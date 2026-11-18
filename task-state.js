/** Pure, checkpointable task facts derived only from committed DSH events. */
export function initialState(header) {
  return { sessionId: header.id, title: '', child: header.origin === 'subagent' || header.delegationDepth > 0, running: false, since: null, pending: [], outcome: null, lastSeq: -1,
    cwd: typeof header.cwd === 'string' ? header.cwd : '', parentSession: typeof header.parentSession === 'string' ? header.parentSession : null,
    phase:'idle',step:null,currentTools:[],toolCount:0,todoTotal:0,todoDone:0,progress:null,updatedAt:null,summary:'',summaryEligible:false,summaryFinal:false };
}
const clip = x => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
export function classifyQuestion(raw) {
  let questions=[];try{const value=JSON.parse(raw)?.questions;if(Array.isArray(value))questions=value;}catch{}
  return { kind: questions.some(q=>Array.isArray(q?.options)&&q.options.length>0 || q?.intent?.kind==='plan-review')?'choice':'input', message: typeof questions[0]?.question==='string'?clip(questions[0].question):'' };
}
export function foldTask(state,event) {
 const d=event.data??{},at=Number(event.time)||0,seq=Number.isSafeInteger(event.seq)?event.seq:state.lastSeq+1;
 let next;
 switch(event.type){
  case 'session/title':next={...state,title:clip(d.title)};break;
  case 'turn/start':next={...state,running:true,since:at,pending:[],outcome:null,phase:'thinking',step:null,currentTools:[],toolCount:0,todoTotal:0,todoDone:0,progress:null,summary:'',summaryEligible:false,summaryFinal:false};break;
  case 'step/start':next={...state,phase:'thinking',step:Number.isSafeInteger(d.step)?d.step:null,summaryEligible:false};break;
  case 'approval/asked':next={...state,pending:[...state.pending.filter(p=>p.id!=='approval:'+d.id),{id:'approval:'+d.id,callId:d.callId??null,kind:'approval',message:clip(d.reason||d.toolName),at,seq}]};break;
  case 'approval/decided':{
   const pending=state.pending.filter(p=>p.id!=='approval:'+d.id);if(pending.length===state.pending.length)return state;next={...state,pending,phase:state.currentTools.length?'tool':state.running?'thinking':'idle'};break;
  }
  case 'tool/call':{
   if(typeof d.callId!=='string'||typeof d.name!=='string')return state;
   const currentTools=[...state.currentTools.filter(t=>t.callId!==d.callId),{name:clip(d.name),callId:d.callId}];
   const pending=d.name==='ask_user_question'?[...state.pending.filter(p=>p.id!=='question:'+d.callId),{id:'question:'+d.callId,callId:d.callId,...classifyQuestion(d.arguments),at,seq}]:state.pending;
   next={...state,currentTools,pending,phase:'tool',summaryEligible:false};break;
  }
  case 'tool/result':{
   const id=d.message?.toolCallId??d.message?.source?.callId;if(!id)return state;
   const pending=state.pending.filter(p=>p.callId!==id),currentTools=state.currentTools.filter(t=>t.callId!==id);
   const completed=currentTools.length<state.currentTools.length;
   if(!completed&&pending.length===state.pending.length)return state;
   next={...state,pending,currentTools,toolCount:state.toolCount+(completed?1:0),phase:currentTools.length?'tool':'thinking',summaryEligible:false};break;
  }
  case 'todo/write':{
   if(!Array.isArray(d.todos)||!d.todos.every(t=>t&&typeof t==='object'&&typeof t.content==='string'&&t.content.trim().length>0&&['pending','in_progress','completed'].includes(t.status)))return state;
   const todoTotal=d.todos.length,todoDone=d.todos.filter(t=>t?.status==='completed').length;
   next={...state,todoTotal,todoDone,progress:todoTotal?todoDone/todoTotal:null};break;
  }
  case 'assistant/message':{
   const blocks=d.message?.content;if(!Array.isArray(blocks))return state;
   const text=blocks.filter(b=>b?.type==='text'&&typeof b.text==='string').map(b=>b.text).join(' ');
   const summary=Array.from(text.replace(/\s+/g,' ').trim()).slice(0,180).join('');
   // A durable message is not a final answer until a completed turn ends without more work.
   next={...state,summary,summaryEligible:!!summary&&!d.interrupted&&!blocks.some(b=>b?.type==='tool-call'),summaryFinal:false,phase:state.currentTools.length?'tool':'thinking'};break;
  }
  case 'turn/end':{
   const reasons={completed:'done',aborted:'stopped',error:'error','max-tokens':'error',blocked:'error',interrupted:'interrupted',forked:'forked'};
   const kind=d.reason?.kind==='aborted' && d.reason?.reason?.kind!=='user' ? 'interrupted' : reasons[d.reason?.kind]??'unknown';
   const message=clip(d.reason?.error?.message || (d.reason?.kind==='max-tokens'?'输出达到长度上限':d.reason?.kind==='blocked'?'任务被拦截':''));
   const summaryFinal=kind==='done'&&state.summaryEligible&&state.currentTools.length===0;
   next={...state,running:false,pending:[],currentTools:[],phase:kind,summaryFinal,outcome:{kind,message,summary:state.summary,summaryFinal,at,seq,turn:d.turn??0,durationMs:state.since===null?null:Math.max(0,at-state.since)}};break;
  }
  default:return state;
 }
 if(next.pending.length)next.phase='waiting';
 return {...next,updatedAt:event.type==='session/title'?state.updatedAt:at,lastSeq:seq};
}

/**
 * One rule for every surface: the newest unanswered request is the one shown.
 * Older prompts stay in the Session and become current again once it settles,
 * so the panel row, the bubble and the system notice never disagree.
 */
export function selectAttention(pending){
 if(!Array.isArray(pending)||pending.length===0)return null;
 for(let i=pending.length-1;i>=0;i--)if(pending[i])return pending[i];
 return null;
}

/**
 * Ephemeral delivery receipts: never interpret a successful constructor as
 * displayed. Native submission is a separate step with bounded retries, so a
 * failed helper no longer consumes the only reminder.
 */
export class DeliveryQueue {
 constructor({now=()=>Date.now(),waitMs=7000,limit=100,maxNativeAttempts=3,nativeRetryMs=15000}={}){
  this.now=now;this.waitMs=waitMs;this.limit=limit;this.maxNativeAttempts=Math.max(1,maxNativeAttempts);this.nativeRetryMs=nativeRetryMs;this.items=[];
 }
 find(id){return this.items.find(n=>n.id===id);}
 push(event){
  if(this.items.some(n=>n.id===event.id))return this.items.find(n=>n.id===event.id);
  for(const n of this.items)if(n.sessionId===event.sessionId&&!['withdrawn','shown','native','native-submitted'].includes(n.status))n.status='withdrawn';
  const n={...event,status:'pending',client:null,attempts:0,deadline:this.now()+this.waitMs};
  this.items.push(n);if(this.items.length>this.limit)this.items.shift();return n;
 }
 claim(id,client){const n=this.find(id);if(!n||n.status!=='pending')return false;n.client=client;n.status='claimed';n.deadline=this.now()+this.waitMs;return true;}
 ack(id,client,stage){const n=this.find(id);if(!n||n.client!==client||n.status!=='claimed')return false;if(stage==='shown')n.status='shown';else if(stage==='error'){n.status='failed';n.deadline=this.now();}else return false;return true;}
 withdraw(sessionId){for(const n of this.items)if(n.sessionId===sessionId&&n.kind==='waiting')n.status='withdrawn';}
 /** Eligible for a native attempt; does not mutate, so presence can defer them first. */
 peekDue(){return this.items.filter(n=>['pending','claimed','failed'].includes(n.status)&&n.deadline<=this.now());}
 /** Atomically takes an eligible item into the native-attempt state. */
 beginNative(id){const n=this.find(id);if(!n||!['pending','claimed','failed'].includes(n.status)||n.deadline>this.now())return false;n.status='native';n.attempts+=1;n.deadline=this.now()+this.waitMs;return true;}
 /** Records the real helper outcome; failures return to the queue until attempts run out. */
 settleNative(id,{ok=false,reason='' }={}){
  const n=this.find(id);if(!n||!['native','native-submitted'].includes(n.status))return null;
  if(ok){n.status='native-submitted';n.nativeReason=reason;return n.status;}
  n.nativeReason=reason;
  if(n.attempts<this.maxNativeAttempts){n.status='pending';n.deadline=this.now()+this.nativeRetryMs;return n.status;}
  n.status='native-failed';return n.status;
 }
 /** Foreground suppression: retry later without charging an attempt. */
 defer(id,ms=30000){const n=this.find(id);if(!n||!['pending','claimed','failed'].includes(n.status))return false;n.status='pending';n.deadline=this.now()+ms;return true;}
 /** Keep eligibility semantics of 1.x: one eligible item leaves the queue once. */
 due(){const due=this.peekDue();for(const n of due)this.beginNative(n.id);return due;}
 /** Drop only terminal, old receipts so a long session cannot grow without bound. */
 prune(at,maxAgeMs=3600000){
  const terminal=new Set(['withdrawn','shown','native-submitted','native-failed']);
  this.items=this.items.filter(n=>!(terminal.has(n.status)&&Number.isFinite(n.at)&&at-n.at>maxAgeMs));
 }
 list(){return this.items.map(n=>({...n}));}
}
