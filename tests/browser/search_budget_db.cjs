// Actual local Postgres permission, conflict and competing-session tests.
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
module.exports=async stack=>{
 const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 stack.sql(`insert into auth.users(id,email) values('${owner}','fictional-budget-owner@example.invalid'),('${other}','fictional-budget-other@example.invalid');insert into salesos_research_private.search_budget(owner_id) values('${owner}');`);
 const auth=(id,q)=>`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);${q};commit;`;
 try{
  let v=stack.sql(auth(owner,"select public.salesos_search_budget('status')"));assert.match(v,/"remaining": 0/);
  stack.sql(auth(owner,`do $$declare b jsonb;begin
   b:=public.salesos_search_budget('configure',6,current_date+1,0);
   if (b->>'remaining')::int<>6 then raise exception 'Confirmation failed';end if;
   begin perform public.salesos_search_budget('configure',100,current_date+1,0);raise exception 'Stale allowance accepted';exception when sqlstate 'PT409' then null;end;
   begin perform public.salesos_search_budget('configure',1001,current_date+1,1);raise exception 'Invalid cap accepted';exception when sqlstate '22023' then null;end;
   begin update salesos_research_private.search_budget set allocated=0;raise exception 'Direct counter reset allowed';exception when insufficient_privilege then null;end;
  end$$`));
  stack.sql(auth(other,`do $$declare b jsonb;begin
   b:=public.salesos_search_budget('status');if (b->>'configured')::boolean then raise exception 'Other account read budget';end if;
   begin perform public.salesos_search_budget('reserve',2);raise exception 'Other account spent budget';exception when insufficient_privilege then null;end;
   begin perform public.salesos_search_budget('configure',100,current_date+1,1);raise exception 'Other account edited budget';exception when insufficient_privilege then null;end;
  end$$`));
  stack.sql(`begin;set local role anon;do $$begin begin perform public.salesos_search_budget('status');raise exception 'Anonymous budget access';exception when insufficient_privilege then null;end;end$$;rollback;`);
  const reserve=()=>new Promise((resolve,reject)=>{
   const p=cp.spawn('docker',['compose','-f',path.join(__dirname,'compose.yml'),'exec','-T','db','psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.once('error',reject);p.once('exit',code=>code?reject(Error(err)):resolve(out));p.stdin.end(auth(owner,"select public.salesos_search_budget('reserve',2)->>'granted'"));
  });
  const competing=await Promise.all(Array.from({length:10},reserve));
  assert.equal(competing.filter(v=>v.split('\n').includes('2')).length,3,'ten sessions cannot spend beyond six allocated requests');
  assert.equal(stack.sql('select allocated from salesos_research_private.search_budget').trim(),'6');
  stack.sql(auth(owner,`do $$declare b jsonb;begin
   b:=public.salesos_search_budget('configure',3,current_date+1,(public.salesos_search_budget('status')->>'revision')::bigint);
   b:=public.salesos_search_budget('reserve',8);if (b->>'granted')::int<>2 or (b->>'remaining')::int<>1 then raise exception 'Partial pair funding failed';end if;
   b:=public.salesos_search_budget('reserve',2);if (b->>'granted')::int<>0 then raise exception 'Single request funded an incomplete company';end if;
  end$$`));
  stack.sql("update salesos_research_private.search_budget set stop_on=current_date,ceiling=allocated+100;");
  v=stack.sql(auth(owner,"select public.salesos_search_budget('reserve',8)"));assert.match(v,/"granted": 0/);assert.match(v,/"expired": true/);
  assert.equal(stack.sql('select allocated from salesos_research_private.search_budget').trim(),'8','expiry never resets or spends the counter');
  console.log('PASS: real Postgres search budget permissions, stale-edit conflicts, cap/expiry, anonymous/account isolation and ten competing sessions.');
 }finally{stack.sql(`delete from salesos_research_private.search_budget;delete from auth.users where id in ('${owner}','${other}');`)}
};
