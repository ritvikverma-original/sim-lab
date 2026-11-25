-- Sim Lab account storage. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Every saved document is one row: a person's runs, run data, preferences and profile.

create table if not exists public.simlab_docs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  col        text        not null check (col in ('runs', 'rundata', 'prefs', 'profile')),
  id         text        not null,
  body       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);
create index if not exists simlab_docs_recent on public.simlab_docs (user_id, col, updated_at desc);

-- Owner accounts that may read everyone's scores. Add yourself after your first sign-in:
--   insert into public.simlab_admins (user_id)
--   select id from auth.users where email = 'you@example.com';
create table if not exists public.simlab_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.simlab_docs   enable row level security;
alter table public.simlab_admins enable row level security;

create or replace function public.simlab_is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.simlab_admins where user_id = auth.uid()) $$;

-- Each person reads and writes only their own rows.
drop policy if exists "own rows" on public.simlab_docs;
create policy "own rows" on public.simlab_docs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can read run summaries (scores, grades, dates) and profiles of everyone.
-- Full answers and drafts ('rundata') and preferences stay private to each person.
drop policy if exists "admins read summaries" on public.simlab_docs;
create policy "admins read summaries" on public.simlab_docs
  for select to authenticated
  using (public.simlab_is_admin() and col in ('runs', 'profile'));

drop policy if exists "admins see themselves" on public.simlab_admins;
create policy "admins see themselves" on public.simlab_admins
  for select to authenticated
  using (user_id = auth.uid());

-- Live updates so a second open device refreshes on its own.
do $$ begin
  alter publication supabase_realtime add table public.simlab_docs;
exception when duplicate_object then null; when undefined_object then null; end $$;
