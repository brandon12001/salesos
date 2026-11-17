-- Account-scoped versioned JSON workspace, preserving the SalesOS v3 document.
create table public.salesos_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (
  jsonb_typeof(payload) = 'object' and payload ?& array['version','leads','tasks','activities']
  and payload->>'version' = '3'
  and jsonb_typeof(payload->'leads') = 'array'
  and jsonb_typeof(payload->'tasks') = 'array'
  and jsonb_typeof(payload->'activities') = 'array'
 ),
 revision bigint not null check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.salesos_workspaces enable row level security;
revoke all on public.salesos_workspaces from public, anon, authenticated;
grant select, insert, update on public.salesos_workspaces to authenticated;
create policy "read own workspace" on public.salesos_workspaces for select to authenticated
 using ((select auth.uid())=user_id);
create policy "create own workspace" on public.salesos_workspaces for insert to authenticated
 with check ((select auth.uid())=user_id);
create policy "update own workspace" on public.salesos_workspaces for update to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- SECURITY INVOKER keeps RLS active. Serialise writes, including the first save.
create function public.salesos_save_workspace(document jsonb, expected_revision bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 owner_id uuid := auth.uid();
 stored public.salesos_workspaces%rowtype;
 next_revision bigint;
 saved_at timestamptz;
begin
 if owner_id is null then raise exception 'Sign in before saving' using errcode='42501'; end if;
 if expected_revision is null or expected_revision < 0 then raise exception 'Invalid revision' using errcode='22023'; end if;
 if jsonb_typeof(document) is distinct from 'object'
  or document->>'version' is distinct from '3'
  or jsonb_typeof(document->'leads') is distinct from 'array'
  or jsonb_typeof(document->'tasks') is distinct from 'array'
  or jsonb_typeof(document->'activities') is distinct from 'array'
 then raise exception 'Invalid SalesOS document' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
 select * into stored from public.salesos_workspaces where user_id=owner_id for update;
 if found then
  -- A lost response can be retried without creating a false conflict or duplicate write.
  if stored.payload=document then return jsonb_build_object('revision',stored.revision,'updated_at',stored.updated_at); end if;
  if stored.revision<>expected_revision then raise exception 'Cloud revision conflict' using errcode='40001'; end if;
  update public.salesos_workspaces set payload=document,revision=stored.revision+1,updated_at=clock_timestamp()
   where user_id=owner_id returning revision,updated_at into next_revision,saved_at;
 else
  if expected_revision<>0 then raise exception 'Cloud revision conflict' using errcode='40001'; end if;
  insert into public.salesos_workspaces(user_id,payload,revision) values(owner_id,document,1)
   returning revision,updated_at into next_revision,saved_at;
 end if;
 return jsonb_build_object('revision',next_revision,'updated_at',saved_at);
end;
$$;
revoke all on function public.salesos_save_workspace(jsonb,bigint) from public, anon;
grant execute on function public.salesos_save_workspace(jsonb,bigint) to authenticated;
