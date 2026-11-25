import {useEffect,useState} from 'react';
import {researchApi} from '../lib/researchApi';
import type {SearchBudget as Budget} from '../../server/searchBudget';
type Props={onChange:(value:Budget|null)=>void;refresh:number;disabled:boolean};
export function SearchBudget({onChange,refresh,disabled}:Props){
 const [budget,setBudget]=useState<Budget|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [remaining,setRemaining]=useState(''),[stopOn,setStopOn]=useState(''),[confirmed,setConfirmed]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{
  let active=true;onChange(null);
  void researchApi({mode:'budget-status'}).then(r=>{if(active){setBudget(r.budget);onChange(r.budget);setError('');setConfirmed(false);setRemaining('');setStopOn(r.budget.stopOn||'')}}).catch(e=>{if(active){setError((e as Error).message);setBudget(null);onChange(null)}});
  return ()=>{active=false};
 },[onChange,refresh,reload]);
 async function save(){
  if(!budget?.configured||busy||disabled||!confirmed)return;
  setBusy(true);setError('');onChange(null);
  try{const r=await researchApi({mode:'budget-config',remaining:Number(remaining),stopOn,revision:budget.revision,confirmed:true});setBudget(r.budget);onChange(r.budget);setConfirmed(false);setRemaining('')}
  catch(e){setError((e as Error).message);setBudget(null)}finally{setBusy(false)}
 }
 const available=budget?.configured&&!budget.expired&&(budget.remaining||0)>=2;
 return <details className="panel inset"><summary>Search budget · {available?budget.remaining+' searches remaining':'paid research paused'}</summary><div className="stack">
  <p className="hint">Free HMRC scans use no Brave searches. Paid research reserves two searches per company before sending requests, shared across your sessions. Failed or unused reservations stay counted to protect the limit. This is a conservative SalesOS allowance, not Brave’s billing balance; searches made elsewhere must be allowed for separately.</p>
  {budget?.configured&&<><p className="hint">{budget.remaining} remaining · {budget.allocated} allocated since tracking began · Stop on {budget.stopOn||'not set'}{budget.expired?' (expired)':''}. No automatic reset.</p>
   <label className="field">Confirmed remaining Brave allowance<input type="number" min="0" max="1000" step="1" value={remaining} onChange={e=>{setRemaining(e.target.value);setConfirmed(false)}}/></label>
   <label className="field">Stop searches on<input type="date" value={stopOn} onChange={e=>{setStopOn(e.target.value);setConfirmed(false)}}/></label>
   <label className="check-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked my current Brave allowance and reset date.</label>
   <button className="btn secondary" disabled={busy||disabled||!confirmed||remaining===''||!Number.isInteger(Number(remaining))||Number(remaining)<0||Number(remaining)>1000||!stopOn} onClick={()=>void save()}>{busy?'Saving allowance…':'Set confirmed allowance'}</button>
  </>}
  {budget&&!budget.configured&&<p className="hint">Search budget has not been provisioned for this account. Paid research is paused.</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="btn quiet small" disabled={busy||disabled} onClick={()=>setReload(n=>n+1)}>Refresh search budget</button>
 </div></details>;
}
