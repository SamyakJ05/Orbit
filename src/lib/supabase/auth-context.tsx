'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from './client';
import { useTravelStore } from '@/stores/useTravelStore';

interface AuthContextValue {
  user: User | null;
  /** True until the initial session check resolves. */
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Tracks the current Supabase session and keeps the travel store's loaded
 * trips in sync with it: loads on sign-in, clears on sign-out. Mount once
 * near the app root.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const loadSegments = useTravelStore((state) => state.loadSegments);
  const reset = useTravelStore((state) => state.reset);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.user);
      setIsInitializing(false);
      if (data.user) void loadSegments(data.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void loadSegments(nextUser.id);
      } else {
        reset();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable via useMemo
  }, [supabase]);

  const value = useMemo(() => ({ user, isInitializing }), [user, isInitializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
