import {randomBytes} from 'node:crypto';
import {mkdirSync,readdirSync,lstatSync,readFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
/** Opaque, short-lived notification capabilities. No session ID is placed in the URI. */
export function createActivationQueue({dir,protocol,now=()=>Date.now(),ttlMs=10*60*1000,limit=100,readClick=readFileSync}={}){
 if(!/^(?:dsh-whale-)[a-f0-9]{12}$/.test(protocol??''))throw Error('invalid protocol');
 mkdirSync(dir,{recursive:true});const issued=new Map();let disposed=false;
 function remove(token){issued.delete(token);const file=join(dir,token+'.click');try{const s=lstatSync(file);if(s.isFile()&&!s.isSymbolicLink())unlinkSync(file)}catch(e){if(e.code!=='ENOENT')throw e;}}
 function expire(){for(const[token,x]of issued)if(x.expires<=now())remove(token);}
 return{
  issue(notice){if(disposed)return null;if(!notice||typeof notice.id!=='string'||typeof notice.sessionId!=='string')throw Error('invalid notice');expire();while(issued.size>=limit)remove(issued.keys().next().value);const token=randomBytes(32).toString('hex');issued.set(token,{noticeId:notice.id,sessionId:notice.sessionId,expires:now()+ttlMs});return protocol+'://activate/'+token;},
  consume(){if(disposed)return[];expire();const clicks=[];for(const file of readdirSync(dir)){if(!/^[a-f0-9]{64}\.click$/.test(file))continue;const token=file.slice(0,-6),path=join(dir,file);try{const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128)continue;const text=readClick(path,'utf8');const entry=issued.get(token);if(entry&&text!==token)continue;unlinkSync(path);issued.delete(token);if(!entry||entry.expires<=now())continue;clicks.push({...entry,token});}catch(error){if(!['ENOENT','EBUSY','EPERM','EACCES'].includes(error.code))continue;}}return clicks;},
  dispose(){if(disposed)return;for(const token of [...issued.keys()])remove(token);disposed=true;}
 };
}
