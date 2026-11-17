// 1.6.2: show live percentages beside the sound and mascot-size sliders.
// 1.6.1: settings chips and the size slider were dead because the handlers
// were never exposed to the component; wire them through slot props.
// 1.6.0: side-by-side layout, scalable mascot, collapsed notices, foreground notify switch, task scope and row count.
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';import {randomBytes} from 'node:crypto';
import {initialState,foldTask} from './task-state.js?release=1.6.2';
import {createTaskHost} from './host.js?release=1.6.2';
import {createNativeBridge} from './native.js?release=1.6.2';
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
