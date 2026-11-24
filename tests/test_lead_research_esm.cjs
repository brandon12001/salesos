// Regression: Vercel runs the emitted API handler as native Node ESM.
// A bare './rule-score' import worked in CommonJS unit tests but crashed production.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-api-esm-'));
 const build=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','nodenext','--moduleResolution','nodenext','--skipLibCheck','--outDir',dir,'--rootDir','.','api/lead-research.ts'],{encoding:'utf8'});
 if(build.status)throw Error(build.stdout||build.stderr);
 // TypeScript uses the nearest package.json "type":"module" to emit ESM.
 // Ensure the import resolves in an ESM directory, even with cwd/module mismatch.
 fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({type:'module'}));
 const script=`import('./api/lead-research.js').then(async({default:handler})=>{const result={statusCode:200,setHeader(){},end(s){this.body=JSON.parse(s)}};await handler({method:'GET',headers:{}},result);if(result.statusCode!==405||result.body.error!=='Use POST.')process.exit(2);}).catch(e=>{console.error(e);process.exit(1)})`;
 const smoke=cp.spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:dir,encoding:'utf8'});
 if(smoke.status)throw Error('Vercel-style ESM boot failed:\n'+smoke.stdout+'\n'+smoke.stderr);
 console.log('PASS: compiled research function boots as native Node ESM and responds in JSON.');
})().catch(e=>{console.error(e);process.exit(1)});
