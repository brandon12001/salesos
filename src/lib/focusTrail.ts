import type {Activity,State,Task} from '../types';

export type FocusVisit={task:Task;activityId?:string};
export type FocusTrail={entries:FocusVisit[];index:number;following:boolean};
export const emptyTrail=():FocusTrail=>({entries:[],index:-1,following:true});
export const visitKey=(v:FocusVisit)=>v.activityId?'activity:'+v.activityId:'task:'+v.task.id;
export function visit(trail:FocusTrail,v:FocusVisit,following=false):FocusTrail{
 const current=trail.entries[trail.index];
 if(current&&visitKey(current)===visitKey(v))return trail.following===following?trail:{...trail,following};
 const entries=[...trail.entries.slice(0,trail.index+1),v].slice(-30);
 return {entries,index:entries.length-1,following};
}
export function finishVisit(trail:FocusTrail,originalId:string,v:FocusVisit,stay:boolean):FocusTrail{
 const updated=trail.entries.some(old=>old.task.id===originalId)?{...trail,entries:trail.entries.map(old=>old.task.id===originalId?v:old)}:visit(trail,v,false);
 return stay?visit(updated,v,false):{...updated,following:true};
}
export function previousVisit(trail:FocusTrail):FocusTrail{return trail.index>0?{...trail,index:trail.index-1,following:false}:trail}
export function nextVisit(trail:FocusTrail,candidate?:Task|null):FocusTrail{
 if(trail.index<trail.entries.length-1)return {...trail,index:trail.index+1,following:false};
 return candidate?visit(trail,{task:candidate},false):{...trail,following:true};
}
export function visitForActivity(s:State,a:Activity):FocusVisit{
 const actual=s.tasks.find(t=>t.id===a.taskId);
 const task:Task=actual||{id:'activity:'+a.id,leadId:a.leadId,contactId:a.contactId||null,methodId:null,type:a.type==='Call'?'call':'manual',title:a.outcome,description:'Historical activity; no pending task',dueAt:a.at.slice(0,10),dueTime:'',status:'completed',origin:'history',stepIndex:null,objective:'Review the recorded activity',successCriteria:'',isCommitment:false,dedupeKey:'',createdAt:a.at,completedAt:a.at};
 return {task,activityId:a.id};
}
