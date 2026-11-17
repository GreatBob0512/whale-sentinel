import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { win32 as winPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 12000;
const DEFAULT_SCRIPT = fileURLToPath(new URL('./native-wake.ps1', import.meta.url));
const DEFAULT_PS = winPath.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const WAKE_FAILURES = { 20: 'window-not-found', 21: 'foreground-denied', 22: 'untrusted-parent', 23: 'ambiguous-window' };
const result = (ok, reason) => ({ ok, reason });
// XML 1.0 control characters and unpaired surrogates cannot be safely displayed.
function validText(value, max, required = false) {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0)
    && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value) && value.isWellFormed();
}
function validNotification(value) {
  if (!value || typeof value !== 'object') return false;
  if(value.soundEnabled!==undefined&&typeof value.soundEnabled!=='boolean')return false;
  if(value.meta!==undefined&&!validText(value.meta,100))return false;
  if(value.activationUri!==undefined&&(typeof value.activationUri!=='string'||!/^dsh-whale-[a-f0-9]{12}:\/\/activate\/[a-f0-9]{64}$/.test(value.activationUri)))return false;
  if (!validText(value.title, 200, true) || !validText(value.body, 2000)
    || !validText(value.sessionId, 256, true) || !validText(value.kind, 64, true)) return false;
  if (value.iconPath !== undefined) {
    // Local drive paths only: no HTTP/UNC image requests or remote credentials.
    if (!validText(value.iconPath, 1024, true) || !/^[a-z]:\\/i.test(value.iconPath)
      || !winPath.isAbsolute(value.iconPath) || winPath.extname(value.iconPath).toLowerCase() !== '.png') return false;
  }
  return true;
}

/**
 * Short-lived native helpers; no Electron/app.asar changes, daemon, registry or
 * scheduled task. psPath/wakeScript/parentPid are trusted host configuration,
 * never client-provided notification content. Success means verified foreground
 * (wake), or WinRT Show accepted (notify), not guaranteed delivery/click routing.
 */
export function createNativeBridge({ platform = process.platform, spawnImpl = spawn,
  psPath = DEFAULT_PS, wakeScript = DEFAULT_SCRIPT, parentPid = process.ppid } = {}) {
  const active = new Set();
  let disposed = false;
  const unavailable = () => disposed ? 'disposed' : platform !== 'win32' ? 'unsupported' : null;

  function run(mode, extra = []) {
    const reason = unavailable();
    if (reason) return Promise.resolve(result(false, reason));
    return new Promise(resolve => {
      let child;
      let timer;
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        active.delete(cancel);
        resolve(value);
      };
      const stop = () => { try { child?.kill(); } catch { /* Already gone. */ } };
      const cancel = () => { finish(result(false, 'disposed')); stop(); };
      try {
        child = spawnImpl(psPath, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', wakeScript,
          '-Mode', mode, ...extra], { stdio: 'ignore', windowsHide: true, shell: false });
        active.add(cancel);
        child.once('error', () => finish(result(false, 'spawn-failed')));
        child.once('close', (code, signal) => {
          if (signal || code === null) return finish(result(false, 'terminated'));
          if (code === 0) return finish(result(true, mode === 'Wake' ? 'foreground' : 'submitted-local-toast-session-fallback-unavailable'));
          finish(result(false, mode === 'Wake' ? (WAKE_FAILURES[code] || 'powershell-failed') : 'toast-failed'));
        });
        timer = setTimeout(() => { finish(result(false, 'timeout')); stop(); }, TIMEOUT_MS);
      } catch {
        finish(result(false, 'spawn-failed'));
        stop();
      }
    });
  }

  return {
    wake() {
      const reason = unavailable();
      if (reason) return Promise.resolve(result(false, reason));
      if (!Number.isSafeInteger(parentPid) || parentPid <= 0 || parentPid > 2147483647) {
        return Promise.resolve(result(false, 'invalid-parent-pid'));
      }
      return run('Wake', ['-ParentPid', String(parentPid)]);
    },
    notify(input) {
      const reason = unavailable();
      if (reason) return Promise.resolve(result(false, reason));
      if (!validNotification(input)) return Promise.resolve(result(false, 'invalid-notification'));
      const { title, body, sessionId, kind, iconPath } = input;
      const tag = createHash('sha256').update(sessionId, 'utf8').digest('hex').slice(0, 16);
      const encoded = Buffer.from(JSON.stringify({ title, body, sessionId, kind, iconPath, tag, soundEnabled:input.soundEnabled===true,meta:input.meta??'',activationUri:input.activationUri??'' }), 'utf8').toString('base64');
      return run('Notify', ['-PayloadBase64', encoded]);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cancel of [...active]) cancel();
    },
  };
}
