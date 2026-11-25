export type SearchBudget={configured:boolean;remaining:number;allocated:number;revision:number;stopOn:string|null;expired:boolean;granted:number};
export class BudgetError extends Error {constructor(message:string,public status=503){super(message)}}
export function budgetClient(url:string,key:string,token:string){
 return async(action:'status'|'configure'|'reserve',amount=0,stopDate:string|null=null,revision:number|null=null):Promise<SearchBudget>=>{
  let response:Response;
  try{response=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/salesos_search_budget',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,amount,stop_date:stopDate,expected_revision:revision}),signal:AbortSignal.timeout(4500)})}
  catch{throw new BudgetError('Search budget unavailable. No Brave request sent; any uncertain reservation stays counted. Refresh the budget before retrying.')}
  if(!response.ok)throw new BudgetError(response.status===409?'Search budget changed in another session. Refresh before confirming the allowance.':'Search budget unavailable or not authorised. Paid research is paused; free HMRC scans still work.',response.status===409?409:503);
  const b=await response.json() as SearchBudget;
  if(!b||typeof b.configured!=='boolean'||typeof b.expired!=='boolean'||!Number.isSafeInteger(b.remaining)||b.remaining<0||b.remaining>1000||!Number.isSafeInteger(b.allocated)||b.allocated<0||!Number.isSafeInteger(b.revision)||b.revision<0||!Number.isInteger(b.granted)||b.granted<0||b.granted>8||b.granted%2!==0||b.granted>amount||b.stopOn!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(b.stopOn))throw new BudgetError('Invalid search budget response. Paid research is paused.');
  return b;
 };
}
