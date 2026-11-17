import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const module = await import('./win-activation.js').catch(() => null);
const protocol = 'dsh-whale-012345abcdef';
const token = 'a'.repeat(64);
const options = { platform: 'win32', protocol, spoolDir: 'C:\\whale spool', scriptPath: 'C:\\whale app\\win-activation.ps1', powershellPath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' };
function bridge(extra = {}) {
  assert.equal(typeof module?.createWindowsActivation, 'function', 'activation factory must exist');
  return module.createWindowsActivation({ ...options, ...extra });
}
function fakeSpawn(code = 0) {
  const calls = [];
  const fn = (...args) => {
    const child = new EventEmitter();
    child.kill = () => { child.killed = true; };
    calls.push({ args, child });
    if (code !== 'pending') queueMicrotask(() => child.emit('close', code, null));
    return child;
  };
  return { fn, calls };
}

test('factory exists before any implementation', () => assert.equal(typeof module?.createWindowsActivation, 'function'));
test('URL readiness requires actual successful registration; only opaque tokens accepted', async () => {
  const fake = fakeSpawn();
  const value = bridge({ spawnImpl: fake.fn });
  assert.equal(value.url(token), null);
  assert.deepEqual(await value.register(), { ok: true, reason: 'registered' });
  assert.equal(value.url(token), `${protocol}://activate/${token}`);
  for (const bad of ['', token.toUpperCase(), token + '/x', token + '\n', 'session-id', null]) assert.equal(value.url(bad), null);
  assert.deepEqual(await value.register(), { ok: true, reason: 'registered' });
  assert.equal(fake.calls.length, 1, 'one-time registration');
  const [exe, args, spawnOptions] = fake.calls[0].args;
  assert.equal(exe, options.powershellPath);
  assert.deepEqual(args, ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', options.scriptPath, '-Mode', 'Register', '-Protocol', protocol, '-SpoolDirectory', options.spoolDir]);
  assert.deepEqual(spawnOptions, { stdio: 'ignore', shell: false, windowsHide: true });
  assert.deepEqual(await value.unregister(), { ok: true, reason: 'unregistered' });
  assert.equal(value.url(token), null);
  assert.equal(fake.calls[1].args[1].includes('Unregister'), true);
});
test('rejects unsafe configuration without launching anything', async () => {
  const fake = fakeSpawn();
  for (const extra of [ { protocol: 'dsh' }, { protocol: protocol.toUpperCase() }, { protocol: protocol + '\n' }, { spoolDir: '\\\\host\\share' }, { spoolDir: 'C:relative' }, { spoolDir: 'C:\\bad"path' }, { spoolDir: 'C:\\bad\npath' }, { spoolDir: 'C:\\bad%1path' }, { scriptPath: 'relative.ps1' }, { powershellPath: 'powershell.exe' } ]) {
    const value = bridge({ spawnImpl: fake.fn, ...extra });
    assert.deepEqual(await value.register(), { ok: false, reason: 'invalid-configuration' });
    assert.equal(value.url(token), null);
  }
  assert.equal(fake.calls.length, 0);
  assert.deepEqual(await bridge({ platform: 'linux', spawnImpl: fake.fn }).register(), { ok: false, reason: 'unsupported-platform' });
});
test('returns real PowerShell failures and termination, never ready on failure', async () => {
  for (const [code, reason] of [[2, 'invalid-input'], [3, 'conflict'], [4, 'io-error'], [19, 'exit-19'], [null, 'terminated']]) {
    const fake = fakeSpawn(code);
    const value = bridge({ spawnImpl: fake.fn });
    assert.deepEqual(await value.register(), { ok: false, reason });
    assert.equal(value.url(token), null);
  }
  const failed = bridge({ spawnImpl: () => { throw new Error('spawn'); } });
  assert.deepEqual(await failed.register(), { ok: false, reason: 'spawn-error' });
});
test('dispose kills active short process, permanently disables bridge', async () => {
  const fake = fakeSpawn('pending');
  const value = bridge({ spawnImpl: fake.fn });
  const pending = value.register();
  await value.dispose();
  assert.equal(fake.calls[0].child.killed, true);
  assert.deepEqual(await pending, { ok: false, reason: 'disposed' });
  assert.deepEqual(await value.register(), { ok: false, reason: 'disposed' });
  assert.equal(value.url(token), null);
});
test('10-second timeout kills helper and cannot report ready', { timeout: 15000 }, async () => {
  const fake = fakeSpawn('pending');
  const value = bridge({ spawnImpl: fake.fn });
  assert.deepEqual(await value.register(), { ok: false, reason: 'timeout' });
  assert.equal(fake.calls[0].child.killed, true);
  assert.equal(value.url(token), null);
});

test('PowerShell AST parses and pure function boundaries reject hostile URIs/foreign ownership', { skip: process.platform !== 'win32' }, () => {
  const scriptPath = fileURLToPath(new URL('./win-activation.ps1', import.meta.url));
  const source = readFileSync(scriptPath, 'utf8');
  assert.match(source, /FileMode\]::CreateNew/);
  assert.doesNotMatch(source, /Invoke-WebRequest|Start-Process|ShowWindow|schtasks|HKLM:/i);
  const ps = `
$ErrorActionPreference = 'Stop'
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile('${scriptPath.replaceAll("'", "''")}', [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { throw ($errors | Out-String) }
# Extract only function declarations: the registry entrypoint is NEVER executed.
$functions = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)
foreach ($fn in $functions) { Invoke-Expression $fn.Extent.Text }
$p = '${protocol}'; $t = '${token}'; $good = $p + '://activate/' + $t
if ((Get-ActivationToken $good $p) -cne $t) { throw 'valid URI rejected' }
$bad = @($good + '/', $good + '?x', $good + '#x', $p + '://user@activate/' + $t, $p + '://activate:80/' + $t, $p + '://activate//' + $t, $p + '://activate/%61' + $t.Substring(1), $p + '://ACTIVATE/' + $t, $p.ToUpperInvariant() + '://activate/' + $t, $good + ' -Command evil', $p + '://activate/' + $t.ToUpperInvariant())
foreach ($uri in $bad) { if ($null -ne (Get-ActivationToken $uri $p)) { throw ('accepted hostile URI: ' + $uri) } }
if ((Get-RegistrationDecision $false '' '' 'marker' 'command') -ne 'missing') { throw 'missing' }
if ((Get-RegistrationDecision $true 'marker' 'command' 'marker' 'command') -ne 'owned') { throw 'owned' }
if ((Get-RegistrationDecision $true 'marker' 'legacy command' 'marker' 'new command') -ne 'owned') { throw 'owned row must be upgradable' }
foreach ($pair in @(@('foreign','command'), @('','command'))) {
 if ((Get-RegistrationDecision $true $pair[0] $pair[1] 'marker' 'command') -ne 'conflict') { throw 'foreign registration accepted' }
}
$rejected = $false
try { [void](Get-ActivationCommand 'C:\\Windows\\System32\\wscript.exe' 'C:\\spool\\activate.vbs' ($p + [char]10)) } catch { $rejected = $true }
if (-not $rejected) { throw 'newline protocol accepted' }
$cmd = Get-ActivationCommand 'C:\\Windows\\System32\\wscript.exe' 'C:\\my spool\\activate.vbs' $p
if (-not $cmd.Contains('wscript.exe" //B //Nologo "C:\\my spool\\activate.vbs" "%1"')) { throw $cmd }
if ($cmd -match 'powershell') { throw 'console host must not be the protocol command' }
# The launcher is written into an isolated directory and must validate the URI first.
$tempLauncher = Join-Path ([IO.Path]::GetTempPath()) ('whale-launcher-test-' + [guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($tempLauncher)
try {
  $vbs = Write-ActivationLauncher $tempLauncher 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' 'C:\\app\\win-activation.ps1' $p
  $body = [IO.File]::ReadAllText($vbs)
  if ($body -notmatch 'RegExp') { throw 'launcher does not validate the URI' }
  if ($body -notmatch 'sh\\.Run\\s+\\w+,\\s*0,\\s*False') { throw 'launcher must run hidden and detached' }
  if (-not $body.Contains($p + '://activate/[0-9a-f]{64}')) { throw 'protocol must stay one literal line' }
  if ($body -notmatch 'WindowStyle Hidden') { throw 'powershell must stay hidden' }
} finally { [IO.Directory]::Delete($tempLauncher, $true) }
foreach ($badPath in @('relative', '\\\\server\\share', 'C:relative', 'C:\\bad"path', "C:\\bad\npath", 'C:\\bad%1path')) { if (Test-LocalFixedPath $badPath) { throw ('accepted path: ' + $badPath) } }
# Test actual CreateNew/replay behavior only inside an isolated temporary directory.
$temp = Join-Path ([IO.Path]::GetTempPath()) ('whale-activation-test-' + [guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($temp)
try {
 if (-not (Write-ActivationClick $temp $t)) { throw 'first write failed' }
 $file = Join-Path $temp ($t + '.click'); $before = [IO.File]::GetLastWriteTimeUtc($file)
 if ([IO.File]::ReadAllText($file) -cne $t) { throw 'wrong content' }
 if (-not (Write-ActivationClick $temp $t)) { throw 'replay failed' }
 if ([IO.File]::GetLastWriteTimeUtc($file) -ne $before) { throw 'replay modified file' }
 if (@([IO.Directory]::GetFiles($temp)).Count -ne 1) { throw 'duplicate spool file' }
} finally { [IO.Directory]::Delete($temp, $true) }
Write-Output 'AST and function boundaries PASS; no registry entrypoint executed'
`;
  const encoded = Buffer.from(ps, 'utf16le').toString('base64');
  const run = spawnSync(options.powershellPath, ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /function boundaries PASS/);
});
