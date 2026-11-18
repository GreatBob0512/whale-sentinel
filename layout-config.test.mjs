import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./client.js',import.meta.url),'utf8');
test('hidden mascot keeps an in-panel notice instead of losing every reminder',()=>{
  const start=src.indexOf("return h('div',{className:'dpg-root'");
  assert.ok(start>0,'root render must exist');
  const branch=src.slice(start,start+900);
  assert.match(branch,/data-collapsed/,'collapsed state renders its own container');
  assert.match(branch,/bubble/,'hidden branch still renders the bubble');
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
test('the panel follows the OS dark preference instead of glowing white',()=>{
  assert.match(src,/@media\(prefers-color-scheme:dark\)/,'dark appearance is handled');
  const start=src.indexOf('@media(prefers-color-scheme:dark)');
  assert.match(src.slice(start,start+1200),/--paper:#1B2436/,'panel surface is re-toned, not only text');
});
test('stat pills read host statistics instead of mixing sessions and events',()=>{
  assert.match(src,/stats\.active/,'task count comes from the host');
  assert.match(src,/stats\.doneToday/,'finished count has a real window');
  assert.doesNotMatch(src,/activity\.length\+state\.events\.length/,'sessions and events must not be added together');
});
test('new controls are wired into the slot props and would not silently do nothing',()=>{
  const inject=src.slice(src.indexOf("inject: () => ({"),src.indexOf("})",src.indexOf("inject: () => ({"))+3);
  for(const name of ['setMascotScale','toggleFocusedNotify','setBuddyScale','testNotification'])
    assert.match(inject,new RegExp('\\b'+name+'\\s*:'),name+' must be exposed to the component');
});
