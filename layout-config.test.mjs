import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./client.js',import.meta.url),'utf8');
test('hidden mascot keeps an in-panel notice instead of losing every reminder',()=>{
  const start=src.indexOf("return h('div',{className:'dpg-root'");
  assert.ok(start>0,'root render must exist');
  const branch=src.slice(start,start+900);
  assert.match(branch,/data-collapsed/,'collapsed state renders its own container');
  assert.match(branch,/bubble/,'hidden branch still renders the bubble');
  assert.match(branch,/panel/,'the badge can open the radar while the mascot stays hidden');
  assert.match(branch,/restore/,'hidden branch keeps the restore button');
});
test('mascot sizes are configurable data, not hard-coded strings',()=>{
  assert.match(src,/mascotScale/,'seated scale must come from settings');
  assert.match(src,/buddyScale/,'expanded scale must come from settings');
  assert.match(src,/data-scale/,'root exposes the applied scale');
});
test('settings expose foreground notifications and both sizes, without retired filters',()=>{
  assert.match(src,/toggleFocusedNotify|setFocusedNotify/,'a control toggles foreground system notifications');
  assert.match(src,/setMascotScale/,'seated size has a setter');
  assert.match(src,/setBuddyScale/,'expanded size has a setter');
  // The scope and row-count filters were removed; a stale control must not return.
  assert.doesNotMatch(src,/toggleScope|cycleHistoryLimit/,'retired filter controls must stay gone');
});
test('mascot animates as one whole body, with a pulse at the pointing hand',()=>{
  assert.doesNotMatch(src,/dpg-head-layer/,'a clipped head copy tears the silhouette');
  assert.doesNotMatch(src,/dpg-head-sway/,'no separate head rotation');
  assert.match(src,/dpg-breathe/,'body uses a gentle breathing loop');
  assert.match(src,/dpg-buddy-idle/,'expand-state pose gets its own float loop');
  assert.match(src,/dpg-point/,'pointing hand gets a pulse marker');
  assert.match(src,/dpg-tap/,'pulse marker needs its own keyframes');
  assert.match(src,/prefers-reduced-motion/,'motion must respect the reduced-motion preference');
});
test('expanded character matches the concept proportions',()=>{
  assert.match(src,/\.dpg-anchor\[data-open="true"\] \.dpg-sprite\{height:calc\(var\(--dpg-buddy-h\) \* var\(--dpg-buddy-scale,1\)\)/,'expand height derives from a pixel base, not a percentage chain');
  assert.match(src,/--dpg-buddy-h:236px/,'base height equals ~46% of the panel width expressed in height');
  assert.match(src,/margin-left:-10px/,'character tucks under the panel border');
});
test('seated and expanded sizes have separate controls',()=>{
  assert.match(src,/buddyScale/,'expanded size is its own setting');
  assert.match(src,/setBuddyScale/,'expanded size has its own setter');
  assert.match(src,/--dpg-buddy-scale/,'expanded size uses its own css variable');
  assert.match(src,/height:calc\(var\(--dpg-buddy-h\) \* var\(--dpg-buddy-scale/,'expanded height reads the buddy scale');
  const sliders=[...src.matchAll(/min:\.8,max:1\.6/g)].length;
  assert.ok(sliders>=2,'two size sliders must exist (seated and expanded)');
});
test('the size control also drives the expanded character',()=>{
  assert.match(src,/style:\{'--dpg-scale':String\(state\.mascotScale/,'root publishes the scale variable');
  assert.match(src,/min:\.8,max:1\.6/,'slider keeps the 80%-160% range');
});
test('layout anchors the mascot to the right of the panel',()=>{
  const anchor=src.split('\n').find(l=>l.startsWith('.dpg-anchor{'));
  assert.match(anchor,/flex-direction:row/,'panel and mascot sit side by side');
  assert.match(anchor,/align-items:flex-end/,'both anchored on the same baseline');
});
test('a narrow viewport keeps the panel complete and lets the mascot yield',()=>{
  const start=src.indexOf('@media(max-width:520px)');
  assert.ok(start>0,'narrow layout rule must exist');
  const block=src.slice(start,src.indexOf('}',src.indexOf('.dpg-anchor[data-open="true"] .dpg-panel',start))+1);
  assert.match(block,/\.dpg-anchor\[data-open="true"\] \.dpg-mascot\{display:none\}/,'the character yields before a control is clipped');
  assert.match(block,/width:calc\(100vw - 20px\)/,'the panel still fits the viewport');
});
test('panel colors follow host theme tokens instead of the OS preference',()=>{
  assert.match(src,/--ink:var\(--dsw-alias-label-primary/,'text and ink follow the host theme');
  assert.match(src,/--paper:color-mix\(in srgb,var\(--dsw-alias-bg-layer-1/,'surface follows the host layer token');
  assert.match(src,/--card:color-mix\(in srgb,var\(--dsw-alias-bg-overlay/,'raised cards mix the host overlay token');
  assert.match(src,/--muted:var\(--dsw-alias-label-secondary/,'secondary text follows the host');
  assert.doesNotMatch(src,/@media\(prefers-color-scheme:dark\)/,'dark is decided by the host theme, not the OS');
});
test('the waiting card uses a theme tint, never a hardcoded light surface',()=>{
  const rule=src.split('\n').find(line=>line.startsWith('.dpg-task[data-waiting="true"]'));
  assert.ok(rule,'waiting card rule exists');
  assert.match(rule,/color-mix\(in srgb,var\(--dsw-alias-bg-layer-1/,'waiting tint follows the host surface');
  assert.match(rule,/var\(--dsw-alias-state-warn-primary/,'waiting tint follows the host warning color');
  assert.doesNotMatch(rule,/#FFFBF0\}/,'a fixed cream background would make light text invisible in dark themes');
});
test('active sessions are not repeated in recent activity',()=>{
  assert.match(src,/terminalKinds=new Set\(\[/,'only terminal kinds become result rows');
  assert.match(src,/resultMap\.get\(event\.sessionId\)/,'results are grouped by session');
  assert.doesNotMatch(src,/event\.kind==='running'\|\|event\.kind==='waiting'/,'live transient events never become results');
});
test('the top row is a real tab list with mutually exclusive buckets',()=>{
  assert.match(src,/role:'tablist'/,'the row is a tab list');
  assert.match(src,/role:'tab'/,'each bucket is a tab');
  assert.match(src,/data-active/,'the selected tab is visible');
  assert.match(src,/waitingItems=activity\.filter\(x=>x\.waiting\)/,'waiting is its own bucket');
  assert.match(src,/runningItems=activity\.filter\(x=>!x\.waiting\)/,'a waiting session is not counted as running');
});
test('results are archived per session and capped by default',()=>{
  assert.match(src,/resultMap\.get\(event\.sessionId\)/,'one result row per session');
  assert.match(src,/list\.slice\(0,5\)/,'five results by default');
  assert.match(src,/dpg-archive-note/,'the retained window is disclosed');
});
test('tabs are keyboard operable and own a labelled tab panel',()=>{
  assert.match(src,/'aria-controls':'dpg-tabpanel'/,'each tab names its panel');
  assert.match(src,/role:'tabpanel'/,'the content is a tab panel');
  assert.match(src,/ArrowRight/,'left/right arrow navigation exists');
  assert.match(src,/tabIndex:tabKey===item\.key\?0:-1/,'roving tab index');
  assert.match(src,/onKeyDown:event=>onTabKey/,'keyboard handler is wired');
});
test('the dialog keeps keyboard focus inside itself and only sliders size the mascot',()=>{
  assert.match(src,/onKeyDown:onPanelKeyDown/,'the panel handles Tab');
  assert.match(src,/last\.focus\(\)/,'Shift+Tab wraps to the last control');
  assert.match(src,/first\.focus\(\)/,'Tab wraps to the first control');
  assert.doesNotMatch(src,/props\.toggleSize/,'the duplicate standard/large button is gone');
  assert.doesNotMatch(src,/toggleSize: \(\) =>/,'the legacy setter is not exposed');
});
test('the opening tab is chosen once, and a hidden mascot opens the panel',()=>{
  assert.match(src,/if\(!open\)setTab\(preferredTab\(\)\)/,'opening freezes the default tab');
  assert.match(src,/onClick:\(\)=>setOpen\(true\)/,'the restore badge opens the radar');
  assert.match(src,/panel\.staleSync/,'a stale connection shows the last sync time');
  assert.match(src,/dpg-prev/,'previous-turn results are labelled');
});
test('a task row shows its workspace and live delegated subagents',()=>{
  assert.match(src,/item\.workspace/,'workspace label comes from the host row');
  assert.match(src,/item\.children\.running/,'delegated activity is shown on the root row');
  assert.match(src,/panel\.children/,'the subagent label is localized');
});
test('the long-run nudge is a real setting, not dead copy',()=>{
  assert.match(src,/longRunEnabled/,'long-run state comes from settings');
  assert.match(src,/toggleLongRun/,'a control toggles it');
  assert.match(src,/panel\.longRun/,'the control has a localized label');
});
test('navigation outcomes are reported back as diagnostics',()=>{
  assert.match(src,/stage:'navigation-success'/,'success is traced');
  assert.match(src,/stage:'navigation-failed'/,'failure is traced with a reason');
});
test('new controls are wired into the slot props and would not silently do nothing',()=>{
  const inject=src.slice(src.indexOf("inject: () => ({"),src.indexOf("})",src.indexOf("inject: () => ({"))+3);
  for(const name of ['setMascotScale','toggleFocusedNotify','setBuddyScale','testNotification'])
    assert.match(inject,new RegExp('\\b'+name+'\\s*:'),name+' must be exposed to the component');
});
