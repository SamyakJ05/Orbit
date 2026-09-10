# Orbit — 3D Travel Recap

A cinematic 3D personal flight tracker. Each user signs in to their own
private account, starting with zero trips, and adds their own journeys. An
interactive dark-themed Earth globe plots every trip taken in a selected
year, aggregates the year's travel stats, and replays the routes along a
timeline scrubber.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, React Three
Fiber, drei, Three.js, Zustand, and Supabase (Postgres + Auth).

## Setup

Trip data is per-account, so the app needs a Supabase project before it will
run — there's no working demo mode without one.

### Using the Supabase CLI (recommended)

```bash
brew install supabase/tap/supabase   # or see supabase.com/docs/guides/cli
supabase login                       # opens a browser to authenticate
supabase link --project-ref <your-project-ref>
supabase db push                     # applies supabase/migrations/*.sql
```

Then copy your API keys from *Project Settings > API* into `.env.local`:

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Without the CLI

1. **Create a free project** at [supabase.com](https://supabase.com).
2. **Run the schema.** In your project, go to *SQL Editor > New query*, paste
   the contents of the file in `supabase/migrations/`, and run it. This
   creates the `trips` table with row-level security, so each account can
   only ever see its own trips.
3. **Copy your API keys** as above.

### Either way

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up with any email/password, and add your
first trip.

### Email delivery (SMTP)

Supabase requires confirming a sign-up via email before signing in. Its
built-in mailer is fine for a couple of test signups but rate-limits hard
(as low as ~2 emails/hour on the free tier) — expect `email rate limit
exceeded` the moment you're testing seriously.

This project is configured to send auth email through
[Resend](https://resend.com) instead, from a verified subdomain
(`mail.samyak.space`). The config lives in `supabase/config.toml` under
`[auth.email.smtp]`; the password field references `env(RESEND_SMTP_PASSWORD)`
rather than a literal key. To push a change to this section (or set it up
fresh for a different project):

```bash
export RESEND_SMTP_PASSWORD=<your Resend API key>
supabase config diff --project-ref <ref>   # review every line before pushing
supabase config push --project-ref <ref>
```

**Always run `config diff` first and read it.** `config push` sends your
*entire* local `config.toml`, and `supabase init`'s template ships with
several settings (MFA, Twilio, storage analytics, pooler sizes, OTP length...)
that default differently from a real project's live settings — a blind push
can silently change things you never meant to touch. The safe pattern used
here: diff, fix every unintended mismatch in the file so it matches the
remote value, diff again until only your intended change remains, then push.

To disable email confirmation entirely for local testing (not recommended
once real users are on the app), toggle it by hand in *Authentication >
Providers > Email > Confirm email* rather than via config push.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npx eslint src  # lint
npx tsc --noEmit # typecheck
```

## What to check

- **Sign up / sign in** — each account's trips are private (enforced by
  Postgres row-level security, not just app-level filtering). A new account
  starts with zero trips.
- **Add trip** — top-right button opens a form: pick a travel mode, search an
  origin/destination (airport code or city name matches instantly from a
  bundled ~4000-airport dataset; anything else falls back to live geocoding
  for train stations, road-trip stops, etc.), set departure/arrival, and
  optionally a carrier. Distance and duration are computed automatically.
- **Globe** — drag to orbit, scroll to zoom (pan is disabled). Arcs behind the
  Earth are occluded by it.
- **Timeline** — press play; the year replays over 20 seconds and routes draw
  themselves in from origin to destination on their departure date. Drag the
  handle to scrub; the HUD totals count along with it. The ticks under the rail
  mark each departure, coloured by travel mode.
- **Stats HUD** — total distance (toggle km/mi), equivalent trips around the
  equator, time in transit, and passport stamps for every country touched.
- **Filters** — the year dropdown covers last year / this year / next year;
  the mode tabs filter to flights, trains, road trips or cycling.
- **Selection** — click an arc to isolate it and open its detail card; click
  empty space to clear.

## Architecture

```
src/
├── app/                        # layout, page shell, global styles
├── components/
│   ├── auth/
│   │   └── AuthGate.tsx        # sign-in/sign-up screen; renders children once authed
│   ├── canvas/
│   │   ├── GlobeCanvas.tsx     # Canvas, lighting, camera, OrbitControls
│   │   ├── EarthSphere.tsx     # globe, real coastline texture, Fresnel atmosphere
│   │   └── FlightArcs.tsx      # great-circle tubes + animated beacons
│   └── ui/
│       ├── StatsHUD.tsx        # yearly metrics, passport stamps, detail card
│       ├── TimelineScrubber.tsx# scrub bar with play/pause
│       ├── NavigationBar.tsx   # year selector, travel-mode tabs, add-trip, sign-out
│       ├── AddTripModal.tsx    # trip-entry form, saves via the store
│       ├── LocationSearchInput.tsx # airport dropdown + geocoding fallback
│       └── EmptyState.tsx      # nudge shown when an account has zero trips
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # browser Supabase client
│   │   ├── server.ts           # server-side Supabase client (Server Components)
│   │   ├── middleware.ts       # session-refresh logic used by middleware.ts
│   │   ├── auth-context.tsx    # React context tracking the current session
│   │   └── types.ts            # hand-written types for the `trips` table
│   ├── geo-utils.ts            # spherical math, Haversine, SLERP arcs
│   ├── travel-stats.ts         # aggregate metrics
│   └── location-search.ts      # airport dataset search + Nominatim geocoding
├── data/
│   └── airports.json           # ~4000 airports with IATA codes (OurAirports, public domain)
└── stores/
    └── useTravelStore.ts       # Zustand state; loads/saves trips via Supabase

public/textures/
├── earth-color.png             # equirectangular land/ocean map
└── earth-emissive.png          # faint land self-glow for the dark side

scripts/
└── build-earth-texture.py      # regenerates the textures above from source data

supabase/
├── config.toml                  # local CLI config (created by `supabase init`)
└── migrations/
    └── ..._create_trips_table.sql  # trips table + row-level security policy

middleware.ts                   # refreshes the Supabase session on every request
```

The data layer is mode-agnostic: `TravelSegment` carries a `TransportMode`, so
trains, road trips and cycling render through the same pipeline as flights.
Adding a mode means adding a colour and a filter tab. Segment distances are
derived from real coordinates via the Haversine helper rather than hardcoded,
so the stats always agree with the rendered arcs.

## Accounts and data

- **Auth**: Supabase Auth (email/password). `src/lib/supabase/auth-context.tsx`
  tracks the session client-side; `middleware.ts` refreshes it on every
  request so it doesn't silently expire.
- **Storage**: every trip lives in the `trips` Postgres table
  (`supabase/migrations/`), scoped to `user_id` with row-level security — the
  database itself refuses to return or accept rows for any other user,
  regardless of what the client asks for.
- **Empty by default**: a new account has zero rows. `useTravelStore` starts
  with `segments: []` and only populates after `loadSegments(userId)` runs
  post sign-in; there's no seeded demo data.
- **Adding a trip**: `AddTripModal` collects mode, origin/destination,
  departure/arrival, and an optional carrier. `LocationSearchInput` resolves
  places two ways — instantly against the bundled airport dataset
  (`src/data/airports.json`, ~4000 airports with scheduled service, from
  [OurAirports](https://github.com/davidmegginson/ourairports-data), public
  domain), or via live [Nominatim](https://nominatim.org/) geocoding when no
  airport matches (train stations, road-trip stops, cycling routes). Distance
  and duration are computed from the chosen coordinates and times — never
  typed in by hand.

## Notes on the spec

- `OrbitControls` uses `minDistance={4.2}` / `maxDistance={14}` rather than the
  originally specified `3.2` / `8.0`. At a globe radius of 2.5, long-haul arcs
  peak at a radius of about 3.07, and the visible half-height at distance 3.2 is
  well under that — the arcs were being cropped by the viewport. The wider range
  keeps whole routes in frame.

## Globe texture

Coastlines are real Natural Earth data, not a hand-drawn approximation. The
world map in `public/textures/` is rasterized from
[datasets/geo-countries](https://github.com/datasets/geo-countries) (258
country polygons, PDDL 1.0 / public domain) into a 2048×1024 equirectangular
land/ocean mask, styled to the app's dark palette, plus a matching low-intensity
emissive map so continents stay legible on the globe's night side.

To regenerate the textures (e.g. after changing the palette or resolution):

```bash
pip install pillow
python3 scripts/build-earth-texture.py
```

The script downloads and caches the source GeoJSON, then writes
`public/textures/earth-color.png` and `earth-emissive.png`. See the script's
docstring for the coordinate convention it rasterizes against.

## Memory management

`TubeGeometry` instances in `FlightArcs.tsx` are created outside R3F's
reconciler, so they're disposed explicitly on unmount. Arc reveal is animated
with `setDrawRange` rather than by rebuilding geometry each frame. Earth
textures are loaded once via drei's `useTexture` (which dedupes and caches by
URL) rather than reloaded per render, and `useFrame` mutates refs directly
instead of calling `setState`.
