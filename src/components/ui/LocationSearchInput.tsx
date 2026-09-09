'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { geocodePlace, searchAirports } from '@/lib/location-search';
import type { LocationNode } from '@/stores/useTravelStore';
import { cn } from '@/lib/utils';

interface LocationSearchInputProps {
  label: string;
  placeholder: string;
  value: LocationNode | null;
  onChange: (node: LocationNode) => void;
}

/** Debounce delay before falling back to the network geocoder. */
const GEOCODE_DEBOUNCE_MS = 500;

export default function LocationSearchInput({
  label,
  placeholder,
  value,
  onChange,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(value ? formatLocationLabel(value) : '');
  const [geocoded, setGeocoded] = useState<LocationNode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local airport search is a pure, synchronous function of the query, so it
  // derives directly during render rather than living in effect state.
  const airportMatches = useMemo(() => searchAirports(query), [query]);
  const needsGeocodeFallback = airportMatches.length === 0 && query.trim().length >= 3;
  const results = needsGeocodeFallback ? geocoded : airportMatches;

  // Only reach for the network geocoder when the local airport dataset comes
  // up empty, after a short debounce. Skipped entirely (no state touched)
  // when airport matches already satisfy the query.
  useEffect(() => {
    if (!needsGeocodeFallback) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsGeocoding(true);
      geocodePlace(query, controller.signal)
        .then((places) => setGeocoded(places))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setGeocoded([]);
        })
        .finally(() => setIsGeocoding(false));
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, needsGeocodeFallback]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="text-xs font-medium text-white/60">{label}</label>
      <div className="relative">
        <MapPin
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-8 pr-8 text-sm text-white outline-none transition focus:border-[#00F5D4]/50"
        />
        {needsGeocodeFallback && isGeocoding ? (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30"
          />
        ) : null}
      </div>

      {isOpen && results.length > 0 ? (
        <ul className="absolute top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0A0F1D]/95 shadow-2xl backdrop-blur-xl">
          {results.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(node);
                  setQuery(formatLocationLabel(node));
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-white/5',
                  value?.id === node.id && 'bg-[#00F5D4]/10'
                )}
              >
                <span className="font-medium text-white">
                  {node.code ? `${node.code} — ` : ''}
                  {node.city}
                </span>
                <span className="truncate text-xs text-white/40">{node.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatLocationLabel(node: LocationNode): string {
  return node.code ? `${node.code} — ${node.city}` : node.city;
}
