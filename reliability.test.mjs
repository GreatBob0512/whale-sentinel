import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DeliveryQueue,selectAttention} from './task-state.js';
import {readPreferences,protocolFor} from './release-2.3.1.js';
import {createActivationQueue} from './activation-queue.js';
import {createTaskHost} from './host.js';

function hostSetup(options={}){
 const handlers={},routes=new Map();
 const native={notifyCalls:[],removeCalls:[],wakeCalls:0,async notify(n){this.notifyCalls.push(n);return options.notifyResult??{ok:true,reason:'submitted'}},async remove(n){this.removeCalls.push(n);return{ok:true,reason:'removed'}},async wake(){this.wakeCalls++;return{ok:true,reason:'restored'}},dispose(){}};
 const handle={stateOf:s=>s.state};
 const ctx={on(n,f){handlers[n]=f},effect(f){return f()},get(){},webServer:{register:r=>{routes.set(r.path,r);return()=>{}}},connection:{requestRejection:()=>undefined},agents:{list:()=>[]}};
 const host=createTaskHost(ctx,handle,native,options);
 host.mount();
 return {host,native,routes,handlers};
}

test('a notice whose browser and native delivery both fail is retried, then reports a real failure',async()=>{
 let now=1000;
 const {host,native}=hostSetup({now:()=>now,notifyResult:{ok:false,reason:'toast-failed'}});
 await host.action({action:'test'});
 now+=10000;
 host.tick();await Promise.resolve();await Promise.resolve();
 let notice=host.snapshot().notices.find(n=>n.test===true);
 assert.equal(native.notifyCalls.length,1,'first native attempt really happens');
 assert.equal(notice.status,'pending','a failed helper returns the notice to the queue');
 now+=16000;
 host.tick();await Promise.resolve();
 assert.equal(native.notifyCalls.length,2,'second attempt after the retry delay');
 now+=16000;
 host.tick();await Promise.resolve();
 assert.equal(native.notifyCalls.length,3,'third attempt');
 now+=16000;
 host.tick();await Promise.resolve();
 assert.equal(native.notifyCalls.length,3,'attempts are bounded');
 notice=host.snapshot().notices.find(n=>n.test===true);
 assert.equal(notice.status,'native-failed','final state is an honest failure, not a success');
 assert.equal(notice.attempts,3);
 host.dispose();
});

test('without a ready click bridge the reminder is still delivered, as notification-only',async()=>{
 let now=1000;
 const activation={ready:false,issue:()=>null,consume:()=>[],dispose(){}};
 const {host,native}=hostSetup({now:()=>now,activation});
 await host.action({action:'test'});
 now+=10000;
 host.tick();await Promise.resolve();
 assert.equal(native.notifyCalls.length,1,'a missing bridge must not swallow the reminder');
 assert.equal(native.notifyCalls[0].noNavigation,true);
 assert.equal(native.notifyCalls[0].activationUri,undefined,'it never claims a target it cannot reach');
 host.dispose();
});

test('a bridge that is ready but cannot issue a token still delivers exactly one notice',async()=>{
 let now=1000;
 const activation={ready:true,issue:()=>null,consume:()=>[],dispose(){}};
 const {host,native}=hostSetup({now:()=>now,activation});
 await host.action({action:'test'});
 now+=10000;
 host.tick();await Promise.resolve();await Promise.resolve();
 assert.equal(native.notifyCalls.length,1,'degrading must not schedule a duplicate retry');
 assert.equal(native.notifyCalls[0].noNavigation,true);
 const notice=host.snapshot().notices.find(n=>n.test===true);
 assert.equal(notice.status,'native-submitted');
 now+=60000;
 host.tick();await Promise.resolve();
 assert.equal(native.notifyCalls.length,1,'a delivered notice is never re-sent');
 host.dispose();
});

test('one failing notice no longer aborts the rest of the delivery pass',async()=>{
 let now=1000;
 const {host,native}=hostSetup({now:()=>now});
 for(const id of ['a','b']){
  host.remember({id,state:{sessionId:id,title:id,child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null}},false);
  await host.action({action:'test',sessionId:id});
 }
 now+=10000;
 const original=native.notify.bind(native);
 let calls=0;
 native.notify=async content=>{calls+=1;if(calls===1)throw new Error('helper exploded');return original(content);};
 host.tick();
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(calls,2,'both notices reach the helper');
 const notices=host.snapshot().notices.filter(n=>n.test===true);
 assert.equal(notices.filter(n=>n.status==='native-submitted').length,1);
 assert.equal(notices.filter(n=>n.status==='pending').length,1,'the failed one can retry later');
 host.dispose();
});

test('panel row, bubble and notice share one attention rule',async()=>{
 let now=1000;
 const {host}=hostSetup({now:()=>now});
 const session={id:'s',state:{sessionId:'s',title:'Work',child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null}};
 const base=session.state;
 host.remember(session,false);
 session.state={...base,lastSeq:1,pending:[{id:'question:old',callId:'old',seq:1,at:1,kind:'approval',message:'old approval'}]};
 host.remember(session);
 session.state={...base,lastSeq:2,pending:[...session.state.pending,{id:'question:new',callId:'new',seq:2,at:2,kind:'choice',message:'new choice'}]};
 host.remember(session);
 const row=host.snapshot().active.find(x=>x.sessionId==='s');
 const notice=host.snapshot().notices.filter(n=>n.sessionId==='s').at(-1);
 assert.equal(row.waitKind,'choice');
 assert.equal(notice.waitKind,'choice');
 assert.equal(row.message,notice.message,'the same request is highlighted everywhere');
 assert.equal(selectAttention(session.state.pending).id,'question:new');
 host.dispose();
});

test('a channel test never enters recent activity, stats or the done count',async()=>{
 let now=1000;
 const {host}=hostSetup({now:()=>now});
 assert.equal(host.snapshot().stats.doneToday,0);
 const result=await host.action({action:'test'});
 assert.equal(typeof result.id,'string');
 assert.equal(host.snapshot().events.length,0,'diagnostic notice is not history');
 assert.equal(host.snapshot().stats.doneToday,0,'and cannot inflate the finished count');
 assert.ok(host.snapshot().notices.some(n=>n.id===result.id),'but it still reaches the page channel');
 host.dispose();
});

test('stats separate live sessions from events and only count real results',async()=>{
 let now=1000;
 const {host}=hostSetup({now:()=>now});
 const a={id:'a',state:{sessionId:'a',title:'A',child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null}};
 host.remember(a,false);
 const b={id:'b',state:{sessionId:'b',title:'B',child:false,running:false,since:1,lastSeq:0,pending:[],outcome:null}};
 host.remember(b,false);
 b.state={...b.state,lastSeq:4,outcome:{kind:'done',at:now,seq:4,durationMs:1000}};
 host.remember(b);
 const stats=host.snapshot().stats;
 assert.equal(stats.active,1,'only the running session is active');
 assert.equal(stats.events,1,'the finished result is an event, not an active task');
 assert.equal(stats.doneToday,1);
 host.dispose();
});

test('a corrupt preferences file is preserved and the plugin still starts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'whale-prefs-'));
 const file=join(dir,'preferences.json');
 writeFileSync(file,'{not json');
 let recovered=0;
 const value=readPreferences(file,{onRecover:()=>{recovered+=1}});
 assert.equal(recovered,1);
 assert.equal(value.enabled,true,'safe defaults keep reminders on');
 assert.equal(value.recovered,true);
 const backups=readdirSync(dir).filter(name=>name.includes('.corrupt-'));
 assert.equal(backups.length,1,'damaged file is kept for diagnosis');
 assert.equal(readFileSync(join(dir,backups[0]),'utf8'),'{not json');
 const missing=readPreferences(join(dir,'absent.json'));
 assert.equal(missing.enabled,true);
 const arrayLike=join(dir,'array.json');writeFileSync(arrayLike,'[1,2]');
 assert.equal(readPreferences(arrayLike).enabled,true,'an unexpected shape falls back instead of throwing');
});

test('the click protocol is stable per profile and separate across profiles',()=>{
 const a=protocolFor('C:\\Users\\小明\\.dsh');
 const b=protocolFor('C:\\Users\\小明\\.dsh');
 const c=protocolFor('C:\\Users\\Another\\.dsh');
 assert.match(a,/^dsh-whale-[a-f0-9]{12}$/);
 assert.equal(a,b,'two live instances of one profile must share one route');
 assert.notEqual(a,c,'separate profiles must not steal each other clicks');
});

test('a shared spool directory never consumes another instance token',()=>{
 const dir=mkdtempSync(join(tmpdir(),'whale-shared-'));
 const q=createActivationQueue({dir,protocol:'dsh-whale-123456abcdef'});
 const foreign='f'.repeat(64);
 writeFileSync(join(dir,foreign+'.click'),foreign);
 assert.deepEqual(q.consume(),[],'an unknown token is not this instance click');
 assert.ok(existsSync(join(dir,foreign+'.click')),'and is left for its real owner');
 const own=q.issue({id:'n',sessionId:'s'}).split('/').at(-1);
 writeFileSync(join(dir,own+'.click'),own);
 assert.equal(q.consume().length,1);
 q.dispose();
});

test('the Windows launcher is written as Unicode and stale routes are only pruned when dead',()=>{
 const ps=readFileSync(new URL('./win-activation.ps1',import.meta.url),'utf8');
 assert.match(ps,/\[Text\.Encoding\]::Unicode/,'CJK user directories need a Unicode launcher');
 assert.doesNotMatch(ps,/\[Text\.Encoding\]::ASCII\)/);
 assert.match(ps,/IO\.Directory\]::Exists/,'pruning requires proving the old launcher directory is gone');
 assert.match(ps,/shell\\open\\command/,'and reads the old command before deciding');
 assert.doesNotMatch(ps,/\$staleMarker -ceq \$marker\) \{ \$root\.DeleteSubKeyTree/,'a bare marker match must not delete a live instance');
});

test('foreground withdrawal is a host decision, not a client lie',async()=>{
 let now=1000;
 const{host}=hostSetup({now:()=>now});
 const result=await host.action({action:'test'});
 assert.equal(host.snapshot().notices.find(n=>n.id===result.id).status,'pending');
 const suppressed=await host.action({action:'suppress',ids:[result.id]});
 assert.equal(suppressed.suppressed,1);
 assert.equal(host.snapshot().notices.find(n=>n.id===result.id).status,'withdrawn');
 await assert.rejects(()=>host.action({action:'suppress',ids:'nope'}));
 host.dispose();
});

test('finished results survive a flood of transient start events',async()=>{
 let now=100000;
 const{host}=hostSetup({now:()=>now});
 const session={id:'s',state:{sessionId:'s',title:'S',child:false,running:true,since:1,lastSeq:1,pending:[],outcome:null}};
 host.remember(session,false);
 session.state={...session.state,lastSeq:2,running:false,outcome:{kind:'done',at:now-5000,seq:2,durationMs:1000,summary:'ok',summaryFinal:true}};
 host.remember(session);
 assert.equal(host.snapshot().results.length,1);
 for(let i=0;i<60;i++){
  session.state={...session.state,running:true,since:2000+i,lastSeq:3+i,outcome:null};
  host.remember(session);
 }
 const snap=host.snapshot();
 assert.equal(snap.results.length,1,'results have their own bounded record');
 assert.equal(snap.results[0].kind,'done');
 assert.equal(snap.resultsTotal,1);
 assert.equal(snap.events.some(e=>e.id===snap.results[0].id),false,'mixed history already dropped it');
 host.dispose();
});

test('simultaneous completions become one toast that says how many were folded',async()=>{
 let now=1000;
 const{host,native}=hostSetup({now:()=>now});
 for(const id of ['a','b']){
  const session={id,state:{sessionId:id,title:id,child:false,running:true,since:1,lastSeq:1,pending:[],outcome:null}};
  host.remember(session,false);
  session.state={...session.state,lastSeq:2,running:false,outcome:{kind:'done',at:now+id.charCodeAt(0),seq:2,durationMs:500,summary:'',summaryFinal:false}};
  host.remember(session);
 }
 now+=10000;host.tick();
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(native.notifyCalls.length,1,'one interruption, not a burst');
 assert.match(native.notifyCalls[0].meta,/另有 1 个任务已完成/);
 const statuses=host.snapshot().notices.filter(n=>n.kind==='done').map(n=>n.status).sort();
 assert.deepEqual(statuses,['aggregated','native-submitted']);
 host.dispose();
});

test('clearing history also clears results, pending notices and shows a withdrawal',async()=>{
 let now=1000;
 const{host,native}=hostSetup({now:()=>now});
 const session={id:'c',state:{sessionId:'c',title:'C',child:false,running:true,since:1,lastSeq:1,pending:[],outcome:null}};
 host.remember(session,false);
 session.state={...session.state,lastSeq:2,running:false,outcome:{kind:'done',at:now,seq:2,durationMs:1000,summary:'ok',summaryFinal:true}};
 host.remember(session);
 await host.action({action:'test'});
 assert.equal(host.snapshot().results.length,1);
 assert.ok(host.snapshot().notices.some(n=>n.status==='pending'));
 await host.action({action:'clear'});
 const snap=host.snapshot();
 assert.equal(snap.results.length,0,'results are cleared with history');
 assert.equal(snap.stats.doneToday,0,'the completion counter is cleared too');
 assert.equal(snap.notices.some(n=>!['withdrawn','shown','native-submitted','native-failed','aggregated'].includes(n.status)),false,'no pending notice survives');
 assert.ok(native.removeCalls.length>0,'the Windows toast group is withdrawn');
 host.dispose();
});

test('completed-today is a counter, not a slice of the 50-result window',async()=>{
 let now=1000;
 const{host}=hostSetup({now:()=>now});
 const session={id:'many',state:{sessionId:'many',title:'Many',child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null}};
 host.remember(session,false);
 for(let i=1;i<=60;i++){
  session.state={...session.state,running:true,since:i,lastSeq:i*2-1,outcome:null};
  host.remember(session);
  session.state={...session.state,running:false,lastSeq:i*2,outcome:{kind:'done',at:now,seq:i*2,durationMs:100,summary:'',summaryFinal:false}};
  host.remember(session);
 }
 const snap=host.snapshot();
 assert.equal(snap.results.length,50,'the result record stays bounded');
 assert.equal(snap.stats.doneToday,60,'the count is not truncated by the record cap');
 host.dispose();
});

test('a session with several pending prompts exposes how many are waiting',()=>{
 let now=1000;
 const{host}=hostSetup({now:()=>now});
 const session={id:'m',state:{sessionId:'m',title:'M',child:false,running:true,since:1,lastSeq:2,pending:[{id:'a',seq:1,at:1,kind:'approval',message:'A'},{id:'b',seq:2,at:2,kind:'input',message:'B'}],outcome:null}};
 host.remember(session,false);host.remember(session);
 const row=host.snapshot().active[0];
 assert.equal(row.pendingCount,2);
 assert.equal(row.message,'B','the newest prompt is the visible one');
 host.dispose();
});

test('a disposed agent reclaims its per-session state, and a return re-adds it',()=>{
 let now=1000;
 const{host,handlers}=hostSetup({now:()=>now});
 const session={id:'z',state:{sessionId:'z',title:'Z',child:false,running:true,since:1,lastSeq:1,pending:[],outcome:null}};
 host.remember(session,false);host.remember(session);
 assert.equal(host.snapshot().stats.sessions,1);
 handlers['agent/disposed']({agent:{session}});
 assert.equal(host.snapshot().stats.sessions,0,'facts are dropped after disposal');
 handlers['agent/created']({agent:{session}});
 assert.equal(host.snapshot().stats.sessions,1,'a returning session is tracked again');
 host.dispose();
});

test('clearing records does not re-nudge a turn that was already nudged',async()=>{
 let now=1000;
 const{host,native}=hostSetup({now:()=>now});
 await host.action({action:'preferences',longRunEnabled:true});
 host.remember({id:'lr',state:{sessionId:'lr',title:'LR',child:false,running:true,since:1000,lastSeq:0,pending:[],outcome:null}},false);
 now=1000+20*60*1000;
 host.tick();
 now+=8000;host.tick();
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,1);
 assert.equal(native.notifyCalls.filter(n=>n.kind==='longRun').length,1);
 await host.action({action:'clear'});
 now+=8000;host.tick();await Promise.resolve();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,0,'cleared history stays cleared, no instant re-nudge');
 assert.equal(native.notifyCalls.filter(n=>n.kind==='longRun').length,1,'no second nudge after clear');
 host.dispose();
});

test('a long-run batch is folded into one toast with its own wording',async()=>{
 let now=1000;
 const{host,native}=hostSetup({now:()=>now});
 await host.action({action:'preferences',longRunEnabled:true});
 for(const id of ['x','y']){
  host.remember({id,state:{sessionId:id,title:id,child:false,running:true,since:1000,lastSeq:0,pending:[],outcome:null}},false);
 }
 now=1000+20*60*1000;
 host.tick();
 now+=8000;host.tick();
 for(let i=0;i<12;i++)await Promise.resolve();
 const calls=native.notifyCalls.filter(n=>n.kind==='longRun');
 assert.equal(calls.length,1);
 assert.match(calls[0].meta,/另有 1 个任务运行较久/);
 host.dispose();
});
