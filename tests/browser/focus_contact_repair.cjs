// Fictional records only. Focus filtering must not mutate or complete repairs.
const assert=require('node:assert/strict');
module.exports=async({a,saved,state,restore,nav,core})=>{
 const fresh=mode=>{const s=core.newState();s.settings={...s.settings,intelligenceMode:mode,intelligenceWorkStart:0,intelligenceWorkEnd:1440,intelligenceWorkDays:127,coldCallMode:0,kpiFirstMode:0,reserveAutoActivate:0};return s};
 const make=(s,company,phone)=>core.createLead(s,{company,contact:'Fictional Finance Director',title:'CFO',mobile:phone,email:'',crmClearance:'cleared',crmCheckedAt:core.today()});
 for(const mode of [0,1,2]){
  const s=fresh(mode),broken=make(s,'Fictional Contact Repair Only Ltd',''),callable=make(s,'Fictional Ready To Call Ltd','07700900123');
  const repair=s.tasks.find(t=>t.leadId===broken.id&&t.type==='research');assert.ok(repair);
  await restore(a,s);const before=await state(a);await nav(a,'Focus Mode');await a.getByRole('button',{name:'Return to current recommended task',exact:true}).click();
  await a.locator('.focus-who').filter({hasText:callable.company}).waitFor();assert.equal(await a.getByRole('heading',{name:repair.title,exact:true}).count(),0);
  await a.getByRole('region',{name:'Focus work queues'}).getByRole('button',{name:'Standard: 1 eligible actions',exact:true}).waitFor();
  await a.getByRole('button',{name:'Copy number',exact:true}).click();
  const after=await state(a);for(const key of ['leads','tasks','activities','settings'])assert.deepEqual(after[key],before[key],key+' unchanged by filtering/copy in mode '+mode);
  const only=fresh(mode),lead=make(only,'Fictional Contact Repair Alone Ltd',''),pending=only.tasks.find(t=>t.leadId===lead.id&&t.type==='research');
  await restore(a,only);const onlyBefore=await state(a);await nav(a,'Focus Mode');await a.getByRole('button',{name:'Return to current recommended task',exact:true}).click();
  assert.equal(await a.locator('.focus-card[data-task-id]').count(),0,'research-only work produces an honest empty Focus in mode '+mode);
  await a.getByRole('region',{name:'Focus work queues'}).getByRole('button',{name:'Standard: 0 eligible actions',exact:true}).waitFor();
  await nav(a,'Contact Resolution');const row=a.getByRole('row').filter({has:a.getByText(pending.title,{exact:true})});await row.waitFor();await row.getByRole('button',{name:'Open',exact:true}).click();
  const dialog=a.getByRole('dialog',{name:'Log outcome',exact:true});await dialog.getByRole('heading',{name:'Resolve contact',exact:true}).waitFor();await dialog.getByRole('button',{name:'Close',exact:true}).click();
  assert.equal((await state(a)).tasks.find(t=>t.id===pending.id).status,'pending');assert.deepEqual((await state(a)).activities,onlyBefore.activities);
 }
 console.log('PASS: routine contact research stays out of Focus/queue counts in shadow/enabled/off modes; repair-only empty state, contact-resolution dialog, pending data/history and copying preserved.');
};
