-- Condor Fitness — owner-only RLS policies
-- Phase 2a of the migration from GitHub-as-database to Supabase.
-- Run this in the Supabase SQL Editor.
--
-- 001 gave every authenticated user full CRUD. Once the app signs users in with
-- Google OAuth, "authenticated" means anyone with a Google account, so the
-- policies are narrowed to the single owner email.

-- ---------------------------------------------------------------------------
-- Drop the broad authenticated-CRUD policies from 001
-- ---------------------------------------------------------------------------
drop policy if exists programs_authenticated_all        on public.programs;
drop policy if exists sessions_authenticated_all        on public.sessions;
drop policy if exists session_sets_authenticated_all    on public.session_sets;
drop policy if exists body_weight_authenticated_all     on public.body_weight;
drop policy if exists prs_authenticated_all             on public.prs;
drop policy if exists athlete_profile_authenticated_all on public.athlete_profile;

-- ---------------------------------------------------------------------------
-- Recreate, restricted to the owner's email claim
-- ---------------------------------------------------------------------------
drop policy if exists programs_owner_all        on public.programs;
drop policy if exists sessions_owner_all        on public.sessions;
drop policy if exists session_sets_owner_all    on public.session_sets;
drop policy if exists body_weight_owner_all     on public.body_weight;
drop policy if exists prs_owner_all             on public.prs;
drop policy if exists athlete_profile_owner_all on public.athlete_profile;

create policy programs_owner_all on public.programs
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com');

create policy sessions_owner_all on public.sessions
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com');

create policy session_sets_owner_all on public.session_sets
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com');

create policy body_weight_owner_all on public.body_weight
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com');

create policy prs_owner_all on public.prs
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com');

create policy athlete_profile_owner_all on public.athlete_profile
  for all to authenticated
  using      ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jchriscole@gmail.com');
