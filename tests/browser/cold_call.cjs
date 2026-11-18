const assert=require('node:assert/strict'),path=require('node:path');
// Disposable fictional accounts from the existing reliability runner only.
module.exports=async function({a,other,saved,state,restore,nav,core,artifacts}){
 const fixture=mode=>{
  const s=core.newState();s.settings={...s.settings,intelligenceMode:mode,intelligenceWorkStart:0,intelligenceWorkEnd:1440,intelligenceWorkDays:127};
  const make=company=>core.createLead(s,{company,contact:'Fictional Finance Director',mobile:'07700900711',email:'fictional@example.invalid',crmClearance:'cleared',crmCheckedAt:core.today(),readiness:1});
  make('Fictional Cold Calling A Ltd');make('Fictional Cold Calling B Ltd');const other=make('Fictional Non-call Work Ltd');s.tasks=s.tasks.filter(t=>t.leadId!==other.id);
  core.addTask(s,other,'email','Fictional queued email',core.today(),{contactId:other.contacts[0].id});core.addTask(s,other,'research','Fictional queued research',core.today());return JSON.parse(JSON.stringify(s));
 };
 for(const mode of [0,1,2]){
  const initial=fixture(mode),queued=initial.tasks.filter(t=>!['call','callback'].includes(t.type));await restore(a,initial);
  const toggle=a.getByRole('switch',{name:'Cold call mode',exact:true});await toggle.focus();await a.keyboard.press('Space');await saved(a);assert.equal(await toggle.isChecked(),true);let doc=await state(a);
  assert.deepEqual(doc.leads,initial.leads);assert.deepEqual(doc.tasks,initial.tasks);assert.deepEqual(doc.activities,initial.activities,'toggling is not outreach');assert.equal(doc.settings.coldCallMode,1);
  await nav(a,'Prospects');await nav(a,'Focus Mode');assert.equal(await toggle.isChecked(),true);await a.reload();await saved(a);assert.equal(await toggle.isChecked(),true);
  await a.getByRole('button',{name:/^No answer/}).click();await saved(a);await a.getByRole('button',{name:/^No answer/}).click();await saved(a);await a.getByText('No eligible calls due',{exact:true}).waitFor();assert.equal(await a.getByRole('button',{name:/I sent the email/}).count(),0);doc=await state(a);
  assert.equal(doc.activities.filter(x=>x.type==='Call').length,2);for(const task of queued)assert.deepEqual(doc.tasks.find(t=>t.id===task.id),task,'non-call work stays queued unchanged');assert.ok(doc.tasks.filter(t=>t.status==='pending'&&t.origin==='sequence').every(t=>t.dueAt>core.today()),'future cadence must not be pulled forward');
  await a.getByRole('button',{name:'Turn off Cold call mode',exact:true}).click();await saved(a);assert.equal(await toggle.isChecked(),false);assert.equal(await a.getByText('No eligible calls due',{exact:true}).count(),0);assert.equal((await state(a)).settings.coldCallMode,0);
 }
 console.log('PASS: Cold Call Mode on/off, keyboard, navigation/reload, strict empty queue and untouched non-call work in shadow/enabled/off modes');
 const commitments=fixture(1);commitments.settings.coldCallMode=1;const lead=commitments.leads[0],meeting=core.addTask(commitments,lead,'meeting','Fictional protected meeting',core.addDays(core.today(),-1),{isCommitment:true,dueTime:'09:00'});await restore(a,commitments);await a.getByRole('heading',{name:meeting.title,exact:true}).waitFor();assert.equal(await a.getByRole('switch',{name:'Cold call mode',exact:true}).isChecked(),true);await a.getByText('Calls only · Due promised actions and meetings still take priority.',{exact:true}).waitFor();
 const callbackOnly=fixture(1);callbackOnly.settings.coldCallMode=1;const callback=core.scheduleCallback(callbackOnly,callbackOnly.leads[0],core.today(),'00:01','Fictional promised callback',callbackOnly.leads[0].contacts[0].id);await restore(a,callbackOnly);await a.getByRole('heading',{name:callback.title,exact:true}).waitFor();
 for(const width of [320,390,768,1440]){await a.setViewportSize({width,height:844});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Cold Call Mode toolbar overflow at '+width);await a.screenshot({path:path.join(artifacts,'cold-call-'+width+'.png'),fullPage:true,animations:'disabled'})}await a.setViewportSize({width:1440,height:1000});
 // View preferences must not run replenishment, even if the user has separately enabled it.
 const auto=fixture(1);auto.settings.reserveAutoActivate=1;auto.settings.reserveIntelligentRefill=1;core.createLead(auto,{company:'Fictional Passive Reserve Ltd',contact:'Fictional FD',mobile:'07700900722',leadPool:'reserve',opportunityScore:90,researchDate:core.today(),researchRationale:'Fictional research',crmClearance:'cleared',crmCheckedAt:core.today()});await restore(a,auto);await a.getByRole('switch',{name:'Cold call mode',exact:true}).check();await saved(a);assert.deepEqual((await state(a)).leads,JSON.parse(JSON.stringify(auto.leads)),'filter preference cannot activate reserve companies');assert.deepEqual((await state(a)).activities,JSON.parse(JSON.stringify(auto.activities)));
 await other.reload();await saved(other);assert.equal(await other.getByRole('switch',{name:'Cold call mode',exact:true}).isChecked(),false,'mode belongs to its own account');
 console.log('PASS: due meetings/callbacks protected, mobile toolbar, account-scoped setting and zero replenishment side effects');
};
