import {useState} from 'react';
import type {TurnoverEvidence,TurnoverTarget} from '../lib/companyContext';
export function ResearchTarget({value,onSave}:{value:TurnoverTarget;onSave:(value:TurnoverTarget)=>boolean}){
 const [min,setMin]=useState(String(value.min/1e6)),[max,setMax]=useState(String(value.max/1e6));
 return <details><summary>Annual turnover target · £{value.min/1e6}m–£{value.max/1e6}m</summary>
  <div className="button-row"><label className="field">Minimum (£m)<input type="number" min="0" step="0.1" value={min} onChange={e=>setMin(e.target.value)}/></label>
   <label className="field">Maximum (£m)<input type="number" min="0" step="0.1" value={max} onChange={e=>setMax(e.target.value)}/></label>
   <button className="btn secondary small" onClick={()=>onSave({min:min.trim()?Number(min)*1e6:NaN,max:max.trim()?Number(max)*1e6:NaN})}>Save turnover target</button></div>
  <p className="hint">Recent, sourced company-level annual GBP turnover outside this range holds paid research. Missing figures remain eligible. Group totals, assets, FX volume and our potential revenue do not substitute for company turnover.</p>
 </details>;
}
export function TurnoverEditor({value,onSave}:{value?:TurnoverEvidence;onSave:(value:TurnoverEvidence|null)=>boolean}){
 const [amount,setAmount]=useState(value?String(value.amount/1e6):''),[date,setDate]=useState(value?.periodEnd||''),[scope,setScope]=useState<'entity'|'group'>(value?.scope||'entity'),[source,setSource]=useState(value?.sourceUrl||'');
 return <details><summary>{value?'Edit':'Record'} published annual turnover</summary><div className="stack">
  <p className="hint">Use sourced annual accounts for a 12-month period, in GBP. Keep the prospect company’s figures separate from its group. This records evidence; it does not verify it automatically.</p>
  <div className="form-grid"><label className="field">Annual turnover (£m)<input type="number" min="0" step="0.1" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
   <label className="field">Financial year ended<input type="date" max={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="field">Figure applies to<select aria-label="Figure applies to" value={scope} onChange={e=>setScope(e.target.value as 'entity'|'group')}><option value="entity">This legal company</option><option value="group">Whole group — context only</option></select></label>
   <label className="field">Published accounts source URL<input type="url" value={source} onChange={e=>setSource(e.target.value)} placeholder="https://…" maxLength={1000}/></label></div>
  <div className="button-row"><button className="btn secondary small" onClick={()=>onSave({amount:amount.trim()?Number(amount)*1e6:NaN,currency:'GBP',periodMonths:12,periodEnd:date,scope,sourceUrl:source.trim(),recordedAt:new Date().toISOString()})}>Save turnover evidence</button>
   {value&&<button className="btn quiet small" onClick={()=>onSave(null)}>Clear turnover evidence</button>}</div>
 </div></details>;
}
