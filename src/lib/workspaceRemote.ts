import {cloud,cloudUrl,cloudKey} from './cloud';
import {core} from './core';
import type {State} from '../types';
import {RevisionConflict,type CloudRecord,type RemoteWorkspace} from './autosave';
export function validateWorkspace(value:unknown):State{
 const state=value as State;
 // Validate without rebuilding v3 records: preserve historical and extension fields verbatim.
 if(!state||state.version!==3||!['leads','tasks','activities','readinessHistory','milestoneHistory','suppression','sequence'].every(key=>Array.isArray((state as unknown as Record<string,unknown>)[key]))||!state.settings||typeof state.settings!=='object'||!state.meta||typeof state.meta!=='object')throw new Error('The cloud workspace is incompatible.');
 if(state.leads.some(l=>!Array.isArray(l.contacts)||!l.fx||!Array.isArray(l.fx.flows)||!Array.isArray(l.fx.products))||core.checkInvariants(state).length)throw new Error('The workspace violates SalesOS data rules.');
 return state;
}
export function workspaceRemote(userId:string):RemoteWorkspace{
 let lastRecord:CloudRecord|null=null;
 async function request(path:string,body?:unknown){
  if(!cloud)throw new Error('Cloud storage is not configured.');
  const {data,error}=await cloud.auth.getSession();
  if(error)throw error;
  const session=data.session;
  if(!session||session.user.id!==userId)throw new Error('Sign in again before syncing this account.');
  // Capture the token per request, so switching accounts cannot redirect an old write.
  const response=await fetch(cloudUrl+'/rest/v1/'+path,{
   method:body===undefined?'GET':'POST',
   headers:{apikey:cloudKey!,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)
  });
  const result=await response.json();
  if(!response.ok){if(result.code==='40001')throw new RevisionConflict();throw new Error(result.message||'Cloud save failed. Your changes remain in this browser.')}
  return result;
 }
 return {
  load:async()=>{
   if(lastRecord){
    const receipts=await request('salesos_workspaces?select=revision&user_id=eq.'+encodeURIComponent(userId));
    if(Array.isArray(receipts)&&receipts[0]?.revision===lastRecord.revision)return lastRecord;
   }
   const rows=await request('salesos_workspaces?select=payload,revision,updated_at&user_id=eq.'+encodeURIComponent(userId));
   if(!Array.isArray(rows))throw new Error('Unexpected cloud response.');
   if(!rows.length){lastRecord=null;return null}
   const row=rows[0];
   if(!Number.isSafeInteger(row.revision)||row.revision<1)throw new Error('Invalid cloud revision.');
   lastRecord={document:validateWorkspace(row.payload),revision:row.revision,updatedAt:row.updated_at};return lastRecord;
  },
  save:async(document,revision)=>{
   const result=await request('rpc/salesos_save_workspace',{document,expected_revision:revision});
   if(!Number.isSafeInteger(result.revision)||result.revision<1)throw new Error('Invalid save receipt. Local changes are preserved.');
   lastRecord={document,revision:result.revision,updatedAt:result.updated_at};
   return {revision:result.revision,updatedAt:result.updated_at};
  }
 };
}
