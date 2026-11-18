import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createTaskHost} from './host.js';
import {cleanExcerpt} from './notification-format.js';

function setup(options={}){
 const native={notifyCalls:[],async notify(n){this.notifyCalls.push(n);return{ok:true,reason:'submitted'}},async wake(){return{ok:true,reason:'foreground'}},dispose(){}};
 const ctx={on(){},effect(f){return f()},get(){},webServer:{register:()=>()=>{}},connection:{requestRejection:()=>undefined},agents:{list:()=>[]}};
 const host=createTaskHost(ctx,{stateOf:s=>s.state},native,{now:()=>now,...options});
 host.mount();
 return{host,native};
}
let now=1000;

const root=(id,extra={})=>({id,state:{sessionId:id,title:id,child:false,running:true,since:1,lastSeq:0,pending:[],outcome:null,cwd:'C:\\work\\demo',parentSession:null,...extra}});
const child=(id,parentSession,extra={})=>({id,state:{sessionId:id,title:id,child:true,running:true,since:1,lastSeq:0,pending:[],outcome:null,cwd:'C:\\work\\demo',parentSession,...extra}});

test('a running subagent is aggregated into its root row and never becomes its own notice',()=>{
 now=1000;
 const{host}=setup();
 const parent=root('root-1');host.remember(parent,false);host.remember(parent);
 const kid=child('kid-1','root-1');host.remember(kid,false);host.remember(kid);
 const snap=host.snapshot();
 assert.equal(snap.active.length,1,'only the root is a row');
 assert.equal(snap.active[0].sessionId,'root-1');
 assert.deepEqual(snap.active[0].children,{running:1,total:1,waiting:0});
 assert.equal(snap.active[0].workspace,'demo','workspace label comes from the cwd basename');
 assert.equal(snap.stats.children,1);
 assert.equal(snap.notices.length,0,'a child never raises a reminder');
 host.dispose();
});

test('an idle child is not counted as running subagent activity',()=>{
 now=1000;
 const{host}=setup();
 host.remember(root('root-2'),false);
 host.remember(child('kid-2','root-2',{running:false}),false);
 const row=host.snapshot().active[0];
 assert.deepEqual(row.children,{running:0,total:0,waiting:0},'only live child activity is aggregated');
 host.dispose();
});

test('one focused window keeps foreground suppression against a hidden second window',()=>{
 now=1000;
 const{host,native}=setup();
 return (async()=>{
  await host.action({action:'test'});
  now+=10000;
  await host.action({action:'presence',client:'page-a',visible:true,focused:false});
  await host.action({action:'presence',client:'page-b',visible:true,focused:true});
  host.tick();await Promise.resolve();await Promise.resolve();
  assert.equal(native.notifyCalls.length,0,'the focused window still suppresses');
  // Both windows go to the background: delivery resumes.
  await host.action({action:'presence',client:'page-b',visible:false,focused:false});
  now+=31000;
  host.tick();await Promise.resolve();await Promise.resolve();
  assert.equal(native.notifyCalls.length,1);
  host.dispose();
 })();
});

test('a hidden window cannot clear another window foreground state',()=>{
 now=1000;
 const{host,native}=setup();
 return (async()=>{
  await host.action({action:'presence',client:'page-a',visible:true,focused:true});
  await host.action({action:'presence',client:'page-b',visible:false,focused:false});
  await host.action({action:'test'});
  now+=10000;
  host.tick();await Promise.resolve();await Promise.resolve();
  assert.equal(native.notifyCalls.length,0,'suppressed while any window is focused');
  host.dispose();
 })();
});

test('the long-run nudge is opt-in, fires once per turn and not for children',async()=>{
 now=1000;
 const{host}=setup();
 const session=root('long-1',{since:1000});
 host.remember(session,false);host.remember(session);
 now=1000+20*60*1000;
 host.tick();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,0,'disabled by default');
 await host.action({action:'preferences',longRunEnabled:true});
 host.tick();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,1);
 host.tick();host.tick();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,1,'one nudge per running turn');
 // A new turn has its own since value and may nudge again.
 session.state={...session.state,lastSeq:5,since:now};
 host.remember(session);
 now+=20*60*1000;host.tick();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,2);
 host.dispose();
});

test('long-run never nudges a delegated child',async()=>{
 now=1000;
 const{host}=setup();
 await host.action({action:'preferences',longRunEnabled:true});
 host.remember(root('r',{running:false}),false);
 host.remember(child('c','r',{since:1000}),false);
 now+=20*60*1000;host.tick();
 assert.equal(host.snapshot().events.filter(e=>e.kind==='longRun').length,0);
 host.dispose();
});

test('navigation diagnostics land in the delivery trace with their reason',async()=>{
 now=1000;
 const{host}=setup();
 await host.action({action:'diagnostic',stage:'navigation-success',sessionId:'s-1',noticeId:'n-1'});
 await host.action({action:'diagnostic',stage:'navigation-failed',sessionId:'s-2',noticeId:'n-2',reason:'打开超时'});
 const trace=host.snapshot().delivery;
 assert.equal(trace[0].stage,'navigation-failed');
 assert.equal(trace[0].reason,'打开超时');
 assert.equal(trace[0].sessionId,'s-2');
 assert.equal(trace[1].stage,'navigation-success');
 await assert.rejects(()=>host.action({action:'diagnostic',stage:'made-up'}));
 host.dispose();
});

test('terminal receipts older than an hour are pruned while pending work survives',async()=>{
 now=1000;
 const{host}=setup();
 await host.action({action:'test'});
 now+=10000;host.tick();await Promise.resolve();await Promise.resolve();
 assert.equal(host.snapshot().notices.length,1,'submitted receipt is kept for now');
 now+=61*60*1000;host.tick();
 assert.equal(host.snapshot().notices.length,0,'old terminal receipt is dropped');
 host.dispose();
});

test('client and host plain-text rules stay identical',async()=>{
 const source=readFileSync(new URL('./client.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const marker='    return {\n      inject:';
 assert.ok(source.includes(marker),'insertion marker must exist');
 const patched=source.replace(marker, '    window.__whalePlainText = plainText;\n    return {\n      inject:');
 assert.ok(patched.length>source.length,'test hook must be inserted');
 let factory;const sandbox={window:{__ModuleLoader__:{load:x=>factory=x.factory},localStorage:{getItem:()=>null,setItem(){}}},document:{hidden:true,visibilityState:'hidden',hasFocus:()=>false,addEventListener(){},removeEventListener(){}},console,Date,fetch:async()=>({ok:true,json:async()=>({})}),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},URL,AbortController};
 vm.runInNewContext(patched,sandbox);
 factory(name=>{if(name==='react')return{createElement(){},useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect(){}};throw new Error(name)});
 const clientPlain=sandbox.window.__whalePlainText;
 assert.equal(typeof clientPlain,'function');
 const corpus=[
  '## **已完成**\n- 修复 `按钮`，见 [报告](C:/private/report.md)',
  '说明\n```js\nsecret()\n```\nhttps://host/token?key=abc\n完成',
  '![图](https://x/y.png) 纯文本 *重点* ~~删除~~',
  'a\\*escaped\\*b',
  '控制\u0001字符\u007f',
  '一'.repeat(200),
  ''
 ];
 for(const sample of corpus){
  for(const max of [20,96,120]){
   assert.equal(clientPlain(sample,max),cleanExcerpt(sample,max),`client and host differ for ${JSON.stringify(sample).slice(0,40)} max=${max}`);
  }
 }
});
