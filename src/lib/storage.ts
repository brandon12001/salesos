import type {State} from '../types';
import {core} from './core';
export const STATE_KEY=core.KEY;
export function restoreLocal():State{
  for(const key of [STATE_KEY,core.OLD_KEY]){
    try {const raw=localStorage.getItem(key);if(!raw)continue;const state=core.normalize(JSON.parse(raw));if(state)return state as State;}catch(err){console.warn('Could not restore',key,err)}
  }
  return core.newState() as State;
}
export function persistLocal(state:State){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
export function parseBackup(text:string):State{
  const parsed=core.normalize(JSON.parse(text));
  if(!parsed)throw new Error('Unsupported SalesOS backup. Expected v2 or v3 JSON.');
  return parsed as State;
}
export function download(name:string,content:string,mime='application/json'){
  const href=URL.createObjectURL(new Blob([content],{type:mime}));const el=document.createElement('a');el.href=href;el.download=name;document.body.append(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
