/** Plain text for compact notifications; never render raw Markdown or hidden destinations. */
export function cleanExcerpt(value, max = 64) {
  const raw = typeof value === 'string' ? value : '';
  const plain = raw
    .replace(/```[^\n]*\n[\s\S]*?(?:```|$)/g, ' ')
    .replace(/~~~[^\n]*\n[\s\S]*?(?:~~~|$)/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\\([\\[\]{}()#+.!>-])/g, '$1')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const characters = Array.from(plain);
  return characters.length > max ? characters.slice(0, Math.max(0, max - 1)).join('') + '…' : plain;
}
export function formatNotice(event, locale = 'zh') {
  const en=String(locale).startsWith('en');
  const headings = en ? {done:'Task complete',error:'Task failed',interrupted:'Task interrupted',stopped:'Task stopped',waiting:'Your attention is needed',forked:'Session forked',unknown:'Task ended'} : {done:'任务完成',error:'任务异常',interrupted:'任务中断',stopped:'已手动停止',waiting:'等你处理',forked:'会话已分叉',unknown:'任务结束'};
  const waits=en?{approval:'Approval needed',choice:'Choose an option',input:'Text input needed'}:{approval:'需要你批准',choice:'需要你选择',input:'需要你输入'};
  const heading=event.kind==='waiting'?(waits[event.waitKind]||headings.waiting):(headings[event.kind]||(en?'Task update':'任务动态'));
  const task=cleanExcerpt(event.title,32)||(en?'This session':'这个会话');
  const detail=cleanExcerpt(event.summaryFinal&&event.summary?event.summary:event.message,58);
  const duration=Number.isFinite(event.durationMs)&&event.durationMs>=0?Math.round(event.durationMs/1000):null;
  let meta=en?'Open session for details':'点击查看会话详情';
  if(duration!==null){
    const m=Math.floor(duration/60),s=duration%60;
    meta=(en?'Duration ':'用时 ')+(m?(en?`${m}m ${s}s`:`${m} 分 ${s} 秒`):(en?`${s}s`:`${s} 秒`));
  }
  return {heading,title:(en?'Xiao Jingshao':'小鲸哨')+' · '+heading,body:'「'+task+'」'+(detail?'\n'+detail:''),meta,tag:'whale-sentinel:'+(event.sessionId||'test')};
}
