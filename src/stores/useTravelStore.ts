import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { calculateDistanceKm } from '@/lib/geo-utils';
import type { Database } from '@/lib/supabase/types';

export type TransportMode = 'flight' | 'train' | 'roadtrip' | 'bike';

export type ModeFilter = 'all' | TransportMode;

export interface LocationNode {
  id: string;
  name: string;
  code?: string; // IATA (e.g., "JFK", "HND")
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export interface TravelSegment {
  id: string;
  mode: TransportMode;
  origin: LocationNode;
  destination: LocationNode;
  departureTime: string; // ISO 8601 (e.g., "2025-04-12T08:30:00Z")
  arrivalTime: string;
  distanceKm: number;
  durationMinutes: number;
  carrierOrFlightNo?: string;
  coTravelers?: string[];
}

/** Fields the user supplies when adding a trip; everything else is derived. */
export interface NewTripInput {
  mode: TransportMode;
  origin: LocationNode;
  destination: LocationNode;
  departureTime: string;
  arrivalTime: string;
  carrierOrFlightNo?: string;
  coTravelers?: string[];
}

interface TravelStore {
  userId: string | null;
  segments: TravelSegment[];
  isLoading: boolean;
  loadError: string | null;
  isSaving: boolean;
  saveError: string | null;

  selectedYear: number;
  activeModeFilter: ModeFilter;
  selectedSegmentId: string | null;
  isPlaying: boolean;
  timelineProgress: number; // 0.0 (Jan 1) to 1.0 (Dec 31)

  /** Loads this user's trips from Supabase. Call once after sign-in. */
  loadSegments: (userId: string) => Promise<void>;
  /** Clears local trip state, e.g. on sign-out. */
  reset: () => void;
  addSegment: (input: NewTripInput) => Promise<{ error: string | null }>;
  deleteSegment: (id: string) => Promise<{ error: string | null }>;

  setSelectedYear: (year: number) => void;
  setActiveModeFilter: (mode: ModeFilter) => void;
  setSelectedSegmentId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setTimelineProgress: (progress: number) => void;
}

const CURRENT_YEAR = new Date().getUTCFullYear();

/** Years shown in the selector: a couple back, current, and next. */
export const AVAILABLE_YEARS = [
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
];

type TripRow = Database['public']['Tables']['trips']['Row'];

function rowToSegment(row: TripRow): TravelSegment {
  return {
    id: row.id,
    mode: row.mode,
    origin: {
      id: `${row.id}-origin`,
      name: row.origin_name,
      code: row.origin_code ?? undefined,
      lat: row.origin_lat,
      lng: row.origin_lng,
      city: row.origin_city,
      country: row.origin_country,
    },
    destination: {
      id: `${row.id}-destination`,
      name: row.destination_name,
      code: row.destination_code ?? undefined,
      lat: row.destination_lat,
      lng: row.destination_lng,
      city: row.destination_city,
      country: row.destination_country,
    },
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    distanceKm: row.distance_km,
    durationMinutes: row.duration_minutes,
    carrierOrFlightNo: row.carrier_or_flight_no ?? undefined,
    coTravelers: row.co_travelers,
  };
}

export const useTravelStore = create<TravelStore>((set, get) => ({
  userId: null,
  segments: [],
  isLoading: false,
  loadError: null,
  isSaving: false,
  saveError: null,

  selectedYear: CURRENT_YEAR,
  activeModeFilter: 'all',
  selectedSegmentId: null,
  isPlaying: false,
  timelineProgress: 1,

  loadSegments: async (userId) => {
    set({ isLoading: true, loadError: null, userId });

    const supabase = createClient();
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('departure_time', { ascending: true });

    if (error) {
      set({ isLoading: false, loadError: error.message });
      return;
    }

    set({
      segments: (data ?? []).map(rowToSegment),
      isLoading: false,
      loadError: null,
    });
  },

  reset: () =>
    set({
      userId: null,
      segments: [],
      selectedSegmentId: null,
      isPlaying: false,
      timelineProgress: 1,
      loadError: null,
      saveError: null,
    }),

  addSegment: async (input) => {
    const { userId } = get();
    if (!userId) return { error: 'Not signed in.' };

    set({ isSaving: true, saveError: null });

    const distanceKm = calculateDistanceKm(
      input.origin.lat,
      input.origin.lng,
      input.destination.lat,
      input.destination.lng
    );
    const durationMinutes = Math.max(
      1,
      Math.round(
        (new Date(input.arrivalTime).getTime() - new Date(input.departureTime).getTime()) /
          60_000
      )
    );

    const supabase = createClient();
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        mode: input.mode,
        origin_name: input.origin.name,
        origin_code: input.origin.code ?? null,
        origin_lat: input.origin.lat,
        origin_lng: input.origin.lng,
        origin_city: input.origin.city,
        origin_country: input.origin.country,
        destination_name: input.destination.name,
        destination_code: input.destination.code ?? null,
        destination_lat: input.destination.lat,
        destination_lng: input.destination.lng,
        destination_city: input.destination.city,
        destination_country: input.destination.country,
        departure_time: input.departureTime,
        arrival_time: input.arrivalTime,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        carrier_or_flight_no: input.carrierOrFlightNo ?? null,
        co_travelers: input.coTravelers ?? [],
      })
      .select()
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Could not save trip.';
      set({ isSaving: false, saveError: message });
      return { error: message };
    }

    const newSegment = rowToSegment(data);
    set((state) => ({
      segments: [...state.segments, newSegment].sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime)
      ),
      isSaving: false,
      saveError: null,
      selectedYear: new Date(newSegment.departureTime).getUTCFullYear(),
    }));

    return { error: null };
  },

  deleteSegment: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('trips').delete().eq('id', id);

    if (error) {
      set({ saveError: error.message });
      return { error: error.message };
    }

    set((state) => ({
      segments: state.segments.filter((segment) => segment.id !== id),
      selectedSegmentId: state.selectedSegmentId === id ? null : state.selectedSegmentId,
    }));

    return { error: null };
  },

  setSelectedYear: (year) => set({ selectedYear: year, selectedSegmentId: null }),
  setActiveModeFilter: (mode) => set({ activeModeFilter: mode, selectedSegmentId: null }),
  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTimelineProgress: (progress) =>
    set({ timelineProgress: Math.min(Math.max(progress, 0), 1) }),
}));

/**
 * Segments narrowed to the selected year and travel mode. Kept as a plain
 * selector helper so both the 3D scene and the HUD share one filtering rule.
 */
export function selectFilteredSegments(state: {
  segments: TravelSegment[];
  selectedYear: number;
  activeModeFilter: ModeFilter;
}): TravelSegment[] {
  return state.segments.filter((segment) => {
    const year = new Date(segment.departureTime).getUTCFullYear();
    if (year !== state.selectedYear) return false;
    if (state.activeModeFilter !== 'all' && segment.mode !== state.activeModeFilter) {
      return false;
    }
    return true;
  });
}
