import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {initialState,foldTask} from './task-state.js';
let mod={};try{mod=await import('./host.js')}catch{}
function setup(options={}){assert.equal(typeof mod.createTaskHost,'function','host export missing');const handlers={},routes=new Map();const native={notifyCalls:[],wakeCalls:0,async notify(n){this.notifyCalls.push(n);return{ok:true,reason:'submitted'}},async wake(){this.wakeCalls++;return{ok:true,reason:'restored'}},dispose(){}};const handle={stateOf:s=>s.state};const ctx={on(n,f){handlers[n]=f},effect(f){return f()},get(){},webServer:{register:r=>{routes.set(r.path,r);return()=>{};}},connection:{requestRejection:req=>req.bad?401:undefined},agents:{list:()=>[]}};const host=mod.createTaskHost(ctx,handle,native,options);host.mount();return{host,ctx,native,routes,handlers};}
async function call(route,body,method='POST',bad=false){let status;let raw='';const req=Readable.from(body===null?[]:[JSON.stringify(body)]);Object.assign(req,{method,url:'/test',bad});const res={statusCode:200,setHeader(){},end(x){status=this.statusCode;raw=x??'';}};await route.handler(req,res);return{status,body:raw?JSON.parse(raw):null};}
test('native clicks request exact bound session and page ACK does not guess latest',async()=>{const pending=[];const activation={ready:true,issue:n=>'dsh-whale-123456abcdef://activate/'+'a'.repeat(64),consume:()=>pending.splice(0),dispose(){}};const{host,native}=setup({activation});pending.push({token:'tokA',sessionId:'session-A',noticeId:'notice-A'});host.tick();await Promise.resolve();const request=host.snapshot().focusRequest;assert.ok(request);assert.equal(request.sessionId,'session-A');assert.equal(native.wakeCalls,1);assert.equal((await host.action({action:'focus-claim',id:request.id,client:'page'})).ok,true);assert.equal((await host.action({action:'focus-claim',id:request.id,client:'other'})).ok,false);assert.equal((await host.action({action:'focus-ack',id:request.id,client:'page'})).ok,true);assert.equal(host.snapshot().focusRequest,null);host.dispose()});
test('native fallback carries opaque activation URI and missing bridge fails closed',async()=>{let now=1000;const activation={ready:true,issue:n=>'dsh-whale-123456abcdef://activate/'+'a'.repeat(64),consume:()=>[],dispose(){}};const{host,native}=setup({activation,now:()=>now});await host.action({action:'test'});now+=10000;host.tick();await Promise.resolve();assert.match(native.notifyCalls[0].activationUri,/^dsh-whale-/);host.dispose()});
test('a focused visible page suppresses the backend toast',async()=>{let now=1000;const{host,native}=setup({now:()=>now});await host.action({action:'test'});now+=30000;await host.action({action:'presence',visible:true,focused:true});host.tick();await Promise.resolve();host.tick();assert.equal(native.notifyCalls.length,0,'no system toast while DSH is in front');assert.equal(host.snapshot().delivery[0].stage,'native-skip-visible');host.dispose()});
test('background or blurred page still gets the backend toast',async()=>{let now=1000;const{host,native}=setup({now:()=>now});await host.action({action:'test'});now+=30000;await host.action({action:'presence',visible:true,focused:false});host.tick();await Promise.resolve();host.tick();assert.equal(native.notifyCalls.length,1);host.dispose()});
test('stale presence no longer suppresses delivery',async()=>{let now=1000;const{host,native}=setup({now:()=>now});await host.action({action:'test'});now+=30000;await host.action({action:'presence',visible:true,focused:true});host.tick();now+=120000;host.tick();await Promise.resolve();host.tick();assert.equal(native.notifyCalls.length,1,'presence expires after 20s');host.dispose()});
test('presence payload is validated',async()=>{const{host}=setup();await assert.rejects(()=>host.action({action:'presence',visible:'yes',focused:true}));host.dispose()});
test('host preference persistence starts disabled and writes changes',async()=>{let saved;const{host}=setup({preferences:{load:()=>({enabled:false}),save:x=>{saved=x}}});assert.equal(host.snapshot().enabled,false);await host.action({action:'preferences',enabled:true});assert.equal(saved.enabled,true);host.dispose()});
test('routes enforce authentication and method',async()=>{const {routes,host}=setup();const r=routes.get('/whale-sentinel/action');assert.equal((await call(r,{},'POST',true)).status,401);assert.equal((await call(r,{},'GET')).status,405);host.dispose()});
test('untrusted action payload cannot launch a command',async()=>{const{routes,native,host}=setup();assert.equal((await call(routes.get('/whale-sentinel/action'),{action:'exec',command:'bad'})).status,400);assert.equal(native.wakeCalls,0);host.dispose()});
test('wake action uses native helper, no app.asar dependency',async()=>{const{routes,native,host}=setup();const r=await call(routes.get('/whale-sentinel/action'),{action:'wake',sessionId:'s'});assert.equal(r.body.ok,true);assert.equal(native.wakeCalls,1);host.dispose()});
test('test notification has unique ID and can be claimed once',async()=>{const{routes,host}=setup();const action=routes.get('/whale-sentinel/action');const r=await call(action,{action:'test'});const id=r.body.id;assert.equal(typeof id,'string');assert.equal((await call(action,{action:'claim',id,client:'p'})).body.ok,true);assert.equal((await call(action,{action:'claim',id,client:'q'})).body.ok,false);assert.equal((await call(action,{action:'ack',id,client:'p',stage:'shown'})).body.ok,true);host.dispose()});
test('answering latest parallel question withdraws only that notice and promotes remaining prompt',()=>{const{host}=setup();const base={sessionId:'s',title:'Work',child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null};const session={id:'s',state:base};host.remember(session,false);session.state={...base,lastSeq:1,pending:[{id:'question:a',callId:'a',seq:1,at:1,kind:'choice',message:'A'}]};host.remember(session);session.state={...base,lastSeq:2,pending:[...session.state.pending,{id:'question:b',callId:'b',seq:2,at:2,kind:'input',message:'B'}]};host.remember(session);const b=host.snapshot().notices.at(-1);session.state={...base,lastSeq:3,pending:[session.state.pending[0]]};host.remember(session);assert.equal(host.snapshot().notices.find(n=>n.id===b.id).status,'withdrawn');assert.equal(host.snapshot().notices.at(-1).pendingId,'question:a');assert.equal(host.snapshot().notices.at(-1).status,'pending');host.dispose()});
test('current pending is restored on startup but old completed outcomes are not replayed',()=>{const{host}=setup();const pending={id:'question:a',callId:'a',seq:2,at:1,kind:'choice',message:'Still waiting'};const session={id:'s',state:{sessionId:'s',title:'Work',child:false,running:true,since:1,lastSeq:2,pending:[pending],outcome:null}};host.remember(session,false);assert.equal(host.snapshot().notices.length,1);host.remember(session,false);assert.equal(host.snapshot().notices.length,1);host.remember({id:'old',state:{...session.state,sessionId:'old',pending:[],running:false,outcome:{kind:'done',seq:2,at:1}}},false);assert.equal(host.snapshot().notices.length,1);host.dispose()});
test('answered latest shown question promotes remaining previously shown question',async()=>{const{host}=setup();const base={sessionId:'s',title:'W',child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null};const session={id:'s',state:base};host.remember(session,false);const a={id:'qa',seq:1,at:1,kind:'choice',message:'A'};const b={id:'qb',seq:2,at:2,kind:'input',message:'B'};session.state={...base,lastSeq:1,pending:[a]};host.remember(session);let n=host.snapshot().notices.at(-1);await host.action({action:'claim',id:n.id,client:'p'});await host.action({action:'ack',id:n.id,client:'p',stage:'shown'});session.state={...base,lastSeq:2,pending:[a,b]};host.remember(session);n=host.snapshot().notices.at(-1);await host.action({action:'claim',id:n.id,client:'p'});await host.action({action:'ack',id:n.id,client:'p',stage:'shown'});session.state={...base,lastSeq:3,pending:[a]};host.remember(session);assert.equal(host.snapshot().notices.at(-1).pendingId,'qa');assert.equal(host.snapshot().notices.at(-1).status,'pending');host.dispose()});
test('notification switch prevents native fallback, not merely UI display',async()=>{let now=1000;const{routes,host,native}=setup({now:()=>now});await host.action({action:'test'});assert.equal(host.snapshot().notices.length,1);await call(routes.get('/whale-sentinel/action'),{action:'preferences',enabled:false});now+=30000;host.tick();assert.equal(native.notifyCalls.length,0);assert.equal(host.snapshot().enabled,false);assert.equal(host.snapshot().notices[0].status,'withdrawn');host.dispose()});
test('missing browser receipt really invokes native fallback once',async()=>{let now=1000;const{host,native}=setup({now:()=>now});await host.action({action:'test'});now+=10000;host.tick();await Promise.resolve();host.tick();assert.equal(native.notifyCalls.length,1);assert.ok(native.notifyCalls[0].sessionId);assert.equal(host.snapshot().delivery[0].stage,'native-submitted');host.dispose()});

const sessionOf=id=>({id,state:initialState({id})});
function commit(host,session,type,data,seq,time=seq*100){session.state=foldTask(session.state,{type,data,seq,time});host.remember(session);}
test('disabled pending is recorded once and enabling restores only current waits',async()=>{
 const{host}=setup({preferences:{load:()=>({enabled:false})}}),s=sessionOf('s');host.remember(s,false);
 commit(host,s,'turn/start',{},1);commit(host,s,'tool/call',{name:'ask_user_question',callId:'q',arguments:'{"questions":[{"question":"A?"}]}'},2);
 const count=host.snapshot().events.length;commit(host,s,'step/start',{step:2},3);host.remember(s);host.remember(s,false);
 assert.equal(host.snapshot().events.length,count);assert.equal(host.snapshot().notices.length,0);
 const old=sessionOf('old');commit(host,old,'turn/end',{reason:{kind:'completed'}},1);
 await host.action({action:'preferences',enabled:true});assert.equal(host.snapshot().notices.length,1);assert.equal(host.snapshot().notices[0].pendingId,'question:q');
 const historyCount=host.snapshot().events.length;await host.action({action:'preferences',enabled:true});assert.equal(host.snapshot().events.length,historyCount);
 await host.action({action:'preferences',enabled:false});await host.action({action:'preferences',enabled:true});assert.equal(host.snapshot().notices.filter(n=>n.status==='pending').length,1);assert.equal(host.snapshot().events.length,historyCount);
 host.dispose();
});
test('settings validate booleans, clamp volume, persist and reach fallback',async()=>{
 let saved,now=1000;const{host,native}=setup({now:()=>now,preferences:{load:()=>({soundEnabled:true,soundVolume:9}),save:x=>saved=x}});
 assert.deepEqual(host.snapshot().settings,{enabled:true,soundEnabled:true,soundVolume:0.5,notifyWhenFocused:false,longRunEnabled:false,scope:'all',historyLimit:3,mascotScale:1,buddyScale:1});
 await host.action({action:'preferences',soundEnabled:false,soundVolume:-3});assert.deepEqual(saved,{enabled:true,soundEnabled:false,soundVolume:0.05,notifyWhenFocused:false,longRunEnabled:false,scope:'all',historyLimit:3,mascotScale:1,buddyScale:1});
 await assert.rejects(host.action({action:'preferences',soundEnabled:'yes'}));await assert.rejects(host.action({action:'preferences',soundVolume:'0.3'}));
 await host.action({action:'preferences',soundEnabled:true,soundVolume:0.22});await host.action({action:'test'});now+=9000;host.tick();await Promise.resolve();assert.equal(native.notifyCalls[0].soundEnabled,true);assert.equal(native.notifyCalls[0].soundVolume,0.22);host.dispose();
});
test('active rows prioritize waiting then newest activity with honest progress and stalled marker',()=>{
 let now=1000;const{host}=setup({now:()=>now});const a=sessionOf('a'),b=sessionOf('b'),c=sessionOf('c');
 for(const s of [a,b,c])host.remember(s,false);
 commit(host,a,'turn/start',{},1,100);commit(host,b,'turn/start',{},1,200);commit(host,c,'turn/start',{},1,300);
 commit(host,a,'tool/call',{name:'ask_user_question',callId:'q',arguments:'{}'},2,150);
 commit(host,c,'step/start',{step:4},2,400);commit(host,c,'todo/write',{todos:[{content:'done',status:'completed'},{content:'next',status:'pending'}]},3,500);
 commit(host,c,'tool/call',{name:'read',callId:'r',arguments:'secret'},4,600);
 const snap=host.snapshot();assert.equal(snap.version,'2.1.1');assert.deepEqual(snap.active.map(x=>x.sessionId),['a','c','b']);
 const row=snap.active[1];assert.equal(row.phase,'tool');assert.equal(row.step,4);assert.equal(row.tool,'read');assert.equal(row.toolCount,0);assert.equal(row.todoTotal,2);assert.equal(row.todoDone,1);assert.equal(row.progress,0.5);assert.equal(row.updatedAt,600);assert.equal(row.stalled,false);assert.equal(snap.active[2].progress,null);
 now=400000;assert.equal(host.snapshot().active[1].stalled,true);assert.equal(host.snapshot().active[1].phase,'tool');assert.equal(host.snapshot().events.filter(x=>x.kind==='error').length,0);host.dispose();
});
test('same durable event is not republished and terminal notice includes safe final summary',()=>{
 const{host}=setup(),s=sessionOf('s');host.remember(s,false);commit(host,s,'turn/start',{},1);commit(host,s,'assistant/message',{message:{content:[{type:'text',text:'Finished safely'}]}},2);commit(host,s,'turn/end',{reason:{kind:'completed'}},3);
 const snap=host.snapshot();assert.equal(snap.events[0].summary,'Finished safely');assert.equal(snap.events[0].summaryFinal,true);assert.equal(snap.notices.at(-1).summary,'Finished safely');host.remember(s);assert.equal(host.snapshot().events.length,snap.events.length);host.dispose();
});
test('agent disposal clears active and preserves exact committed terminal outcome',()=>{
 const{host,handlers}=setup(),s=sessionOf('s');host.remember(s,false);commit(host,s,'turn/start',{},1);assert.equal(typeof handlers['agent/disposed'],'function');
 s.state=foldTask(s.state,{type:'turn/end',data:{reason:{kind:'aborted',reason:{kind:'user'}}},seq:2,time:200});handlers['agent/disposed']({agent:{id:s.id,session:s}});
 assert.equal(host.snapshot().active.length,0);assert.equal(host.snapshot().events[0].kind,'stopped');assert.equal(host.snapshot().events[0].summaryFinal,false);assert.equal(host.snapshot().notices.at(-1).kind,'stopped');
 const t=sessionOf('t');commit(host,t,'turn/start',{},1);handlers['agent/disposed']({agent:{id:t.id,session:t}});assert.equal(host.snapshot().active.length,0);assert.equal(host.snapshot().events[0].kind,'interrupted');host.dispose();
});
test('revision changes for progress, settings and receipts but is stable for time alone',async()=>{
 let now=1000;const{host}=setup({now:()=>now}),s=sessionOf('s');host.remember(s,false);let rev=host.snapshot().rev;assert.equal(typeof rev,'string');now+=100;assert.equal(host.snapshot().rev,rev);
 commit(host,s,'turn/start',{},1);assert.notEqual(host.snapshot().rev,rev);rev=host.snapshot().rev;
 commit(host,s,'step/start',{step:1},2);assert.notEqual(host.snapshot().rev,rev);rev=host.snapshot().rev;host.remember(s);assert.equal(host.snapshot().rev,rev);
 await host.action({action:'preferences',soundEnabled:true});assert.notEqual(host.snapshot().rev,rev);
 const result=await host.action({action:'test'});rev=host.snapshot().rev;await host.action({action:'claim',id:result.id,client:'p'});assert.notEqual(host.snapshot().rev,rev);rev=host.snapshot().rev;await host.action({action:'ack',id:result.id,client:'p',stage:'shown'});assert.notEqual(host.snapshot().rev,rev);rev=host.snapshot().rev;await host.action({action:'clear'});assert.notEqual(host.snapshot().rev,rev);host.dispose();
});

test('focus-notification switch defaults off and permits toasts while DSH is focused',async()=>{
 let now=1000;const{routes,host,native}=setup({now:()=>now});
 assert.equal(host.snapshot().settings.notifyWhenFocused,false);
 await host.action({action:'test'});now+=30000;
 await host.action({action:'presence',visible:true,focused:true});host.tick();await Promise.resolve();host.tick();
 assert.equal(native.notifyCalls.length,0,'default keeps foreground suppression');
 await call(routes.get('/whale-sentinel/action'),{action:'preferences',notifyWhenFocused:true});
 now+=40000;host.tick();await Promise.resolve();host.tick();
 assert.ok(native.notifyCalls.length>=1,'enabled switch must deliver while focused');
 host.dispose();
});
test('scope, row count and mascot scale are validated and persisted',async()=>{
 let saved;const{host}=setup({preferences:{load:()=>({}),save:x=>{saved=x}}});
 assert.deepEqual({scope:host.snapshot().settings.scope,rows:host.snapshot().settings.historyLimit,scale:host.snapshot().settings.mascotScale},{scope:'all',rows:3,scale:1});
 await host.action({action:'preferences',scope:'attention',historyLimit:10,mascotScale:1.4});
 assert.equal(saved.scope,'attention');assert.equal(saved.historyLimit,10);assert.equal(saved.mascotScale,1.4);
 await assert.rejects(host.action({action:'preferences',scope:'current'}),'unsupported scope must be rejected');
 await assert.rejects(host.action({action:'preferences',scope:'everything'}));
 await assert.rejects(host.action({action:'preferences',historyLimit:7}));
 await assert.rejects(host.action({action:'preferences',mascotScale:'big'}));
 await host.action({action:'preferences',mascotScale:9});assert.equal(host.snapshot().settings.mascotScale,1.6);
 await host.action({action:'preferences',mascotScale:0.1});assert.equal(host.snapshot().settings.mascotScale,0.8);
 host.dispose();
});

test('seated and expanded sizes are independent settings',async()=>{
 let saved;const{host}=setup({preferences:{load:()=>({}),save:x=>{saved=x}}});
 assert.deepEqual({seated:host.snapshot().settings.mascotScale,expanded:host.snapshot().settings.buddyScale},{seated:1,expanded:1});
 await host.action({action:'preferences',mascotScale:1.4});
 assert.equal((await host.snapshot()).settings.mascotScale,1.4);
 assert.equal((await host.snapshot()).settings.buddyScale,1,'changing one must not move the other');
 await host.action({action:'preferences',buddyScale:0.8});
 assert.equal((await host.snapshot()).settings.buddyScale,0.8);
 assert.equal((await host.snapshot()).settings.mascotScale,1.4,'seated size stays');
 assert.equal(saved.buddyScale,0.8);
 await host.action({action:'preferences',buddyScale:9});assert.equal((await host.snapshot()).settings.buddyScale,1.6);
 await host.action({action:'preferences',buddyScale:0.1});assert.equal((await host.snapshot()).settings.buddyScale,0.8);
 await assert.rejects(host.action({action:'preferences',buddyScale:'big'}));
 host.dispose();
});
