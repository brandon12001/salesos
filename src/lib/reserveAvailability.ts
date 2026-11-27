import type {Lead,State} from '../types';
import {core} from './core';

// Match the actual activation transaction. A score filter is not ownership
// clearance; expose the separate blockers without changing any saved record.
export function reserveAvailability(s:State,leads:Lead[],threshold:number,phoneOnly:boolean){
 const callable=(l:Lead)=>l.contacts.some(c=>core.canContact(c)&&!core.isSuppressed(s,l,c)&&core.anyPhone(c));
 const eligible:Lead[]=[],belowScore:Lead[]=[],counts=new Map<string,number>();let missingPhone=0;
 for(const l of leads){
  const reason=core.reserveEligibility(s,l,threshold) as string;
  if(!core.reserveEligibility(s,l,0)&&(!phoneOnly||callable(l))&&Number(l.opportunityScore)<threshold)belowScore.push(l);
  if(!reason&&phoneOnly&&!callable(l))missingPhone++;
  const block=reason||(phoneOnly&&!callable(l)?'Usable telephone contact needed for call-only activation':'');
  if(block)counts.set(block,(counts.get(block)||0)+1);else eligible.push(l);
 }
 return {eligible,belowScore,missingPhone,callable,highestBelowScore:belowScore.length?Math.max(...belowScore.map(l=>l.opportunityScore!)):null,blocked:[...counts.entries()].sort((a,b)=>b[1]-a[1])};
}
