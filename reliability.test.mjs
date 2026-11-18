import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DeliveryQueue,selectAttention} from './task-state.js';
import {readPreferences,protocolFor} from './release-2.2.0.js';
import {createActivationQueue} from './activation-queue.js';
import {createTaskHost} from './host.js';

function hostSetup(options={}){
 const handlers={},routes=new Map();
 const native={notifyCalls:[],wakeCalls:0,async notify(n){this.notifyCalls.push(n);return options.notifyResult??{ok:true,reason:'submitted'}},async wake(){this.wakeCalls++;return{ok:true,reason:'restored'}},dispose(){}};
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
