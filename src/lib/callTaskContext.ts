import type {Lead,State,Task} from '../types';
import {contactFor,phoneMethodFor} from './helpers';

// Display-only context for number repair. Never changes selection, scheduling or stored history.
export function repairCallContext(state:State,lead:Lead,task:Task){
 if(task.type!=='call'||task.origin!=='repair_followup'||task.isCommitment||task.status!=='pending')return null;
 const contact=contactFor(lead,task),method=phoneMethodFor(contact,task);
 if(!contact||!method||(task.methodId&&method.id!==task.methodId))return null;
 const previousBadNumber=state.activities.some(a=>a.leadId===lead.id&&a.type==='Call'&&(a.callOutcome==='bad_number'||a.outcome==='Bad or invalid number'));
 const route=method.kind==='mobile'?'mobile':'phone';
 return {
  title:'Try alternative contact number',
  reason:(previousBadNumber?'A previous number at this company was marked invalid. ': 'This task checks another recorded contact number. ')+`Use this ${route} number for ${contact.name||'the selected contact'}. `+(method.status==='unverified'?'This number is unverified; confirm who answers.':'Confirm who answers before discussing FX.'),
  objective:`Confirm you have reached ${contact.name||'the selected contact'} and whether they handle the company’s FX decisions.`,
  success:'Record the actual call outcome. No answer schedules a retry; Bad number checks for another number or creates contact research.'
 };
}
