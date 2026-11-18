// Cloud developer test runner. All services bind to localhost; no paid resources.
const cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const {start,stop,poll}=require('./stack.cjs');
const root=path.resolve(__dirname,'../..');let stack,app;
(async()=>{try{
 stack=await start();
 stack.sql(fs.readFileSync(path.join(root,'db/verify_cloud_autosave.sql'),'utf8'));console.log('PASS: isolated SQL RLS, anonymous denial, stale writes, idempotence and snapshots');
 const env={...process.env,VITE_SUPABASE_URL:stack.url,VITE_SUPABASE_PUBLISHABLE_KEY:stack.key};
 const vite=path.join(root,'node_modules/vite/bin/vite.js');const dev=process.argv.includes('--dev');
 if(!dev){cp.execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-b'],{cwd:root,stdio:'inherit'});cp.execFileSync(process.execPath,[vite,'build','--outDir','.test-artifacts/build'],{cwd:root,env,stdio:'inherit'})}
 app=cp.spawn(process.execPath,[vite,...(dev?[]:['preview','--outDir','.test-artifacts/build']),'--host','127.0.0.1','--port','5273','--strictPort'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 let startup='';app.stdout.on('data',x=>{startup+=x});app.stderr.on('data',x=>{startup+=x});
 await poll(async()=>{if(app.exitCode!==null)throw Error(startup);return (await fetch('http://127.0.0.1:5273')).ok});
 const result=await new Promise((resolve,reject)=>{const child=cp.spawn(process.execPath,[path.join(__dirname,'reliability.cjs')],{cwd:root,env,stdio:'inherit',timeout:360000});child.once('error',reject);child.once('exit',code=>resolve(code))});
 if(result!==0)throw Error('Browser reliability suite failed; see .test-artifacts screenshots');
 console.log('PASS: '+(dev?'development Strict Mode':'production bundle')+' reliability suite');
}catch(e){console.error(e.message);process.exitCode=1}finally{app?.kill();if(stack)await stack.close();else stop()}})();
