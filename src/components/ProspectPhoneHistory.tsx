import type {State,Lead} from '../types';
import {registry,secondsLabel} from '../lib/callLogImport';

export function ProspectPhoneHistory({state,lead}:{state:State;lead:Lead}){
 const calls=registry(state).records.filter(c=>c.leadId===lead.id).slice().sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time));
 if(!calls.length)return null;
 return <details className="phone-log-prospect">
   <summary>Imported phone calls ({calls.length})</summary>
   <div className="phone-log-prospect-list">
    {calls.slice(0,30).map(call=><div className="phone-log-prospect-row" key={call.key}>
      <div><strong>{call.date} · {call.time}</strong><small>{lead.contacts.find(c=>c.id===call.contactId)?.name||'Unassigned contact'} · {call.number}</small></div>
      <div><strong>{call.hasDuration?secondsLabel(call.durationSeconds):'Duration not shown'}</strong><small>{call.activityId?'Matched to a logged activity':'KPI only · no CRM activity created'}</small></div>
    </div>)}
    {calls.length>30&&<small>Showing the latest 30 imported calls.</small>}
   </div>
 </details>;
}
