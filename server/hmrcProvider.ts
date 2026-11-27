// HMRC documents 60 requests/minute. Leave headroom within each warm worker.
// This is not a distributed quota: a provider rejection still closes the batch.
export class HMRCProviderError extends Error{constructor(message:string,public status=502){super(message)}}
type Clock={now:()=>number;wait:(ms:number)=>Promise<void>};
export function createHMRCGate(clock:Clock={now:Date.now,wait:ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 let next=0,blockedUntil=0;
 return {
  async enter(){
   const now=clock.now();
   if(blockedUntil>now)throw new HMRCProviderError('HMRC requests are cooling down. Wait at least a minute before retrying. No scan cursor advanced.',429);
   const slot=Math.max(now,next);
   if(slot-now>30000)throw new HMRCProviderError('HMRC request queue is busy. Retry this batch later; no scan cursor advanced.',429);
   next=slot+1250;
   if(slot>now)await clock.wait(slot-now);
   if(blockedUntil>clock.now())throw new HMRCProviderError('HMRC requests are cooling down. Wait at least a minute before retrying. No scan cursor advanced.',429);
  },
  coolDown(){blockedUntil=Math.max(blockedUntil,clock.now()+60000)}
 };
}
export const hmrcGate=createHMRCGate();
