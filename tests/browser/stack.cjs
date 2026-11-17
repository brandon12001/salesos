// Ephemeral localhost-only test stack. No production credentials or data.
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const compose=['compose','-f',path.join(__dirname,'compose.yml')];
const jwtSecret='salesos-isolated-test-jwt-secret-at-least-thirty-two-characters';
function jwt(role){const data=[{alg:'HS256',typ:'JWT'},{role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');return data+'.'+crypto.createHmac('sha256',jwtSecret).update(data).digest('base64url')}
function docker(args,options={}){return cp.execFileSync('docker',[...compose,...args],{encoding:'utf8',stdio:['pipe','pipe','pipe'],...options})}
async function poll(fn,timeout=45000){const end=Date.now()+timeout;let error;do{try{const v=await fn();if(v)return v}catch(e){error=e}await new Promise(r=>setTimeout(r,200))}while(Date.now()<end);throw error||Error('Test service readiness timed out')}
function sql(query){return docker(['exec','-T','db','psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input:query})}
async function start(){
 console.log('Starting disposable localhost Auth/Postgres/REST/mail stack');
 // Only this fixed test compose project is reset; it contains fictional data.
 docker(['down','-v','--remove-orphans']);
 docker(['up','-d','db','mail']);
 await poll(()=>{try{return docker(['exec','-T','db','pg_isready','-h','127.0.0.1','-U','postgres']).includes('accepting')}catch{return false}});
 sql(fs.readFileSync(path.join(__dirname,'init.sql'),'utf8'));
 docker(['up','-d','auth','rest']);
 await poll(async()=> (await fetch('http://127.0.0.1:55429/health')).ok);
 sql("create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::json->>'sub')::uuid$$;\n"+fs.readFileSync(path.join(root,'db/001_salesos_snapshot.sql'),'utf8')+'\n'+fs.readFileSync(path.join(root,'db/002_cloud_autosave.sql'),'utf8'));
 for(const file of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())sql(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
 sql("notify pgrst, 'reload schema';");
 const proxy=http.createServer((req,res)=>{
  const cors={'access-control-allow-origin':'http://127.0.0.1:5273','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS'};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return}
  const auth=req.url.startsWith('/auth/v1/'),rest=req.url.startsWith('/rest/v1/');
  if(!auth&&!rest){res.writeHead(404,cors);res.end();return}
  const target=http.request({hostname:'127.0.0.1',port:auth?55429:55430,path:req.url.replace(auth?'/auth/v1':'/rest/v1',''),method:req.method,headers:{...req.headers,host:'127.0.0.1'}},upstream=>{
   res.writeHead(upstream.statusCode,{...upstream.headers,...cors});upstream.pipe(res)
  });target.on('error',()=>{res.writeHead(502,cors);res.end('{}')});req.pipe(target)
 });
 await new Promise(r=>proxy.listen(55421,'127.0.0.1',r));
 await poll(async()=> (await fetch('http://127.0.0.1:55421/rest/v1/',{headers:{Authorization:'Bearer '+jwt('anon')}})).ok);
 return {url:'http://127.0.0.1:55421',key:jwt('anon'),sql,close:async()=>{await new Promise(r=>proxy.close(r));docker(['down','-v','--remove-orphans'])}};
}
module.exports={start,poll,jwt,stop:()=>docker(['down','-v','--remove-orphans'])};
