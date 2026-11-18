// 2.3.1: close the remaining loops.
// - Clear removes history, results, counters and pending notices, and withdraws
//   the Windows toast group; the page closes its shown notifications too.
// - Completed-today is a counter, not a slice of the 50-result window.
// - Multiple prompts in one session expose how many more are waiting.
// - A disposed agent reclaims facts/seen/nudges/waitingEvents/tombstone state.
// - The panel traps Tab focus; the legacy standard/large size toggle is gone
//   because the two size sliders are the only size control.
// - Windows toasts can be removed by session tag or by group.
// 2.3.0: notification discipline and a calmer opening.
// 2.1.0: radar and multi-window release.
// - Workspace label and delegated-subagent activity are aggregated into the root
//   row, so a running child is visible without becoming its own notification.
// - Presence is tracked per Client window; one hidden window can no longer clear
//   the fact that another window is focused.
// - Optional long-run nudge, once per running turn.
// - Navigation success/failure is reported back as a diagnostic trace.
// 2.0.0: reliability release.
// - One deterministic protocol per profile, so a second live instance can no
//   longer delete the first one's click route; each instance still only accepts
//   tokens it issued.
// - Instance heartbeat: a normal unload unregisters the protocol only when no
//   other live instance is using it.
// - A corrupt preferences file is preserved and replaced by safe defaults.
// - A toast that cannot carry a click target is delivered as notification-only.
import {readFileSync,writeFileSync,mkdirSync,renameSync,unlinkSync,readdirSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';import {createHash,randomUUID} from 'node:crypto';
import {initialState,foldTask} from './task-state.js?release=2.3.1';
import {createTaskHost} from './host.js?release=2.3.1';
import {createNativeBridge} from './native.js?release=2.3.1';
import {createWindowsActivation} from './win-activation.js';
import {createActivationQueue} from './activation-queue.js';
export const inject=['agents','sessionProjections','webServer','connection'];
const DEFAULTS={enabled:true,soundEnabled:false,soundVolume:.2};
const INSTANCE_TTL_MS=60000;

/** Read preferences without ever failing the whole plugin. */
export function readPreferences(file,{onRecover}={}){
 try{
  const raw=readFileSync(file,'utf8');
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('preferences must be an object');
  return value;
 }catch(error){
  if(error.code==='ENOENT')return {...DEFAULTS};
  // Keep the damaged file for diagnosis instead of silently overwriting it.
  try{renameSync(file,`${file}.corrupt-${Date.now()}`);onRecover?.(error);}catch{}
  return {...DEFAULTS,recovered:true};
 }
}

/** One protocol per profile: identical instances agree, separate profiles do not collide. */
export function protocolFor(root){
 return 'dsh-whale-'+createHash('sha256').update(String(root).toLowerCase(),'utf8').digest('hex').slice(0,12);
}

export async function apply(ctx){
 const stateSchema={parse(v){if(!v||typeof v.sessionId!=='string'||!Array.isArray(v.pending)||typeof v.running!=='boolean'||typeof v.phase!=='string'||!Array.isArray(v.currentTools))throw Error('Invalid mascot checkpoint');return v;}};
 const handle=await ctx.sessionProjections.register({key:'local.whale-sentinel.state',stateVersion:4,stateSchema,init:initialState,apply:foldTask});
 const dir=join(process.env.DSH_HOME||join(homedir(),'.dsh'),'storages','whale-sentinel'),file=join(dir,'preferences.json');
 const preferences={load(){return readPreferences(file);},save(v){mkdirSync(dir,{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(v));renameSync(file+'.tmp',file);}};
 const profileRoot=process.env.DSH_HOME||join(homedir(),'.dsh');
 const protocol=protocolFor(profileRoot);
 const spoolDir=join(dir,'activation',protocol);mkdirSync(spoolDir,{recursive:true});

 // Liveness markers: shared protocol + reference-counted unregister.
 const instanceDir=join(dir,'instances');mkdirSync(instanceDir,{recursive:true});
 const instanceFile=join(instanceDir,`${process.pid}-${randomUUID().slice(0,8)}.json`);
 const stamp=()=>{try{writeFileSync(instanceFile,JSON.stringify({pid:process.pid,at:Date.now()}));}catch{}};
 stamp();
 const heartbeat=setInterval(stamp,20000);heartbeat.unref?.();
 const othersAlive=()=>{
  try{
   for(const name of readdirSync(instanceDir)){
    const path=join(instanceDir,name);if(path===instanceFile)continue;
    try{const data=JSON.parse(readFileSync(path,'utf8'));if(Date.now()-Number(data.at)<INSTANCE_TTL_MS)return true;}catch{}
   }
  }catch{}
  return false;
 };

 const windows=createWindowsActivation({protocol,spoolDir});let active=true,registration=null,cleaning=null;
 const queue=createActivationQueue({dir:spoolDir,protocol});
 const cleanup=()=>cleaning??=(async()=>{
  active=false;
  try{queue.dispose();}
  finally{
   try{if(registration)await registration;}catch{}
   clearInterval(heartbeat);
   try{unlinkSync(instanceFile);}catch{}
   // Another live instance still needs this exact protocol registration.
   if(!othersAlive()){try{await windows.unregister();}catch{}}
   await windows.dispose();
  }
 })();
 ctx.effect(()=>cleanup);
 registration=windows.register();const registered=await registration;if(!active){await cleanup();return;}
 const activation={ready:registered.ok,issue:n=>active&&registered.ok?queue.issue(n):null,consume:()=>queue.consume(),dispose:cleanup};
 const host=createTaskHost(ctx,handle,createNativeBridge(),{preferences,activation});
 ctx.effect(()=>{host.mount();return()=>host.dispose();});
}
