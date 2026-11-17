import type {ReactNode} from 'react';
export function Icon({name,size=19}:{name:string,size?:number}){
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  const lines:Record<string,ReactNode>={
    bolt:<><path d="m13 2-9 11h7l-1 9 10-12h-7l0-8"/></>,
    menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
    phone:<><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.6 19.6 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.8L7.1 10a16 16 0 0 0 7 7l1.7-1.8a2 2 0 0 1 1.8-.6l2.8.4a2 2 0 0 1 1.6 1.9Z"/></>,
    check:<><path d="m5 12 4 4L19 6"/></>,copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    alert:<><path d="M10 4 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L14 4a2 2 0 0 0-4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    mail:<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,
    users:<><circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m2 3a6 6 0 0 1 4 6v1"/></>,
    target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    chart:<><path d="M3 3v18h18M7 16l4-5 4 2 5-8"/></>,
    list:<><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    search:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.5 3.1 2.6 1.5 3-.9 2 3.5-2.3 2.2v3l2.3 2.2-2 3.5-3-.9-2.6 1.5L14 22h-4l-.5-3.1-2.6-1.5-3 .9-2-3.5 2.3-2.2v-3L1.9 7.4l2-3.5 3 .9 2.6-1.5z"/></>,
    upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4"/></>,
    file:<><path d="M6 2h9l5 5v15H6zM15 2v5h5M9 12h8M9 16h8"/></>,
    external:<><path d="M13 4h7v7m0-7-9 9M20 14v6H4V4h6"/></>,
    x:<><path d="M5 5 19 19M19 5 5 19"/></>,
    plus:<><path d="M12 4v16M4 12h16"/></>,
    db:<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></>,
    filter:<><path d="M3 5h18l-7 8v5l-4 2v-7z"/></>,
  };
  return <svg aria-hidden="true" {...common}>{lines[name]||lines.target}</svg>;
}
export function Badge({children,tone='muted'}:{children:ReactNode;tone?:'muted'|'blue'|'amber'|'green'|'red'}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function Empty({title,detail}:{title:string;detail?:string}){return <div className="empty"><Icon name="target" size={28}/><strong>{title}</strong><p>{detail}</p></div>}
export function Metric({label,value,sub}:{label:string;value:ReactNode;sub?:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>}
export const money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n||0);
export const day=(s:string)=>s?new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—';
