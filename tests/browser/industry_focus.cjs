const assert=require('node:assert/strict');
module.exports=async function({a,saved,state,restore,nav,core}){
 function fixture(mode=2,promise=false){
  const s=core.newState();s.settings={...s.settings,intelligenceMode:mode,intelligenceWorkStart:0,intelligenceWorkEnd:1440,intelligenceWorkDays:127};
  const rec=core.createLead(s,{company:'Fictional Industry Recruiter Ltd',sector:'Technology Recruitment',contact:'Fictional Recruiter',title:'FD',mobile:'07700900121',email:'rec@example.invalid',crmClearance:'cleared',crmCheckedAt:core.today()});
  const mach=core.createLead(s,{company:'Fictional Industry Machines Ltd',sector:'Industrial Machinery',contact:'Fictional Engineer',title:'FD',mobile:'07700900122',email:'machine@example.invalid',crmClearance:'cleared',crmCheckedAt:core.today()});
  if(promise)core.scheduleCallback(s,mach,core.today(),'08:00','Explicit fictional promised callback',mach.contacts[0].id);
  core.createLead(s,{company:'Fictional Reserve Recruiter Ltd',sector:'Executive Search',contact:'Reserve Fictional',title:'FD',mobile:'07700900123',leadPool:'reserve',researchDate:core.today(),researchRationale:'Verified fictional staffing',opportunityScore:91,crmClearance:'cleared',crmCheckedAt:core.today(),crmNote:'Manually checked'});
  core.createLead(s,{company:'Fictional Reserve Machinery Ltd',sector:'Machinery distribution',contact:'Reserve Fictional',title:'FD',mobile:'07700900124',leadPool:'reserve',researchDate:core.today(),researchRationale:'Verified fictional machinery',opportunityScore:90,crmClearance:'cleared',crmCheckedAt:core.today(),crmNote:'Manually checked'});
  return s;
 }
 await restore(a,fixture());
 await nav(a,'Focus Mode');
 assert.equal(await a.getByRole('switch',{name:'Industry Focus'}).isChecked(),false,'industry is opt-in');
 const initial=await state(a);
 await a.getByRole('switch',{name:'Industry Focus'}).check();await saved(a);
 await a.locator('.focus-card .focus-who').getByText('Fictional Industry Recruiter Ltd').waitFor();
 assert.deepEqual((await state(a)).tasks,initial.tasks,'selection does not rewrite outreach tasks');
 await a.getByLabel('Focus industry').selectOption('machinery');await saved(a);
 await a.locator('.focus-card .focus-who').getByText('Fictional Industry Machines Ltd').waitFor();
 await nav(a,'Lead Reserve');
 assert.equal(await a.getByLabel('Reserve industry filter').inputValue(),'machinery','reserve opens in Focus industry');
 assert.equal(await a.locator('tbody tr').filter({hasText:'Fictional Reserve Recruiter Ltd'}).count(),0,'other sectors hidden from filtered queue');
 await a.getByRole('button',{name:'Activate top 5',exact:true}).click();await saved(a);
 let s=await state(a);
 assert.equal(s.leads.find(l=>l.company==='Fictional Reserve Machinery Ltd').leadPool,'active');
 assert.equal(s.leads.find(l=>l.company==='Fictional Reserve Recruiter Ltd').leadPool,'reserve');
 await nav(a,'Focus Mode');
 await a.getByRole('switch',{name:'Industry Focus'}).uncheck();await saved(a);
 assert.equal((await state(a)).meta.industryFocus.enabled,false);
 await restore(a,fixture(1,true));await nav(a,'Focus Mode');
 await a.getByRole('switch',{name:'Industry Focus'}).check();await saved(a);
 await a.locator('.focus-card .focus-who').getByText('Fictional Industry Machines Ltd').waitFor();
 await a.getByText('Protected commitment outside today\'s focus').waitFor();
 console.log('PASS: browser industry on/off, both engines, protected promise, filtered activation and cloud persistence');
};
