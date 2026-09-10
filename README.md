# Orbit

A cinematic 3D travel recap. Sign in, log the flights, trains, road trips and
rides you've taken, and watch them replay as great-circle arcs across a
dark, real-coastline Earth — with a timeline scrubber, live travel stats, and
a passport-stamp view of every country you've touched.

**Live:** [orbit.samyak.space](https://orbit.samyak.space)

Every account starts empty. There's no demo data and no shared state between
users — what you see is only what you've logged, enforced at the database
level, not just in the UI.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · React Three Fiber ·
drei · Three.js · Zustand · Supabase (Postgres + Auth)

## What it does

- **Add a trip** — pick a mode (flight, train, road trip, bike), search an
  origin and destination, set departure/arrival. Airport search matches
  instantly against a bundled ~4,000-airport dataset; anything else (a train
  station, a road-trip stop) falls back to live geocoding. Distance and
  duration are always computed from the actual coordinates and times, never
  typed in by hand.
- **The globe** — real Natural Earth coastlines, not an approximation, with
  a Fresnel atmosphere glow. Drag to orbit, scroll to zoom; arcs behind the
  Earth are correctly occluded by it.
- **Timeline** — press play and the year replays over 20 seconds, each route
  drawing itself in on its actual departure date. Scrub by hand and the stats
  update live.
- **Stats** — total distance (km/mi), equivalent trips around the equator,
  hours in transit, and a passport-stamp row for every country visited.
- **Filters** — by year and by travel mode.
- **Your data only** — click any route for its detail card, with a delete
  option. Every trip is private to your account, enforced by Postgres row
  level security.

## Running it locally

Trip data is per-account, so this needs a real Supabase project — there's no
offline demo mode.

**1. Set up Supabase.**

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # creates the trips table + row-level security policy
```

(No CLI? Create a project at [supabase.com](https://supabase.com), then paste
the SQL from `supabase/migrations/` into the SQL Editor and run it.)

**2. Add your keys.**

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from Project Settings > API
```

**3. Run it.**

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, add a trip.

By default, Supabase requires confirming a sign-up by email. Its built-in
mailer is fine for a couple of test accounts but rate-limits hard (as low as
2/hour on the free tier) — expect `email rate limit exceeded` the moment you
test seriously. See "Email delivery (SMTP)" under Technical notes below to
fix that properly, or turn confirmation off for local testing under
*Authentication > Providers > Email* in the Supabase dashboard.

```bash
npm run build    # production build
npm run start    # serve the production build
npx eslint src   # lint
npx tsc --noEmit # typecheck
```

## Architecture

```
src/
├── app/                             # layout, page shell, global styles
├── components/
│   ├── auth/
│   │   └── AuthGate.tsx             # sign-in/sign-up screen; renders children once authed
│   ├── canvas/
│   │   ├── GlobeCanvas.tsx          # Canvas, lighting, camera, OrbitControls, shared rotation
│   │   ├── EarthSphere.tsx          # globe geometry: coastline texture, Fresnel atmosphere
│   │   └── FlightArcs.tsx           # great-circle tubes + animated beacons
│   └── ui/
│       ├── StatsHUD.tsx             # yearly metrics, passport stamps, trip detail + delete
│       ├── TimelineScrubber.tsx     # scrub bar with play/pause
│       ├── NavigationBar.tsx        # year selector, mode tabs, add-trip, sign-out
│       ├── AddTripModal.tsx         # trip-entry form
│       ├── LocationSearchInput.tsx  # airport dropdown + geocoding fallback
│       └── EmptyState.tsx           # nudge shown when an account has zero trips
├── lib/
│   ├── supabase/                    # browser/server clients, session middleware, auth context
│   ├── geo-utils.ts                 # spherical math: Haversine, lat/lng → 3D, SLERP arcs
│   ├── travel-stats.ts              # aggregate metrics
│   └── location-search.ts           # airport dataset search + Nominatim geocoding
├── data/
│   └── airports.json                # ~4,000 airports with IATA codes (OurAirports, public domain)
└── stores/
    └── useTravelStore.ts            # Zustand state; loads/saves trips via Supabase

public/textures/                     # equirectangular coastline + emissive maps
scripts/build-earth-texture.py       # regenerates the textures above
supabase/migrations/                 # trips table schema + RLS policy
supabase/config.toml                 # includes production SMTP config
middleware.ts                        # refreshes the Supabase session on every request
```

The data layer is mode-agnostic — `TravelSegment` carries a `TransportMode`,
so trains, road trips and cycling render through the exact same pipeline as
flights. Adding a new mode is a colour and a filter tab, not a new code path.

## Technical notes

<details>
<summary><b>Real coastlines, not an approximation</b></summary>

The world map in `public/textures/` is rasterized from
[datasets/geo-countries](https://github.com/datasets/geo-countries) (258
country polygons, Natural Earth data, public domain) into a 2048×1024
equirectangular land/ocean mask, styled to the app's dark palette, with a
matching low-intensity emissive map so continents stay legible on the
globe's night side.

Regenerate after changing the palette or resolution:

```bash
pip install pillow
python3 scripts/build-earth-texture.py
```

</details>

<details>
<summary><b>Globe and arcs share one rotation</b></summary>

The globe's idle spin and the flight arcs both live inside a single
`RotatingWorld` group in `GlobeCanvas.tsx`. An earlier version gave the globe
its own private rotation while arcs were computed independently in
world-space lat/lng — every frame the globe span but the arcs stayed put, so
routes visibly drifted off their real coastlines the longer the page stayed
open. Wrapping both in one group makes the whole scene rotate as a single
rigid body.

</details>

<details>
<summary><b>Row-level security, not app-level filtering</b></summary>

Every trip lives in the `trips` Postgres table, scoped to `user_id` with a
row-level security policy — the database itself refuses to return or accept
rows for any other user, regardless of what the client asks for. A new
account starts with zero rows: `useTravelStore` only populates after
`loadSegments(userId)` runs post sign-in.

</details>

<details>
<summary><b>Email delivery (SMTP)</b></summary>

This project sends auth email through [Resend](https://resend.com) rather
than Supabase's shared dev mailer, from a verified subdomain. Config lives in
`supabase/config.toml` under `[auth.email.smtp]`; the password field
references `env(RESEND_SMTP_PASSWORD)`, never a literal key.

```bash
export RESEND_SMTP_PASSWORD=<your Resend API key>
supabase config diff --project-ref <ref>   # review every line before pushing
supabase config push --project-ref <ref>
```

**Always run `config diff` first and read it.** `config push` sends your
entire local `config.toml`, and `supabase init`'s template ships with several
settings (MFA, Twilio, storage analytics, pooler sizes, OTP length) that
default differently from a real project's live settings — a blind push can
silently change things you never meant to touch. The pattern used here: diff,
fix every unintended mismatch in the file to match the remote value, diff
again until only the intended change remains, then push.

</details>

<details>
<summary><b>Location search: real airport priority over coincidental codes</b></summary>

`location-search.ts` ranks a matching airport name above a same-string IATA
code coincidence — e.g. searching "Goa" correctly returns Goa Dabolim
International Airport (India) rather than Genoa, Italy (IATA code: `GOA`). An
all-caps 3-letter query is treated as a deliberate code lookup; anything else
is ranked as a place-name search.

</details>

<details>
<summary><b>Memory management</b></summary>

`TubeGeometry` instances in `FlightArcs.tsx` are created outside R3F's
reconciler, so they're disposed explicitly on unmount. Arc reveal animates
via `setDrawRange` rather than rebuilding geometry each frame. Earth textures
load once through drei's `useTexture` (deduped and cached by URL), and
`useFrame` mutates refs directly instead of calling `setState`.

</details>

<details>
<summary><b>Camera distance vs. the original spec</b></summary>

`OrbitControls` uses `minDistance={4.2}` / `maxDistance={14}` rather than a
tighter `3.2` / `8.0`. At a globe radius of 2.5, long-haul arcs peak around a
radius of 3.07 — at distance 3.2 the visible half-height is under that, so
arcs were being cropped by the viewport. The wider range keeps whole routes
in frame.

</details>


