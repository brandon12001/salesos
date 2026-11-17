import type {Lead,Task,Contact} from '../types';
import {core} from './core';
export function contactFor(lead:Lead|null|undefined,task?:Task|null):Contact|null{
  if(!lead)return null;
  return (task?.contactId&&core.getContact(lead,task.contactId))||core.preferredContact(lead,task?.type==='callback'?'call':task?.type||'call')||lead.contacts[0]||null;
}
export function dialFor(contact:Contact|null,task?:Task|null):string{
  if(!contact)return '';
  const m=(task?.methodId&&contact.methods.find(x=>x.id===task.methodId&&['mobile','phone'].includes(x.kind)&&x.status!=='invalid'&&x.status!=='blocked'))||core.anyPhone(contact);
  return m?core.phoneDial(m.value):'';
}
export function emailFor(contact:Contact|null){return contact?core.bestMethod(contact,'email')?.value||'':''}
export function linkedInFor(contact:Contact|null){let v=contact?core.bestMethod(contact,'linkedin')?.value||'':'';return /^https:\/\/(www\.)?linkedin\.com\//i.test(v)?v:''}
export function latestActivity(state:any,leadId:string){return [...state.activities].reverse().find(a=>a.leadId===leadId&&a.notes&&a.type!=='Company')||null}
