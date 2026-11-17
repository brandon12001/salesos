import type {State} from '../types';
const ledgerKey=(value:unknown)=>{
 const item=value as Record<string,unknown>;
 return JSON.stringify(['scope','company','contact','email','phone'].map(key=>item[key]??''));
};
// Explicit conflict recovery still cannot erase opt-outs or a missing promised commitment.
export function protectCloudReplacement(local:State,remote:State){
 const ledger=new Set(remote.suppression.map(ledgerKey));
 if(local.suppression.some(item=>!ledger.has(ledgerKey(item))))throw new Error('The cloud copy is missing local opt-out records. Both copies are kept; reconcile those opt-outs before continuing.');
 for(const lead of local.leads){
  const next=remote.leads.find(item=>item.id===lead.id);
  if(lead.status==='Take Me Off the List'&&next?.status!=='Take Me Off the List')throw new Error('Loading this cloud copy would remove a local opt-out. Both copies are kept.');
  for(const contact of lead.contacts){
   if(contact.optedOut&&!next?.contacts.some(item=>item.id===contact.id&&item.optedOut))throw new Error('Loading this cloud copy would remove a contact opt-out. Both copies are kept.');
  }
 }
 if(local.tasks.some(task=>task.status==='pending'&&task.isCommitment&&!remote.tasks.some(item=>item.id===task.id)))throw new Error('The cloud copy is missing a local promised commitment. Both copies are kept; reconcile that promise before continuing.');
}
