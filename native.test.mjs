import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { win32 as winPath } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// The only mock is the process boundary: never restore a user's window or show
// a real notification as a side effect of the unit test suite.
let createNativeBridge;
try { ({ createNativeBridge } = await import('./native.js')); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const scriptURL = new URL('./native-wake.ps1', import.meta.url);
function bridge(options = {}) {
  assert.equal(typeof createNativeBridge, 'function', 'native bridge export must exist');
  return createNativeBridge({ platform: 'win32', parentPid: 1234, ...options });
}
function processes() {
  const calls = [];
  const spawnImpl = (file, args, options) => {
    const child = new EventEmitter();
    child.kills = 0;
    child.kill = () => { child.kills++; return true; };
    calls.push({ file, args, options, child });
    return child;
  };
  return { calls, spawnImpl };
}
const basic = { title: '任务完成', body: '回来看看', sessionId: 'session-a', kind: 'complete', activationUri:'dsh-whale-123456abcdef://activate/'+'a'.repeat(64) };
function payload(call) {
  const index = call.args.indexOf('-PayloadBase64');
  assert.ok(index > 0);
  return JSON.parse(Buffer.from(call.args[index + 1], 'base64').toString('utf8'));
}

test('non-Windows operations are unsupported without spawning', async () => {
  const fake = processes();
  const native = bridge({ platform: 'linux', spawnImpl: fake.spawnImpl });
  assert.deepEqual(await native.wake(), { ok: false, reason: 'unsupported' });
  assert.deepEqual(await native.notify(basic), { ok: false, reason: 'unsupported' });
  assert.equal(fake.calls.length, 0);
  native.dispose();
});

test('wake invokes only a fixed PowerShell file, passing trusted parent PID and no pipes', async () => {
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  const pending = native.wake();
  const call = fake.calls[0];
  assert.match(call.file, /WindowsPowerShell\\v1\.0\\powershell\.exe$/i);
  assert.equal(call.options.stdio, 'ignore');
  assert.equal(call.options.shell, false);
  assert.equal(call.options.windowsHide, true);
  assert.ok(call.args.includes('-NoProfile'));
  assert.ok(call.args.includes('-NonInteractive'));
  assert.ok(call.args.includes('-File'));
  assert.ok(!call.args.includes('-Command'));
  assert.ok(!call.args.includes('-EncodedCommand'));
  assert.match(call.args[call.args.indexOf('-File') + 1], /native-wake\.ps1$/);
  assert.equal(call.args[call.args.indexOf('-ParentPid') + 1], '1234');
  assert.equal(call.args[call.args.indexOf('-Mode') + 1], 'Wake');
  let settled = false;
  pending.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false, 'spawn is not proof of foreground success');
  call.child.emit('close', 0, null);
  assert.deepEqual(await pending, { ok: true, reason: 'foreground' });
  native.dispose();
});

test('wake supports explicit executable/script paths without shell interpolation', async () => {
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl, psPath: 'C:\\PS path\\powershell.exe', wakeScript: 'C:\\helper path\\native-wake.ps1' });
  const pending = native.wake();
  assert.equal(fake.calls[0].file, 'C:\\PS path\\powershell.exe');
  assert.equal(fake.calls[0].args[fake.calls[0].args.indexOf('-File') + 1], 'C:\\helper path\\native-wake.ps1');
  fake.calls[0].child.emit('close', 0);
  assert.equal((await pending).ok, true);
  native.dispose();
});

test('invalid trusted PID cannot broaden wake matching', async () => {
  for (const parentPid of [0, -1, 1.1, NaN, '1234', 2147483648]) {
    const fake = processes();
    const native = bridge({ spawnImpl: fake.spawnImpl, parentPid });
    assert.deepEqual(await native.wake(), { ok: false, reason: 'invalid-parent-pid' });
    assert.equal(fake.calls.length, 0);
    native.dispose();
  }
});

test('wake reports native failure and signal exits honestly', async () => {
  for (const [code, signal, reason] of [[20, null, 'window-not-found'], [21, null, 'foreground-denied'], [22, null, 'untrusted-parent'], [23, null, 'ambiguous-window'], [1, null, 'powershell-failed'], [null, 'SIGTERM', 'terminated']]) {
    const fake = processes();
    const native = bridge({ spawnImpl: fake.spawnImpl });
    const pending = native.wake();
    fake.calls[0].child.emit('close', code, signal);
    assert.deepEqual(await pending, { ok: false, reason });
    native.dispose();
  }
});

test('spawn exceptions and asynchronous errors resolve instead of rejecting', async () => {
  const native = bridge({ spawnImpl() { throw new Error('ENOENT'); } });
  assert.deepEqual(await native.wake(), { ok: false, reason: 'spawn-failed' });
  native.dispose();
  const fake = processes();
  const other = bridge({ spawnImpl: fake.spawnImpl });
  const pending = other.notify(basic);
  fake.calls[0].child.emit('error', new Error('ENOENT'));
  fake.calls[0].child.emit('close', 0);
  assert.deepEqual(await pending, { ok: false, reason: 'spawn-failed' });
  other.dispose();
});

test('wake times out and kills its short-lived child', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  const pending = native.wake();
  t.mock.timers.tick(15000);
  assert.deepEqual(await pending, { ok: false, reason: 'timeout' });
  assert.equal(fake.calls[0].child.kills, 1);
  fake.calls[0].child.emit('close', 0);
  native.dispose();
});

test('dispose cancels all pending operations and refuses future operations', async () => {
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  const first = native.wake();
  const second = native.notify(basic);
  native.dispose();
  native.dispose();
  assert.deepEqual(await first, { ok: false, reason: 'disposed' });
  assert.deepEqual(await second, { ok: false, reason: 'disposed' });
  assert.ok(fake.calls.every(call => call.child.kills === 1));
  assert.deepEqual(await native.wake(), { ok: false, reason: 'disposed' });
  assert.deepEqual(await native.notify(basic), { ok: false, reason: 'disposed' });
  assert.equal(fake.calls.length, 2);
});

test('notify safely roundtrips hostile Unicode content as data and stable per-session tags', async () => {
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  const hostile = { ...basic, title: `中文 ' \" ; $(Stop-Process -Id 1) <&>`, body: 'line1\nline2 💙 `; exit 0', iconPath: 'C:\\images\\full body.png' };
  const tags = [];
  for (const input of [hostile, { ...hostile, body: 'changed', kind: 'error' }, { ...hostile, sessionId: 'session-b' }]) {
    const pending = native.notify(input);
    const call = fake.calls.at(-1);
    assert.equal(call.options.stdio, 'ignore');
    assert.equal(call.args[call.args.indexOf('-Mode') + 1], 'Notify');
    const decoded = payload(call);
    for (const key of Object.keys(input)) assert.equal(decoded[key], input[key]);
    assert.match(decoded.tag, /^[a-f0-9]{16}$/);
    tags.push(decoded.tag);
    assert.ok(!call.args.some(value => value.includes(hostile.title) || value.includes(hostile.body)));
    call.child.emit('close', 0);
    assert.deepEqual(await pending, { ok: true, reason: 'submitted-local-toast-session-fallback-unavailable' });
  }
  assert.equal(tags[0], tags[1]);
  assert.notEqual(tags[1], tags[2]);
  native.dispose();
});

test('notification sound is opt-in and passed only as data',async()=>{const fake=processes();const native=bridge({spawnImpl:fake.spawnImpl});let promise=native.notify(basic);assert.equal(payload(fake.calls[0]).soundEnabled,false);fake.calls[0].child.emit('close',0);await promise;promise=native.notify({...basic,soundEnabled:true});assert.equal(payload(fake.calls[1]).soundEnabled,true);fake.calls[1].child.emit('close',0);await promise;native.dispose()});
test('notify rejects invalid payloads before spawning', async () => {
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  for (const input of [undefined, {}, { ...basic, title: 42 }, { ...basic, sessionId: '' }, { ...basic, body: 'x'.repeat(2001) }, { ...basic, iconPath: 'relative.png' }, { ...basic, iconPath: 'https://example.test/a.png' }, { ...basic, iconPath: 'C:\\a.jpg' }, { ...basic, body: 'bad\u0000xml' }]) {
    assert.deepEqual(await native.notify(input), { ok: false, reason: 'invalid-notification' });
  }
  assert.equal(fake.calls.length, 0);
  native.dispose();
});

test('notify reports submission failure and has bounded lifetime', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  const pending = native.notify(basic);
  fake.calls[0].child.emit('close', 30);
  assert.deepEqual(await pending, { ok: false, reason: 'toast-failed' });
  const hung = native.notify(basic);
  t.mock.timers.tick(15000);
  assert.deepEqual(await hung, { ok: false, reason: 'timeout' });
  assert.equal(fake.calls[1].child.kills, 1);
  native.dispose();
});

test('Windows PowerShell 5.1 parses script, compiles C#, rejects renderers and invalid data without UI side effects', { skip: process.platform !== 'win32' }, () => {
  const scriptPath = fileURLToPath(scriptURL).replaceAll("'", "''");
  const harness = `
$ErrorActionPreference = 'Stop'
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile('${scriptPath}', [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { exit 91 }
$type = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.CommandAst] -and $n.GetCommandName() -eq 'Add-Type' }, $true)
Add-Type -TypeDefinition $type.CommandElements[-1].Value
# Load only function definitions. Never execute the script's bottom-level entry.
$functions = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)
foreach ($definition in $functions) { . ([scriptblock]::Create($definition.Extent.Text)) }
$ParentPid = 1234
# Process enumeration is the OS boundary; no real user32 calls occur because
# invalid/mismatched/renderer parents must be rejected before window enumeration.
function Get-CimInstance {
  [pscustomobject]@{ ProcessId = 1234; ParentProcessId = 0; ExecutablePath = 'C:\\other\\Other.exe'; CommandLine = 'Other.exe' }
}
if ((Invoke-DshWake) -ne 22) { exit 92 }
foreach ($command in @('"C:\\DSH\\DeepSeek Harness.exe" --type=renderer', '"C:\\DSH\\DeepSeek Harness.exe" "--type=renderer"')) {
  function Get-CimInstance {
    [pscustomobject]@{ ProcessId = 1234; ParentProcessId = 0; ExecutablePath = 'C:\\DSH\\DeepSeek Harness.exe'; CommandLine = $command }
  }
  if ((Invoke-DshWake) -ne 22) { exit 93 }
}
$PayloadBase64 = ''
if ((Invoke-DshToast) -ne 30) { exit 94 }
$PayloadBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"tag":"invalid"}'))
if ((Invoke-DshToast) -ne 30) { exit 95 }
# Construct a real WinRT notification but remove only Show at the native boundary.
$toastDefinition = $functions | Where-Object Name -eq 'Invoke-DshToast'
$toastText = $toastDefinition.Extent.Text.Replace('$notifier.Show($notification)', '$script:toastXml = $notification.Content.GetXml(); $script:selectedAppId = $appId; if ($notification.Tag -ne "0123456789abcdef" -or $null -eq $notifier) { throw "construction failed" }')
. ([scriptblock]::Create($toastText))
$imageFile = '${fileURLToPath(new URL('./assets/fish-done-side.png', import.meta.url)).replaceAll("'", "''")}'
$PayloadBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((@{title='safe <&> title';body='line body';tag='0123456789abcdef';iconPath=$imageFile;meta='duration 27s';activationUri='dsh-whale-123456abcdef://activate/'+('a'*64)} | ConvertTo-Json -Compress)))
function Get-StartApps { [pscustomobject]@{Name='DeepSeek Harness';AppID='electron.app.DeepSeek Harness'} }
if ((Invoke-DshToast) -ne 0) { exit 90 }
if ($selectedAppId -ne 'electron.app.DeepSeek Harness' -or $toastXml -notmatch '<group>' -or $toastXml -notmatch 'hint-maxLines="3"' -or $toastXml -notmatch 'hint-weight="1"' -or $toastXml -match 'placement="hero"' -or $toastXml -notmatch 'safe &lt;&amp;&gt; title') { exit 89 }
function Get-StartApps { [pscustomobject]@{Name='DeepSeek Harness';AppID='com.deepseek.dsh'} }
if ((Invoke-DshToast) -ne 0 -or $selectedAppId -ne 'com.deepseek.dsh') { exit 88 }
function Get-StartApps { [pscustomobject]@{Name='DeepSeek Harness';AppID='not-allowed'} }
if ((Invoke-DshToast) -ne 0 -or $selectedAppId -notmatch 'WindowsPowerShell') { exit 87 }
function Get-StartApps { throw 'lookup unavailable' }
if ((Invoke-DshToast) -ne 0 -or $selectedAppId -notmatch 'WindowsPowerShell') { exit 86 }
# Replace only user32 with an in-memory boundary double; run the real PowerShell
# candidate-selection/verification logic against synthetic process records.
Add-Type -TypeDefinition @'
using System;
public static class DshMockWindows {
  public static IntPtr[] Windows = new IntPtr[] { (IntPtr)11 };
  public static IntPtr Foreground = IntPtr.Zero;
  public static IntPtr Visible = IntPtr.Zero;
  public static IntPtr Shown = IntPtr.Zero;
  public static bool Accept = true;
  public static int ShowCommand = 0;
  public static bool Zoomed = false;
  public static System.Collections.Generic.List<int> Commands = new System.Collections.Generic.List<int>();
  public static uint RequestedPid = 0;
  public static IntPtr[] Find(uint pid) { RequestedPid = pid; return Windows; }
  public static IntPtr GetForegroundWindow() { return Foreground; }
  public static bool IsWindowVisible(IntPtr hwnd) { return hwnd == Visible; }
  public static bool IsWindow(IntPtr hwnd) { return true; }
  public static bool IsIconic(IntPtr hwnd) { return false; }
  public static bool IsZoomed(IntPtr hwnd) { return Zoomed; }
  public static uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid) { pid = RequestedPid; return 1; }
  public static bool ShowWindow(IntPtr hwnd, int command) { Shown = hwnd; ShowCommand = command; Commands.Add(command); Visible = hwnd; if (command == 3) Zoomed = true; return false; }
  public static bool SetForegroundWindow(IntPtr hwnd) { if (Accept) Foreground = hwnd; return Accept; }
}
'@
$wakeDefinition = $functions | Where-Object Name -eq 'Invoke-DshWake'
$wakeText = $wakeDefinition.Extent.Text.Replace($type.Extent.Text, '').Replace('[DshNativeWindows]', '[DshMockWindows]')
. ([scriptblock]::Create($wakeText))
$mainRecord = [pscustomobject]@{ ProcessId = 1234; ParentProcessId = 999; ExecutablePath = 'C:\\DSH\\DeepSeek Harness.exe'; CommandLine = '"C:\\DSH\\DeepSeek Harness.exe"'; CreationDate = [datetime]'2026-01-01' }
function Get-CimInstance {
  param([string]$ClassName, [string]$Filter)
  if ($Filter) { return $mainRecord }
  $mainRecord
  [pscustomobject]@{ ProcessId = 999; ParentProcessId = 0; ExecutablePath = 'C:\\DSH\\DeepSeek Harness.exe'; CommandLine = '"C:\\DSH\\DeepSeek Harness.exe"'; CreationDate = [datetime]'2026-01-01' }
}
if ((Invoke-DshWake) -ne 0 -or [DshMockWindows]::RequestedPid -ne 1234 -or [DshMockWindows]::Shown -ne [IntPtr]11) { exit 96 }
# Restore (9) must come before maximize (3), and the window ends maximized.
if (([DshMockWindows]::Commands -join ',') -ne '9,3' -or -not [DshMockWindows]::Zoomed) { exit 85 }
[DshMockWindows]::Windows = [IntPtr[]]@([IntPtr]11, [IntPtr]12)
[DshMockWindows]::Foreground = [IntPtr]::Zero
[DshMockWindows]::Visible = [IntPtr]::Zero
[DshMockWindows]::Shown = [IntPtr]::Zero
if ((Invoke-DshWake) -ne 23 -or [DshMockWindows]::Shown -ne [IntPtr]::Zero) { exit 97 }
[DshMockWindows]::Visible = [IntPtr]12
if ((Invoke-DshWake) -ne 0 -or [DshMockWindows]::Shown -ne [IntPtr]12) { exit 98 }
[DshMockWindows]::Windows = [IntPtr[]]@([IntPtr]11)
[DshMockWindows]::Foreground = [IntPtr]::Zero
[DshMockWindows]::Accept = $false
if ((Invoke-DshWake) -ne 21) { exit 99 }
exit 0
`;
  const ps = winPath.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  // -EncodedCommand is test harness only, never used by the production bridge.
  const execution = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(harness, 'utf16le').toString('base64')], { stdio: 'ignore', windowsHide: true, timeout: 15000 });
  assert.ifError(execution.error);
  assert.equal(execution.status, 0, `PowerShell noninteractive validation failed: exit ${execution.status}, signal ${execution.signal}`);
});

// These checks guard the security-critical native source boundary. They are
// not a substitute for the parent's interactive Windows integration check.
test('native script enumerates hidden Chromium windows and validates process ancestry/path/type', async () => {
  const script = await readFile(scriptURL, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  assert.match(script, /EnumWindows/);
  assert.doesNotMatch(script, /MainWindowHandle/);
  assert.match(script, /DeepSeek Harness\.exe/);
  assert.match(script, /Chrome_WidgetWin_1/);
  assert.match(script, /--type/);
  assert.match(script, /ParentProcessId/);
  assert.match(script, /GetFileName/);
  assert.match(script, /GetWindowThreadProcessId/);
  assert.match(script, /ShowWindow\([^\r\n]*,\s*9\)/);
  assert.match(script, /SetForegroundWindow/);
  assert.match(script, /GetForegroundWindow/);
  assert.match(script, /IsIconic/);
  // Quoted Chromium arguments are still process-type arguments, not a main process.
  const rendererRule = script.split('\n').find(line => line.includes('$record.CommandLine -match'));
  assert.ok(rendererRule?.includes('["\\s]'), 'quoted --type renderer arguments must be excluded');
});

test('removing a toast targets the same per-session tag, and an empty target removes the group', async () => {
  const fake = processes();
  const native = bridge({ spawnImpl: fake.spawnImpl });
  const one = native.remove({ sessionId: 'session-a' });
  const call = fake.calls.at(-1);
  assert.equal(call.args[call.args.indexOf('-Mode') + 1], 'Remove');
  const tag = createHash('sha256').update('session-a', 'utf8').digest('hex').slice(0, 16);
  assert.equal(call.args[call.args.indexOf('-Tag') + 1], tag);
  call.child.emit('close', 0);
  assert.deepEqual(await one, { ok: true, reason: 'removed' });
  const all = native.remove();
  assert.ok(!fake.calls.at(-1).args.includes('-Tag'), 'no tag removes the group');
  fake.calls.at(-1).child.emit('close', 0);
  assert.deepEqual(await all, { ok: true, reason: 'removed' });
  assert.deepEqual(await native.remove({ sessionId: 42 }), { ok: false, reason: 'invalid-notification' });
  native.dispose();
});

test('toast script builds XML as data, supports an inline PNG, and never registers protocol/task/daemon', async () => {
  const script = await readFile(scriptURL, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  assert.match(script, /FromBase64String/);
  assert.match(script, /ConvertFrom-Json/);
  assert.match(script, /CreateElement/);
  assert.match(script, /InnerText/);
  assert.match(script, /ToastGeneric/);
  assert.match(script, /data\.activationUri/);
  assert.match(script, /\.Tag\s*=/);
  assert.ok(script.includes('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'), 'use the existing registered PowerShell application identity');
  assert.doesNotMatch(script, /\$notifier\.Setting/, 'WinRT Setting projection may be null in Windows PowerShell 5.1');
  assert.doesNotMatch(script, /Invoke-Expression|\biex\b|Register-ScheduledTask|New-ItemProperty|while\s*\(\s*\$true/i);
});
