-- Optional cloud backup, NOT a substitute for an approved employer data-handling policy.
-- Run in Supabase SQL Editor. Each authenticated account can access only its own snapshot.
create table if not exists public.salesos_snapshots (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.salesos_snapshots enable row level security;
create policy "select own SalesOS snapshot" on public.salesos_snapshots
 for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own SalesOS snapshot" on public.salesos_snapshots
 for insert to authenticated with check ((select auth.uid())=user_id);
create policy "update own SalesOS snapshot" on public.salesos_snapshots
 for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- Do not use service_role keys in frontend apps.

revoke all on public.salesos_snapshots from public, anon, authenticated;
grant select, insert, update on public.salesos_snapshots to authenticated;
