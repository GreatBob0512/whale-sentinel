// 1.8.8: separate size settings for the seated and expanded mascot.
// 1.8.7: smaller default for the expand pose.
// 1.8.6: give the expand pose a pixel base height so the size slider really works.
// 1.8.5: the size slider now scales the expand-state character too, default smaller.
// 1.8.4: shrink the expand-state character at the user's request.
// 1.8.3: tight, higher-resolution buddy art so the pose stays sharp and slim.
// 1.8.2: one whole-body animation, and the expand pose matched to the concept art.
// 1.8.1: the expand-state head keeps swaying instead of being overridden.
// 1.8.0: opening the panel swaps the seated mascot for a standing buddy that
// grips the panel edge and points at it.
// 1.7.3: the mascot breathes, sways her head and pulses at the pointing hand.
// 1.7.2: keep the live artwork marker in sync with the manifest id.
// 1.7.1: the mascot sits at a work desk while tasks run.
// 1.7.0: five IT-scene poses replace the single standing figure; no behaviour change.
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';import {randomBytes} from 'node:crypto';
import {initialState,foldTask} from './task-state.js?release=1.8.8';
import {createTaskHost} from './host.js?release=1.8.8';
import {createNativeBridge} from './native.js?release=1.8.8';
import {createWindowsActivation} from './win-activation.js';
import {createActivationQueue} from './activation-queue.js';
export const inject=['agents','sessionProjections','webServer','connection'];
export async function apply(ctx){
 const stateSchema={parse(v){if(!v||typeof v.sessionId!=='string'||!Array.isArray(v.pending)||typeof v.running!=='boolean'||typeof v.phase!=='string'||!Array.isArray(v.currentTools))throw Error('Invalid mascot checkpoint');return v;}};
 const handle=await ctx.sessionProjections.register({key:'local.whale-sentinel.state',stateVersion:3,stateSchema,init:initialState,apply:foldTask});
 const dir=join(process.env.DSH_HOME||join(homedir(),'.dsh'),'storages','whale-sentinel'),file=join(dir,'preferences.json');
 const preferences={load(){try{return JSON.parse(readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return{enabled:true,soundEnabled:false,soundVolume:.2};throw e;}},save(v){mkdirSync(dir,{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(v));renameSync(file+'.tmp',file);}};
 const protocol='dsh-whale-'+randomBytes(6).toString('hex');
 const spoolDir=join(dir,'activation',protocol);mkdirSync(spoolDir,{recursive:true});
 const windows=createWindowsActivation({protocol,spoolDir});let active=true,registration=null,cleaning=null;
 const queue=createActivationQueue({dir:spoolDir,protocol});
 const cleanup=()=>cleaning??=(async()=>{active=false;try{queue.dispose();}finally{try{if(registration)await registration;await windows.unregister();}finally{await windows.dispose();}}})();
 ctx.effect(()=>cleanup);
 registration=windows.register();const registered=await registration;if(!active){await cleanup();return;}
 const activation={ready:registered.ok,issue:n=>active&&registered.ok?queue.issue(n):null,consume:()=>queue.consume(),dispose:cleanup};
 const host=createTaskHost(ctx,handle,createNativeBridge(),{preferences,activation});
 ctx.effect(()=>{host.mount();return()=>host.dispose();});
}
