    function formatDuration(t, ms) {
      if (!isFiniteNumber(ms) || ms < 1000) return t('duration.seconds', { n: Math.max(0, Math.round((isFiniteNumber(ms) ? ms : 0) / 1000)) });
      const total = Math.round(ms / 1000);
      if (total < 60) return t('duration.seconds', { n: total });
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      if (minutes < 60) return seconds === 0 ? t('duration.minutes', { m: minutes }) : t('duration.minuteSeconds', { m: minutes, s: seconds });
      return t('duration.hours', { h: Math.floor(minutes / 60), m: minutes % 60 });
    }

    function formatAgo(t, at, now) {
      const seconds = Math.max(0, Math.floor((now - at) / 1000));
      if (seconds < 10) return t('time.justNow');
      if (seconds < 60) return t('time.secondsAgo', { n: seconds });
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return t('time.minutesAgo', { n: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('time.hoursAgo', { n: hours });
      return t('time.daysAgo', { n: Math.floor(hours / 24) });
    }

    function bubbleContent(t, bubble) {
      const event = bubble.event;
      const title = event.title === undefined ? t('title.untitled') : event.title;
      switch (event.kind) {
        case 'running':
          return {
            tone: 'running',
            text: event.title === undefined ? t('bubble.running.untitled') : t('bubble.running', { title })
          };
        case 'done': {
          const duration = isFiniteNumber(event.durationMs) && event.durationMs > 500 ? formatDuration(t, event.durationMs) : undefined;
          if (duration !== undefined) {
            return {
              tone: 'done',
              text: event.title === undefined ? t('bubble.done.untitled', { duration }) : t('bubble.done', { title, duration }), detail: event.summaryFinal ? event.summary : undefined
            };
          }
          return {
            tone: 'done',
            text: event.title === undefined ? t('bubble.doneShort.untitled') : t('bubble.doneShort', { title }), detail: event.summaryFinal ? event.summary : undefined
          };
        }
        case 'waiting':
          return { tone: 'waiting', text: t('waiting.' + (event.waitKind || 'choice')), detail: event.message || event.title };
        case 'stopped':
          return { tone: 'waiting', text: t('event.stopped'), detail: event.title };
        case 'interrupted':
          return { tone: 'error', text: t('event.interrupted'), detail: event.title };
        case 'longRun':
          return {
            tone: 'waiting',
            text: t('bubble.longRun', { duration: formatDuration(t, event.durationMs) }),
            detail: event.title
          };
        case 'error':
          return {
            tone: 'error',
            text: event.title === undefined ? t('bubble.error.untitled') : t('bubble.error', { title }),
            detail: event.message
          };
        default:
          return null;
      }
    }

    /**
     * Compose the system notification for one background reminder. The desktop
     * shell relays a renderer Notification into the OS notification center, so
     * it reaches the user while the workbench is minimized or in the tray.
     */
    function desktopAlert(t, event) {
      event={...event,title:event.title===undefined?undefined:toastPlain(event.title,32),summary:toastPlain(event.summary,58),message:toastPlain(event.message,58)};
      const title = event.title;
      if (event.kind === 'done') {
        const duration = isFiniteNumber(event.durationMs) && event.durationMs > 500 ? formatDuration(t, event.durationMs) : undefined;
        return {
          title: '🐳 ' + t('name') + ' · ' + t('notify.title.done'),
          body: title === undefined
            ? t('notify.body.doneShort', { title: t('title.untitled') })
            : (duration === undefined ? t('notify.body.doneShort', { title }) : t('notify.body.done', { title, duration })) + (event.summaryFinal && event.summary ? '\n' + event.summary : ''),
          tag: 'whale-sentinel:' + (event.sessionId || 'test')
        };
      }
      if (event.kind === 'error' || event.kind === 'interrupted') {
        const message = typeof event.message === 'string' ? event.message.slice(0, 140) : undefined;
        return {
          title: '🐳 ' + t('name') + ' · ' + t('notify.title.error'),
          body: title === undefined
            ? t('notify.body.errorShort', { title: t('title.untitled') })
            : (message === undefined ? t('notify.body.errorShort', { title }) : t('notify.body.error', { title, message })),
          tag: 'whale-sentinel:' + (event.sessionId || 'test')
        };
      }
      if (event.kind === 'waiting') {
        return {
          title: '🐳 ' + t('name') + ' · ' + t('waiting.' + (event.waitKind || 'choice')),
          body: (title === undefined ? t('notify.body.waitingShort') : t('notify.body.waiting', { title })) + (event.message ? '\n' + event.message : ''),
          tag: 'whale-sentinel:' + (event.sessionId || 'test')
        };
      }
      if(event.kind!=='longRun')return{title:'🐳 '+t('name')+' · '+t('event.'+event.kind),body:(event.title||t('title.untitled'))+(event.message?' · '+event.message:''),tag:'whale-sentinel:'+(event.sessionId||'test')};
      return {
        title: '🐳 ' + t('name') + ' · ' + t('notify.title.longRun'),
        body: title === undefined
          ? t('notify.body.longRunShort', { duration: formatDuration(t, event.durationMs) })
          : t('notify.body.longRun', { title, duration: formatDuration(t, event.durationMs) }),
        tag: 'whale-sentinel:' + (event.sessionId || 'test')
      };
    }

    /**
     * One plain-text rule for panel rows, bubbles and notifications. Keep it
     * byte-compatible with the Host's cleanExcerpt; a test compares both.
     */
    function plainText(value,max=96){
      const plain=String(value??'')
        .replace(/```[^\n]*\n[\s\S]*?(?:```|$)/g,' ')
        .replace(/~~~[^\n]*\n[\s\S]*?(?:~~~|$)/g,' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
        .replace(/https?:\/\/\S+/g,' ')
        .replace(/<[^>]*>/g,' ')
        .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/gm,'')
        .replace(/[*_`~]/g,'')
        .replace(/\\([\\[\]{}()#+.!>-])/g,'$1')
        .replace(/[\u0000-\u001f\u007f]+/g,' ')
        .replace(/\s+/g,' ').trim();
      const chars=Array.from(plain);
      return chars.length>max?chars.slice(0,Math.max(0,max-1)).join('')+'…':plain;
    }
    const toastPlain=plainText;
    /** Try to raise one native reminder. Never throws; returns what happened. */
    function showDesktopNotification(alert, options={}) {
      const Native=window.Notification;
      if(typeof Native!=='function'){options.onError?.();return{ok:false,reason:'unsupported'}}
      if(Native.permission!=='granted'){options.onError?.();return{ok:false,reason:'permission:'+Native.permission}}
      try{
        const notification=new Native(alert.title,{body:toastPlain(alert.body),tag:alert.tag,renotify:true,silent:true,icon:options.icon});
        notification.onshow=()=>options.onShow?.();
        notification.onerror=()=>options.onError?.();
        notification.onclick=()=>{try{notification.close()}catch{}options.onClick?.();try{window.focus()}catch{}};
        return{ok:true,reason:'awaiting-show',notification};
      }catch(e){options.onError?.();return{ok:false,reason:String(e)}}
    }

    /** The full state artwork of the mood that raised this reminder. */
    function notificationFace(kind) {
      const phase = kind === 'longRun' ? 'running' : kind === 'interrupted' ? 'error' : kind;
      return typeof NOTIFY_FACES[phase] === 'string' ? NOTIFY_FACES[phase] : NOTIFY_FACES.idle;
    }

    /** Bring the session that produced the alert to the front of the workbench. */
    function openSession(uiWorkspace, sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '') return false;
      if (uiWorkspace === undefined || uiWorkspace === null || typeof uiWorkspace.openSession !== 'function') return false;
      try {
        uiWorkspace.openSession(sessionId);
        return true;
      } catch (error) {
        console.error('[whale-sentinel] opening the session failed', error);
        return false;
      }
    }

    /** A four-point sparkle. */
    function sparkle(cx, cy, size, delay) {
      const d = `M${cx} ${cy - size} L${cx + size * 0.34} ${cy - size * 0.34} L${cx + size} ${cy} L${cx + size * 0.34} ${cy + size * 0.34} L${cx} ${cy + size} L${cx - size * 0.34} ${cy + size * 0.34} L${cx - size} ${cy} L${cx - size * 0.34} ${cy - size * 0.34} Z`;
      return h('path', {
        key: `sparkle-${cx}-${cy}`,
        className: 'dpg-sparkle',
        d,
        style: delay === undefined ? undefined : { animationDelay: delay }
      });
    }

    /** Failure fallback uses the same approved character, never a retired drawing. */
    function ArtworkFallback() {
      const [failed,setFailed]=React.useState(false);
      if(failed)return h('span',{role:'img','aria-label':'鲸哨图片暂不可用',title:'鲸哨图片暂不可用',className:'dpg-art-unavailable'},'鲸哨');
      return h('img',{className:'dpg-sprite','data-artwork': 'whale-it-seated-v1','data-artwork-fallback':'idle',src:SPRITES.idle,alt:'',draggable:false,onError:()=>setFailed(true)});
    }

