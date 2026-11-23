const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-rules-'));
const r=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','.','api/rule-score.ts'],{encoding:'utf8'});
if(r.status)throw Error(r.stdout||r.stderr);
const {ruleScore}=require(path.join(dir,'api/rule-score.js'));
const hit=(url,title,description)=>({url,title,description});
const company='Fictional Global Staffing Ltd';
let result=ruleScore(company,'recruitment',55,[]);
assert.equal(result.priority,55);assert.equal(result.researchMethod,'registry-only');assert.equal(result.signals.length,0);
result=ruleScore(company,'recruitment',55,[hit('https://facebook.com/example','Fictional Global Staffing','International contractor payroll')]);
assert.equal(result.priority,55,'social directories cannot establish evidence');
result=ruleScore(company,'recruitment',55,[hit('https://other.example/','Another Agency','International contractor payroll global')]);
assert.equal(result.priority,55,'unrelated company snippet ignored');
result=ruleScore(company,'recruitment',55,[hit('https://site-one.example/about','Fictional Global Staffing','We operate international contractor payroll in 20 countries.')]);
assert.equal(result.priority,66,'one matching source earns a modest increase');
assert.equal(result.researchConfidence,'Low','one signal is not independently corroborated');
result=ruleScore(company,'recruitment',55,[
 hit('https://site-one.example/about','Fictional Global Staffing','International contractor payroll and operations in multiple countries.'),
 hit('https://site-two.example/services','Fictional Global Staffing Ltd','Our cross-border contractor payments are provided globally.')
]);
assert.equal(result.priority,79,'two domains with strong relevant text receive more points');
assert.equal(result.researchConfidence,'Medium');
assert.equal(result.signals.filter(s=>s.strength==='strong').length,2);
result=ruleScore(company,'recruitment',55,[hit('https://site-one.example/','Fictional Global Staffing','Recruit overseas nurses for UK hospitals; visa sponsorship provided.')]);
assert.equal(result.priority,55,'overseas candidates alone do not demonstrate cross-border payments');
result=ruleScore('Fictional Machine Importers Ltd','goods',59,[hit('https://machine.example/about','Fictional Machine Importers','We import industrial machinery and equipment from Germany and Italy.')]);
assert.ok(result.priority>59&&result.priority<=75);
assert.throws(()=>ruleScore(company,'recruitment',100,[]),/registry score/);
console.log('PASS: no-AI rules rank verified context conservatively, reject unrelated/weak snippets, require independent hosts for high priority, preserve registry-only fallback.');
