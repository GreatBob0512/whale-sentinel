    const NS = 'whaleSentinel';
    const MUTE_KEY = 'dsh.whale-sentinel.muted';
    const NOTIFY_KEY = 'dsh.whale-sentinel.notify';
    const HIDDEN_KEY = 'dsh.whale-sentinel.hidden';
    const LONG_RUN_MS = 180000;
    const MAX_EVENTS = 12;

    // First release uses the user-selected soft miniature only: navy hair with a
    // pale tail gradient, mint bows, white lace headband, whale clip and a fully
    // covered navy/white dress. All five states share one canvas; no age selector.
    const HAIR_DARK = '#26386b';
    const HAIR_MID = '#31508f';
    const HAIR_LIGHT = '#5c86c6';
    const HAIR_OUTLINE = '#1b2747';
    const FIN_DARK = '#5b93c9';
    const FIN_LIGHT = '#a9d6f2';
    const FIN_OUTLINE = '#2f5c8f';
    const DRESS = '#26314f';
    const DRESS_SOFT = '#33436b';
    const WHITE = '#f7f9fd';
    const WHITE_SHADE = '#dbe4f2';
    const TRIM = '#8a6a3f';
    const SKIN = '#ffe9dc';
    const SKIN_SHADE = '#f5cbb8';
    const EYE_DARK = '#1c2b4d';
    const IRIS_TOP = '#2f5c9e';
    const IRIS_BOTTOM = '#8fd2f5';
    const CHEEK = '#ffb3ae';
    const SHOE = '#1b2130';
    const WHALE_BLUE = '#5b93d6';
    const ACCENT = '#7cc7f5';
    const WATER_LIGHT = '#cfeeff';

    const DICT = {
      zh: {
        name: '小鲸哨',
        'panel.sound': '柔和音效', 'panel.preview': '试听', 'panel.size': '角色尺寸', 'panel.standard': '标准', 'panel.large': '大', 'panel.options': '外观与提醒', 'panel.status': '会话雷达', 'panel.attention': '需要你处理', 'panel.busy': '运行中', 'panel.connection': '连接状态', 'panel.result': '结果与最近动态', 'panel.stalled': '暂未收到新活动，不代表失败', 'panel.progress': '已完成 {done} / {total} · {percent}%', 'panel.step': '第 {step} 步', 'panel.tool': '正在使用 {tool}', 'panel.thinking': '思考与整理', 'panel.working': '正在处理', 'panel.toolsDone': '已完成 {n} 次工具调用', 'panel.volume': '提示音音量', 'panel.soundHint': '默认关闭 · 本地短音 · 不访问麦克风', 'panel.hideHint': '隐藏后仍保留状态徽章与通知', 'panel.offline':'连接中断 · 显示最后状态', 'panel.connected': '后台已连接', 'panel.connecting': '正在连接后台', 'panel.emptyResult': '新的结果会留在这里', 'panel.countLabel': '{running} 运行 · {waiting} 待处理', 'panel.restoreBadge': '恢复会话雷达 · {n} 个待处理', 'panel.soundBlocked': '需要先点一次试听以解锁音效', 'panel.docs': '图解说明见插件详情', 'panel.radar': '任务雷达', 'panel.statTasks': '任务', 'panel.statDone': '已完成', 'panel.moreShow': '查看更多结果（{n}）', 'panel.toolShort': '使用工具：{tool}', 'panel.short.done': '完成', 'panel.short.error': '异常', 'panel.short.interrupted': '中断', 'panel.short.stopped': '暂停', 'panel.short.waiting': '等待', 'panel.short.forked': '分叉', 'panel.short.unknown': '结束', 'panel.short.running': '开始', 'panel.short.longRun': '长任务', 'panel.less': '收起', 'panel.more': '全部', 'panel.scope':'进行中范围', 'panel.scopeAll':'全部会话', 'panel.scopeAttention':'只看待处理', 'panel.rows':'结果条数', 'panel.focusedNotify':'前台也通知', 'panel.scale':'大小', 'alert.saved':'已保存', 'alert.retry':'稍后自动重试', 'panel.scaleSeated':'收起尺寸', 'panel.scaleExpanded':'展开尺寸', 'panel.children':'{n} 个子任务运行中', 'panel.longRun':'长任务提醒', 'panel.tab.waiting':'待处理', 'panel.tab.running':'进行中', 'panel.tab.results':'结果', 'panel.emptyWaiting':'没有需要你处理的任务', 'panel.emptyRunning':'没有正在运行的任务', 'panel.emptyResults':'还没有结果', 'panel.archiveNote':'仅保留最近 50 条结束记录，更早的结果已归档', 'panel.resultCount':'保留了 {n} 次结束记录', 'panel.previousTurn':'上一轮', 'panel.staleSync':'离线 · 上次同步 {ago}', 'panel.morePending':'另有 {n} 个待处理', 'phase.tool': '工具执行', 'phase.thinking': '思考中', 'panel.openResult': '查看此会话结果',
        'event.stopped': '已手动停止', 'event.interrupted': '任务意外中断', 'event.forked': '已分叉', 'event.unknown': '任务结束', 'waiting.approval': '需要你批准', 'waiting.choice': '需要你选择', 'waiting.input': '需要你输入文字',
        title: '任务提醒',
        'state.idle': '待命中',
        'state.running': '任务进行中',
        'state.waiting': '等你回应',
        'state.done': '任务完成',
        'state.error': '异常中断',
        'bubble.running': '「{title}」正在跑，我吐泡泡帮你盯着～',
        'bubble.running.untitled': '任务正在跑，我吐泡泡帮你盯着～',
        'bubble.done': '「{title}」完成啦！用时 {duration}',
        'bubble.done.untitled': '任务完成啦！用时 {duration}',
        'bubble.doneShort': '「{title}」完成啦！',
        'bubble.doneShort.untitled': '任务完成啦！',
        'bubble.waiting': '有个决定在等你点头哦～',
        'bubble.error': '「{title}」异常中断了…点我看看记录',
        'bubble.error.untitled': '任务异常中断了…点我看看记录',
        'bubble.longRun': '已经连续游了 {duration} 啦，要不要歇一下？',
        'bubble.dismiss': '知道了',
        'event.running': '开始任务',
        'event.done': '任务完成',
        'event.error': '异常中断',
        'event.waiting': '等待回应',
        'event.longRun': '长任务提醒',
        'panel.open': '打开任务提醒面板',
        'panel.close': '收起面板',
        'panel.history': '最近记录',
        'panel.empty': '还没有记录，派个任务给我吧～',
        'panel.counts': '进行中 {running} 个 · 等待回应 {waiting} 个',
        'panel.active': '正在进行的任务',
        'panel.jump': '跳转',
        'panel.hide': '隐藏看板娘',
        'panel.show': '显示看板娘',
        'panel.test': '测试通知',
        'alert.ready': '系统通知已就绪（窗口隐藏时使用）',
        'alert.sent': '已发送 {n} 条系统通知',
        'alert.failed': '发送失败：{reason}',
        'alert.denied': '系统通知被拒绝，请在 Windows 通知设置里允许 DeepSeek Harness',
        'alert.permission': '系统通知未授权，点“测试通知”尝试授权',
        'alert.unsupported': '当前环境不支持系统通知',
        'notify.testTitle': '🐳 小鲸哨 · 测试通知',
        'notify.testBody': '看到这条说明后台提醒通道是通的',
        'alert.debug': '页面 {state} · 权限 {permission}',
        'alert.wakeOn': '可唤起窗口',
        'alert.wakeOff': '未打补丁，无法唤起窗口',
        'panel.idleLine': '任务都结束啦，我在水里等你～',
        'panel.mute': '静音气泡',
        'panel.notify': '后台通知',
        'panel.notifyHint': '窗口缩到托盘或被挡住时，用系统通知提醒你；点通知会回到对应会话',
        'panel.notifyBlocked': '系统通知被拒绝了，请在 Windows 通知设置里允许 DeepSeek Harness',
        'panel.clear': '清空记录',
        'title.untitled': '这个任务',
        'notify.title.done': '任务完成啦',
        'notify.title.error': '任务异常中断',
        'notify.title.waiting': '需要你回应一下',
        'notify.title.longRun': '长任务提醒',
        'notify.body.done': '「{title}」用时 {duration}',
        'notify.body.doneShort': '「{title}」已经完成',
        'notify.body.error': '「{title}」：{message}',
        'notify.body.errorShort': '「{title}」中断了，回到窗口看看记录',
        'notify.body.waiting': '「{title}」有个决定在等你',
        'notify.body.waitingShort': '有个决定在等你',
        'notify.body.longRun': '「{title}」已经连续跑了 {duration}',
        'notify.body.longRunShort': '任务已经连续跑了 {duration}',
        'time.justNow': '刚刚',
        'time.secondsAgo': '{n} 秒前',
        'time.minutesAgo': '{n} 分钟前',
        'time.hoursAgo': '{n} 小时前',
        'time.daysAgo': '{n} 天前',
        'duration.seconds': '{n} 秒',
        'duration.minutes': '{m} 分钟',
        'duration.minuteSeconds': '{m} 分 {s} 秒',
        'duration.hours': '{h} 小时 {m} 分'
      },
      en: {
        name: 'Xiao Jingshao',
        'panel.sound': 'Soft cues', 'panel.preview': 'Preview', 'panel.size': 'Mascot size', 'panel.standard': 'Standard', 'panel.large': 'Large', 'panel.options': 'Appearance and alerts', 'panel.status': 'Session radar', 'panel.attention': 'Needs you', 'panel.busy': 'Running', 'panel.connection': 'Connection', 'panel.result': 'Results and recent activity', 'panel.stalled': 'No recent activity — not a failure', 'panel.progress': '{done} / {total} complete · {percent}%', 'panel.step': 'Step {step}', 'panel.tool': 'Using {tool}', 'panel.thinking': 'Thinking and organizing', 'panel.working': 'Working', 'panel.toolsDone': '{n} tool calls completed', 'panel.volume': 'Cue volume', 'panel.soundHint': 'Off by default · local short tones · no microphone', 'panel.hideHint': 'Hidden mascot keeps alerts and its status badge', 'panel.offline':'Offline · showing last known state', 'panel.connected': 'Host connected', 'panel.connecting': 'Connecting to host', 'panel.emptyResult': 'New results will appear here', 'panel.countLabel': '{running} running · {waiting} need you', 'panel.restoreBadge': 'Restore session radar · {n} need you', 'panel.soundBlocked': 'Click Preview once to unlock audio', 'panel.docs': 'Illustrated guide in plugin details', 'panel.radar': 'Task radar', 'panel.statTasks': 'Tasks', 'panel.statDone': 'Done', 'panel.moreShow': 'View more results ({n})', 'panel.toolShort': 'Using {tool}', 'panel.short.done': 'Done', 'panel.short.error': 'Error', 'panel.short.interrupted': 'Interrupted', 'panel.short.stopped': 'Paused', 'panel.short.waiting': 'Waiting', 'panel.short.forked': 'Forked', 'panel.short.unknown': 'Ended', 'panel.short.running': 'Started', 'panel.short.longRun': 'Long run', 'panel.less': 'Show less', 'panel.more': 'All', 'panel.scope':'Running scope', 'panel.scopeAll':'All sessions', 'panel.scopeAttention':'Needs me only', 'panel.rows':'Result rows', 'panel.focusedNotify':'Notify when focused', 'panel.scale':'Size', 'alert.saved':'Saved', 'alert.retry':'retrying', 'panel.scaleSeated':'Collapsed size', 'panel.scaleExpanded':'Expanded size', 'panel.children':'{n} subagents running', 'panel.longRun':'Long-run nudge', 'panel.tab.waiting':'Pending', 'panel.tab.running':'Running', 'panel.tab.results':'Results', 'panel.emptyWaiting':'Nothing needs your answer', 'panel.emptyRunning':'Nothing is running', 'panel.emptyResults':'No results yet', 'panel.archiveNote':'Only the latest 50 terminal events are kept; older results are archived', 'panel.resultCount':'{n} terminal records kept', 'panel.previousTurn':'Previous turn', 'panel.staleSync':'Offline · last sync {ago}', 'panel.morePending':'{n} more pending', 'phase.tool': 'Using a tool', 'phase.thinking': 'Thinking', 'panel.openResult': 'Open this session result',
        'event.stopped': 'Stopped by user', 'event.interrupted': 'Task interrupted', 'event.forked': 'Forked', 'event.unknown': 'Task ended', 'waiting.approval': 'Approval needed', 'waiting.choice': 'A choice is needed', 'waiting.input': 'Text input needed',
        title: 'Task reminders',
        'state.idle': 'Standing by',
        'state.running': 'Task running',
        'state.waiting': 'Waiting for you',
        'state.done': 'Task finished',
        'state.error': 'Interrupted',
        'bubble.running': '“{title}” is running — I am blowing bubbles at it.',
        'bubble.running.untitled': 'A task is running — I am blowing bubbles at it.',
        'bubble.done': '“{title}” is done! Took {duration}.',
        'bubble.done.untitled': 'Task done! Took {duration}.',
        'bubble.doneShort': '“{title}” is done!',
        'bubble.doneShort.untitled': 'Task done!',
        'bubble.waiting': 'A decision is waiting for your answer.',
        'bubble.error': '“{title}” broke off… click me for details.',
        'bubble.error.untitled': 'The task broke off… click me for details.',
        'bubble.longRun': 'Swimming for {duration} already — take a break?',
        'bubble.dismiss': 'Got it',
        'event.running': 'Task started',
        'event.done': 'Task finished',
        'event.error': 'Interrupted',
        'event.waiting': 'Waiting for you',
        'event.longRun': 'Long-running nudge',
        'panel.open': 'Open task reminder panel',
        'panel.close': 'Collapse panel',
        'panel.history': 'Recent activity',
        'panel.empty': 'Nothing yet — send me a task.',
        'panel.counts': '{running} running · {waiting} waiting for you',
        'panel.active': 'In progress',
        'panel.jump': 'Open',
        'panel.hide': 'Hide mascot',
        'panel.show': 'Show mascot',
        'panel.test': 'Test alert',
        'alert.ready': 'Desktop alerts are ready (used while the window is hidden)',
        'alert.sent': 'Sent {n} desktop alerts',
        'alert.failed': 'Send failed: {reason}',
        'alert.denied': 'Desktop alerts are denied — allow DeepSeek Harness in the Windows notification settings',
        'alert.permission': 'Desktop alerts are not authorized yet — press Test alert',
        'alert.unsupported': 'Desktop alerts are not supported here',
        'notify.testTitle': '🐳 Whale Girl · test alert',
        'notify.testBody': 'If you can read this, the background reminder channel works',
        'alert.debug': 'page {state} · permission {permission}',
        'alert.wakeOn': 'window wake available',
        'alert.wakeOff': 'window wake unavailable (shell not patched)',
        'panel.idleLine': 'All done down here — floating by.',
        'panel.mute': 'Mute bubbles',
        'panel.notify': 'Desktop alerts',
        'panel.notifyHint': 'While the window is in the tray or behind other apps, alerts arrive as system notifications; click one to jump back to that session.',
        'panel.notifyBlocked': 'System notifications are blocked — allow DeepSeek Harness in the Windows notification settings.',
        'panel.clear': 'Clear',
        'title.untitled': 'this task',
        'notify.title.done': 'Task finished',
        'notify.title.error': 'Task interrupted',
        'notify.title.waiting': 'Your answer is needed',
        'notify.title.longRun': 'Long-running task',
        'notify.body.done': '“{title}” took {duration}.',
        'notify.body.doneShort': '“{title}” is done.',
        'notify.body.error': '“{title}”: {message}',
        'notify.body.errorShort': '“{title}” broke off — open the window for details.',
        'notify.body.waiting': '“{title}” is waiting for a decision.',
        'notify.body.waitingShort': 'A decision is waiting for you.',
        'notify.body.longRun': '“{title}” has been running for {duration}.',
        'notify.body.longRunShort': 'The task has been running for {duration}.',
        'time.justNow': 'just now',
        'time.secondsAgo': '{n}s ago',
        'time.minutesAgo': '{n}m ago',
        'time.hoursAgo': '{n}h ago',
        'time.daysAgo': '{n}d ago',
        'duration.seconds': '{n}s',
        'duration.minutes': '{m}m',
        'duration.minuteSeconds': '{m}m {s}s',
        'duration.hours': '{h}h {m}m'
      }
    };

    function readFlag(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value === '1';
      } catch (error) {
        return fallback;
      }
    }

    function writeFlag(key, value) {
      try {
        window.localStorage.setItem(key, value ? '1' : '0');
      } catch (error) {
        /* storage may be unavailable; the in-memory flag still works */
      }
    }

    function isFiniteNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }

    /** True while the workbench is minimized to the tray or covered by another app. */
    function isBackgroundNow() {
      try {
        if (document.visibilityState === 'hidden' || document.hidden === true) return true;
        if (typeof document.hasFocus === 'function' && document.hasFocus() === false) return true;
      } catch (error) {
        /* a missing document means no background signal */
      }
      return false;
    }

    /** Tiny local cues: no files, network, microphone or perpetual oscillator. */
    function createCuePlayer() {
      let audio=null,unlocked=false,disposed=false,last=-Infinity;
      const nodes=new Set();
      async function unlock(){
        if(disposed)return false;
        try{const Audio=window.AudioContext||window.webkitAudioContext;if(typeof Audio!=='function')return false;audio??=new Audio();if(audio.state==='suspended')await audio.resume();unlocked=audio.state==='running';return unlocked;}catch{return false;}
      }
      async function play(kind,enabled,volume=.12){
        if(disposed||!enabled||!unlocked||!audio||audio.state!=='running'||Date.now()-last<1000)return false;
        const melody=kind==='done'?[523.25,659.25,783.99]:kind==='waiting'?[659.25,523.25]:['error','interrupted'].includes(kind)?[392,329.63]:null;
        if(!melody)return false;
        try{
          const gain=audio.createGain();const start=audio.currentTime;const peak=Math.min(.25,Math.max(.03,Number(volume)||.12));gain.gain.value=0;gain.connect(audio.destination);nodes.add(gain);
          melody.forEach((hz,i)=>{const oscillator=audio.createOscillator();oscillator.type='sine';oscillator.frequency.value=hz;const t=start+i*.095;const envelope=audio.createGain();envelope.gain.setValueAtTime(.0001,t);envelope.gain.exponentialRampToValueAtTime(peak,t+.012);envelope.gain.exponentialRampToValueAtTime(.0001,t+.16);oscillator.connect(envelope);envelope.connect(gain);gain.gain.setValueAtTime(1,start);nodes.add(oscillator);nodes.add(envelope);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();nodes.delete(oscillator);nodes.delete(envelope);if(i===melody.length-1){gain.disconnect();nodes.delete(gain);}};oscillator.start(t);oscillator.stop(t+.17);});
          last=Date.now();return true;
        }catch{return false;}
      }
      function dispose(){disposed=true;for(const n of nodes){try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}}nodes.clear();try{audio?.close()?.catch?.(()=>{})}catch{}audio=null;}
      return{unlock,play,dispose};
    }

    // All task facts come from the Host's committed-event projection.
    function createStore(ctx, deliver, t) {
      const listeners = new Set();
      let disposed = false, bubbleTimer = null, settleTimer = null, timer = null, boot = null;
      let events = [], lastRecent = null, polling = false;
      const controllers = new Set();
      async function request(url, init={}) {
        const abort=new AbortController();controllers.add(abort);
        const timeout=setTimeout(()=>abort.abort(),10000);
        try{const res=await fetch(url,{...init,signal:abort.signal});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json();}
        catch(error){
          // A timeout or a page resume can abort the fetch. Surface plain Chinese
          // instead of the raw DOMException text.
          const message=String(error&&error.message||error||'');
          if(error&&(error.name==='AbortError'||/abort/i.test(message)))throw new Error('请求超时，稍后会自动重试');
          if(/^HTTP \d+$/.test(message))throw error;
          throw new Error('暂时连不上后台，稍后会自动重试');
        }
        finally{clearTimeout(timeout);controllers.delete(abort);}
      }
      const processed = new Set(), shown = new Map();
      const cues=createCuePlayer();
      let lastRev=null,lastFocusId=null,pendingFocusAck=null;
      const client = 'page-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      let snapshot = {phase:'idle',phaseSince:Date.now(),runningCount:0,waitingCount:0,muted:readFlag(MUTE_KEY,false),notifyEnabled:readFlag(NOTIFY_KEY,true),hidden:readFlag(HIDDEN_KEY,false),size:'standard',mascotScale:1,buddyScale:1,notifyWhenFocused:false,longRunEnabled:false,scope:'all',historyLimit:3,soundEnabled:false,soundVolume:.2,active:[],stats:null,events:[],results:[],resultsTotal:0,lastSyncAt:null,bubble:null,alert:null,alertCount:0,hostReady:false,native:false};
      const patch = values => {if(disposed)return;snapshot={...snapshot,...values};for(const fn of [...listeners])fn();};
      const observable={getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}};
      async function action(body) {
        const res=await request('whale-sentinel/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
        return res;
      }
      function noteAlert(title,result){patch({alert:{at:Date.now(),title,ok:result?.ok===true,reason:result?.reason??''},alertCount:snapshot.alertCount+(result?.ok===true?1:0)});}
      const terminalKinds=new Set(['done','error','interrupted','stopped','forked','unknown']);
      function markProcessed(id){processed.add(id);if(processed.size>200)processed.delete(processed.values().next().value);}
      /** One navigation path for rows, bubbles and system notifications. */
      function openSessionWithDiagnostic(sessionId,noticeId){
        const ok=openSession(ctx.get('uiWorkspace'),sessionId);
        if(typeof sessionId==='string'&&sessionId){
          action({action:'diagnostic',stage:ok?'navigation-success':'navigation-failed',sessionId,noticeId,reason:ok?undefined:'会话导航未就绪'}).catch(()=>{});
        }
        return ok;
      }
      function updatePhase(){
        const active=snapshot.active;
        let phase=active.some(x=>x.waiting)?'waiting':active.some(x=>x.running)?'running':'idle';
        const latest=events[0];
        if(phase!=='waiting'&&latest&&Date.now()-latest.at<12000&&['done','error','interrupted'].includes(latest.kind))phase=latest.kind==='done'?'done':'error';
        patch({phase,phaseSince:snapshot.phase===phase?snapshot.phaseSince:Date.now()});
      }
      function replay(event){
        if(!event)return;
        if(!snapshot.muted){patch({bubble:{event,at:Date.now()}});clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>patch({bubble:null}),event.kind==='error'?14000:9000);}
      }
      async function send(notice){
        // Claim first: a transient transport failure must not retire the reminder.
        const claim=await action({action:'claim',id:notice.id,client});
        if(!claim.ok||disposed)return;
        processed.add(notice.id);if(processed.size>200)processed.delete(processed.values().next().value);
        let notification, receipted=false;
        const receipt=async(stage)=>{
          if(disposed||receipted)return;
          receipted=true;
          try{
            const accepted=await action({action:'ack',id:notice.id,client,stage});
            if(disposed)return;
            if(!accepted.ok){try{notification?.close()}catch{};noteAlert(notice.title,{ok:false,reason:'通知认领已过期，已关闭过时通知'});return;}
            if(stage==='shown')noteAlert(notice.title,{ok:true,reason:'系统已显示（横幅受系统设置影响）'});
            
            else noteAlert(notice.title,{ok:false,reason:'页面发送失败，后台将尝试原生通知'});
          }catch(error){if(!disposed)noteAlert(notice.title,{ok:false,reason:'通知回执失败：'+String(error)});}
        };
        const n=deliver(notice,{onShow:()=>receipt('shown'),onError:()=>receipt('error'),onClick:()=>{action({action:'wake',sessionId:notice.sessionId}).then(r=>{if(!r.ok)noteAlert(notice.title,{ok:false,reason:'窗口唤起失败：'+r.reason})}).catch(e=>noteAlert(notice.title,{ok:false,reason:String(e)}));openSessionWithDiagnostic(notice.sessionId,notice.id);replay(notice);}});
        if(n?.notification){
          notification=n.notification;
          const previous=shown.get(notice.sessionId);try{previous?.close()}catch{}
          shown.set(notice.sessionId,n.notification);
        }
        if(!n?.ok)receipt('error');
      }
      /** Navigation is bounded: a hung UI must not freeze the radar. */
      function navigate(sessionId){
        const ui=ctx.get('uiWorkspace');
        if(!ui||typeof ui.openSession!=='function')return Promise.reject(new Error('会话导航未就绪'));
        return new Promise((resolve,reject)=>{
          let settled=false;
          const timer=setTimeout(()=>{if(settled)return;settled=true;reject(new Error('打开会话超时'));},4000);
          Promise.resolve().then(()=>ui.openSession(sessionId)).then(()=>{
            if(settled)return;settled=true;clearTimeout(timer);resolve();
          },error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);});
        });
      }
      let navFailures=0;
      async function handleFocus(state){
        try{
          if(pendingFocusAck){const lease=await action({action:'focus-claim',id:pendingFocusAck,client});if(lease.ok){const ack=await action({action:'focus-ack',id:pendingFocusAck,client});if(ack.ok)pendingFocusAck=null;}else if(state.focusRequest?.id!==pendingFocusAck)pendingFocusAck=null;}
          if(!state.focusRequest||state.focusRequest.id===lastFocusId)return;
          const focus=state.focusRequest;const claim=await action({action:'focus-claim',id:focus.id,client});
          if(!claim.ok||disposed)return;
          try{
            await navigate(claim.sessionId||focus.sessionId);
            if(disposed)return;
            navFailures=0;lastFocusId=focus.id;pendingFocusAck=focus.id;
            action({action:'diagnostic',stage:'navigation-success',sessionId:claim.sessionId||focus.sessionId,noticeId:focus.id}).catch(()=>{});
            try{window.focus()}catch{}
            const ack=await action({action:'focus-ack',id:focus.id,client});if(ack.ok)pendingFocusAck=null;
          }catch(error){
            navFailures+=1;
            if(navFailures<3){noteAlert('会话导航',{ok:false,reason:'暂时打不开目标会话，稍后自动重试'});return;}
            // Release the request so one broken target cannot block later clicks.
            navFailures=0;lastFocusId=focus.id;pendingFocusAck=focus.id;
            action({action:'diagnostic',stage:'navigation-failed',sessionId:claim.sessionId||focus.sessionId,noticeId:focus.id,reason:String(error&&error.message||error)}).catch(()=>{});
            noteAlert('会话导航',{ok:false,reason:'无法打开目标会话，已释放本次点击'});
            try{const ack=await action({action:'focus-ack',id:focus.id,client});if(ack.ok)pendingFocusAck=null;}catch{}
          }
        }catch(error){if(!disposed)noteAlert('会话导航',{ok:false,reason:String(error&&error.message||error)});}
      }
      async function poll(){
        if(disposed||polling)return;
        polling=true;
        try{
          let state;
          try{state=await request('whale-sentinel/state',{cache:'no-store'});}
          catch(error){if(!disposed){patch({hostReady:false,connectionLost:true});noteAlert('后台连接',{ok:false,reason:String(error&&error.message||error)});}return;}
          if(disposed||!state)return;
          if(boot!==state.boot){boot=state.boot;processed.clear();lastRecent=state.events?.[0]?.id??null;lastRev=null;}
          // Navigation failure is its own condition, never "host offline".
          await handleFocus(state);
          reportPresence();
          if(state.rev&&lastRev===state.rev){if(!snapshot.hostReady)patch({hostReady:true,connectionLost:false});return;}
          lastRev=state.rev;
          const list=Array.isArray(state.events)?state.events:[];
          const recent=list[0];
          events=list.slice(0,MAX_EVENTS);
          const results=Array.isArray(state.results)?state.results:list.filter(event=>terminalKinds.has(event.kind)&&event.test!==true);
          const incoming={hostReady:true,connectionLost:false,lastSyncAt:Date.now(),notifyEnabled:state.enabled!==false,soundEnabled:state.settings?.soundEnabled===true,soundVolume:state.settings?.soundVolume??.2,mascotScale:state.settings?.mascotScale??1,buddyScale:state.settings?.buddyScale??1,notifyWhenFocused:state.settings?.notifyWhenFocused===true,longRunEnabled:state.settings?.longRunEnabled===true,scope:state.settings?.scope==='attention'?'attention':'all',historyLimit:[3,5,10].includes(state.settings?.historyLimit)?state.settings.historyLimit:3,native:state.native===true,active:state.active??[],stats:state.stats??null,runningCount:(state.active??[]).filter(x=>x.running).length,waitingCount:(state.active??[]).filter(x=>x.waiting).length,events,results,resultsTotal:Number.isFinite(state.resultsTotal)?state.resultsTotal:results.length};
          // Never let a stale snapshot overwrite a value the user just changed.
          for(const key of dirty)delete incoming[key];
          patch(incoming);
          if(recent&&recent.id!==lastRecent){lastRecent=recent.id;replay(recent);cues.play(recent.kind,snapshot.soundEnabled,snapshot.soundVolume);clearTimeout(settleTimer);settleTimer=setTimeout(updatePhase,12100);}
          updatePhase();
          const notices=state.notices??[];
          for(const [id,n] of [...shown]){
            const latest=notices.filter(x=>x.sessionId===id).at(-1);
            if(!latest||['withdrawn','native','native-failed','aggregated'].includes(latest.status)){try{n.close()}catch{}shown.delete(id);}
          }
          if(snapshot.notifyEnabled){
            const suppressed=[];
            // The foreground rule is one rule for both channels: if you are
            // already looking at DSH, the panel is the reminder, not a toast.
            const foreground=!isBackgroundNow();
            for(const n of notices){
              if(n.status!=='pending'||processed.has(n.id))continue;
              if(!snapshot.notifyWhenFocused&&foreground){markProcessed(n.id);suppressed.push(n.id);continue;}
              try{await send(n);}catch(error){noteAlert('通知',{ok:false,reason:'通知认领失败，稍后重试'});break;}
            }
            if(suppressed.length)action({action:'suppress',ids:suppressed}).catch(()=>{});
          }
          const nativeResult=state.delivery?.[0];
          if(nativeResult&&(nativeResult.id+':'+nativeResult.stage)!==snapshot.lastDelivery&&nativeResult.stage.startsWith('native-')){patch({lastDelivery:nativeResult.id+':'+nativeResult.stage});noteAlert('后台通知',{ok:false,reason:nativeResult.stage==='native-submitted'?'已提交 Windows 通知，未确认显示':nativeResult.reason||'后台原生发送中'});}
        }catch(error){
          if(!disposed)noteAlert('面板同步',{ok:false,reason:'同步出现异常，任务状态不受影响'});
        }finally{polling=false;if(!disposed)timer=setTimeout(poll,1500);}
      }
      let presenceAt=0;
      function reportPresence(force){
        if(disposed)return;
        const now=Date.now();if(!force&&now-presenceAt<9000)return;presenceAt=now;
        const visible=document.visibilityState!=='hidden'&&document.hidden!==true;
        const focused=visible&&typeof document.hasFocus==='function'?document.hasFocus():false;
        action({action:'presence',client,visible,focused}).catch(()=>{});
      }
      function onPresenceChange(){reportPresence(true);}
      if(typeof document.addEventListener==='function'){
        document.addEventListener('visibilitychange',onPresenceChange);
        window.addEventListener?.('focus',onPresenceChange);
        window.addEventListener?.('blur',onPresenceChange);
      }
      function toggleMute(){const muted=!snapshot.muted;writeFlag(MUTE_KEY,muted);patch({muted,bubble:muted?null:snapshot.bubble});}
      function toggleHidden(){const hidden=!snapshot.hidden;writeFlag(HIDDEN_KEY,hidden);patch({hidden});}
      function toggleNotify(){const notifyEnabled=!snapshot.notifyEnabled;writeFlag(NOTIFY_KEY,notifyEnabled);patch({notifyEnabled});action({action:'preferences',enabled:notifyEnabled}).catch(e=>noteAlert('设置',{ok:false,reason:String(e&&e.message?e.message:e)}));}
      function clearHistory(){action({action:'clear'}).then(()=>{events=[];processed.clear();for(const n of shown.values())try{n.close()}catch{}shown.clear();patch({events:[],results:[],resultsTotal:0,bubble:null});updatePhase()}).catch(e=>noteAlert('清空记录',{ok:false,reason:String(e&&e.message?e.message:e)}));}
      function testNotification(){cues.unlock();return action({action:'test'}).catch(e=>noteAlert('测试通知',{ok:false,reason:String(e&&e.message?e.message:e)}));}
      function dispose(){disposed=true;cues.dispose();clearTimeout(settingsTimer);settingsTimer=null;
        if(typeof document.removeEventListener==='function'){document.removeEventListener('visibilitychange',onPresenceChange);window.removeEventListener?.('focus',onPresenceChange);window.removeEventListener?.('blur',onPresenceChange);}for(const controller of controllers)controller.abort();controllers.clear();clearTimeout(timer);clearTimeout(bubbleTimer);clearTimeout(settleTimer);for(const n of shown.values())try{n.close()}catch{}listeners.clear();}
      function toggleSound(){
        cues.unlock();const soundEnabled=!snapshot.soundEnabled;patch({soundEnabled});
        action({action:'preferences',soundEnabled}).catch(e=>noteAlert('音效设置',{ok:false,reason:String(e&&e.message?e.message:e)}));
      }
      function previewSound(){return cues.unlock().then(ok=>{if(ok)return cues.play('done',true,snapshot.soundVolume);noteAlert('音效',{ok:false,reason:'请通过用户交互解锁音效'});return false;});}
      function setVolume(value){const soundVolume=Math.min(.5,Math.max(.05,Number(value)||.2));patch({soundVolume});action({action:'preferences',soundVolume}).catch(e=>noteAlert('音量设置',{ok:false,reason:String(e&&e.message?e.message:e)}));}
      function toggleSize(){/* removed: the two size sliders are the only size control */}
      const pendingSettings={};let settingsTimer=null;const dirty=new Set();
      function flushSettings(attempt=0){
        const body={...pendingSettings};
        for(const key of Object.keys(pendingSettings))delete pendingSettings[key];
        if(!Object.keys(body).length)return;
        action({action:'preferences',...body})
          .then(()=>{
            for(const key of Object.keys(body))dirty.delete(key);
            noteAlert('设置',{ok:true,reason:t('alert.saved')});
          })
          .catch(error=>{
            if(disposed)return;
            if(attempt<2){Object.assign(pendingSettings,body);settingsTimer=setTimeout(()=>flushSettings(attempt+1),700);return;}
            for(const key of Object.keys(body))dirty.delete(key);
            noteAlert('设置',{ok:false,reason:'设置暂时没保存成功，稍后会自动重试'});
          });
      }
      function saveSetting(values){
        patch(values);
        Object.assign(pendingSettings,values);
        for(const key of Object.keys(values))dirty.add(key);
        clearTimeout(settingsTimer);
        settingsTimer=setTimeout(()=>flushSettings(0),220);
      }
      function setMascotScale(value){const mascotScale=Math.min(1.6,Math.max(0.8,Math.round((Number(value)||1)*10)/10));saveSetting({mascotScale});}
      function setBuddyScale(value){const buddyScale=Math.min(1.6,Math.max(0.8,Math.round((Number(value)||1)*10)/10));saveSetting({buddyScale});}
      function toggleFocusedNotify(){saveSetting({notifyWhenFocused:!snapshot.notifyWhenFocused});}
      function toggleLongRun(){saveSetting({longRunEnabled:!snapshot.longRunEnabled});}
      poll();
      return {toggleSound,previewSound,setVolume,setMascotScale,toggleFocusedNotify,toggleLongRun,setBuddyScale,unlockAudio:()=>cues.unlock(),observable,noteAlert,toggleMute,toggleHidden,toggleNotify,clearHistory,testNotification,openSession:(sessionId,noticeId)=>openSessionWithDiagnostic(sessionId,noticeId),dismissBubble:()=>{clearTimeout(bubbleTimer);patch({bubble:null})},dispose};
    }

