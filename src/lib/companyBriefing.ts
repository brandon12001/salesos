import type {Lead,State} from '../types';

// Keep the longer business briefing separate from the five-second company summary
// and from FX research. Manual edits must not alter scoring, contacts or tasks.
export function briefingStamp(lead:Lead){
 return JSON.stringify([lead.companyBriefing||'',lead.companyBriefingEditedAt||'']);
}
export function saveManualCompanyBriefing(state:State,id:string,value:string,expected:string){
 const lead=state.leads.find(item=>item.id===id);
 if(!lead)throw Error('Company no longer exists.');
 if(briefingStamp(lead)!==expected)throw Error('Company briefing changed elsewhere. Reopen this company and review the current text.');
 const next=value.trim();
 if(next.length>1400)throw Error('Keep the company briefing under 1,400 characters.');
 if(next&&next.length<35)throw Error('Add meaningful company context (at least 35 characters), or clear the briefing.');
 if(next===(lead.companyBriefing||''))return lead;
 lead.companyBriefing=next;
 lead.companyBriefingEditedAt=new Date().toISOString();
 return lead;
}
