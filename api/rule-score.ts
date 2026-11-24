/**
 * Deterministic, deliberately conservative FX signal screener.
 * Search snippets are leads for investigation, never confirmed FX transactions.
 * Registry-only screening is always capped at 65.
 */
export type Sector='recruitment'|'goods';
export type Signal={label:string;sourceUrl:string;excerpt:string;strength:'strong'|'supporting'};
export type SearchHit={title:string;description:string;url:string;extra_snippets?:string[]};
export type RuleResult={priority:number;signals:Signal[];reason:string;researchMethod:'registry-only'|'web-rule-screen';researchConfidence:'Low'|'Medium'};

const BLOCKED_HOSTS=['linkedin.com','facebook.com','instagram.com','twitter.com','x.com','companieshouse.gov.uk','company-information.service.gov.uk','gov.uk','glassdoor.com','indeed.com','checkcompany.co.uk','companycheck.co.uk','yell.com','192.com','endole.co.uk','find-and-update.company-information.service.gov.uk'];
const strip=(s:string)=>s.toLowerCase().replace(/\b(limited|ltd|plc|the|uk|group)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const hostOf=(u:string)=>{try{const parsed=new URL(u);return parsed.protocol==='https:'?parsed.hostname.toLowerCase().replace(/^www\./,''):''}catch{return ''}};
const rootName=(name:string)=>strip(name).split(' ').filter(w=>w.length>=3).slice(0,3);
function companyRelevant(name:string,hit:SearchHit){
 const text=strip((hit.title||'')+' '+(hit.description||'')),parts=rootName(name);
 if(parts.length===0)return false;
 const words=parts.filter(w=>text.split(' ').includes(w));
 // Exact company phrase (with legal suffix ignored) or two distinctive tokens.
 return words.length>=Math.min(2,parts.length)&&words.length>=1;
}
const RULES:Record<Sector,Array<{label:string;pattern:RegExp;strength:'strong'|'supporting'}>>={
 recruitment:[
  {label:'Overseas contractor payroll',pattern:/\b(?:international|global|overseas|cross.border|multi.country)\s+(?:contractor\s+)?payroll\b|\b(?:payroll|paying)\s+(?:for\s+)?(?:international|overseas|global)\s+contractors\b/i,strength:'strong'},
  {label:'Employer of record across countries',pattern:/\b(?:employer of record|EOR)\b.{0,60}\b(?:countries|international|global|overseas)\b|\b(?:international|global)\b.{0,30}\bemployer of record\b/i,strength:'strong'},
  {label:'Cross-border contractor payment services',pattern:/\b(?:cross.border|international|global|overseas)\s+(?:contractor\s+)?payments\b|\bpay\s+contractors\s+(?:in|across)\s+\d+\s+countries\b/i,strength:'strong'},
  {label:'Recruitment offices in multiple countries',pattern:/\b(?:offices|operations|teams)\s+(?:in|across)\s+(?:multiple|several|\d+)\s+countries\b/i,strength:'supporting'},
  {label:'International staffing delivery',pattern:/\b(?:international|global|overseas)\s+(?:contract|contractor|staffing)\s+(?:recruitment|solutions|services|placements)\b/i,strength:'supporting'}
 ],
 goods:[
  {label:'Imports equipment from overseas manufacturers',pattern:/\b(?:import(?:s|ed|ing)?|sourc(?:e|es|ing))\s+(?:specialist|industrial|machinery|equipment|products|goods|components|parts|directly|from)\b.{0,60}\b(?:europe|asia|china|germany|japan|overseas|international|abroad)\b|\bimported\s+(?:machinery|equipment|products|components)\b/i,strength:'strong'},
  {label:'Official UK distributor of foreign manufacturer',pattern:/\b(?:exclusive|official|authorised|authorized)\s+(?:uk|british|united kingdom)?\s*(?:distributor|importer|agent)\b.{0,80}\b(?:german|japanese|italian|french|swiss|chinese|european|international)\b/i,strength:'strong'},
  {label:'International sourcing and procurement',pattern:/\b(?:global|international|overseas)\s+(?:sourcing|procurement|supply chain|suppliers)\b/i,strength:'supporting'},
  {label:'Worldwide machinery distribution',pattern:/\b(?:worldwide|international|global)\s+(?:machinery|equipment|parts)\s+(?:distribution|supplier|sales)\b/i,strength:'supporting'}
 ]
};
const WEAK_CONTEXT=/\b(?:recruits?\s+(?:international|overseas)\s+(?:candidates|nurses)|visa sponsorship|study abroad)\b/i;
export function ruleScore(company:string,sector:Sector,base:number,hits:SearchHit[]):RuleResult{
 if(!Number.isFinite(base)||base<0||base>65)throw Error('Invalid registry score.');
 const seen=new Set<string>(),signals:Signal[]=[];
 for(const hit of hits.slice(0,12)){
  const host=hostOf(hit.url||'');
  if(!host||BLOCKED_HOSTS.some(b=>host===b||host.endsWith('.'+b))||!companyRelevant(company,hit))continue;
  const body=[hit.title,hit.description,...(Array.isArray(hit.extra_snippets)?hit.extra_snippets.slice(0,2):[])].join(' ').slice(0,1400);
  if(sector==='recruitment'&&WEAK_CONTEXT.test(body)&&!RULES.recruitment.slice(0,3).some(r=>r.pattern.test(body)))continue;
  for(const rule of RULES[sector]){
   if(rule.pattern.test(body)){
    const key=rule.label+'@'+host;if(seen.has(key))continue;
    seen.add(key);signals.push({label:rule.label,sourceUrl:hit.url,excerpt:body.replace(/\s+/g,' ').slice(0,240),strength:rule.strength});
   }
  }
 }
 const uniqueStrongHosts=new Set(signals.filter(s=>s.strength==='strong').map(s=>hostOf(s.sourceUrl)));
 const uniqueHosts=new Set(signals.map(s=>hostOf(s.sourceUrl)));
 // One search excerpt can't demonstrate FX, and multiple words on one page
 // must not be treated as independent proof.
 const strong=uniqueStrongHosts.size,support=signals.some(s=>s.strength==='supporting');
 // Scores describe *research quality*, not a verified FX need. Registry-only
 // matches stay below 36; corroborated overseas-payment clues can earn 65–85.
 const priority=strong>=2?Math.min(85,80+Math.min(5,base/7|0)):
  strong===1?Math.min(75,65+Math.min(10,base/4|0)):
  support?Math.min(45,Math.max(base,38)):Math.round(base);
 const method:RuleResult['researchMethod']=signals.length?'web-rule-screen':'registry-only';
 const reason=strong>=2?'Multiple independent web sources suggest an international operating model. FX payments, amounts and UK decision authority remain unverified.':
  strong===1?'One web source suggests cross-border operations. Independent verification and FX qualification required.':
  support?'International-business language detected, but direct overseas payments remain unverified.':
  'No corroborating cross-border signals found in indexed snippets. Registry sector classification alone is not evidence of FX.';
 return {priority:signals.length?priority:Math.round(base),signals:signals.slice(0,8),reason,researchMethod:method,researchConfidence:strong>=2&&uniqueHosts.size>=2?'Medium':'Low'};
}
