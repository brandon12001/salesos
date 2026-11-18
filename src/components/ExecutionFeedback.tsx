import type {CSSProperties} from 'react';
import type {SyncStatus} from '../lib/autosave';
import type {ExecutionFeedback as Feedback} from '../lib/executionFeedback';
export function ExecutionFeedback({event,status,celebrate}:{event:Feedback;status:SyncStatus|'local';celebrate:boolean}){
 const failed=['error','conflict','locked'].includes(status),confirmed=status==='saved'||status==='local';
 const detail=failed?'Cloud save failed · local recovery copy kept':status==='offline'?'Queued offline on this device · not saved to cloud':status==='local'?'Saved on this browser':confirmed?'Saved to cloud':'Saved on this device · waiting for cloud confirmation';
 return <div key={event.id} className={`execution-feedback ${confirmed?'is-confirmed':'is-pending'} ${failed?'is-failed':''} ${event.kind} ${celebrate?'celebrate':''}`} role="status" aria-live="polite" aria-atomic="true" data-event-id={event.id}>
  <span className="execution-mark" aria-hidden="true">{failed?'!':confirmed?'✓':'·'}</span><div><strong>{failed?'Cloud save needs attention':confirmed?event.message:'Recorded on this device'}</strong><small>{detail}</small>{event.callMessage&&<small>{event.callMessage}</small>}</div>
  {confirmed&&event.major&&celebrate&&<span className="milestone-sparks" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i} style={{'--spark':i} as CSSProperties}/>)}</span>}
 </div>;
}
