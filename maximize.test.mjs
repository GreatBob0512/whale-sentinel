import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('./native-wake.ps1',import.meta.url),'utf8');
test('wake restores then maximizes the DSH window instead of leaving it windowed',()=>{
  assert.match(script,/IsZoomed/);
  const restore=script.indexOf('ShowWindow($hwnd, 9)'),maximize=script.indexOf('ShowWindow($hwnd, 3)');
  assert.ok(restore>=0,'restore from tray/minimize first');
  assert.ok(maximize>restore,'maximize after restore so minimized windows fill the screen');
});
test('maximize is attempted again after foreground for windows that ignore it while inactive',()=>{
  const after=script.slice(script.indexOf('SetForegroundWindow($hwnd)'));
  assert.match(after,/IsZoomed/);
  assert.match(after,/ShowWindow\(\$hwnd, 3\)/);
});
