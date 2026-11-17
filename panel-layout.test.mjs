import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./client.js',import.meta.url),'utf8');
test('panel caps its height and scrolls internally instead of growing past the viewport',()=>{
  const rule=src.split('\n').find(line=>line.startsWith('.dpg-panel{'));
  assert.ok(rule,'panel rule exists');
  assert.match(rule,/max-height:calc\(100dvh/);
  assert.match(rule,/overflow-y:auto/);
});
test('panel header stays visible while the list scrolls',()=>{
  const rule=src.split('\n').find(line=>line.startsWith('.dpg-head{'));
  assert.match(rule,/position:sticky/);
});
test('panel is interactive inside the click-through overlay root',()=>{
  const root=src.split('\n').find(line=>line.startsWith('.dpg-root{'));
  assert.match(root,/pointer-events:none/,'overlay root must stay click-through');
  const rule=src.split('\n').find(line=>line.startsWith('.dpg-panel{'));
  assert.match(rule,/pointer-events:auto/,'panel must opt back into pointer events or every control dies');
});
test('panel controls keep a visible keyboard focus ring',()=>{
  assert.match(src,/\.dpg-panel button:focus-visible\{[^}]*outline:3px solid/);
});
test('panel matches the generated anime-cartoon reference',()=>{
  const css=src.slice(src.indexOf('const CSS ='),src.indexOf('function snapshotDebug'));
  assert.match(css,/\.dpg-panel\{[^}]*border:3px solid/, 'thick ink outline like the reference');
  assert.match(css,/\.dpg-panel\{[^}]*box-shadow:4px 5px 0/, 'offset sticker shadow');
  assert.match(css,/\.dpg-head\{[^}]*linear-gradient\(135deg,#A8DCF7/, 'sky-to-lavender header');
  assert.match(css,/\.dpg-title\{[^}]*font-size:17px[^}]*font-weight:800/, 'large readable title');
  assert.match(css,/\.dpg-stats\{[^}]*grid-template-columns:repeat\(3,1fr\)/, 'three pastel stat pills');
  assert.match(css,/\.dpg-row\{[^}]*border:3px solid[^}]*border-radius:15px/, 'outlined task cards');
  assert.match(css,/\.dpg-bar\{[^}]*height:14px/, 'thick progress bar');
  assert.doesNotMatch(css,/border-top:0/, 'every card keeps its full outline');
});
