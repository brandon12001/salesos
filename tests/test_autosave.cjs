const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const core=require('./core.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-sync-'));
const compile=cp.spawnSync(process.execPath,[path.resolve('node_modules/typescript/bin/tsc'),'--target','es2022','--module','commonjs','--skipLibCheck','--outDir',tmp,'--rootDir','src','src/lib/autosave.ts','src/lib/workspaceStore.ts','src/lib/workspaceSafety.ts','src/types.ts'],{encoding:'utf8'});
if(compile.status!==0)throw Error(compile.stdout||compile.stderr);
const {Autosave,RevisionConflict}=require(path.join(tmp,'lib/autosave.js'));
const {workspaceStore,accountKey}=require(path.join(tmp,'lib/workspaceStore.js'));
const {protectCloudReplacement}=require(path.join(tmp,'lib/workspaceSafety.js'));
const clone=x=>structuredClone(x);
const all=[];
function memory(){const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),data}}
function server(document=core.newState()){
 let record=document?{document:clone(document),revision:1,updatedAt:new Date().toISOString()}:null;
 const api={loads:0,writes:0,failed:false,
  load:async()=>{api.loads++;if(api.failed)throw Error('offline');return clone(record)},
  save:async(document,revision)=>{
   if(api.failed)throw Error('offline');
   if(record&&JSON.stringify(record.document)===JSON.stringify(document))return {revision:record.revision,updatedAt:record.updatedAt};
   if((record?.revision||0)!==revision)throw new RevisionConflict();
   api.writes++;record={document:clone(document),revision:revision+1,updatedAt:new Date().toISOString()};
   return {revision:record.revision,updatedAt:record.updatedAt};
  },get:()=>clone(record)};return api;
}
function engine(remote,storage=memory(),userId='account-a',guest=null){
 const instance=new Autosave({userId,empty:core.newState(),guest,remote,store:workspaceStore(storage,userId),validate:x=>{assert.equal(x.version,3);return x},delay:60000,protectReplacement:protectCloudReplacement});
 all.push(instance);return instance;
}
function edit(instance,label){const doc=clone(instance.getSnapshot().document);doc.meta.test=label;instance.change(doc);return doc}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
(async()=>{try{
 // Empty account, coalescing and exact document preservation.
 const remote=server(null),storage=memory(),a=engine(remote,storage);
 await a.start();assert.equal(a.getSnapshot().ready,true);await a.flush();assert.equal(remote.get().revision,1);
 edit(a,'first');edit(a,'second');await a.flush();assert.equal(remote.writes,2);assert.equal(remote.get().document.meta.test,'second');assert.equal(a.getSnapshot().dirty,false);
 // A second change during a request stays queued; its base revision advances safely.
 const gate=deferred(),originalSave=remote.save;
 remote.save=async(doc,revision)=>{await gate.promise;return originalSave(doc,revision)};
 edit(a,'in flight');const flight=a.flush();edit(a,'newer edit');gate.resolve();await flight;
 assert.equal(a.getSnapshot().dirty,true);assert.equal(a.getSnapshot().document.meta.test,'newer edit');
 remote.save=originalSave;await a.flush();assert.equal(remote.get().document.meta.test,'newer edit');
 // Offline edit survives a full controller restart and retries on reconnect.
 a.setOnline(false);edit(a,'offline edit');assert.equal(a.getSnapshot().status,'offline');a.stop();
 const resumed=engine(remote,storage);await resumed.start(false);assert.equal(resumed.getSnapshot().document.meta.test,'offline edit');assert.equal(resumed.getSnapshot().ready,true);
 await resumed.start(true);await resumed.flush();assert.equal(remote.get().document.meta.test,'offline edit');
 // A successful remote write with a lost response is recovered without duplication.
 const save=remote.save;remote.save=async(doc,revision)=>{await save(doc,revision);throw Error('response lost')};
 edit(resumed,'lost response');await resumed.flush();assert.equal(resumed.getSnapshot().dirty,true);
 remote.save=save;const writes=remote.writes;await resumed.reconcile();assert.equal(resumed.getSnapshot().dirty,false);assert.equal(remote.writes,writes);

 // Postgres JSONB can reorder object keys; a lost response is still acknowledged safely.
 const unordered=server(),unorderedStore=memory(),unorderedClient=engine(unordered,unorderedStore);
 await unorderedClient.start();const unorderedSave=unordered.save;
 unordered.save=async(doc,revision)=>{await unorderedSave(doc,revision);throw Error('response lost')};
 edit(unorderedClient,'jsonb order');await unorderedClient.flush();
 const unorderedLoad=unordered.load;
 unordered.load=async()=>{const record=await unorderedLoad();record.document=Object.fromEntries(Object.entries(record.document).reverse());record.document.settings=Object.fromEntries(Object.entries(record.document.settings).reverse());return record};
 await unorderedClient.reconcile();assert.equal(unorderedClient.getSnapshot().dirty,false);assert.equal(unorderedClient.getSnapshot().status,'saved');
 // Competing sessions never silently overwrite one another.
 const shared=server(),leftStore=memory(),rightStore=memory(),left=engine(shared,leftStore),right=engine(shared,rightStore);
 await left.start();await right.start();edit(left,'left');edit(right,'right');await left.flush();await right.flush();
 assert.equal(right.getSnapshot().status,'conflict');assert.equal(right.getSnapshot().document.meta.test,'right');assert.equal(shared.get().document.meta.test,'left');
 assert.throws(()=>edit(right,'cannot edit while conflicted'));
 right.stop();const reopened=engine(shared,rightStore);await reopened.start();assert.equal(reopened.getSnapshot().status,'conflict');assert.equal(reopened.getSnapshot().document.meta.test,'right');
 await reopened.useCloudVersion();assert.equal(reopened.getSnapshot().document.meta.test,'left');
 assert.equal(JSON.parse(rightStore.getItem(accountKey('account-a')+'.recovery')).document.meta.test,'right');
 // Clean clients pull new remote data, while a local edit during a refresh is kept.
 const fresh=engine(shared);await fresh.start();edit(left,'external update');await left.flush();await fresh.reconcile();assert.equal(fresh.getSnapshot().document.meta.test,'external update');
 const loadGate=deferred(),load=shared.load;shared.load=()=>loadGate.promise;
 const refreshing=fresh.reconcile();edit(fresh,'typed while pulling');edit(left,'another external');await left.flush();loadGate.resolve(shared.get());await refreshing;
 assert.equal(fresh.getSnapshot().status,'conflict');assert.equal(fresh.getSnapshot().document.meta.test,'typed while pulling');shared.load=load;
 // First sign-in never uploads guest records until migration is explicitly chosen.
 const guest=core.newState();const prospect=core.createLead(guest,{company:'FICTIONAL Migration',contact:'Test CFO',mobile:'07700900111'});prospect.nurtureUntil='2030-01-01';guest.suppression.push({scope:'company',company:'fictional suppressed'});
 const migrationServer=server(null),migrationStore=memory(),migration=engine(migrationServer,migrationStore,'account-a',guest);
 await migration.start();assert.equal(migration.getSnapshot().status,'migration');assert.equal(migrationServer.writes,0);
 migration.importBrowserRecords(true);await migration.flush();assert.deepEqual(migrationServer.get().document,clone(guest));assert.equal(migration.getSnapshot().document.leads[0].nurtureUntil,'2030-01-01');
 assert.equal(JSON.parse(migrationStore.getItem(accountKey('account-a')+'.recovery')).document.leads.length,1);
 const existing=engine(shared,memory(),'account-a',guest);await existing.start();assert.equal(existing.getSnapshot().document.meta.test,'another external');assert.equal(existing.guest.leads.length,1);
 // Conflict recovery is conservative about local opt-outs and missing promises.
 const protectedLocal=clone(guest),protectedRemote=clone(guest);
 protectedLocal.suppression.push({scope:'company',company:'fictional new optout'});
 assert.throws(()=>protectCloudReplacement(protectedLocal,protectedRemote),/opt-out/);
 protectedRemote.suppression=clone(protectedLocal.suppression);
 core.scheduleCallback(protectedLocal,protectedLocal.leads[0],core.businessAdd(core.today(),1),'10:30','Promised callback');
 assert.throws(()=>protectCloudReplacement(protectedLocal,protectedRemote),/commitment/);
 protectedRemote.tasks=clone(protectedLocal.tasks);
 assert.doesNotThrow(()=>protectCloudReplacement(protectedLocal,protectedRemote));
 // Accounts have separate local caches; invalid ownership and corrupt data fail closed.
 const accounts=memory(),storeA=workspaceStore(accounts,'one'),storeB=workspaceStore(accounts,'two');
 storeA.write({version:1,userId:'one',document:guest,revision:1,dirty:true});assert.equal(storeB.read(),null);
 assert.throws(()=>storeB.write(storeA.read()));
 accounts.setItem(accountKey('broken'),'{not JSON');const broken=engine(shared,accounts,'broken');await broken.start();assert.equal(broken.getSnapshot().ready,false);assert.equal(broken.getSnapshot().status,'error');assert.equal(accounts.getItem(accountKey('broken')),'{not JSON');
 // Storage failure blocks the user action before either UI or cloud can advance.
 const quotaStore=memory(),quota=engine(shared,quotaStore);await quota.start();const before=quota.getSnapshot().document;
 quotaStore.setItem=()=>{throw Error('quota exceeded')};assert.throws(()=>edit(quota,'must not save'));assert.equal(quota.getSnapshot().document,before);
 // Offline first use cannot create an empty replacement for unknown cloud records.
 const unknown=engine(shared);await unknown.start(false);assert.equal(unknown.getSnapshot().ready,false);assert.throws(()=>edit(unknown,'blocked'));
 // A disposed account ignores in-flight responses, preserving its durable outbox.
 const stopServer=server(),stopStore=memory(),stopped=engine(stopServer,stopStore);await stopped.start();edit(stopped,'pending sign-out');
 const stopGate=deferred(),stopSave=stopServer.save;stopServer.save=async(doc,revision)=>{await stopGate.promise;return stopSave(doc,revision)};
 const saving=stopped.flush();stopped.stop();stopGate.resolve();await saving;
 assert.equal(JSON.parse(stopStore.getItem(accountKey('account-a'))).dirty,true);
 const signedBackIn=engine(stopServer,stopStore);await signedBackIn.start();assert.equal(signedBackIn.getSnapshot().dirty,false);
 console.log('AUTOSAVE PASS: coalescing, in-flight edits, offline recovery, lost responses, two-session conflicts, explicit migration, account isolation, quota failures and sign-out safety');
}finally{for(const instance of all)instance.stop();fs.rmSync(tmp,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
