const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-import-'));
const tsc=path.join(root,'node_modules','typescript','bin','tsc');
if(!fs.existsSync(tsc)){console.log('Install dependencies with npm install first.');process.exit(1)}
const args=[tsc,'--target','es2022','--module','commonjs','--skipLibCheck','--outDir',tmp,'--rootDir',path.join(root,'src'),path.join(root,'src/lib/importer.ts'),path.join(root,'src/lib/core.ts'),path.join(root,'src/types.ts')];
try{
  const out=cp.spawnSync(process.execPath,args,{encoding:'utf8'});
  if(out.status!==0)throw new Error(out.stderr||out.stdout||'TypeScript import compilation failed.');
  const core=require(path.join(__dirname,'core.cjs'));
  global.window={SalesCore:core};
  const {importLusha}=require(path.join(tmp,'lib','importer.js'));
  const state=core.newState();
  const csv='Company Name,First Name,Last Name,Job Title,Mobile Phone,Work Email\n"Example, Ltd",John,Smith,CFO,07700900123,john@example.example\n"Example, Ltd",Jane,Smith,FD,07700900124,jane@example.example\n';
  const first=importLusha(state,csv);
  assert.equal(first.created,1);assert.equal(first.merged,1);assert.equal(state.leads[0].readiness,1);assert.equal(state.leads[0].contacts.length,2);
  core.setReadiness(state,state.leads[0],4,'Buyer recognised a problem');
  importLusha(state,csv);assert.equal(state.leads[0].readiness,4);assert.equal(state.leads[0].contacts.length,2);
  core.changeStatus(state,state.leads[0],'Take Me Off the List','Explicit opt-out',{scope:'company',contact:state.leads[0].contacts[0]});
  importLusha(state,'Company Name,First Name,Last Name,Mobile Phone\n"Example, Ltd",Another,Person,07700900222\n');
  assert.equal(core.pending(state).filter(t=>t.leadId===state.leads[0].id).length,0);
  assert.equal(core.checkInvariants(state).length,0);
  console.log('IMPORT PASS: Lusha CSV, company/contact merges, initial Unaware, preserved readiness and opt-outs');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
