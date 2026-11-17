import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DeliveryQueue } from './task-state.js';
import { formatNotice } from './notification-format.js?release=1.3.1';

const response=(res,status,body)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(body));};
const relevant=new Set(['turn/start','turn/end','step/start','assistant/message','todo/write','session/title','approval/asked','approval/decided','tool/call','tool/result']);
const clampVolume=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0.05,Math.min(0.5,value)):0.2;
const pendingKinds={approval:'需要批准',choice:'需要选择',input:'需要输入'};

export function createTaskHost(ctx, projection, native, {now=()=>Date.now(),preferences,activation}={}) {
 const boot=randomUUID(),queue=new DeliveryQueue({now}),facts=new Map(),seen=new Map(),waitingEvents=new Map(),detached=new Set(),stalledStates=new Map();
 const loaded=preferences?.load()??{};
 const SCOPES=new Set(['all','attention']),LIMITS=new Set([3,5,10]);
 const clampScale=v=>typeof v==='number'&&Number.isFinite(v)?Math.min(1.6,Math.max(0.8,Math.round(v*10)/10)):1;
 let serial=0,revision=0,enabled=loaded.enabled!==false,soundEnabled=loaded.soundEnabled===true,soundVolume=clampVolume(loaded.soundVolume),notifyWhenFocused=loaded.notifyWhenFocused===true,scope=SCOPES.has(loaded.scope)?loaded.scope:'all',historyLimit=LIMITS.has(loaded.historyLimit)?loaded.historyLimit:3,mascotScale=clampScale(loaded.mascotScale),buddyScale=clampScale(loaded.buddyScale),disposed=false,timer=null,lastWake=null;
 const history=[],delivery=[],focusQueue=[];let presence=null;
 const changed=()=>{revision++;};
 const settings=()=>({enabled,soundEnabled,soundVolume,notifyWhenFocused,scope,historyLimit,mascotScale,buddyScale});
 const trace=(event)=>{delivery.unshift({at:now(),...event});delivery.splice(20);changed();};
 const titleOf=s=>s.title||'这个任务';
 function publish(row,notify=true){
  const event={...row,id:`${boot}:${++serial}`};history.unshift(event);history.splice(50);changed();
  if(notify&&enabled)queue.push(event);
  return event;
 }
 const waitKey=(s,p)=>JSON.stringify([s.sessionId,p.id,p.seq]);
 function waitingEvent(s,p){
  const key=waitKey(s,p);let event=waitingEvents.get(key);
  if(!event){event=publish({kind:'waiting',pendingId:p.id,waitKind:p.kind,sessionId:s.sessionId,title:titleOf(s),at:p.at,message:p.message},false);waitingEvents.set(key,event);}
  return event;
 }
 function restoreWait(s,force=false){
  if(!enabled||detached.has(s.sessionId)||!s.pending.length)return;
  const p=s.pending.at(-1),event=waitingEvent(s,p);
  const current=queue.items.filter(n=>n.sessionId===s.sessionId&&n.kind==='waiting'&&n.status!=='withdrawn').at(-1);
  if(!force&&current?.pendingId===p.id)return;
  // Promotion/re-enable is a new delivery attempt, not another history event.
  queue.push({...event,id:`${boot}:${++serial}`});changed();
 }
 function remember(session,emit=true){
  const s=projection.stateOf(session);if(s.child)return;
  const before=facts.get(session.id),watermark=seen.get(session.id)??-1;
  if(!before||s.lastSeq!==before.lastSeq){facts.set(session.id,s);changed();}
  if(emit&&s.lastSeq<=watermark)return;
  seen.set(session.id,s.lastSeq);
  if(emit&&s.running&&(!before?.running||s.since!==before.since))publish({kind:'running',sessionId:session.id,title:titleOf(s),at:s.since??now()},false);
  const livePending=new Set(s.pending.map(p=>p.id));
  const latest=queue.items.filter(n=>n.sessionId===session.id&&n.kind==='waiting').at(-1);
  const retired=latest&&latest.status!=='withdrawn'&&!livePending.has(latest.pendingId);
  for(const n of queue.items)if(n.sessionId===session.id&&n.kind==='waiting'&&!livePending.has(n.pendingId)&&n.status!=='withdrawn'){n.status='withdrawn';changed();}
  const liveKeys=new Set(s.pending.map(p=>waitKey(s,p)));
  for(const [key,event] of waitingEvents)if(event.sessionId===s.sessionId&&!liveKeys.has(key))waitingEvents.delete(key);
  for(const p of s.pending)waitingEvent(s,p);
  restoreWait(s,retired);
  if(emit&&s.outcome&&s.outcome.seq>watermark){const o=s.outcome;publish({kind:o.kind,sessionId:session.id,title:titleOf(s),at:o.at,message:o.message,summary:o.summary??'',summaryFinal:o.summaryFinal===true,durationMs:o.durationMs??null},true);}
 }
 function snapshot(){
  const at=now(),rows=[...facts.values()].filter(x=>!detached.has(x.sessionId)&&(x.running||x.pending.length));
  rows.sort((a,b)=>Number(b.pending.length>0)-Number(a.pending.length>0)||(b.updatedAt??b.since??0)-(a.updatedAt??a.since??0));
  const active=rows.map(x=>{
   const updatedAt=x.updatedAt??x.since??null,stalled=updatedAt!==null&&at-updatedAt>=300000;
   if(stalledStates.has(x.sessionId)&&stalledStates.get(x.sessionId)!==stalled)changed();stalledStates.set(x.sessionId,stalled);
   const currentTools=x.currentTools??[];
   return {sessionId:x.sessionId,title:titleOf(x),running:x.running,waiting:x.pending.length>0,waitKind:x.pending[0]?.kind??null,message:x.pending[0]?.message??'',since:x.since,phase:x.pending.length?'waiting':x.phase??'thinking',step:x.step??null,currentTools:currentTools.map(t=>({...t})),tool:currentTools.at(-1)?.name??null,toolCount:x.toolCount??0,todoTotal:x.todoTotal??0,todoDone:x.todoDone??0,progress:x.progress??null,updatedAt,stalled};
  });
  return {boot,version:'1.8.8',enabled,settings:settings(),rev:`${boot}:${revision}`,seq:serial,at,active,events:[...history],notices:queue.list(),delivery:[...delivery],focusRequest:focusQueue[0]?{id:focusQueue[0].id,sessionId:focusQueue[0].sessionId}:null,activationReady:activation?.ready===true,lastWake,native:process.platform==='win32'};
 }
 function wording(n){
  const formatted=formatNotice(n);
  const phase=n.kind==='done'?'done':n.kind==='waiting'?'waiting':['error','interrupted'].includes(n.kind)?'error':'idle';
  return {title:formatted.title,body:formatted.body,meta:formatted.meta,sessionId:n.sessionId||'whale-sentinel-test',kind:n.kind,soundEnabled,soundVolume,iconPath:fileURLToPath(new URL(`./assets/fish-${phase}-side.png`,import.meta.url))};
 }
 function tick(at=now()){
  if(disposed)return;
   try{for(const click of activation?.consume?.()??[]){
    if(click.sessionId){focusQueue.push({id:randomUUID(),sessionId:click.sessionId,noticeId:click.noticeId,expires:now()+60000,client:null,lease:0});focusQueue.splice(0,Math.max(0,focusQueue.length-20));changed();}
    native.wake().then(result=>{if(!disposed){lastWake=result;trace({id:click.noticeId,stage:'native-click-wake',reason:result.reason});}},error=>{if(!disposed)trace({id:click.noticeId,stage:'native-click-error',reason:String(error)});});
   }}catch(error){trace({stage:'native-click-error',reason:String(error)});}
   while(focusQueue[0]?.expires<=now()){focusQueue.shift();changed();}
   if(!enabled)return;
  // Deterministic time is injected in tests. Production deadlines use the host clock.
  for(const n of queue.due()){
   trace({id:n.id,stage:'native-attempt'});
   const content=wording(n);
    // A focused, visible page already shows its own reminder; a system toast on top is noise.
    // Defer instead of dropping, so going to the background still gets a real toast.
    if(!notifyWhenFocused&&presence&&presence.visible&&presence.focused&&now()-presence.at<20000){n.status='pending';n.deadline=now()+30000;changed();trace({id:n.id,stage:'native-skip-visible'});continue;}
    if(activation){if(!activation.ready){trace({id:n.id,stage:'native-error',reason:'通知点击桥未就绪，未发送不可定位的备用提醒'});continue;}content.activationUri=activation.issue(n);}
    native.notify(content).then(result=>{if(!disposed)trace({id:n.id,stage:result.ok?'native-submitted':'native-error',reason:result.reason});},error=>{if(!disposed)trace({id:n.id,stage:'native-error',reason:String(error)});});
  }
 }
 async function action(body){
  if(!body||typeof body!=='object')throw new Error('invalid action');
  switch(body.action){
   case 'focus-claim':{
     const request=focusQueue[0];if(typeof body.client!=='string'||body.client.length>100)throw Error('invalid client');
     if(!request||request.id!==body.id||request.expires<=now()||(request.client&&request.client!==body.client&&request.lease>now()))return{ok:false};
     request.client=body.client;request.lease=now()+5000;return{ok:true,sessionId:request.sessionId};
    }
    case 'focus-ack':{const request=focusQueue[0];if(!request||request.id!==body.id||request.client!==body.client||request.expires<=now()||request.lease<=now())return{ok:false};focusQueue.shift();trace({id:request.noticeId,stage:'native-click-navigation-requested'});return{ok:true};}
    case 'preferences':{
    const known=['enabled','soundEnabled','soundVolume','notifyWhenFocused','scope','historyLimit','mascotScale','buddyScale'];
    if(body.enabled!==undefined&&typeof body.enabled!=='boolean')throw new Error('enabled must be boolean');
    if(body.soundEnabled!==undefined&&typeof body.soundEnabled!=='boolean')throw new Error('soundEnabled must be boolean');
    if(body.soundVolume!==undefined&&(typeof body.soundVolume!=='number'||!Number.isFinite(body.soundVolume)))throw new Error('soundVolume must be finite');
    if(body.notifyWhenFocused!==undefined&&typeof body.notifyWhenFocused!=='boolean')throw new Error('notifyWhenFocused must be boolean');
    if(body.scope!==undefined&&!SCOPES.has(body.scope))throw new Error('unknown scope');
    if(body.historyLimit!==undefined&&!LIMITS.has(body.historyLimit))throw new Error('unsupported historyLimit');
    if(body.mascotScale!==undefined&&(typeof body.mascotScale!=='number'||!Number.isFinite(body.mascotScale)))throw new Error('mascotScale must be finite');
    if(body.buddyScale!==undefined&&(typeof body.buddyScale!=='number'||!Number.isFinite(body.buddyScale)))throw new Error('buddyScale must be finite');
    if(!known.some(k=>body[k]!==undefined))throw new Error('missing preferences');
    const next={enabled:body.enabled??enabled,soundEnabled:body.soundEnabled??soundEnabled,soundVolume:body.soundVolume===undefined?soundVolume:clampVolume(body.soundVolume),notifyWhenFocused:body.notifyWhenFocused??notifyWhenFocused,scope:body.scope??scope,historyLimit:body.historyLimit??historyLimit,mascotScale:body.mascotScale===undefined?mascotScale:clampScale(body.mascotScale),buddyScale:body.buddyScale===undefined?buddyScale:clampScale(body.buddyScale)};
    preferences?.save?.(next);const wasEnabled=enabled;
    if(JSON.stringify(settings())!==JSON.stringify(next))changed();
    ({enabled,soundEnabled,soundVolume,notifyWhenFocused,scope,historyLimit,mascotScale,buddyScale}=next);
    if(!enabled){for(const n of queue.items)if(n.status!=='withdrawn'){n.status='withdrawn';changed();}}
    else if(!wasEnabled)for(const s of facts.values())restoreWait(s);
    return{ok:true,enabled,settings:settings()};
   }
   case 'test':{const target=body.sessionId===undefined?[...facts.values()].find(x=>!x.child)?.sessionId:body.sessionId;if(target!==undefined&&(typeof target!=='string'||!facts.has(target)))throw Error('unknown test session');const n=publish({kind:'done',sessionId:target||'',title:'通知通道测试',message:'点击可返回此通知绑定的会话',at:now()},body.native!==true);if(body.native===true){if(!activation?.ready)return{ok:false,reason:'activation-unavailable'};const content={...wording(n),activationUri:activation.issue(n)};const result=await native.notify(content);trace({id:n.id,stage:result.ok?'native-submitted':'native-error',reason:result.reason});return{...result,id:n.id,activationUri:content.activationUri};}return{ok:true,id:n.id};}
   case 'claim':{if(typeof body.id!=='string'||typeof body.client!=='string'||body.client.length>100)throw new Error('invalid claim');const ok=enabled&&queue.claim(body.id,body.client);if(ok)changed();return{ok};}
   case 'ack':{if(!['shown','error'].includes(body.stage))throw new Error('invalid receipt');const ok=queue.ack(body.id,body.client,body.stage);if(ok)trace({id:body.id,stage:body.stage==='shown'?'client-shown':'client-error'});return{ok};}
   case 'wake':{if(body.sessionId!==undefined&&(typeof body.sessionId!=='string'||body.sessionId.length>256))throw new Error('invalid session');lastWake=await native.wake();changed();return lastWake;}
   case 'presence':{
    if(typeof body.visible!=='boolean'||typeof body.focused!=='boolean')throw new Error('invalid presence');
    presence={visible:body.visible,focused:body.focused,at:now()};return{ok:true};
   }
   case 'clear':if(history.length){history.length=0;changed();}return{ok:true};
   default:throw new Error('unknown action');
  }
 }
 function mount(){
  for(const agent of ctx.agents.list())remember(agent.session,false);
  ctx.on('session/event',(session,event)=>{if(relevant.has(event.type))remember(session);});
  ctx.on('agent/created',({agent})=>{if(detached.delete(agent.session.id))changed();remember(agent.session,false);});
  ctx.on('agent/disposed',({agent})=>{
   // The inspected event fires after driver quiescence, before session detach.
   remember(agent.session);
   const s=facts.get(agent.session.id);if(!s||detached.has(s.sessionId))return;
   detached.add(s.sessionId);queue.withdraw(s.sessionId);changed();
   if(s.running||s.pending.length)publish({kind:'interrupted',sessionId:s.sessionId,title:titleOf(s),at:now(),message:'任务已结束运行（代理已释放）',summary:s.summary??'',summaryFinal:false,durationMs:s.since===null?null:Math.max(0,now()-s.since)},true);
  });
  const guard=(req,res,method)=>{const rejection=ctx.connection.requestRejection(req);if(rejection!==undefined){response(res,rejection,{error:'unauthorized'});return false;}if(req.method!==method){res.setHeader('allow',method);response(res,405,{error:'method'});return false;}return true;};
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/whale-sentinel/state',handler:(req,res)=>{if(!guard(req,res,'GET'))return;response(res,200,snapshot());}}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/whale-sentinel/action',handler:async(req,res)=>{
   if(!guard(req,res,'POST'))return;try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192){response(res,413,{error:'too large'});return;}}response(res,200,await action(JSON.parse(raw)));}catch(error){response(res,400,{error:String(error.message??error)});}
  }}));
  ctx.effect(()=>{timer=setInterval(tick,1000);timer.unref?.();return()=>{clearInterval(timer);};});
 }
 function dispose(){disposed=true;clearInterval(timer);native.dispose();return activation?.dispose?.();}
 return{snapshot,action,mount,dispose,tick,remember};
}
