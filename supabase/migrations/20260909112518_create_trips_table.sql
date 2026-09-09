-- Orbit: per-user trip storage.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- for a freshly created project. Safe to re-run: uses IF NOT EXISTS / OR REPLACE.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  mode text not null check (mode in ('flight', 'train', 'roadtrip', 'bike')),

  origin_name text not null,
  origin_code text,
  origin_lat double precision not null,
  origin_lng double precision not null,
  origin_city text not null,
  origin_country text not null,

  destination_name text not null,
  destination_code text,
  destination_lat double precision not null,
  destination_lng double precision not null,
  destination_city text not null,
  destination_country text not null,

  departure_time timestamptz not null,
  arrival_time timestamptz not null,
  distance_km integer not null,
  duration_minutes integer not null,
  carrier_or_flight_no text,
  co_travelers text[] not null default '{}',

  created_at timestamptz not null default now()
);

create index if not exists trips_user_id_departure_idx
  on public.trips (user_id, departure_time desc);

alter table public.trips enable row level security;

-- Each user can only ever see, insert, update, or delete their own trips.
drop policy if exists "Users manage their own trips" on public.trips;
create policy "Users manage their own trips"
  on public.trips
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
