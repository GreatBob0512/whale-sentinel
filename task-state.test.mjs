import test from 'node:test';
import assert from 'node:assert/strict';
let mod={};try{mod=await import('./task-state.js')}catch{}
const init=()=>{assert.equal(typeof mod.initialState,'function','initialState must exist');return mod.initialState({id:'s',cwd:'C:/work'})};
const event=(type,data={},seq=1)=>({type,data,seq,time:1000+seq*100});
const fold=(s,e)=>mod.foldTask(s,e);
test('irrelevant events and stream attempts retain object identity',()=>{const s=init();for(const type of ['request/header','assistant/attempt','unknown/event'])assert.equal(fold(s,event(type)),s)});
test('completed vs stopped vs failed are distinct',()=>{for(const [kind,want] of [['completed','done'],['aborted','stopped'],['error','error'],['max-tokens','error'],['blocked','error'],['interrupted','interrupted']]){const s=fold(init(),event('turn/end',{turn:1,reason:{kind,reason:{kind:'user'},error:{message:'failed'}}}));assert.equal(s.outcome.kind,want)}});
test('non-user aborts must not masquerade as manual stop',()=>{for(const kind of ['hook','parent','disposed','legacy']){const s=fold(init(),event('turn/end',{reason:{kind:'aborted',reason:{kind}}}));assert.equal(s.outcome.kind,'interrupted')}});
test('choice and text requests differ, and answered questions settle',()=>{let s=init();s=fold(s,event('tool/call',{name:'ask_user_question',callId:'q',arguments:JSON.stringify({questions:[{question:'Pick?',options:[{label:'a'}]}]})}));assert.equal(s.pending[0].kind,'choice');s=fold(s,event('tool/result',{message:{toolCallId:'q'}},2));assert.deepEqual(s.pending,[]);s=fold(s,event('tool/call',{name:'ask_user_question',callId:'q2',arguments:'{"questions":[{"question":"Name?"}]}'},3));assert.equal(s.pending[0].kind,'input')});
test('malformed question lists normalize to safe input with no raw payload',()=>{
 for(const questions of [{},'not a list',42,null])assert.deepEqual(mod.classifyQuestion(JSON.stringify({questions})),{kind:'input',message:''});
 for(const raw of ['not json','null','42','"text"'])assert.deepEqual(mod.classifyQuestion(raw),{kind:'input',message:''});
 assert.deepEqual(mod.classifyQuestion('{"questions":[{"question":{},"options":"not options"}]}'),{kind:'input',message:''});
 const s=fold(init(),event('tool/call',{name:'ask_user_question',callId:'q',arguments:'{"questions":{}}'}));assert.equal(s.pending[0].kind,'input');assert.equal(s.pending[0].message,'');
});
test('malformed todo snapshots fail closed without changing actual progress',()=>{
 const s=fold(init(),event('todo/write',{todos:[{content:'done',status:'completed'}]}));
 for(const todos of [{},'bad',42,null,[null],[42],[{content:'x',status:'invented'}],[{status:'completed'}],[{content:42,status:'completed'}]])assert.equal(fold(s,event('todo/write',{todos},2)),s);
});
test('malformed assistant content never throws or reads non-text payloads',()=>{
 const s=init();for(const content of [{},'raw private text',42,null])assert.equal(fold(s,event('assistant/message',{message:{content}})),s);
 const next=fold(s,event('assistant/message',{message:{content:[null,42,'raw private text',{type:'text',text:42},{type:'reasoning',get text(){throw Error('private reasoning must not be read')}},{type:'text',text:'safe'}]}}));assert.equal(next.summary,'safe');assert.doesNotMatch(JSON.stringify(next),/private/);
});
test('approval decisions clear their own prompt only',()=>{let s=fold(init(),event('approval/asked',{id:'a',callId:'c',reason:'permission'}));assert.equal(s.pending[0].kind,'approval');s=fold(s,event('approval/decided',{id:'a'},2));assert.equal(s.pending.length,0)});
test('turn boundaries clear waiting and retain duration',()=>{let s=fold(init(),event('turn/start',{turn:1},1));s=fold(s,event('turn/end',{turn:1,reason:{kind:'completed'}},6));assert.equal(s.outcome.durationMs,500);assert.equal(s.running,false);assert.equal(s.pending.length,0)});
test('state is JSON serializable and title preserved',()=>{const s=fold(init(),event('session/title',{title:'Hello'}));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.equal(s.title,'Hello')});
test('delivery claim is per event and at most once, ACK cancels fallback',()=>{assert.equal(typeof mod.DeliveryQueue,'function');let now=1000;const q=new mod.DeliveryQueue({now:()=>now});const n=q.push({id:'e1',sessionId:'s',kind:'done'});assert.equal(q.claim(n.id,'page'),true);assert.equal(q.claim(n.id,'other'),false);assert.equal(q.ack(n.id,'other','shown'),false);assert.equal(q.ack(n.id,'page','shown'),true);now+=10000;assert.equal(q.due().length,0)});
test('failed or missing show confirmation becomes native fallback exactly once',()=>{assert.equal(typeof mod.DeliveryQueue,'function');let now=1000;const q=new mod.DeliveryQueue({now:()=>now});q.push({id:'e',sessionId:'s',kind:'error'});q.claim('e','p');q.ack('e','p','error');assert.equal(q.due().length,1);assert.equal(q.due().length,0)});
test('same-session supersession withdraws stale notice',()=>{assert.equal(typeof mod.DeliveryQueue,'function');const q=new mod.DeliveryQueue();q.push({id:'a',sessionId:'s',kind:'waiting'});q.push({id:'b',sessionId:'s',kind:'done'});assert.equal(q.claim('a','p'),false);assert.equal(q.claim('b','p'),true);assert.equal(q.list().find(x=>x.id==='a').status,'withdrawn')});

test('durable steps and parallel tools expose only names and call IDs',()=>{
 let s=fold(init(),event('turn/start'));
 s=fold(s,event('step/start',{step:3},2));assert.equal(s.phase,'thinking');assert.equal(s.step,3);assert.equal(s.updatedAt,1200);
 s=fold(s,event('tool/call',{name:'read',callId:'a',arguments:'PRIVATE ARGUMENT'},3));
 s=fold(s,event('tool/call',{name:'write',callId:'b',arguments:'PRIVATE ARGUMENT'},4));
 assert.equal(s.phase,'tool');assert.deepEqual(s.currentTools,[{name:'read',callId:'a'},{name:'write',callId:'b'}]);assert.equal(s.toolCount,0);
 s=fold(s,event('tool/result',{message:{source:{callId:'a'},content:[{type:'text',text:'PRIVATE OUTPUT'}]}},5));
 assert.deepEqual(s.currentTools,[{name:'write',callId:'b'}]);assert.equal(s.toolCount,1);
 const same=s;assert.equal(fold(s,event('tool/result',{message:{toolCallId:'a'}},6)),same);
 s=fold(s,event('tool/result',{message:{toolCallId:'b'}},7));assert.equal(s.toolCount,2);assert.equal(s.phase,'thinking');assert.deepEqual(s.currentTools,[]);
 assert.doesNotMatch(JSON.stringify(s),/PRIVATE/);assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
});
test('todo/write whole-list snapshots supply actual counts and no invented percentage',()=>{
 let s=fold(init(),event('turn/start'));assert.equal(s.progress,null);assert.equal(s.todoTotal,0);assert.equal(s.todoDone,0);
 s=fold(s,event('todo/write',{todos:[{content:'a',status:'completed'},{content:'b',status:'in_progress'},{content:'c',status:'pending'}]},2));
 assert.equal(s.todoTotal,3);assert.equal(s.todoDone,1);assert.equal(s.progress,1/3);
 s=fold(s,event('todo/write',{todos:[]},3));assert.equal(s.progress,null);assert.equal(s.todoTotal,0);
 s=fold(s,event('turn/start',{},4));assert.equal(s.todoDone,0);assert.equal(s.step,null);assert.equal(s.toolCount,0);
});
test('text-only output summary is clipped to 180 characters and final only on completed turn',()=>{
 let s=fold(init(),event('turn/start'));
 s=fold(s,event('assistant/message',{message:{content:[{type:'reasoning',get text(){throw Error('must not read reasoning')}},{type:'text',text:'中'.repeat(210)}]}},2));
 assert.equal(s.summary.length,180);assert.equal(s.summaryFinal,false);assert.equal(s.outcome,null);
 s=fold(s,event('turn/end',{reason:{kind:'completed'}},3));assert.equal(s.outcome.summary.length,180);assert.equal(s.outcome.summaryFinal,true);
 s=fold(s,event('turn/start',{},4));assert.equal(s.summary,'');
 s=fold(s,event('assistant/message',{message:{content:[{type:'text',text:'我先检查'}]}},5));
 s=fold(s,event('tool/call',{name:'read',callId:'r',arguments:'secret'},6));
 s=fold(s,event('turn/end',{reason:{kind:'completed'}},7));assert.equal(s.outcome.summary,'我先检查');assert.equal(s.outcome.summaryFinal,false);assert.deepEqual(s.currentTools,[]);
});
test('approval settlement returns to the actual running phase',()=>{
 let s=fold(init(),event('turn/start'));s=fold(s,event('tool/call',{name:'write',callId:'w',arguments:'secret'},2));
 s=fold(s,event('approval/asked',{id:'a',callId:'w'},3));assert.equal(s.phase,'waiting');
 s=fold(s,event('approval/decided',{id:'a'},4));assert.equal(s.phase,'tool');
 s=fold(s,event('tool/result',{message:{toolCallId:'w'}},5));assert.equal(s.phase,'thinking');
});
test('non-completed or interrupted assistant output is never a final result',()=>{
 for(const reason of ['error','aborted','interrupted']){let s=fold(init(),event('turn/start'));s=fold(s,event('assistant/message',{message:{content:[{type:'text',text:'partial'}]}},2));s=fold(s,event('turn/end',{reason:{kind:reason}},3));assert.equal(s.outcome.summary,'partial');assert.equal(s.outcome.summaryFinal,false)}
 let s=fold(init(),event('assistant/message',{interrupted:true,message:{content:[{type:'text',text:'cut off'}]}}));s=fold(s,event('turn/end',{reason:{kind:'completed'}},2));assert.equal(s.outcome.summaryFinal,false);
});
