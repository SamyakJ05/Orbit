import { EARTH_CIRCUMFERENCE_KM, dateToYearProgress } from './geo-utils';
import type { TravelSegment } from '@/stores/useTravelStore';

export interface TravelStats {
  totalKm: number;
  totalMiles: number;
  earthRotations: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  tripCount: number;
  countries: string[];
  cities: string[];
}

const KM_TO_MILES = 0.621371;

/**
 * Aggregate metrics over the segments that have already departed at the given
 * timeline position, so the HUD counts up in step with the scrubber.
 */
export function computeTravelStats(
  segments: TravelSegment[],
  timelineProgress: number
): TravelStats {
  const elapsed = segments.filter(
    (segment) => dateToYearProgress(segment.departureTime) <= timelineProgress
  );

  const totalKm = elapsed.reduce((sum, segment) => sum + segment.distanceKm, 0);
  const totalMinutes = elapsed.reduce((sum, segment) => sum + segment.durationMinutes, 0);

  const countries = new Set<string>();
  const cities = new Set<string>();
  for (const segment of elapsed) {
    countries.add(segment.origin.country);
    countries.add(segment.destination.country);
    cities.add(segment.origin.city);
    cities.add(segment.destination.city);
  }

  return {
    totalKm,
    totalMiles: Math.round(totalKm * KM_TO_MILES),
    earthRotations: totalKm / EARTH_CIRCUMFERENCE_KM,
    totalMinutes,
    totalHours: totalMinutes / 60,
    totalDays: totalMinutes / 60 / 24,
    tripCount: elapsed.length,
    countries: [...countries].sort(),
    cities: [...cities].sort(),
  };
}
