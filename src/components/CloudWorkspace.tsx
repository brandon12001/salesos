import {useEffect,useState,type FormEvent} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {cloud} from '../lib/cloud';
import {core} from '../lib/core';
import {download,restoreLocal} from '../lib/storage';
import {hasRecords} from '../lib/workspaceStore';
import type {Autosave,SyncSnapshot} from '../lib/autosave';
export function useCloudAuth(){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(!!cloud);
 useEffect(()=>{
  if(!cloud)return;
  let alive=true;
  const {data}=cloud.auth.onAuthStateChange((_event,next)=>{if(alive){setSession(next);setLoading(false)}});
  void cloud.auth.getSession().then(({data,error})=>{if(alive){setSession(error?null:data.session);setLoading(false)}}).catch(()=>{if(alive)setLoading(false)});
  return()=>{alive=false;data.subscription.unsubscribe()};
 },[]);
 return {session,loading};
}
export function CloudSignIn({loading=false}:{loading?:boolean}){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function signIn(e:FormEvent){
  e.preventDefault();if(!cloud)return;setBusy(true);setMessage('');
  try{const {error}=await cloud.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+'/'}});if(error)throw error;setMessage('Check your email for the sign-in link. Open it in the browser where you want to use SalesOS.')}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 const [guest]=useState(restoreLocal);
 return <main className="cloud-gate"><section className="panel stack"><span className="eyebrow">SALESOS</span><h1>{loading?'Opening your workspace…':'Sign in to SalesOS'}</h1><p>Private records, automatically saved across your devices.</p>{!loading&&<><form className="stack" onSubmit={e=>void signIn(e)}><label className="field">Email<input aria-label="Sign-in email" type="email" autoComplete="email" value={email} required onChange={e=>setEmail(e.target.value)}/></label><button className="btn primary" disabled={busy}>{busy?'Sending…':'Email sign-in link'}</button></form>{message&&<p role="status">{message}</p>}{(hasRecords(guest)||localStorage.getItem(core.KEY)||localStorage.getItem(core.OLD_KEY))&&<><p className="hint">Existing browser records are preserved. You can migrate them after signing in.</p><button className="btn secondary" onClick={()=>download('SalesOS_browser_backup.json',JSON.stringify(guest,null,2))}>Back up existing browser records</button></>}</>}</section></main>;
}
export function syncLabel(snapshot:SyncSnapshot){
 if(snapshot.status==='saved')return 'Saved to cloud';
 if(snapshot.status==='offline')return snapshot.dirty?'Offline · changes queued':'Offline';
 if(snapshot.status==='saving')return 'Saving…';
 if(snapshot.status==='conflict')return 'Conflicting changes';
 if(snapshot.status==='error')return 'Save pending';
 return 'Opening cloud…';
}
export function SyncIndicator({snapshot,onOpen}:{snapshot:SyncSnapshot;onOpen:()=>void}){
 return <button className={'sync-indicator '+snapshot.status} onClick={onOpen} title={snapshot.error||'Cloud save status'} aria-live="polite">{syncLabel(snapshot)}</button>;
}
function exportDocument(snapshot:SyncSnapshot){download('SalesOS_local_recovery_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(snapshot.document,null,2))}
export function CloudGate({engine,snapshot}:{engine:Autosave;snapshot:SyncSnapshot}){
 const [busy,setBusy]=useState(false),[localError,setLocalError]=useState('');
 const migration=snapshot.status==='migration',conflict=snapshot.status==='conflict',locked=snapshot.status==='locked';
 return <main className="cloud-gate"><section className="panel stack"><span className="eyebrow">YOUR PRIVATE WORKSPACE</span><h1>{migration?'Keep your existing records':conflict?'Newer cloud changes found':locked?'Workspace open in another tab':'Opening SalesOS'}</h1>
 {migration?<><p>These browser records have not been uploaded. Back them up and choose how to start your account.</p><button className="btn primary" onClick={()=>{try{exportDocument(snapshot);engine.importBrowserRecords(true)}catch(e){setLocalError((e as Error).message)}}}>Back up and use these records</button><button className="btn secondary" onClick={()=>{try{engine.importBrowserRecords(false)}catch(e){setLocalError((e as Error).message)}}}>Start empty · keep browser records here</button></>:
 conflict?<><p>Your changes are safe in this browser. SalesOS paused cloud saving to avoid overwriting another session.</p><button className="btn secondary" onClick={()=>exportDocument(snapshot)}>Download my local changes</button><button className="btn primary" disabled={busy} onClick={()=>{exportDocument(snapshot);setBusy(true);void engine.useCloudVersion().finally(()=>setBusy(false))}}>Back up my changes and load cloud version</button><p className="hint">This keeps a local recovery copy and downloads a JSON backup before replacing the view. It does not overwrite the cloud version.</p></>:
 <><p>{snapshot.error||'Loading your latest records before allowing edits.'}</p>{snapshot.status!=='loading'&&<button className="btn primary" onClick={()=>locked?window.location.reload():void engine.reconcile()}>{locked?'Reload':'Retry connection'}</button>}{engine.guest&&<button className="btn secondary" onClick={()=>download('SalesOS_browser_backup.json',JSON.stringify(engine.guest,null,2))}>Back up existing browser records</button>}</>}
 {localError&&<p className="form-error" role="alert">{localError}</p>}
 {snapshot.error&&(migration||conflict)&&<p className="form-error" role="alert">{snapshot.error}</p>}</section></main>;
}
export function CloudPanel({user,engine,snapshot}:{user:User;engine:Autosave;snapshot:SyncSnapshot}){
 const [error,setError]=useState('');
 async function signOut(){
  if(!cloud)return;
  if(snapshot.dirty&&!confirm('Some changes are not in the cloud yet. They will stay queued for this account in this browser. Sign out?'))return;
  const {error}=await cloud.auth.signOut();if(error)setError(error.message);
 }
 return <section className="panel stack"><div className="section-between"><h2>Automatic cloud saving</h2><strong role="status">{syncLabel(snapshot)}</strong></div><p>Signed in as {user.email}. Every saved action is kept in this browser first, then automatically saved to your private account.</p>{snapshot.savedAt&&<p className="hint">Last cloud save: {new Date(snapshot.savedAt).toLocaleString('en-GB')}</p>}{snapshot.error&&<p className="form-error">{snapshot.error}</p>}<div className="button-row"><button className="btn secondary" onClick={()=>void engine.reconcile()}>Check connection</button><button className="btn secondary" onClick={()=>exportDocument(snapshot)}>Download JSON backup</button><button className="btn quiet" onClick={()=>void signOut()}>Sign out of SalesOS</button></div><p className="hint">Offline changes retry when the connection returns. Conflicting edits are held for recovery rather than silently overwritten. Keep the browser open until “Saved to cloud” before moving to another device.</p>{engine.guest&&<details><summary>Existing browser-only records</summary><p>These original records remain untouched in this browser.</p><button className="btn secondary" onClick={()=>download('SalesOS_original_browser_records.json',JSON.stringify(engine.guest,null,2))}>Export original browser records</button></details>}{error&&<p className="form-error">{error}</p>}</section>;
}
