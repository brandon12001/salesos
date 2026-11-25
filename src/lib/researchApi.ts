import {cloud} from './cloud';
export async function researchApi(payload:unknown):Promise<any>{
 if(!cloud)throw Error('Sign in to the SalesOS cloud workspace first.');
 const {data,error}=await cloud.auth.getSession();if(error||!data.session)throw Error('SalesOS sign-in expired.');
 const response=await fetch('/api/lead-research',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(payload)});
 const raw=await response.text();let parsed:any;
 try{parsed=JSON.parse(raw)}catch{throw Error('Research server responded with an error ('+response.status+'). No records changed.')}
 if(!response.ok)throw Error(typeof parsed?.error==='string'?parsed.error:'Research request failed ('+response.status+').');
 return parsed;
}
