    /** Data URL of the sprite for one mood, or undefined for an unknown one. */
    function spriteUrl(phase) {
      const url = SPRITES[phase];
      return typeof url === 'string' && url !== '' ? url : undefined;
    }

    /** Mood FX drawn above the sprite: sparkles, question mark, sweat, bubbles, zzz, mute badge. */
    function SpriteFx({ phase, muted }) {
      const children = [];
      if (phase === 'done') {
        children.push(sparkle(20, 40, 5, '0s'));
        children.push(sparkle(112, 34, 4.2, '.25s'));
        children.push(sparkle(116, 86, 3.6, '.5s'));
        children.push(sparkle(16, 90, 3.2, '.75s'));
      }
      if (phase === 'waiting') {
        children.push(
          h(
            'g',
            { key: 'ask', className: 'dpg-flag' },
            h('circle', { cx: 18, cy: 38, r: 10 }),
            h('text', { x: 18, y: 43, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: '#ffffff', fontFamily: 'inherit' }, '?')
          )
        );
      }
      if (phase === 'error') {
        children.push(
          h(
            'g',
            { key: 'badge', className: 'dpg-badge' },
            h('circle', { cx: 114, cy: 34, r: 9.4, fill: 'var(--dsw-alias-state-error-primary)' }),
            h('rect', { x: 112.6, y: 27.4, width: 2.8, height: 7.2, rx: 1.4, fill: '#ffffff' }),
            h('circle', { cx: 114, cy: 38.4, r: 1.5, fill: '#ffffff' })
          )
        );
      }
      if (phase === 'idle') {
        children.push(
          h('text', { key: 'zzz-1', className: 'dpg-zzz', x: 111, y: 30, fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }, 'z'),
          h('text', { key: 'zzz-2', className: 'dpg-zzz', x: 118, y: 21, fontSize: 8, fontWeight: 700, fontFamily: 'inherit', style: { animationDelay: '.7s' } }, 'z')
        );
      }
      if (phase === 'running') {
        children.push(
          h('g', { key: 'bubbles', className: 'dpg-bubbles' },
            h('circle', { className: 'dpg-bubble-fx', cx: 16, cy: 96, r: 3, style: { animationDelay: '0s' } }),
            h('circle', { className: 'dpg-bubble-fx', cx: 9, cy: 84, r: 2.2, style: { animationDelay: '.5s' } }),
            h('circle', { className: 'dpg-bubble-fx', cx: 19, cy: 72, r: 2.6, style: { animationDelay: '1s' } })
          )
        );
      }
      if (muted) {
        children.push(
          h(
            'g',
            { key: 'muted' },
            h('circle', { cx: 114, cy: 138, r: 9, fill: 'var(--dsw-alias-bg-overlay)', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.2 }),
            h('path', { d: 'M109.5 133.5 L118.5 142.5', stroke: 'var(--dsw-alias-label-secondary)', strokeWidth: 1.8, strokeLinecap: 'round' }),
            h('path', { d: 'M114 132.5 a5.4 5.4 0 0 1 3.6 9.4', stroke: 'var(--dsw-alias-label-secondary)', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' })
          )
        );
      }
      if (children.length === 0) return null;
      return h('svg', { className: 'dpg-fx', viewBox: '0 0 132 152', 'aria-hidden': 'true', focusable: 'false' }, children);
    }

    /**
     * The visible mascot: the shipped sprite for the current mood, with the
     * approved idle artwork as the fallback when one state cannot be decoded.
     */
    function Character({ phase, muted, open }) {
      const [failed, setFailed] = React.useState(false);
      const url = open ? BUDDY[phase] : spriteUrl(phase);
      if (url === undefined || failed) return h(ArtworkFallback);
      return h(
        'span',
        { className: 'dpg-sprite-wrap', 'data-fx': 'live', 'data-pose': open ? 'buddy' : 'seated' },
        h('img', {
          className: 'dpg-sprite',
          'data-artwork': 'whale-it-seated-v1',
          'data-artwork-state': phase,
          src: url,
          alt: '',
          draggable: false,
          onError: () => setFailed(true)
        }),
        h('span', { className: 'dpg-point', 'aria-hidden': 'true' }, h('i'), h('i')),
        h(SpriteFx, { phase, muted })
      );
    }

    const CSS = `
.dpg-root{position:fixed;right:18px;bottom:14px;z-index:40;display:flex;justify-content:flex-end;align-items:flex-end;pointer-events:none;font-family:inherit;-webkit-font-smoothing:antialiased}
.dpg-anchor{position:relative;display:flex;flex-direction:row;align-items:flex-end;justify-content:flex-end;gap:8px}
.dpg-anchor[data-open="true"]{align-items:flex-end;gap:0}
.dpg-anchor[data-open="true"] .dpg-mascot{height:auto;align-self:flex-end;margin-left:-10px;display:flex;align-items:flex-end;width:auto}
.dpg-anchor[data-open="true"] .dpg-sprite-wrap{height:auto;width:auto;align-items:flex-end}
.dpg-anchor[data-open="true"] .dpg-sprite{height:calc(var(--dpg-buddy-h) * var(--dpg-buddy-scale,1));width:auto;max-width:none;image-rendering:auto}
.dpg-mascot{pointer-events:auto;display:block;width:168px;height:176px;margin:0;padding:0;border:0;overflow:visible;background:transparent;border-radius:20px;cursor:pointer;opacity:.95;transition:transform .22s ease,opacity .22s ease;animation:dpg-enter .5s ease}
.dpg-mascot:hover{opacity:1;transform:translateY(-2px)}
.dpg-mascot:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.dpg-svg{display:block;width:100%;height:100%;overflow:visible}
.dpg-sprite-wrap{position:relative;display:flex;align-items:flex-end;justify-content:center;width:100%;height:100%;overflow:visible}
.dpg-sprite{display:block;height:100%;width:auto;max-width:none;max-height:none;filter:drop-shadow(0 6px 8px rgba(0,0,0,.24));animation:dpg-swim 3.6s ease-in-out infinite;transform-origin:bottom center;pointer-events:none;user-select:none;-webkit-user-drag:none}
.dpg-sprite-wrap{animation:dpg-breathe 4.6s ease-in-out infinite;transform-origin:bottom center}
.dpg-point{position:absolute;left:6%;top:52%;width:26px;height:26px;pointer-events:none}
.dpg-sprite-wrap[data-pose="buddy"] .dpg-point{left:11%;top:40%;width:22px;height:22px}
.dpg-sprite-wrap[data-pose="buddy"]{animation:none}

.dpg-point i{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(120,205,255,.85);opacity:0;animation:dpg-tap 2.4s ease-out infinite}
.dpg-point i:last-child{animation-delay:.8s;border-color:rgba(255,214,110,.9)}
.dpg-fx{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.dpg-shadow{fill:var(--dsw-alias-label-secondary);opacity:.16}
.dpg-bob{animation:dpg-swim 3.6s ease-in-out infinite;transform-origin:66px 120px}
.dpg-eyes{transform-box:fill-box;transform-origin:center;animation:dpg-blink 5.8s ease-in-out infinite}
.dpg-hair{transform-box:fill-box;transform-origin:top center;animation:dpg-hair 5.4s ease-in-out infinite}
.dpg-lock-l{transform-box:fill-box;transform-origin:top center;animation:dpg-lock-l 4.6s ease-in-out infinite}
.dpg-lock-r{transform-box:fill-box;transform-origin:top center;animation:dpg-lock-r 5s ease-in-out infinite}
.dpg-fins{transform-box:fill-box;transform-origin:center;animation:dpg-fins 3.8s ease-in-out infinite}
.dpg-tail{transform-box:fill-box;transform-origin:right center;animation:dpg-tail 3.4s ease-in-out infinite}
.dpg-bubbles{fill:#8fd3f7;opacity:.85}
.dpg-bubble-fx{transform-box:fill-box;transform-origin:center;animation:dpg-rise 2.6s ease-in-out infinite}
.dpg-sparkle{fill:var(--dsw-alias-state-success-primary);transform-box:fill-box;transform-origin:center;animation:dpg-pop 1.5s ease-in-out infinite}
.dpg-flag{fill:var(--dsw-alias-state-warn-primary);transform-box:fill-box;transform-origin:center;animation:dpg-pulse 1.7s ease-in-out infinite}
.dpg-sweat{fill:#8fd3f7;animation:dpg-drip 2.2s ease-in infinite}
.dpg-badge{transform-box:fill-box;transform-origin:center;animation:dpg-pulse 1.2s ease-in-out infinite}
.dpg-zzz{fill:var(--dsw-alias-label-secondary);opacity:.7;animation:dpg-float 3s ease-in-out infinite}
.dpg-bubble{pointer-events:auto;position:absolute;right:172px;bottom:80px;width:max-content;max-width:min(268px,calc(100vw - 210px));padding:10px 28px 10px 15px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 14px 30px rgba(0,0,0,.18);font-size:13px;line-height:1.55;text-align:left;animation:dpg-pop-in .2s ease-out both}
.dpg-bubble::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--dsw-alias-brand-primary)}
.dpg-bubble[data-tone="done"]::before{background:var(--dsw-alias-state-success-primary)}
.dpg-bubble[data-tone="error"]::before{background:var(--dsw-alias-state-error-primary)}
.dpg-bubble[data-tone="waiting"]::before{background:var(--dsw-alias-state-warn-primary)}
.dpg-bubble::after{content:"";position:absolute;right:-6px;bottom:16px;width:12px;height:12px;background:var(--dsw-alias-bg-overlay);border-right:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);transform:rotate(-45deg);border-radius:0 0 3px 0}
.dpg-bubble-text{word-break:break-word}
.dpg-bubble-detail{margin-top:3px;color:var(--dsw-alias-label-secondary);font-size:12px;word-break:break-word}
.dpg-bubble-main{display:block;width:100%;padding:0 14px 0 0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:8px}
.dpg-bubble-main:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dpg-bubble-go{display:block;margin-top:4px;font-size:10px;color:var(--dsw-alias-label-secondary)}
.dpg-bubble-close{position:absolute;top:4px;right:4px;width:20px;height:20px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;line-height:1;cursor:pointer}
.dpg-bubble-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dpg-name-dot{width:7px;height:7px;border-radius:50%;background:#5c86c6;box-shadow:0 0 0 3px rgba(92,134,198,.22)}
.dpg-summary{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dpg-pill{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:11px}
.dpg-pill i{display:block;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.dpg-pill[data-kind="wait"] i{background:var(--dsw-alias-state-warn-primary)}
.dpg-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.dpg-dot[data-kind="running"]{background:var(--dsw-alias-brand-primary)}
.dpg-dot[data-kind="done"]{background:var(--dsw-alias-state-success-primary)}
.dpg-dot[data-kind="error"]{background:var(--dsw-alias-state-error-primary)}
.dpg-dot[data-kind="waiting"]{background:var(--dsw-alias-state-warn-primary)}
.dpg-dot[data-kind="longRun"]{background:var(--dsw-alias-state-warn-primary)}
.dpg-restore{pointer-events:auto;width:38px;height:38px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:50%;background:var(--dsw-alias-bg-overlay);box-shadow:0 8px 20px rgba(0,0,0,.22);color:inherit;font-size:18px;line-height:1;cursor:pointer}
.dpg-restore:hover{background:var(--dsw-alias-bg-layer-2)}
@keyframes dpg-enter{from{opacity:0;transform:translateY(8px)}to{opacity:.95;transform:none}}
@keyframes dpg-swim{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-2.6px) rotate(-1.2deg)}}
@keyframes dpg-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.012)}}
@keyframes dpg-buddy-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes dpg-tap{0%{transform:scale(.5);opacity:.85}70%{opacity:.18}100%{transform:scale(1.9);opacity:0}}
@keyframes dpg-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.12)}}
@keyframes dpg-tail{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes dpg-hair{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.2deg)}}
@keyframes dpg-lock-l{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.6deg)}}
@keyframes dpg-lock-r{0%,100%{transform:rotate(2deg)}50%{transform:rotate(-2.6deg)}}
@keyframes dpg-fins{0%,100%{transform:scaleY(1) rotate(0deg)}50%{transform:scaleY(.94) rotate(-2deg)}}
@keyframes dpg-rise{0%{transform:translateY(3px);opacity:.15}40%{opacity:.95}100%{transform:translateY(-7px);opacity:.1}}
@keyframes dpg-pop{0%,100%{transform:scale(.7);opacity:.35}50%{transform:scale(1);opacity:1}}
@keyframes dpg-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}
@keyframes dpg-drip{0%{transform:translateY(-3px);opacity:0}30%{opacity:1}100%{transform:translateY(7px);opacity:0}}
@keyframes dpg-float{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-4px);opacity:.9}}
@keyframes dpg-pop-in{from{opacity:0;transform:translateY(4px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
.dpg-mascot,.dpg-sprite,.dpg-sprite-wrap,.dpg-point i,.dpg-bob,.dpg-eyes,.dpg-hair,.dpg-lock-l,.dpg-lock-r,.dpg-fins,.dpg-tail,.dpg-bubble-fx,.dpg-sparkle,.dpg-flag,.dpg-sweat,.dpg-badge,.dpg-zzz,.dpg-bubble,.dpg-panel{animation:none!important}
.dpg-mascot:hover{transform:none}
}
/* 1.3 compact radar: semantic host tokens, composited motion, no layout loops. */
.dpg-root{--dpg-scale:1;--dpg-buddy-scale:1;--dpg-buddy-h:236px;--dpg-base-h:176px;--dpg-base-w:168px;--dpg-h:calc(var(--dpg-base-h) * var(--dpg-scale));--dpg-w:calc(var(--dpg-base-w) * var(--dpg-scale));right:max(16px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));font-size:13px;color:var(--dsw-alias-label-primary)}
.dpg-root[data-size="large"]{--dpg-base-h:212px;--dpg-base-w:204px}
.dpg-root *{box-sizing:border-box}
.dpg-mascot{height:var(--dpg-h);width:var(--dpg-w);animation:dpg-enter .24s ease}
.dpg-root[data-phase="idle"] .dpg-sprite{animation-duration:7s;animation-timing-function:ease-in-out}
.dpg-root[data-phase="running"] .dpg-sprite{animation-duration:3s}
.dpg-sprite-wrap[data-pose="buddy"] .dpg-sprite{animation:dpg-buddy-idle 5.5s ease-in-out infinite}
.dpg-root[data-phase="done"] .dpg-sprite{animation:dpg-celebrate .5s ease 1,dpg-swim 5s ease-in-out .5s infinite}
.dpg-root[data-phase="error"] .dpg-sprite{animation:dpg-settle .3s ease 1}
.dpg-root[data-phase="waiting"] .dpg-sprite{animation:dpg-swim 5s ease-in-out infinite}
.dpg-mascot{position:relative}
.dpg-alerts{position:absolute;right:6px;top:10px;display:flex;gap:4px;align-items:center;pointer-events:none}
.dpg-alert-dot{display:block;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-error-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-overlay);animation:dpg-alert 2.4s ease-in-out infinite}
.dpg-alert-dot:nth-child(2){animation-delay:.3s}
.dpg-alert-dot:nth-child(3){animation-delay:.6s}
.dpg-root[data-size="large"] .dpg-alerts{right:10px;top:14px}
.dpg-restore{position:relative;width:44px;height:44px;display:grid;place-items:center;color:var(--dsw-alias-brand-primary);transition:transform .18s ease,background .18s ease}
.dpg-restore[data-phase="waiting"]{color:var(--dsw-alias-state-warn-primary);border-color:currentColor}
.dpg-restore[data-phase="error"]{color:var(--dsw-alias-state-error-primary);border-color:currentColor}
.dpg-mini-badge{position:absolute;right:-5px;top:-5px;min-width:18px;height:18px;border-radius:999px;background:var(--dsw-alias-bg-overlay);border:1px solid currentColor;color:inherit;font-size:10px;display:grid;place-items:center;padding:0 4px;font-weight:600}
.dpg-bubble{right:calc(var(--dpg-w) + 8px);bottom:70px;max-width:min(288px,calc(100vw - var(--dpg-w) - 52px));max-height:240px;overflow:auto;font-size:13px;padding:12px 32px 12px 15px}
.dpg-bubble-detail{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;line-height:1.5}
@keyframes dpg-alert{0%,100%{opacity:.55;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
@keyframes dpg-celebrate{0%{transform:translateY(0) rotate(0)}40%{transform:translateY(-7px) rotate(-2deg)}70%{transform:translateY(-2px) rotate(1deg)}100%{transform:none}}
@keyframes dpg-settle{0%{transform:translateX(0)}35%{transform:translateX(-2px)}70%{transform:translateX(2px)}100%{transform:none}}
@media(max-width:560px){.dpg-root{--dpg-base-h:144px;--dpg-base-w:140px;right:12px}.dpg-root[data-size="large"]{--dpg-base-h:176px;--dpg-base-w:168px}.dpg-bubble{right:0;bottom:calc(var(--dpg-h) + 12px);max-width:calc(100vw - 32px);width:280px}.dpg-panel{max-height:calc(100dvh - var(--dpg-h) - 60px)}}
@media(max-height:620px){.dpg-root,.dpg-root[data-size="large"]{--dpg-base-h:128px;--dpg-base-w:130px}.dpg-panel{bottom:44px;max-height:calc(100dvh - 92px)}}
@media(prefers-reduced-motion:reduce){.dpg-root *{animation:none!important;transition:none!important}.dpg-mascot:hover{transform:none}}

/* panel v2: one surface, hairline separators, no nested cards. */
.dpg-meter{display:flex;align-items:center;gap:8px;padding:8px 14px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dpg-meter-count{font-variant-numeric:tabular-nums}
.dpg-options{margin-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dpg-options>summary{min-height:34px;padding:0 14px;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary);cursor:pointer;list-style:none}
.dpg-options>summary::-webkit-details-marker{display:none}
.dpg-options>summary::before{content:"›";display:inline-block;font-size:13px;transition:transform .16s ease}
.dpg-options[open]>summary::before{transform:rotate(90deg)}
.dpg-options>summary:hover{color:var(--dsw-alias-label-primary)}
/* panel v3: shapes over labels — status orb, glyph rows, icon-only controls. */
/* panel v4: cel-shaded anime sticker — hard ink outline, pastel fills, offset shadow. */
.dpg-bar{display:block;height:6px;border:2px solid var(--ink);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#EEF3FA) 55%,#D9E7F5 45%);overflow:hidden}
.dpg-bar b{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--mint),var(--sky));transform-origin:left;transition:transform .25s ease}
/* panel v5: replica of the generated anime-cartoon reference — ink outlines, big type, pastel pills. */
.dpg-panel{pointer-events:auto;--ink:var(--dsw-alias-label-primary,#22304F);--paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#FFF8EF) 90%,#FFDFC0 10%);--card:color-mix(in srgb,var(--dsw-alias-bg-overlay,#FFFFFF) 55%,var(--dsw-alias-bg-layer-1,#FFFFFF) 45%);--sky:color-mix(in srgb,var(--dsw-alias-brand-primary,#8FD6F5) 45%,#8FD6F5 55%);--sea:color-mix(in srgb,var(--dsw-alias-brand-primary,#3F6FC4) 70%,#3F6FC4 30%);--mint:color-mix(in srgb,var(--dsw-alias-state-success-primary,#7FE3C0) 55%,#7FE3C0 45%);--coral:var(--dsw-alias-state-error-primary,#FF8A93);--butter:var(--dsw-alias-state-warn-primary,#FFD25E);--lav:color-mix(in srgb,var(--dsw-alias-brand-primary,#BCA9F5) 35%,#BCA9F5 65%);--muted:var(--dsw-alias-label-secondary,#5B6C8C);position:relative;width:min(330px,calc(100vw - 26px));max-height:calc(100dvh - var(--dpg-h) - 36px);padding:0 0 10px;border:3px solid var(--ink);border-radius:22px;background:var(--paper);color:var(--ink);box-shadow:4px 5px 0 rgba(34,48,79,.28),0 16px 34px rgba(0,0,0,.2);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;animation:dpg-pop-in .18s ease-out both}
.dpg-panel button:focus-visible{outline:3px solid var(--sea);outline-offset:2px}
.dpg-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:10px 10px 9px 11px;border-bottom:3px solid var(--ink);border-radius:19px 19px 0 0;background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-bg-layer-1,#FFFFFF) 35%,#A8DCF7 65%) 0%,color-mix(in srgb,var(--dsw-alias-bg-layer-1,#FFFFFF) 35%,#C9B8FA 65%) 100%)}
.dpg-head::after{content:"";position:absolute;right:96px;top:9px;width:10px;height:10px;border:2px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:13px 8px 0 -3px rgba(255,255,255,.8),-12px 12px 0 -4px rgba(255,255,255,.7);pointer-events:none}
.dpg-orb{position:relative;display:grid;place-items:center;flex:none;width:40px;height:40px;border:3px solid var(--ink);border-radius:50%;color:#fff;background:var(--sea);box-shadow:2px 2px 0 rgba(34,48,79,.3)}
.dpg-orb::before{content:"";position:absolute;inset:5px;border:2px solid rgba(255,255,255,.85);border-radius:50%}
.dpg-orb svg{position:relative;z-index:1}
.dpg-orb b{position:absolute;right:-8px;top:-8px;z-index:2;min-width:19px;height:19px;padding:0 3px;border:2px solid var(--ink);border-radius:999px;background:var(--coral);color:#fff;font-size:10px;line-height:15px;text-align:center;font-weight:800;font-variant-numeric:tabular-nums}
.dpg-orb[data-phase="running"]{background:var(--sea)}
.dpg-orb[data-phase="waiting"]{background:var(--dsw-alias-state-warn-primary,#EDB93C)}
.dpg-orb[data-phase="done"]{background:var(--dsw-alias-state-success-primary,#3FB98C)}
.dpg-orb[data-phase="error"]{background:var(--coral)}
.dpg-headline{display:flex;flex-direction:column;gap:1px;min-width:0}
.dpg-title{font-size:17px;font-weight:800;letter-spacing:.02em;line-height:1.2;color:var(--ink)}
.dpg-conn-line{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:#2F4A72}
.dpg-conn{display:inline-block;width:10px;height:10px;border:2px solid var(--ink);border-radius:50%;background:var(--dsw-alias-state-success-primary,#42C98C)}
.dpg-conn[data-ready="false"]{background:var(--butter)}
.dpg-head-gap{flex:1}
.dpg-close,.dpg-tool{display:grid;place-items:center;flex:none;width:32px;height:32px;padding:0;border:3px solid var(--ink);border-radius:11px;background:var(--card);color:var(--ink);cursor:pointer;box-shadow:2px 2px 0 rgba(34,48,79,.3);transition:transform .12s ease,background .12s ease}
.dpg-close:hover{background:var(--coral)}
.dpg-tool:hover{background:var(--sky)}
.dpg-tool[data-active="true"]{background:var(--mint)}
.dpg-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:9px 10px;border-bottom:3px solid var(--ink)}
.dpg-stat{display:flex;align-items:center;justify-content:center;gap:4px;min-height:34px;padding:0 4px;border:3px solid var(--ink);border-radius:12px;font:inherit;font-size:11.5px;font-weight:800;color:var(--ink);white-space:nowrap;box-shadow:2px 2px 0 rgba(34,48,79,.22);cursor:pointer;background:var(--card);transition:transform .12s ease,box-shadow .12s ease}
.dpg-stat:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 rgba(34,48,79,.3)}
.dpg-stat[data-active="true"]{outline:3px solid var(--sea);outline-offset:1px}
.dpg-stat svg{flex:none}
.dpg-stat[data-kind="waiting"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#FFF7E4) 45%,#FFE6A3 55%)}
.dpg-stat[data-kind="running"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#EAF3FF) 45%,#CBEAFB 55%)}
.dpg-stat[data-kind="results"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#E8FBF2) 45%,#C6F4DE 55%)}
.dpg-stat b{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
.dpg-count{flex:none;padding:0 4px;border:1.5px solid var(--muted);border-radius:999px;font-size:10px;font-weight:800;line-height:14px;color:var(--muted)}
.dpg-archive-note{margin:8px 10px 0;text-align:center;font-size:10.5px;font-weight:700;color:var(--muted)}
.dpg-list{display:flex;flex-direction:column;gap:8px;padding:9px 10px 0}
.dpg-row{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:8px;width:100%;padding:9px 10px;border:3px solid var(--ink);border-radius:15px;background:var(--card);color:var(--ink);font:inherit;text-align:left;cursor:pointer;box-shadow:3px 3px 0 rgba(34,48,79,.22);transition:transform .13s ease,box-shadow .13s ease}
.dpg-row:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 rgba(34,48,79,.3)}
.dpg-row:disabled{cursor:default}
.dpg-task{grid-template-columns:minmax(0,1fr)}
.dpg-task-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px}
.dpg-row-mark{width:14px;height:14px;border:3px solid var(--ink);border-radius:50%;background:#42C98C}
.dpg-row-mark[data-kind="waiting"]{background:var(--butter)}
.dpg-go{display:grid;place-items:center;width:30px;height:30px;border:3px solid var(--ink);border-radius:9px;background:var(--card);color:var(--ink);box-shadow:2px 2px 0 rgba(34,48,79,.26)}
.dpg-row-title{font-size:14px;font-weight:800;line-height:1.3;word-break:break-word}
.dpg-task[data-waiting="true"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#FFFBF0) 88%,var(--dsw-alias-state-warn-primary,#FFD25E) 12%)}
.dpg-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px;margin-top:5px;font-size:11.5px;font-weight:700;color:var(--muted)}
.dpg-meta-item{display:inline-flex;align-items:center;gap:4px;min-width:0}
.dpg-meta-item b{font-weight:700;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:126px}
.dpg-sep{width:1.5px;height:12px;background:#B9C6D8}
.dpg-row-note{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:4px;font-size:11.5px;line-height:1.5;font-weight:600;color:var(--muted);word-break:break-word}
.dpg-row-progress{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;margin-top:7px}
.dpg-bar{display:block;height:14px;border:3px solid var(--ink);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#EEF3FA) 55%,#D9E7F5 45%);overflow:hidden}
.dpg-bar b{display:block;height:100%;width:100%;background:linear-gradient(90deg,#4DE0A8,#4FC3F0);transform-origin:left;transition:transform .25s ease}
.dpg-row-pct{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
.dpg-row-body{display:flex;flex-direction:column;gap:2px;min-width:0}
.dpg-log-head{display:flex;align-items:baseline;gap:8px}
.dpg-log-head .dpg-row-title{flex:1;min-width:0}
.dpg-row-time{flex:none;font-size:11.5px;font-weight:700;color:var(--muted);white-space:nowrap}
.dpg-glyph{display:grid;place-items:center;width:34px;height:34px;border:3px solid var(--ink);border-radius:11px;background:#42C98C;color:#fff;box-shadow:2px 2px 0 rgba(34,48,79,.24)}
.dpg-glyph[data-kind="done"]{background:var(--dsw-alias-state-success-primary,#42C98C)}
.dpg-glyph[data-kind="error"],.dpg-glyph[data-kind="interrupted"]{background:var(--dsw-alias-state-error-primary,#FF7A85)}
.dpg-glyph[data-kind="stopped"],.dpg-glyph[data-kind="forked"]{background:var(--dsw-alias-state-warn-primary,#F5C246)}
.dpg-glyph[data-kind="waiting"],.dpg-glyph[data-kind="longRun"]{background:var(--dsw-alias-state-warn-primary,#F5C246)}
.dpg-empty{margin:9px 10px 0;padding:14px;border:3px dashed var(--dsw-alias-border-l2,#B9C6D8);border-radius:14px;font-size:12px;line-height:1.6;font-weight:700;color:var(--muted);text-align:center}
.dpg-more{display:flex;align-items:center;justify-content:center;gap:6px;width:calc(100% - 20px);margin:9px 10px 0;min-height:36px;border:3px dashed var(--sea);border-radius:999px;background:transparent;color:var(--sea);font:inherit;font-size:12.5px;font-weight:800;cursor:pointer;transition:background .15s ease}
.dpg-more:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#EAF4FF) 70%,#BFDDFF 30%)}
.dpg-tools{margin:9px 10px 0;padding:9px;border:3px solid var(--ink);border-radius:14px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#EFF6FF) 70%,#CFE4FF 30%)}
.dpg-toolrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dpg-toolrow-wrap{margin-top:6px;gap:5px}
.dpg-chip{display:inline-flex;align-items:center;gap:4px;min-height:26px;padding:0 8px;border:2px solid var(--ink);border-radius:8px;background:var(--card);color:var(--ink);font:inherit;font-size:10.5px;font-weight:700;cursor:pointer;box-shadow:1px 1px 0 rgba(34,48,79,.22)}
.dpg-chip[data-active="true"]{background:var(--mint)}
.dpg-anchor[data-collapsed="true"]{gap:10px}
.dpg-anchor[data-collapsed="true"] .dpg-bubble{position:static;right:auto;bottom:auto;max-width:min(280px,calc(100vw - 110px));margin:0}
.dpg-toolrow .dpg-tool{width:30px;height:30px;border-width:2.5px;border-radius:9px}
.dpg-vol{display:flex;align-items:center;gap:8px;margin-top:8px}
.dpg-vol input{flex:1;height:12px;accent-color:var(--sea);cursor:pointer}
.dpg-debug{margin-top:7px;font-size:10.5px;font-weight:700;color:var(--muted);word-break:break-word}
.dpg-debug[data-ready="false"]{color:#B4751D}
/* 2.0: on a narrow viewport the panel keeps every control; the mascot yields. */
@media(max-width:520px){
.dpg-root{right:10px;bottom:10px;--dpg-base-h:132px;--dpg-base-w:128px}
.dpg-anchor[data-open="true"] .dpg-mascot{display:none}
.dpg-anchor[data-open="true"] .dpg-panel{width:calc(100vw - 20px);max-height:calc(100dvh - 84px)}
}
@media(max-width:360px){
.dpg-tabs{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:7px 6px}
.dpg-stat{font-size:10px;gap:2px;min-height:30px}
.dpg-stat b{font-size:12px}
.dpg-close,.dpg-tool{width:28px;height:28px}
}
/* 2.1: surface and text colors derive from host theme tokens, so a DSH light
   or dark theme drives the panel through --dsw-alias-* instead of the OS
   preference. Artwork keeps its own palette. */
`;

    const Icons={
      close:'M6 6l12 12M18 6L6 18',
      gear:'M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8M4.6 12a7.4 7.4 0 0 1 .1-1.2l-1.5-1.1 1.7-2.9 1.7.7a7.4 7.4 0 0 1 2-1.2L8.8 4h3.4l.2 2.3a7.4 7.4 0 0 1 2 1.2l1.7-.7 1.7 2.9-1.5 1.1a7.4 7.4 0 0 1 0 2.4l1.5 1.1-1.7 2.9-1.7-.7a7.4 7.4 0 0 1-2 1.2l-.2 2.3H8.8l-.2-2.3a7.4 7.4 0 0 1-2-1.2l-1.7.7-1.7-2.9 1.5-1.1A7.4 7.4 0 0 1 4.6 12Z',
      bell:'M12 4.5a4.5 4.5 0 0 0-4.5 4.5c0 4-2 5-2 5h13s-2-1-2-5A4.5 4.5 0 0 0 12 4.5ZM10.3 18a1.8 1.8 0 0 0 3.4 0',
      mute:'M4 9.5h3l4-3.5v12l-4-3.5H4ZM15 9l5 6M20 9l-5 6',
      sound:'M4 9.5h3l4-3.5v12l-4-3.5H4ZM15.5 9a4 4 0 0 1 0 6M18 6.8a7.5 7.5 0 0 1 0 10.4',
      play:'M8.5 6.2v11.6L18 12z',
      expand:'M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5',
      hide:'M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6Zm9 2.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8',
      pulse:'M3 12h4l2.5-5 4 10 2.5-5h5',
      trash:'M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12M11 10v6M13 10v6',
      step:'M6 18V9M12 18V6M18 18v-7',
      clock:'M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM12 9v3.4l2.4 1.6',
      arrow:'M8 16 16 8M9.5 8H16v6.5',
      check:'M5 12.5 9.5 17 19 7',
      alert:'M12 4.5 21 19H3zM12 10v4M12 16.6h.01',
      pause:'M9 7v10M15 7v10',
      dot:'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
      layers:'M12 4.5 20 9l-8 4.5L4 9zM4 13l8 4.5L20 13',
      bolt:'M13 3.5 6.5 13.5H11l-1 7 7-10.5h-4.5z',
      checkCircle:'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM8.5 12.2l2.5 2.5 4.5-5',
      down:'M6 9.5 12 15.5 18 9.5',
      up:'M6 14.5 12 8.5 18 14.5'
    };
    function Icon({name,size=16}){
      const d=Icons[name]??Icons.dot;
      return h('svg',{viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d}));
    }
    const GLYPH={done:'check',error:'alert',interrupted:'alert',stopped:'pause',waiting:'clock',running:'dot',longRun:'clock',forked:'arrow',unknown:'dot'};

    function snapshotDebug(state) {
      return state.hostReady ? (state.native ? '后台已连接 · Windows 原生唤起（无需补丁）' : '后台已连接 · 浏览器通知') : '正在连接任务后台';
    }

    function TaskPanelGirl(props) {
      const t=props.t;
      const state=props.usePanelGirl(x=>x);
      const [open,setOpen]=React.useState(false);
      const [,setTick]=React.useState(0);
      const panelRef=React.useRef(null),triggerRef=React.useRef(null);
      React.useEffect(()=>{if(!open)return;const previous=document.activeElement;panelRef.current?.querySelector('button')?.focus();return()=>{try{(triggerRef.current||previous)?.focus()}catch{}}},[open]);
      const now=Date.now();
      React.useEffect(()=>{if(!open)return;const timer=setInterval(()=>setTick(v=>v+1),10000);return()=>clearInterval(timer);},[open]);
      React.useEffect(()=>{if(!open)return;const onKey=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[open]);
      const waiting=state.waitingCount;
      const activity=state.active??[];
      const latest=state.events[0];
      const attention=activity.find(x=>x.waiting);
      const focus=attention??activity[0];
      const topLabel=attention?t('waiting.'+(attention.waitKind||'choice')):t('state.'+state.phase);
      const toggle=event=>{triggerRef.current=event?.currentTarget||null;setOpen(v=>!v)};
      const phaseText=item=>item.waiting?t('waiting.'+(item.waitKind||'choice')):item.phase==='tool'&&item.tool?t('panel.tool',{tool:item.tool}):item.phase==='thinking'?t('panel.thinking'):t('panel.working');
      const [tools,setTools]=React.useState(false);
      const [allHistory,setAllHistory]=React.useState(false);
      const [tab,setTab]=React.useState(null);
      const panelText=(value,max=120)=>plainText(value,max);
      const connText=state.hostReady?t('panel.connected'):state.connectionLost?t('panel.offline'):t('panel.connecting');
      const alertStatus=state.alert?(state.alert.ok?t('alert.sent',{n:state.alertCount}):state.alert.reason):t('alert.ready');
      const phaseGlyph=GLYPH[state.phase]??'dot';
      // Mutually exclusive buckets: a session waiting for you is not "running".
      const waitingItems=activity.filter(x=>x.waiting);
      const runningItems=activity.filter(x=>!x.waiting);
      const terminalKinds=new Set(['done','error','interrupted','stopped','forked','unknown']);
      const resultMap=new Map();
      for(const event of state.events){
        if(!terminalKinds.has(event.kind)||!event.sessionId)continue;
        const previous=resultMap.get(event.sessionId);
        if(previous)previous.count+=1;else resultMap.set(event.sessionId,{...event,count:1});
      }
      const results=[...resultMap.values()];
      const tabs=[
        {key:'waiting',count:waitingItems.length,label:t('panel.tab.waiting'),icon:'clock'},
        {key:'running',count:runningItems.length,label:t('panel.tab.running'),icon:'bolt'},
        {key:'results',count:results.length,label:t('panel.tab.results'),icon:'checkCircle'}
      ];
      const tabItems={waiting:waitingItems,running:runningItems,results};
      const autoTab=waitingItems.length?'waiting':runningItems.length?'running':'results';
      // An explicit choice sticks even when that bucket is empty, so its empty
      // state is reachable; only the untouched default follows the data.
      const tabKey=tab??autoTab;
      const list=tabItems[tabKey];
      const shown=tabKey==='results'?(allHistory?list:list.slice(0,5)):list;
      const emptyText=tabKey==='waiting'?t('panel.emptyWaiting'):tabKey==='running'?t('panel.emptyRunning'):t('panel.emptyResults');
      const arrowBox=h('span',{className:'dpg-go','aria-hidden':'true'},h(Icon,{name:'arrow',size:14}));
      const taskRow=item=>{
        const pct=Number.isFinite(item.progress)&&item.todoTotal>0?Math.round(item.progress*100):null;
        const meta=[];
        if(item.workspace)meta.push({icon:'layers',text:item.workspace});
        if(item.children&&item.children.running>0)meta.push({icon:'bolt',text:t('panel.children',{n:item.children.running})});
        if(item.waiting)meta.push({icon:'clock',text:t('waiting.'+(item.waitKind||'choice'))});
        else if(item.phase==='tool'&&item.tool)meta.push({icon:'gear',text:t('panel.toolShort',{tool:item.tool})});
        else meta.push({icon:item.phase==='thinking'?'pulse':'gear',text:item.phase==='thinking'?t('panel.thinking'):t('panel.working')});
        if(Number.isFinite(item.step))meta.push({icon:'step',text:t('panel.step',{step:item.step})});
        if(Number.isFinite(item.since))meta.push({icon:'clock',text:formatDuration(t,Math.max(0,now-item.since))});
        return h('button',{key:item.sessionId,type:'button',className:'dpg-row dpg-task','data-waiting':item.waiting?'true':'false','data-phase':item.phase,'data-session':item.sessionId,title:t('panel.jump'),'aria-label':(item.title||t('title.untitled'))+' · '+meta.map(m=>m.text).join(' · '),onClick:()=>props.openSession(item.sessionId)},
          h('span',{className:'dpg-task-head'},
            h('i',{className:'dpg-row-mark','data-kind':item.waiting?'waiting':'running'}),
            h('span',{className:'dpg-row-title'},item.title||t('title.untitled')),
            arrowBox),
          h('span',{className:'dpg-meta'},meta.flatMap((m,i)=>[i?h('i',{key:'s'+i,className:'dpg-sep','aria-hidden':'true'}):null,h('span',{key:i,className:'dpg-meta-item',title:m.text},h(Icon,{name:m.icon,size:13}),h('b',null,m.text))]).filter(Boolean)),
          item.waiting&&item.message?h('span',{className:'dpg-row-note'},panelText(item.message,90)):null,
          pct!==null?h('span',{className:'dpg-row-progress'},
            h('i',{className:'dpg-bar',role:'progressbar','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':pct,'aria-label':t('panel.progress',{done:item.todoDone,total:item.todoTotal,percent:pct})},h('b',{style:{transform:'scaleX('+Math.max(0,Math.min(1,item.progress))+')'}})),
            h('span',{className:'dpg-row-pct'},item.todoDone+'/'+item.todoTotal)):null);
      };
      const logRow=event=>{
        const label=t('panel.short.'+event.kind)||t('event.'+event.kind);
        const summary=event.summaryFinal&&event.summary?panelText(event.summary,120):['error','interrupted'].includes(event.kind)?panelText(event.message,120):'';
        return h('button',{type:'button',key:event.sessionId||event.id,className:'dpg-row dpg-log','data-kind':event.kind,'data-session':event.sessionId||'',disabled:!event.sessionId,title:t('panel.openResult'),onClick:()=>props.openSession(event.sessionId)},
          h('i',{className:'dpg-glyph','data-kind':event.kind,'aria-hidden':'true'},h(Icon,{name:GLYPH[event.kind]??'dot',size:15})),
          h('span',{className:'dpg-row-body'},
            h('span',{className:'dpg-log-head'},
              h('span',{className:'dpg-row-title'},label+'：'+(event.title||t('title.untitled'))),
              event.count>1?h('span',{className:'dpg-count',title:t('panel.resultCount',{n:event.count})},'×'+event.count):null,
              h('span',{className:'dpg-row-time'},formatAgo(t,event.at,now))),
            summary?h('span',{className:'dpg-row-note'},summary):null));
      };
      const toolButton=(icon,label,pressed,action)=>h('button',{type:'button',className:'dpg-tool','aria-label':label,title:label,'aria-pressed':pressed===undefined?undefined:pressed,'data-active':pressed?'true':'false',onClick:action},h(Icon,{name:icon,size:15}));
      const panel=open?h('section',{id:'dpg-panel',ref:panelRef,className:'dpg-panel',role:'dialog','aria-label':t('panel.radar'),'aria-modal':false},
        h('header',{className:'dpg-head'},
          h('span',{className:'dpg-orb','data-phase':state.phase,role:'img','aria-label':topLabel,title:topLabel},h(Icon,{name:phaseGlyph,size:20}),state.runningCount||waiting?h('b',null,state.runningCount||waiting):null),
          h('span',{className:'dpg-headline'},
            h('strong',{className:'dpg-title'},t('panel.radar')),
            h('span',{className:'dpg-conn-line'},h('i',{className:'dpg-conn','data-ready':state.hostReady?'true':'false',role:'img','aria-label':connText,title:connText}),h('span',null,connText))),
          h('span',{className:'dpg-head-gap'}),
          h('button',{type:'button',className:'dpg-tool','aria-label':t('panel.options'),title:t('panel.options'),'aria-expanded':tools,onClick:()=>setTools(v=>!v)},h(Icon,{name:'gear',size:16})),
          h('button',{type:'button',className:'dpg-close','aria-label':t('panel.close'),title:t('panel.close'),onClick:()=>setOpen(false)},h(Icon,{name:'close',size:16}))),
        h('div',{className:'dpg-tabs',role:'tablist','aria-label':t('panel.radar')},
          tabs.map(item=>h('button',{key:item.key,type:'button',className:'dpg-stat',role:'tab','data-kind':item.key,'data-active':tabKey===item.key?'true':'false','aria-selected':tabKey===item.key,title:item.label,onClick:()=>setTab(item.key)},
            h(Icon,{name:item.icon,size:14}),h('span',null,item.label),h('b',null,item.count)))),
        shown.length?h('div',{className:'dpg-list'},shown.map(tabKey==='results'?logRow:taskRow)):h('p',{className:'dpg-empty'},emptyText),
        tabKey==='results'&&list.length>5?h('button',{type:'button',className:'dpg-more','aria-expanded':allHistory,onClick:()=>setAllHistory(v=>!v),title:allHistory?t('panel.less'):t('panel.more')},
          h(Icon,{name:allHistory?'up':'down',size:13}),h('b',null,allHistory?t('panel.less'):t('panel.moreShow',{n:list.length-5}))):null,
        tabKey==='results'&&results.length>=20?h('p',{className:'dpg-archive-note'},t('panel.archiveNote')):null,
        tools?h('div',{className:'dpg-tools'},
          h('div',{className:'dpg-toolrow'},
            toolButton('mute',t('panel.mute'),state.muted,props.toggleMute),
            toolButton('bell',t('panel.notify'),state.notifyEnabled,props.toggleNotify),
            toolButton('sound',t('panel.sound'),state.soundEnabled,props.toggleSound),
            toolButton('play',t('panel.preview'),undefined,props.previewSound),
            toolButton('expand',t('panel.size')+' · '+t(state.size==='large'?'panel.large':'panel.standard'),state.size==='large',props.toggleSize),
            toolButton('hide',t('panel.hide'),undefined,props.toggleHidden),
            toolButton('pulse',t('panel.test'),undefined,props.testNotification),
            toolButton('trash',t('panel.clear'),undefined,props.clearHistory)),
          h('label',{className:'dpg-vol'},h(Icon,{name:'sound',size:13}),h('span',{className:'dpg-num'},Math.round((state.soundVolume??.2)*100)+'%'),h('input',{type:'range',min:.05,max:.5,step:.05,value:state.soundVolume??.2,'aria-label':t('panel.volume'),onChange:e=>props.setVolume(e.target.value)})),
          h('div',{className:'dpg-toolrow dpg-toolrow-wrap'},
            h('button',{type:'button',className:'dpg-chip','data-active':state.notifyWhenFocused?'true':'false',title:t('panel.focusedNotify'),'aria-pressed':state.notifyWhenFocused,onClick:props.toggleFocusedNotify},h(Icon,{name:'bell',size:13}),h('span',null,t('panel.focusedNotify'))),
            h('button',{type:'button',className:'dpg-chip','data-active':state.longRunEnabled?'true':'false',title:t('panel.longRun'),'aria-pressed':state.longRunEnabled,onClick:props.toggleLongRun},h(Icon,{name:'clock',size:13}),h('span',null,t('panel.longRun')))),
          h('label',{className:'dpg-vol'},h(Icon,{name:'expand',size:13}),h('span',{className:'dpg-vol-label'},t('panel.scaleSeated')),h('span',{className:'dpg-num'},Math.round((state.mascotScale??1)*100)+'%'),h('input',{type:'range',min:.8,max:1.6,step:.1,value:state.mascotScale??1,'aria-label':t('panel.scaleSeated'),onChange:e=>props.setMascotScale(e.target.value)})),
          h('label',{className:'dpg-vol'},h(Icon,{name:'expand',size:13}),h('span',{className:'dpg-vol-label'},t('panel.scaleExpanded')),h('span',{className:'dpg-num'},Math.round((state.buddyScale??1)*100)+'%'),h('input',{type:'range',min:.8,max:1.6,step:.1,value:state.buddyScale??1,'aria-label':t('panel.scaleExpanded'),onChange:e=>props.setBuddyScale(e.target.value)})),
          h('span',{className:'dpg-debug','data-ready':state.hostReady?'true':'false',title:alertStatus},h('span',null,alertStatus))):null):null;
      const content=state.bubble&&!open?bubbleContent(t,state.bubble):null;
      const bubbleEvent=state.bubble?state.bubble.event:null;
      const bubble=content?h('div',{key:bubbleEvent.id,className:'dpg-bubble','data-tone':content.tone,'aria-live':'polite'},
        h('button',{type:'button',className:'dpg-bubble-main',title:t('panel.openResult'),'aria-label':content.text+' · '+t('panel.openResult'),
          onClick:()=>{const id=bubbleEvent.sessionId;props.dismissBubble();if(id)props.openSession(id);}},
          h('div',{className:'dpg-bubble-text'},content.text),
          content.detail?h('div',{className:'dpg-bubble-detail'},content.detail):null,
          bubbleEvent.sessionId?h('span',{className:'dpg-bubble-go','aria-hidden':true},h(Icon,{name:'arrow',size:12})):null),
        h('button',{type:'button',className:'dpg-bubble-close','aria-label':t('bubble.dismiss'),title:t('bubble.dismiss'),onClick:props.dismissBubble},h(Icon,{name:'close',size:13}))):null;
      const badge=waiting||state.runningCount;
      const restore=state.hidden?h('button',{type:'button',className:'dpg-restore','data-phase':state.phase,'aria-label':waiting?t('panel.restoreBadge',{n:waiting}):t('panel.show'),title:t('panel.show'),onClick:props.toggleHidden},h('svg',{viewBox:'0 0 24 24',width:22,height:22,'aria-hidden':true},h('path',{d:'M3 12c0-5 4-7 8-7 5 0 7 3 7 6l4-3-1 6c-3 5-7 7-12 5-4-1-6-4-6-7Zm5-2h.01M10 3l1-2m2 2 1-2',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round'})),badge?h('span',{className:'dpg-mini-badge'},badge):null):null;
      const alertDots=Math.min(3,waiting);
      const alerts=waiting>0?h('span',{className:'dpg-alerts','data-count':waiting,'aria-hidden':'true'},Array.from({length:alertDots},(_,i)=>h('i',{key:i,className:'dpg-alert-dot'}))):null;
      return h('div',{className:'dpg-root','data-artwork': 'whale-it-seated-v1','data-phase':state.phase,'data-size':state.size||'standard','data-hidden':state.hidden?'true':'false','data-scale':String(state.mascotScale??1),style:{'--dpg-scale':String(state.mascotScale??1),'--dpg-buddy-scale':String(state.buddyScale??1)}},h('style',null,CSS),state.hidden?h('div',{className:'dpg-anchor','data-collapsed':'true'},bubble,restore):h('div',{className:'dpg-anchor','data-open':open?'true':'false'},bubble,panel,
        h('button',{type:'button',className:'dpg-mascot',onClick:toggle,'aria-label':(open?t('panel.close'):t('panel.open'))+(waiting>0?' · '+t('panel.restoreBadge',{n:waiting}):''),'aria-expanded':open,'aria-controls':'dpg-panel',title:focus?.title||topLabel},h(Character,{phase:state.phase,muted:state.muted,open}),alerts)));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICT), 'whale-sentinel: locale dictionaries');
        const t = ctx.locale.bind(NS);
        const store = createStore(ctx, (event, receipt) => {
          const alert = desktopAlert(t, event);
          return showDesktopNotification(alert, {icon:notificationFace(event.kind), ...receipt});
        }, t);
        ctx.effect(() => () => store.dispose(), 'whale-sentinel: reminder store');
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'whale-sentinel',
          order: 30,
          locale: NS,
          inject: () => ({
            hooks: { panelGirl: store.observable },
            toggleMute: () => store.toggleMute(),
            toggleNotify: () => store.toggleNotify(),
            toggleHidden: () => store.toggleHidden(),
            toggleSound: () => store.toggleSound(),
            previewSound: () => store.previewSound(),
            setVolume: value => store.setVolume(value),
            toggleSize: () => store.toggleSize(),
            setMascotScale: value => store.setMascotScale(value),
            setBuddyScale: value => store.setBuddyScale(value),
            toggleFocusedNotify: () => store.toggleFocusedNotify(),
            toggleLongRun: () => store.toggleLongRun(),
            unlockAudio: () => store.unlockAudio(),
            testNotification: () => store.testNotification(),
            openSession: (sessionId) => openSession(ctx.get('uiWorkspace'), sessionId),
            clearHistory: () => store.clearHistory(),
            dismissBubble: () => store.dismissBubble()
          })
        }, TaskPanelGirl));
      }
    };
