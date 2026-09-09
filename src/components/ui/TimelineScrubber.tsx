'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { dateToYearProgress, yearProgressToLabel } from '@/lib/geo-utils';
import { cn } from '@/lib/utils';
import { selectFilteredSegments, useTravelStore } from '@/stores/useTravelStore';
import { MODE_COLORS } from '@/components/canvas/FlightArcs';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
/** Wall-clock seconds for a full Jan 1 to Dec 31 playthrough. */
const PLAYBACK_SECONDS = 20;

export default function TimelineScrubber() {
  const segments = useTravelStore((state) => state.segments);
  const selectedYear = useTravelStore((state) => state.selectedYear);
  const activeModeFilter = useTravelStore((state) => state.activeModeFilter);
  const timelineProgress = useTravelStore((state) => state.timelineProgress);
  const setTimelineProgress = useTravelStore((state) => state.setTimelineProgress);
  const isPlaying = useTravelStore((state) => state.isPlaying);
  const setIsPlaying = useTravelStore((state) => state.setIsPlaying);

  const filtered = useMemo(
    () => selectFilteredSegments({ segments, selectedYear, activeModeFilter }),
    [segments, selectedYear, activeModeFilter]
  );

  const frameRef = useRef<number | null>(null);

  // rAF playback loop. Reads progress from the store at tick time so a manual
  // scrub mid-playback continues from where the user dropped the handle.
  useEffect(() => {
    if (!isPlaying) return;

    let previous = performance.now();

    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;

      const next = useTravelStore.getState().timelineProgress + delta / PLAYBACK_SECONDS;

      if (next >= 1) {
        setTimelineProgress(1);
        setIsPlaying(false);
        return;
      }

      setTimelineProgress(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isPlaying, setTimelineProgress, setIsPlaying]);

  const handlePlayToggle = () => {
    // Restart from the top when replaying a finished timeline.
    if (!isPlaying && timelineProgress >= 1) setTimelineProgress(0);
    setIsPlaying(!isPlaying);
  };

  const percent = timelineProgress * 100;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 sm:p-6">
      <section className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-black/40 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handlePlayToggle}
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00F5D4] text-[#03121A] transition hover:bg-[#5BFFE6] active:scale-95"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setTimelineProgress(0);
            }}
            aria-label="Reset timeline to January"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition hover:border-white/25 hover:text-white"
          >
            <RotateCcw size={15} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm font-semibold tabular-nums">
                {yearProgressToLabel(timelineProgress, selectedYear)}
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                {selectedYear}
              </span>
            </div>

            <div className="relative h-6">
              {/* Track */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00F5D4]/40 to-[#00F5D4]"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Departure ticks, coloured by travel mode */}
              {filtered.map((segment) => {
                const at = dateToYearProgress(segment.departureTime);
                return (
                  <span
                    key={segment.id}
                    title={`${segment.origin.code ?? segment.origin.city} → ${
                      segment.destination.code ?? segment.destination.city
                    }`}
                    className={cn(
                      'pointer-events-none absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full transition-opacity',
                      at <= timelineProgress ? 'opacity-100' : 'opacity-30'
                    )}
                    style={{
                      left: `${at * 100}%`,
                      backgroundColor: MODE_COLORS[segment.mode],
                    }}
                  />
                );
              })}

              <input
                type="range"
                min={0}
                max={1}
                step={0.0005}
                value={timelineProgress}
                aria-label="Scrub through the year"
                onChange={(event) => {
                  setIsPlaying(false);
                  setTimelineProgress(Number(event.target.value));
                }}
                className="timeline-range absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
              />
            </div>

            <div className="mt-1 flex justify-between text-[10px] font-medium text-white/30">
              {MONTHS.map((month, index) => (
                <span key={`${month}-${index}`}>{month}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
