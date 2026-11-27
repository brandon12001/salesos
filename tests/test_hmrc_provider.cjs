const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hmrc-provider-'));const build=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--rootDir','.','--outDir',dir,'server/freeCompanyContext.ts'],{encoding:'utf8'});if(build.status)throw Error(build.stdout||build.stderr);
const provider=require(path.join(dir,'server/hmrcProvider.js')),lib=require(path.join(dir,'server/freeCompanyContext.js')),native=fetch;
(async()=>{try{
 let now=1000,waiting=[];const gate=provider.createHMRCGate({now:()=>now,wait:ms=>new Promise(resolve=>waiting.push({at:now+ms,resolve}))}),starts=[];
 const requests=Array.from({length:20},(_,i)=>gate.enter().then(()=>starts.push(now)));
 await Promise.resolve();while(waiting.length){waiting.sort((a,b)=>a.at-b.at);const next=waiting.shift();now=next.at;next.resolve();await Promise.resolve();await Promise.resolve()}await Promise.all(requests);
 assert.equal(starts.length,20);for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]>=1250);assert.ok(starts.filter(t=>t<61000).length<=48);
 const pending=gate.enter();gate.coolDown();await assert.rejects(()=>gate.enter(),/cooling down/);while(waiting.length){const next=waiting.shift();now=next.at;next.resolve()}await assert.rejects(()=>pending,/cooling down/);now+=60000;await gate.enter();
 const busy=provider.createHMRCGate({now:()=>0,wait:()=>new Promise(()=>{})});for(let i=0;i<25;i++)void busy.enter();await assert.rejects(()=>busy.enter(),/queue is busy/);
 let entries=0,cooldowns=0,calls=0,statuses=[],errors=[];provider.hmrcGate.enter=async()=>{entries++};provider.hmrcGate.coolDown=()=>{cooldowns++};
 global.fetch=async()=>{calls++;if(errors.length)throw errors.shift();const status=statuses.shift()??200;return {ok:status===200,status,json:async()=>({value:[]})}};
 statuses=[503,200];await lib.freeGet('https://api.uktradeinfo.com/Trader(1)');assert.equal(calls,2);
 statuses=[502,504];calls=0;await assert.rejects(()=>lib.freeGet('https://api.uktradeinfo.com/Trader(1)'),/Provider unavailable/);assert.equal(calls,2,'only one transient retry');
 for(const status of [403,429]){statuses=[status];calls=0;await assert.rejects(()=>lib.freeGet('https://api.uktradeinfo.com/Trader(1)'),/no automatic retry/);assert.equal(calls,1)}assert.equal(cooldowns,2);
 errors=[new TypeError('network')];statuses=[200];calls=0;await lib.freeGet('https://api.uktradeinfo.com/Trader(1)');assert.equal(calls,2);
 errors=[new Error('invalid client setup')];calls=0;await assert.rejects(()=>lib.freeGet('https://api.uktradeinfo.com/Trader(1)'));assert.equal(calls,1);
 statuses=[503];calls=0;const prior=entries;await assert.rejects(()=>lib.freeGet('https://api.gleif.org/api/v1/lei-records'));assert.equal(calls,1);assert.equal(entries,prior,'GLEIF and paid providers are outside HMRC retry/pacing policy');
 console.log('PASS: queued HMRC requests respect 48/min worker pacing, cooldown cancels queued calls, queue length is bounded; one transient free-data retry and no rejection/paid-provider retries');
}finally{global.fetch=native;fs.rmSync(dir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});

