-- Condor Fitness — initial schema
-- Phase 1 of the migration from GitHub-as-database to Supabase.
-- Run this in the Supabase SQL Editor before running scripts/backfill-supabase.ts.
--
-- Every table keeps the original JSON in a `raw` / `data` / `meta` column so no
-- information is lost if the flattened columns miss a field.

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  key         text unique,
  label       text,
  meta        jsonb,
  data        jsonb,
  is_active   boolean default false,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- sessions — one row per sessions/YYYY-MM-DD.json
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  session_date    date unique not null,
  week            int,
  day             int,
  day_type        text,
  day_label       text,
  phase           text,
  bonus           boolean default false,
  alternate_used  text,
  duration_min    numeric,
  calf_rating     int,
  overall_feel    int,
  skills          jsonb,
  note            text,
  raw             jsonb not null,
  created_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- session_sets — one row per set / interval entry inside a session
-- Shape varies by exercise type (strength: weight+reps, timed: duration,
-- run days: interval + completed), so unused columns stay null.
-- ---------------------------------------------------------------------------
create table if not exists public.session_sets (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid references public.sessions (id) on delete cascade,
  exercise_name       text not null,
  exercise_order      int,
  set_number          int,
  interval            int,
  target_weight_lbs   numeric,
  actual_weight_lbs   numeric,
  target_reps         int,
  actual_reps         int,
  target_duration_sec int,
  actual_duration_sec int,
  completed           boolean,
  raw                 jsonb not null
);

-- ---------------------------------------------------------------------------
-- body_weight
-- ---------------------------------------------------------------------------
create table if not exists public.body_weight (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  weight_lbs  numeric not null,
  note        text
);

-- ---------------------------------------------------------------------------
-- prs
-- ---------------------------------------------------------------------------
create table if not exists public.prs (
  id          uuid primary key default gen_random_uuid(),
  lift        text not null,
  type        text,
  weight_lbs  numeric,
  date_approx text,
  block       text,
  note        text
);

-- ---------------------------------------------------------------------------
-- athlete_profile — single row (id = 1) holding all of athlete.json
-- ---------------------------------------------------------------------------
create table if not exists public.athlete_profile (
  id          int primary key default 1,
  data        jsonb not null,
  updated_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists session_sets_session_id_idx on public.session_sets (session_id);
create index if not exists sessions_session_date_idx   on public.sessions (session_date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- One policy per table: full CRUD for authenticated. `anon` gets no policy,
-- and with RLS enabled that means no access at all.
-- ---------------------------------------------------------------------------
alter table public.programs        enable row level security;
alter table public.sessions        enable row level security;
alter table public.session_sets    enable row level security;
alter table public.body_weight     enable row level security;
alter table public.prs             enable row level security;
alter table public.athlete_profile enable row level security;

drop policy if exists programs_authenticated_all        on public.programs;
drop policy if exists sessions_authenticated_all        on public.sessions;
drop policy if exists session_sets_authenticated_all    on public.session_sets;
drop policy if exists body_weight_authenticated_all     on public.body_weight;
drop policy if exists prs_authenticated_all             on public.prs;
drop policy if exists athlete_profile_authenticated_all on public.athlete_profile;

create policy programs_authenticated_all on public.programs
  for all to authenticated using (true) with check (true);

create policy sessions_authenticated_all on public.sessions
  for all to authenticated using (true) with check (true);

create policy session_sets_authenticated_all on public.session_sets
  for all to authenticated using (true) with check (true);

create policy body_weight_authenticated_all on public.body_weight
  for all to authenticated using (true) with check (true);

create policy prs_authenticated_all on public.prs
  for all to authenticated using (true) with check (true);

create policy athlete_profile_authenticated_all on public.athlete_profile
  for all to authenticated using (true) with check (true);
