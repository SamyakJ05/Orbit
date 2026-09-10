import airportsData from '@/data/airports.json';
import type { LocationNode } from '@/stores/useTravelStore';

interface AirportRecord {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

const AIRPORTS = airportsData as AirportRecord[];

/**
 * Fast local search over ~4000 airports with scheduled service (OurAirports,
 * public domain). Matches on IATA code, airport name, or city.
 */
export function searchAirports(query: string, limit = 8): LocationNode[] {
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();
  if (q.length < 2) return [];

  // IATA codes are conventionally typed in caps ("JFK"), so treat an
  // all-caps 3-letter query as a deliberate code lookup. Anything else
  // (including a lowercase 3-letter query) is almost always someone typing
  // a city name, which matters because plenty of common city names collide
  // with unrelated codes — e.g. "Goa" (India) vs the IATA code GOA (Genoa,
  // Italy). Without this, an exact-code match would always outrank the
  // obviously-intended city, and silently place a trip on the wrong
  // continent instead of erroring.
  const looksLikeIntentionalCode = trimmed.length === 3 && trimmed === trimmed.toUpperCase();

  const scored: { node: LocationNode; score: number }[] = [];

  for (const airport of AIRPORTS) {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();

    let score = -1;
    if (code === q && looksLikeIntentionalCode) score = 100;
    else if (city.startsWith(q)) score = 90;
    // An airport's full name often carries the region travelers actually
    // search for even when the municipality field doesn't (e.g. "Goa
    // Dabolim International Airport" in the city of "Vasco da Gama") — that
    // deserves to beat a same-string coincidental IATA code.
    else if (name.startsWith(q)) score = 85;
    else if (code === q) score = 80;
    else if (code.startsWith(q)) score = 70;
    else if (city.includes(q)) score = 40;
    else if (name.includes(q)) score = 30;

    if (score > 0) {
      scored.push({
        score,
        node: {
          id: `airport-${airport.code}`,
          name: airport.name,
          code: airport.code,
          lat: airport.lat,
          lng: airport.lng,
          city: airport.city,
          country: airport.country,
        },
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.node);
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country_code?: string;
  };
}

/**
 * Free-text geocoding fallback for places that aren't airports: train
 * stations, road-trip stops, cycling routes. Uses OpenStreetMap's Nominatim,
 * which is free but rate-limited (max ~1 req/sec) and requires a descriptive
 * User-Agent/Referer — both satisfied automatically by browser fetch.
 *
 * https://nominatim.org/release-docs/latest/api/Search/
 */
export async function geocodePlace(query: string, signal?: AbortSignal): Promise<LocationNode[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');

  const response = await fetch(url.toString(), {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed (${response.status})`);
  }

  const results: NominatimResult[] = await response.json();

  return results.map((result) => {
    const address = result.address ?? {};
    const city =
      address.city ?? address.town ?? address.village ?? address.municipality ?? q;

    return {
      id: `place-${result.place_id}`,
      name: result.display_name,
      lat: Number.parseFloat(result.lat),
      lng: Number.parseFloat(result.lon),
      city,
      country: (address.country_code ?? '').toUpperCase(),
    };
  });
}
