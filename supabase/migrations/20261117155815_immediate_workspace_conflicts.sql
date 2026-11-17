-- Return application conflicts as HTTP 409, not retryable SQL serialization failures.
-- Preserves payloads, revision checks, RLS, SECURITY INVOKER and existing grants.
create or replace function public.salesos_save_workspace(document jsonb, expected_revision bigint)
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
  if stored.revision<>expected_revision then raise exception 'Cloud revision conflict' using errcode='PT409'; end if;
  update public.salesos_workspaces set payload=document,revision=stored.revision+1,updated_at=clock_timestamp()
   where user_id=owner_id returning revision,updated_at into next_revision,saved_at;
 else
  if expected_revision<>0 then raise exception 'Cloud revision conflict' using errcode='PT409'; end if;
  insert into public.salesos_workspaces(user_id,payload,revision) values(owner_id,document,1)
   returning revision,updated_at into next_revision,saved_at;
 end if;
 return jsonb_build_object('revision',next_revision,'updated_at',saved_at);
end;
$$;
revoke all on function public.salesos_save_workspace(jsonb,bigint) from public, anon;
grant execute on function public.salesos_save_workspace(jsonb,bigint) to authenticated;
