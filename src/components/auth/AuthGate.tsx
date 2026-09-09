'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plane } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';

type Mode = 'sign-in' | 'sign-up';

const PANEL =
  'backdrop-blur-xl bg-black/40 border border-white/10 text-white shadow-2xl rounded-2xl';

/**
 * Full-screen sign-in/sign-up form shown when no session is active. Renders
 * nothing (letting children through) once a user is authenticated.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isInitializing } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (isInitializing) {
    return (
      <main className="grid h-dvh w-full place-items-center bg-[#030712]">
        <Loader2 className="animate-spin text-white/40" size={28} />
      </main>
    );
  }

  if (user) return <>{children}</>;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();

    if (mode === 'sign-up') {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      setIsSubmitting(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setConfirmationSent(true);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);
    if (signInError) setError(signInError.message);
  };

  return (
    <main className="relative grid h-dvh w-full place-items-center overflow-hidden bg-[#030712] px-4">
      {/* Subtle starfield-less ambient glow to echo the globe's palette without spinning up WebGL here. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,245,212,0.08),_transparent_60%)]"
      />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`${PANEL} w-full max-w-sm p-7`}
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F5D4]/15 text-[#00F5D4]">
            <Plane size={17} />
            <span className="absolute inset-0 rounded-xl bg-[#00F5D4]/25 blur-md" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Orbit</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Travel recap
            </p>
          </div>
        </div>

        {confirmationSent ? (
          <div className="text-sm text-white/70">
            <p className="font-medium text-white">Check your inbox</p>
            <p className="mt-1.5">
              We sent a confirmation link to <span className="text-white">{email}</span>.
              Click it, then sign in below.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmationSent(false);
                setMode('sign-in');
              }}
              className="mt-4 text-xs font-medium text-[#00F5D4] hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold">
              {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {mode === 'sign-in'
                ? 'Sign in to see your travel history.'
                : 'Your trips are private to your account.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00F5D4]/50"
                  placeholder="you@example.com"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00F5D4]/50"
                  placeholder="••••••••"
                />
              </label>

              {error ? (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#00F5D4] px-4 py-2.5 text-sm font-semibold text-[#03121A] transition hover:bg-[#5BFFE6] disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
                {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setError(null);
              }}
              className="mt-4 text-xs font-medium text-white/50 transition hover:text-white"
            >
              {mode === 'sign-in'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </>
        )}
      </motion.section>
    </main>
  );
}
