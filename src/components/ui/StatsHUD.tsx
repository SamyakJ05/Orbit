'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Globe2, Loader2, Plane, Route, Trash2 } from 'lucide-react';
import { computeTravelStats } from '@/lib/travel-stats';
import { countryCodeToFlag, formatNumber } from '@/lib/utils';
import {
  selectFilteredSegments,
  useTravelStore,
  type TravelSegment,
} from '@/stores/useTravelStore';
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

      {selected ? <SelectedTripCard key={selected.id} segment={selected} /> : null}
    </div>
  );
}

function SelectedTripCard({ segment }: { segment: TravelSegment }) {
  const setSelectedSegmentId = useTravelStore((state) => state.setSelectedSegmentId);
  const deleteSegment = useTravelStore((state) => state.deleteSegment);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const { error } = await deleteSegment(segment.id);
    if (error) {
      setIsDeleting(false);
      setDeleteError(error);
      return;
    }
    setSelectedSegmentId(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`${PANEL} p-5`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: MODE_COLORS[segment.mode] }}
          />
          <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            {segment.mode}
          </h3>
        </div>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2 py-1 text-[11px] font-medium text-red-300 transition hover:bg-red-500/30 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 size={11} className="animate-spin" /> : null}
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
              className="rounded-lg px-2 py-1 text-[11px] font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            aria-label="Delete trip"
            className="rounded-lg p-1.5 text-white/35 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <p className="mt-2 text-lg font-semibold">
        {segment.origin.code ?? segment.origin.city}
        <span className="mx-2 text-white/35">→</span>
        {segment.destination.code ?? segment.destination.city}
      </p>
      <p className="text-xs text-white/50">
        {segment.origin.city} to {segment.destination.city}
      </p>

      {deleteError ? (
        <p className="mt-2 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">
          {deleteError}
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
        <dt className="text-white/45">Date</dt>
        <dd className="text-right tabular-nums">
          {new Date(segment.departureTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </dd>
        <dt className="text-white/45">Distance</dt>
        <dd className="text-right tabular-nums">{formatNumber(segment.distanceKm)} km</dd>
        <dt className="text-white/45">Duration</dt>
        <dd className="text-right tabular-nums">
          {Math.floor(segment.durationMinutes / 60)}h {segment.durationMinutes % 60}m
        </dd>
        {segment.carrierOrFlightNo ? (
          <>
            <dt className="text-white/45">Carrier</dt>
            <dd className="text-right">{segment.carrierOrFlightNo}</dd>
          </>
        ) : null}
        {segment.coTravelers?.length ? (
          <>
            <dt className="text-white/45">With</dt>
            <dd className="text-right">{segment.coTravelers.join(', ')}</dd>
          </>
        ) : null}
      </dl>
    </motion.section>
  );
}
