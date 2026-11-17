import type {State} from '../types';

export type CloudRecord={document:State;revision:number;updatedAt:string};
export type SyncStatus='loading'|'migration'|'saving'|'saved'|'offline'|'error'|'conflict'|'locked';
export type SyncSnapshot={document:State;revision:number;dirty:boolean;ready:boolean;status:SyncStatus;error:string;savedAt:string};
export type CachedWorkspace={version:1;userId:string;document:State;revision:number;dirty:boolean};
export type RemoteWorkspace={load:()=>Promise<CloudRecord|null>;save:(document:State,revision:number)=>Promise<{revision:number;updatedAt:string}>};
export type WorkspaceStore={read:()=>CachedWorkspace|null;write:(cache:CachedWorkspace)=>void;recover:(document:State)=>void};
export class RevisionConflict extends Error {constructor(){super('Newer changes exist in the cloud. Your local changes have been kept.')}}
const canonical=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const same=(a:State,b:State)=>canonical(a)===canonical(b);

// A durable local outbox and compare-and-swap remote writes. No automatic overwrites.
export class Autosave {
 private value:SyncSnapshot;
 private listeners=new Set<()=>void>();
 private busy=false;
 private stopped=true;
 private online=true;
 private epoch=0;
 private generation=0;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private hadCache=false;
 private cacheBroken=false;
 readonly guest:State|null;
 constructor(private options:{userId:string;empty:State;guest:State|null;store:WorkspaceStore;remote:RemoteWorkspace;validate:(x:unknown)=>State;delay?:number;canAdopt?:()=>boolean;protectReplacement?:(local:State,remote:State)=>void}){
  this.guest=options.guest;
  this.value={document:options.empty,revision:0,dirty:false,ready:false,status:'loading',error:'',savedAt:''};
  try{
   const cache=options.store.read();
   if(cache){
    if(cache.version!==1||cache.userId!==options.userId||!Number.isSafeInteger(cache.revision)||cache.revision<0||typeof cache.dirty!=='boolean')throw new Error('Invalid account recovery data.');
    this.hadCache=true;
    this.value={...this.value,document:options.validate(cache.document),revision:cache.revision,dirty:cache.dirty};
   }
  }catch{this.cacheBroken=true;this.value={...this.value,status:'error',error:'Account recovery data could not be read. It has been preserved; do not clear browser storage.'}}
 }
 blockForOtherTab(){this.publish({status:'locked',ready:false,error:'This account is already open in another SalesOS tab. Close that tab, then reload here. Unsynced work in the other tab stays protected.'})}
 getSnapshot=()=>this.value;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 private publish(patch:Partial<SyncSnapshot>){this.value={...this.value,...patch};for(const listener of this.listeners)listener()}
 private persist(document:State,revision:number,dirty:boolean){
  this.options.store.write({version:1,userId:this.options.userId,document,revision,dirty});
 }
 private adopt(document:State,revision:number,dirty:boolean,status:SyncStatus,savedAt=''){
  const parsed=this.options.validate(document);
  this.persist(parsed,revision,dirty);
  this.publish({document:parsed,revision,dirty,status,savedAt,ready:true,error:''});
 }
 async start(online=true){this.stopped=false;this.online=online;this.epoch++;await this.reconcile()}
 stop(){this.stopped=true;this.epoch++;this.busy=false;if(this.timer)clearTimeout(this.timer)}
 setOnline(online:boolean){
  if(this.value.status==='locked')return;
  this.online=online;
  if(!online&&this.value.status!=='conflict'&&this.value.status!=='migration')this.publish({status:'offline'});
  if(online)void this.reconcile();
 }
 private schedule(){
  if(this.timer)clearTimeout(this.timer);
  if(!this.stopped&&this.online)this.timer=setTimeout(()=>void this.flush(),this.options.delay??500);
 }
 change(document:State){
  if(!this.value.ready||this.value.status==='conflict')throw new Error('Resolve cloud loading or conflicting changes before editing.');
  const parsed=this.options.validate(document);
  // Write before updating the UI or making a network request. Storage errors block the action.
  this.persist(parsed,this.value.revision,true);
  this.generation++;
  this.publish({document:parsed,dirty:true,status:this.online?'saving':'offline',error:''});
  this.schedule();
 }
 importBrowserRecords(useGuest:boolean){
  if(this.value.status!=='migration')return;
  if(this.guest)this.options.store.recover(this.guest);
  this.adopt(useGuest&&this.guest?this.guest:this.options.empty,0,true,this.online?'saving':'offline');
  this.generation++;
  this.schedule();
 }
 async reconcile(){
  if(this.stopped||this.busy||this.cacheBroken||this.value.status==='migration'||this.value.status==='conflict')return;
  if(!this.online){this.publish({status:'offline',ready:this.hadCache||this.value.ready});return}
  this.busy=true;const epoch=this.epoch;
  try{
   const remote=await this.options.remote.load();
   if(this.stopped||epoch!==this.epoch)return;
   const current=this.value;
   if(current.dirty){
    if(remote&&same(remote.document,current.document))this.adopt(current.document,remote.revision,false,'saved',remote.updatedAt);
    else if((remote?.revision??0)!==current.revision)this.publish({status:'conflict',ready:true,error:'Newer cloud changes were found. Both versions are preserved.'});
    else this.publish({status:'saving',ready:true,error:''});
   }else if(remote){if(current.ready&&this.options.canAdopt&&!this.options.canAdopt())return;this.adopt(remote.document,remote.revision,false,'saved',remote.updatedAt)}
   else if(current.revision>0){this.publish({status:'conflict',ready:true,error:'The cloud record is missing. Your browser copy has been preserved.'})}
   else if(!this.hadCache&&!current.ready&&this.guest){this.publish({status:'migration',document:this.guest,error:''})}
   else this.adopt(current.document,0,true,'saving');
  }catch(e){
   if(!this.stopped&&epoch===this.epoch)this.publish({status:this.online?'error':'offline',ready:this.hadCache||this.value.ready,error:(e as Error).message});
  }finally{
   if(epoch===this.epoch){this.busy=false;if(this.value.dirty&&this.value.status==='saving')this.schedule()}
  }
 }
 async flush(){
  if(this.stopped||this.busy||!this.online||!this.value.ready||!this.value.dirty||this.value.status==='conflict')return;
  this.busy=true;const epoch=this.epoch,generation=this.generation;
  const sent=this.value;
  this.publish({status:'saving',error:''});
  try{
   const result=await this.options.remote.save(sent.document,sent.revision);
   if(this.stopped||epoch!==this.epoch)return;
   const dirty=this.generation!==generation;
   this.persist(this.value.document,result.revision,dirty);
   this.publish({revision:result.revision,dirty,savedAt:result.updatedAt,status:this.online?(dirty?'saving':'saved'):'offline',error:''});
  }catch(e){
   if(!this.stopped&&epoch===this.epoch)this.publish({status:e instanceof RevisionConflict?'conflict':this.online?'error':'offline',error:(e as Error).message});
  }finally{
   if(epoch===this.epoch){this.busy=false;if(this.value.dirty&&this.value.status==='saving')this.schedule()}
  }
 }
 // Explicit recovery only. Never push over another device's work.
 async useCloudVersion(){
  if(this.stopped||this.busy)return;
  this.busy=true;const epoch=this.epoch;
  try{
   this.options.store.recover(this.value.document);
   const remote=await this.options.remote.load();
   if(this.stopped||epoch!==this.epoch)return;
   if(!remote)throw new Error('No cloud record exists. Your local recovery copy is intact.');
   this.options.protectReplacement?.(this.value.document,remote.document);
   this.adopt(remote.document,remote.revision,false,'saved',remote.updatedAt);
  }catch(e){if(!this.stopped&&epoch===this.epoch)this.publish({status:'conflict',error:(e as Error).message})}
  finally{if(epoch===this.epoch)this.busy=false}
 }
}
