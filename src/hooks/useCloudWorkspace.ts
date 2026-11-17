import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {Autosave} from '../lib/autosave';
import {workspaceStore,hasRecords} from '../lib/workspaceStore';
import {workspaceRemote,validateWorkspace} from '../lib/workspaceRemote';
import {restoreLocal} from '../lib/storage';
import {core} from '../lib/core';
import {protectCloudReplacement} from '../lib/workspaceSafety';
const noopSubscribe=()=>()=>{};
const noSnapshot=()=>null;
const canRefresh=()=>!document.querySelector('[role="dialog"]')&&!(document.activeElement as HTMLElement|null)?.matches('input,textarea,select');
export function useCloudWorkspace(userId?:string){
 const engine=useMemo(()=>{
  if(!userId)return null;
  const guest=restoreLocal();
  return new Autosave({userId,empty:core.newState(),guest:hasRecords(guest)||localStorage.getItem(core.KEY)||localStorage.getItem(core.OLD_KEY)?guest:null,store:workspaceStore(localStorage,userId),remote:workspaceRemote(userId),validate:validateWorkspace,canAdopt:canRefresh,protectReplacement:protectCloudReplacement});
 },[userId]);
 const snapshot=useSyncExternalStore(engine?.subscribe||noopSubscribe,engine?.getSnapshot||noSnapshot);
 useEffect(()=>{
  if(!engine)return;
  let cancelled=false;
  let release=()=>{};
  const held=new Promise<void>(resolve=>{release=resolve});
  // One writer per browser/account prevents two tabs overwriting the shared local outbox.
  if(navigator.locks){
   void navigator.locks.request('salesos.account.'+userId,{ifAvailable:true},async lock=>{
    if(cancelled)return;
    if(!lock){engine.blockForOtherTab();return}
    void engine.start(navigator.onLine);
    await held;
   }).catch(()=>engine.blockForOtherTab());
  }else engine.blockForOtherTab();
  const online=()=>engine.setOnline(true),offline=()=>engine.setOnline(false);
  const leaving=(e:BeforeUnloadEvent)=>{if(engine.getSnapshot().dirty){e.preventDefault();e.returnValue=''}};
  const refresh=()=>{
   // Do not replace data behind an unsaved form: its eventual save must check the old revision.
   if(engine.getSnapshot().dirty||canRefresh())void engine.reconcile();
  };
  window.addEventListener('online',online);window.addEventListener('offline',offline);window.addEventListener('focus',refresh);window.addEventListener('beforeunload',leaving);
  const interval=window.setInterval(refresh,15000);
  return()=>{cancelled=true;engine.stop();release();clearInterval(interval);window.removeEventListener('online',online);window.removeEventListener('offline',offline);window.removeEventListener('focus',refresh);window.removeEventListener('beforeunload',leaving)};
 },[engine]);
 return engine&&snapshot?{engine,snapshot}:null;
}
