import { spawn } from 'node:child_process';
import { win32 as winPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTOCOL = /^dsh-whale-[a-f0-9]{12}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const DEFAULT_SCRIPT = fileURLToPath(new URL('./win-activation.ps1', import.meta.url));
const DEFAULT_PS = winPath.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const failureCodes = { 2: 'invalid-input', 3: 'conflict', 4: 'io-error' };
const result = (ok, reason) => ({ ok, reason });
function fixedPath(value) {
  // No UNC/device paths, controls, quotes, wildcard/ADS or shell URL placeholders.
  return typeof value === 'string' && /^[a-z]:\\/i.test(value)
    && !/[\x00-\x1f\x7f"<>|?*%]/.test(value) && !value.slice(2).includes(':');
}

/** Only registers a fixed local handler; the host owns opaque-token/session mapping.
 * url() stays null until Register actually exits 0. dispose kills pending helpers,
 * but deliberately leaves the one-time protocol registration installed.
 */
export function createWindowsActivation({ platform = process.platform, spawnImpl = spawn,
  protocol, spoolDir, scriptPath = DEFAULT_SCRIPT, powershellPath = DEFAULT_PS } = {}) {
  const active = new Set();
  let disposed = false;
  let registered = false;
  let registration;
  const unavailable = () => disposed ? 'disposed' : platform !== 'win32' ? 'unsupported-platform'
    : !PROTOCOL.test(protocol) || !fixedPath(spoolDir) || !fixedPath(scriptPath) || !fixedPath(powershellPath)
      ? 'invalid-configuration' : null;

  function run(mode) {
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
      const kill = () => { try { child?.kill(); } catch { /* Already exited. */ } };
      const cancel = () => { finish(result(false, 'disposed')); kill(); };
      try {
        child = spawnImpl(powershellPath, ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden',
          '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Mode', mode, '-Protocol', protocol,
          '-SpoolDirectory', spoolDir], { stdio: 'ignore', shell: false, windowsHide: true });
        active.add(cancel);
        child.once('error', () => finish(result(false, 'spawn-error')));
        child.once('close', (code, signal) => {
          if (signal || code === null) return finish(result(false, 'terminated'));
          finish(code === 0 ? result(true, mode === 'Register' ? 'registered' : 'unregistered')
            : result(false, failureCodes[code] || `exit-${code}`));
        });
        timer = setTimeout(() => { finish(result(false, 'timeout')); kill(); }, 10000);
      } catch {
        finish(result(false, 'spawn-error'));
        kill();
      }
    });
  }
  return {
    register() {
      const reason = unavailable();
      if (reason) return Promise.resolve(result(false, reason));
      if (registered) return Promise.resolve(result(true, 'registered'));
      if (!registration) {
        registration = run('Register').then(value => {
          registered = value.ok && !disposed;
          return disposed ? result(false, 'disposed') : value;
        }).finally(() => { registration = undefined; });
      }
      return registration;
    },
    async unregister() {
      // Serialize behind an in-flight registration before removing the owned key.
      registered = false;
      if (registration) await registration;
      registered = false;
      return run('Unregister');
    },
    url(token) {
      return !unavailable() && registered && typeof token === 'string' && TOKEN.test(token)
        ? `${protocol}://activate/${token}` : null;
    },
    async dispose() {
      disposed = true;
      registered = false;
      for (const cancel of [...active]) cancel();
    },
  };
}
