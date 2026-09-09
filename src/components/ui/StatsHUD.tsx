'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Globe2, Plane, Route } from 'lucide-react';
import { computeTravelStats } from '@/lib/travel-stats';
import { countryCodeToFlag, formatNumber } from '@/lib/utils';
import { selectFilteredSegments, useTravelStore } from '@/stores/useTravelStore';
import { MODE_COLORS } from '@/components/canvas/FlightArcs';

const PANEL =
  'pointer-events-auto backdrop-blur-xl bg-black/40 border border-white/10 text-white shadow-2xl rounded-2xl';

function StatRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-[#00F5D4]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</p>
        <p className="text-xl font-semibold tabular-nums leading-tight">{value}</p>
        {sub ? <p className="text-xs text-white/50">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function StatsHUD() {
  const [unit, setUnit] = useState<'km' | 'mi'>('km');

  const segments = useTravelStore((state) => state.segments);
  const selectedYear = useTravelStore((state) => state.selectedYear);
  const activeModeFilter = useTravelStore((state) => state.activeModeFilter);
  const timelineProgress = useTravelStore((state) => state.timelineProgress);
  const selectedSegmentId = useTravelStore((state) => state.selectedSegmentId);

  const filtered = useMemo(
    () => selectFilteredSegments({ segments, selectedYear, activeModeFilter }),
    [segments, selectedYear, activeModeFilter]
  );

  const stats = useMemo(
    () => computeTravelStats(filtered, timelineProgress),
    [filtered, timelineProgress]
  );

  const selected = filtered.find((segment) => segment.id === selectedSegmentId) ?? null;

  const distance =
    unit === 'km'
      ? `${formatNumber(stats.totalKm)} km`
      : `${formatNumber(stats.totalMiles)} mi`;

  return (
    <div className="pointer-events-none absolute left-4 top-24 z-10 flex w-[19rem] max-w-[calc(100vw-2rem)] flex-col gap-3 sm:left-6">
      <motion.section
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`${PANEL} p-5`}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-white/80">
            {selectedYear} in transit
          </h2>
          <button
            type="button"
            onClick={() => setUnit((current) => (current === 'km' ? 'mi' : 'km'))}
            className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:border-[#00F5D4]/50 hover:text-[#00F5D4]"
            aria-label={`Switch distance unit to ${unit === 'km' ? 'miles' : 'kilometers'}`}
          >
            {unit.toUpperCase()}
          </button>
        </header>

        <div className="mt-1 divide-y divide-white/5">
          <StatRow
            icon={<Route size={18} />}
            label="Total distance"
            value={distance}
            sub={`${stats.tripCount} ${stats.tripCount === 1 ? 'journey' : 'journeys'} logged`}
          />
          <StatRow
            icon={<Globe2 size={18} />}
            label="Earth rotations"
            value={`${stats.earthRotations.toFixed(2)}x`}
            sub="around the globe at the equator"
          />
          <StatRow
            icon={<Clock size={18} />}
            label="Time in transit"
            value={`${stats.totalHours.toFixed(1)} h`}
            sub={`${stats.totalDays.toFixed(1)} days in motion`}
          />
          <StatRow
            icon={<Plane size={18} />}
            label="Cities touched"
            value={String(stats.cities.length)}
            sub={stats.cities.slice(0, 3).join(' · ') || '—'}
          />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
        className={`${PANEL} p-5`}
      >
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45">
          Passport stamps
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.countries.length === 0 ? (
            <p className="text-xs text-white/40">No borders crossed yet this year.</p>
          ) : (
            stats.countries.map((code) => (
              <span
                key={code}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium"
              >
                <span aria-hidden>{countryCodeToFlag(code)}</span>
                {code}
              </span>
            ))
          )}
        </div>
      </motion.section>

      {selected ? (
        <motion.section
          key={selected.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={`${PANEL} p-5`}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: MODE_COLORS[selected.mode] }}
            />
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45">
              {selected.mode}
            </h3>
          </div>
          <p className="mt-2 text-lg font-semibold">
            {selected.origin.code ?? selected.origin.city}
            <span className="mx-2 text-white/35">→</span>
            {selected.destination.code ?? selected.destination.city}
          </p>
          <p className="text-xs text-white/50">
            {selected.origin.city} to {selected.destination.city}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
            <dt className="text-white/45">Date</dt>
            <dd className="text-right tabular-nums">
              {new Date(selected.departureTime).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </dd>
            <dt className="text-white/45">Distance</dt>
            <dd className="text-right tabular-nums">
              {formatNumber(selected.distanceKm)} km
            </dd>
            <dt className="text-white/45">Duration</dt>
            <dd className="text-right tabular-nums">
              {Math.floor(selected.durationMinutes / 60)}h {selected.durationMinutes % 60}m
            </dd>
            {selected.carrierOrFlightNo ? (
              <>
                <dt className="text-white/45">Carrier</dt>
                <dd className="text-right">{selected.carrierOrFlightNo}</dd>
              </>
            ) : null}
            {selected.coTravelers?.length ? (
              <>
                <dt className="text-white/45">With</dt>
                <dd className="text-right">{selected.coTravelers.join(', ')}</dd>
              </>
            ) : null}
          </dl>
        </motion.section>
      ) : null}
    </div>
  );
}
