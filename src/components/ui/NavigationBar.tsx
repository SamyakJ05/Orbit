'use client';

import { Bike, Car, Globe, LogOut, Plane, TrainFront } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AVAILABLE_YEARS,
  useTravelStore,
  type ModeFilter,
} from '@/stores/useTravelStore';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import AddTripModal from './AddTripModal';

const MODE_TABS: { value: ModeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Globe size={14} /> },
  { value: 'flight', label: 'Flights', icon: <Plane size={14} /> },
  { value: 'train', label: 'Trains', icon: <TrainFront size={14} /> },
  { value: 'roadtrip', label: 'Road', icon: <Car size={14} /> },
  { value: 'bike', label: 'Bike', icon: <Bike size={14} /> },
];

export default function NavigationBar() {
  const selectedYear = useTravelStore((state) => state.selectedYear);
  const setSelectedYear = useTravelStore((state) => state.setSelectedYear);
  const activeModeFilter = useTravelStore((state) => state.activeModeFilter);
  const setActiveModeFilter = useTravelStore((state) => state.setActiveModeFilter);
  const { user } = useAuth();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-white shadow-2xl backdrop-blur-xl">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#00F5D4]/15 text-[#00F5D4]">
          <Plane size={16} />
          <span className="absolute inset-0 rounded-xl bg-[#00F5D4]/25 blur-md" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Orbit</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Travel recap
          </p>
        </div>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Travel mode"
          className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 shadow-2xl backdrop-blur-xl"
        >
          {MODE_TABS.map((tab) => {
            const isActive = activeModeFilter === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveModeFilter(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition',
                  isActive
                    ? 'bg-[#00F5D4]/15 text-[#00F5D4] shadow-[inset_0_0_0_1px_rgba(0,245,212,0.35)]'
                    : 'text-white/55 hover:bg-white/5 hover:text-white'
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
          <span className="sr-only">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-sm font-semibold tabular-nums outline-none"
          >
            {AVAILABLE_YEARS.map((year) => (
              <option key={year} value={year} className="bg-[#0A0F1D] text-white">
                {year}
              </option>
            ))}
          </select>
        </label>

        <AddTripModal />

        <button
          type="button"
          onClick={handleSignOut}
          title={user?.email ?? 'Sign out'}
          aria-label="Sign out"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/50 shadow-2xl backdrop-blur-xl transition hover:border-white/25 hover:text-white"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
