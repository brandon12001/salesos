import type {Task} from '../../types';

export const RULE_VERSION='intelligence-v1.1-work-queues';
export const FEEDBACK_REASONS=['Wrong person','Wrong time','Irrelevant action','Better action available','Insufficient information','Other reason'] as const;
export type FeedbackReason=typeof FEEDBACK_REASONS[number];
export type Fact={status:'confirmed'|'hypothesised'|'unknown';value:string;at:string;observedAt?:string};
export type Commercial=Record<'problem'|'impact'|'timing'|'barrier',Fact>;
export type Momentum={state:'Progressing'|'Stable'|'Stalling'|'At risk'|'Insufficient evidence';reasons:string[]};
export type Recommendation={
 id:string;ruleVersion:string;leadId:string|null;company:string;task:Task;sourceTaskId:string|null;
 generated:boolean;rule:string;reasons:string[];known:string[];missing:string[];
 momentum:Momentum;opportunityScore:number|null;effortMinutes:number;
 protected:boolean;priority:number;components:{urgency:number;impact:number;confidence:number;efficiency:number};
};
export type DecisionEvent={
 id:string;at:string;recommendationId:string;ruleVersion:string;leadId:string|null;taskId:string|null;
 action:string;why:string[];priority:number;channel:string;contactRole:string;
 followed:boolean;outcome:string;reason?:FeedbackReason;deferredUntil?:string;
 activityIds:string[];progress:'confirmed'|'not_recorded';progressEvidence:string[];minutes?:number;
 stageChange?:{from:string;to:string};readinessChange?:{from:number|null;to:number};
};
export type IntelligenceData={version:1;commercial:Record<string,Commercial>;timing:Record<string,{notBefore:string;notAfter:string}>;events:DecisionEvent[];session?:{startedAt:string;endsAt:string;duration:30|45|60}};
export type Decision={recommendations:Recommendation[];blocked:Array<{leadId:string;reason:string}>};
