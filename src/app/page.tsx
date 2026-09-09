'use client';

import dynamic from 'next/dynamic';
import AuthGate from '@/components/auth/AuthGate';
import NavigationBar from '@/components/ui/NavigationBar';
import StatsHUD from '@/components/ui/StatsHUD';
import TimelineScrubber from '@/components/ui/TimelineScrubber';
import EmptyState from '@/components/ui/EmptyState';

// WebGL has no server-rendered equivalent, so the canvas is client-only.
const GlobeCanvas = dynamic(() => import('@/components/canvas/GlobeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-[#030712]">
      <p className="animate-pulse text-xs uppercase tracking-[0.3em] text-white/40">
        Charting orbits…
      </p>
    </div>
  ),
});

export default function Home() {
  return (
    <AuthGate>
      <main className="relative h-dvh w-full overflow-hidden bg-[#030712]">
        <GlobeCanvas />

        {/* Overlay layer: transparent to pointer events except on controls. */}
        <div className="pointer-events-none absolute inset-0">
          <NavigationBar />
          <StatsHUD />
          <EmptyState />
          <TimelineScrubber />
        </div>
      </main>
    </AuthGate>
  );
}
