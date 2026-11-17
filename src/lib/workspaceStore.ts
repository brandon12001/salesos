import type {State} from '../types';
import type {CachedWorkspace,WorkspaceStore} from './autosave';
export function accountKey(userId:string){return 'salesos.account.v1.'+userId}
export function workspaceStore(storage:Pick<Storage,'getItem'|'setItem'>,userId:string):WorkspaceStore{
 const key=accountKey(userId);
 return {
  read:()=>{const raw=storage.getItem(key);return raw?JSON.parse(raw) as CachedWorkspace:null},
  write:cache=>{if(cache.userId!==userId)throw new Error('Account mismatch.');storage.setItem(key,JSON.stringify(cache))},
  recover:document=>storage.setItem(key+'.recovery',JSON.stringify({at:new Date().toISOString(),document}))
 };
}
export function hasRecords(state:State){return state.leads.length>0||state.tasks.length>0||state.activities.length>0}
