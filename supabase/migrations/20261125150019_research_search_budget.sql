-- Separate provider-key budget; never modifies a workspace or sales history.
create schema if not exists salesos_research_private;
revoke all on schema salesos_research_private from public,anon;
grant usage on schema salesos_research_private to authenticated;
create table salesos_research_private.search_budget (
 singleton boolean primary key default true check(singleton),
 owner_id uuid not null references auth.users(id),
 allocated bigint not null default 0 check(allocated>=0),
 ceiling bigint not null default 0 check(ceiling>=allocated),
 stop_on date,
 revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default now()
);
alter table salesos_research_private.search_budget enable row level security;
create policy no_direct_client_access on salesos_research_private.search_budget to authenticated using(false) with check(false);
revoke all on salesos_research_private.search_budget from public,anon,authenticated;
-- Provision the intended account separately as administrator, with zero allowance.
-- No authenticated user may claim ownership or directly edit/reset this ledger.
create function salesos_research_private.manage_search_budget(action text,amount integer,stop_date date,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 owner uuid := auth.uid();
 b salesos_research_private.search_budget%rowtype;
 remaining integer := 0;
 granted integer := 0;
 today date := (clock_timestamp() at time zone 'UTC')::date;
begin
 if owner is null then raise exception 'Sign in first' using errcode='42501'; end if;
 if action is null or action not in ('status','configure','reserve') then raise exception 'Invalid action' using errcode='22023'; end if;
 -- Short row lock: no network requests are performed in this transaction.
 select * into b from salesos_research_private.search_budget where singleton and owner_id=owner for update;
 if not found then
  if action<>'status' then raise exception 'Search budget is not provisioned for this account' using errcode='42501'; end if;
  return jsonb_build_object('configured',false,'remaining',0,'allocated',0,'revision',0,'stopOn',null,'expired',false,'granted',0);
 end if;
 if action='configure' then
  if expected_revision is null or expected_revision<>b.revision then raise exception 'Budget changed; refresh before confirming allowance' using errcode='PT409'; end if;
  if amount is null or amount<0 or amount>1000 or stop_date is null or stop_date<=today or stop_date>today+366 then raise exception 'Confirm 0-1000 remaining searches and a future stop date within one year' using errcode='22023'; end if;
  update salesos_research_private.search_budget set ceiling=allocated+amount,stop_on=stop_date,revision=revision+1,updated_at=clock_timestamp() where singleton returning * into b;
 elsif action='reserve' then
  if amount is null or amount<2 or amount>8 or amount%2<>0 then raise exception 'Reserve 2-8 searches in pairs' using errcode='22023'; end if;
  if b.stop_on>today then granted:=least(amount,((b.ceiling-b.allocated)/2)::integer*2); end if;
  if granted>0 then
   update salesos_research_private.search_budget set allocated=allocated+granted,revision=revision+1,updated_at=clock_timestamp() where singleton returning * into b;
  end if;
 end if;
 if b.stop_on>today then remaining:=(b.ceiling-b.allocated)::integer; end if;
 return jsonb_build_object('configured',true,'remaining',remaining,'allocated',b.allocated,'revision',b.revision,'stopOn',b.stop_on,'expired',coalesce(b.stop_on<=today,false),'granted',granted);
end;
$$;
revoke all on function salesos_research_private.manage_search_budget(text,integer,date,bigint) from public,anon;
grant execute on function salesos_research_private.manage_search_budget(text,integer,date,bigint) to authenticated;
-- Public RPC is an invoker wrapper; privileged work is private, owner-checked,
-- fixed-search-path and has no direct table grants or caller-supplied owner ID.
create function public.salesos_search_budget(action text default 'status',amount integer default 0,stop_date date default null,expected_revision bigint default null)
returns jsonb language sql security invoker set search_path='' as $$
 select salesos_research_private.manage_search_budget(action,amount,stop_date,expected_revision);
$$;
revoke all on function public.salesos_search_budget(text,integer,date,bigint) from public,anon;
grant execute on function public.salesos_search_budget(text,integer,date,bigint) to authenticated;
notify pgrst, 'reload schema';
