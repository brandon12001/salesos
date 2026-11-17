-- Real database regression checks. Synthetic identities and data are rolled back.
begin;
select set_config('salesos.test_user_a',gen_random_uuid()::text,true);
select set_config('salesos.test_user_b',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
 (current_setting('salesos.test_user_a')::uuid,'salesos-rls-a-'||current_setting('salesos.test_user_a')||'@example.invalid'),
 (current_setting('salesos.test_user_b')::uuid,'salesos-rls-b-'||current_setting('salesos.test_user_b')||'@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('salesos.test_user_a'),true);
do $$
declare receipt jsonb; doc jsonb := '{"version":3,"leads":[],"tasks":[],"activities":[],"test":"first"}';
begin
 receipt:=public.salesos_save_workspace(doc,0);
 if (receipt->>'revision')::bigint<>1 then raise exception 'First save failed'; end if;
 receipt:=public.salesos_save_workspace(doc,0);
 if (receipt->>'revision')::bigint<>1 then raise exception 'Retry duplicated a write'; end if;
 receipt:=public.salesos_save_workspace(doc||'{"test":"second"}',1);
 if (receipt->>'revision')::bigint<>2 then raise exception 'Revision did not advance'; end if;
 begin
  perform public.salesos_save_workspace(doc||'{"test":"stale overwrite"}',1);
  raise exception 'Stale write was accepted';
 exception when serialization_failure or sqlstate 'PT409' then null;
 end;
 if (select payload->>'test' from public.salesos_workspaces where user_id=auth.uid())<>'second' then raise exception 'Stale data replaced newer data'; end if;
 insert into public.salesos_snapshots(user_id,payload) values(auth.uid(),doc);
end;
$$;
select set_config('request.jwt.claim.sub',current_setting('salesos.test_user_b'),true);
do $$
declare affected bigint;
begin
 if (select count(*) from public.salesos_workspaces)<>0 then raise exception 'Cross-user read allowed'; end if;
 if (select count(*) from public.salesos_snapshots)<>0 then raise exception 'Cross-user snapshot read allowed'; end if;
 update public.salesos_workspaces set revision=revision+1 where user_id=current_setting('salesos.test_user_a')::uuid;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-user update allowed'; end if;
 begin
  insert into public.salesos_workspaces(user_id,payload,revision) values(current_setting('salesos.test_user_a')::uuid,'{"version":3,"leads":[],"tasks":[],"activities":[]}',1);
  raise exception 'Cross-user insert allowed';
 exception when insufficient_privilege then null;
 end;
 perform public.salesos_save_workspace('{"version":3,"leads":[],"tasks":[],"activities":[],"test":"user b"}',0);
 begin
  update public.salesos_workspaces set user_id=current_setting('salesos.test_user_a')::uuid where user_id=auth.uid();
  raise exception 'Workspace ownership could be reassigned';
 exception when insufficient_privilege then null;
 end;
end;
$$;
set local role anon;
do $$
begin
 begin
  perform count(*) from public.salesos_workspaces;
  raise exception 'Anonymous read allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.salesos_save_workspace('{"version":3,"leads":[],"tasks":[],"activities":[]}',0);
  raise exception 'Anonymous save allowed';
 exception when insufficient_privilege then null;
 end;
end;
$$;
rollback;
select 'PASS: account isolation, anonymous rejection, atomic revisions, stale-write rejection and idempotent retry; all test data rolled back' as result;
