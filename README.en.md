# Whale Sentinel 2.0.0 · task radar

> Chinese name: 小鲸哨 (Little Whale Sentinel)

**English** · [中文](<README.md>)

[中文完整说明与图解](<README.md>) · [验收记录](<docs/ACCEPTANCE.md>)

Version 2.0.0 is a reliability release: **failed reminders are retried, a missing click bridge degrades to notification-only instead of dropping the reminder, two DSH instances no longer break each other's click route, and a corrupt settings file is backed up and replaced by safe defaults.**

The mascot is a child-form character with **two runtime artworks**. While the panel is collapsed she **sits at a small work desk** in five task states: idle waving, typing during a running task, raising a hand while waiting for you, stretching after completion, and troubleshooting from under the desk on error. Opening the panel swaps her for a **standing pose that grips the panel edge and points at the tasks**; closing it switches back. There is no age selector or outfit switching.

![Current five-state artwork guide; illustration, not a live screenshot](<docs/state-handbook.png>)

- Real committed session events determine running, pending-response and terminal outcomes. Going idle does not imply success.
- The top list shows only sessions that are running or waiting for you; it is **not filtered by a recent time window**. Waiting rows sort first, the rest by recent activity. Ended or released sessions leave the list and their events appear as recent activity.
- The three header numbers are **live sessions**, **running sessions** and **results finished in the last 24 hours** (from the retained 50-event history); sessions and events are never added together, and a channel test is not counted as a task.
- A real todo list supplies completed/total progress; phase, step and tool activity do not become invented percentages.
- Click a task, result, bubble body or fresh notification to request its bound session. The bubble × only dismisses it.
- Recent activity shows three rows by default and expands on demand. The panel scrolls within its height limit.
- Page notification delivery is acknowledged on `onshow`; a constructor or native submission is not proof of display or reading.
- Delivery is a state machine: a failed or timed-out attempt returns to the queue and retries, up to three times, then reports an honest failure. If the click bridge is not registered, the reminder still appears as **notification-only** and never guesses a session.
- The Windows click route is **shared per profile**, so a second live instance cannot remove the first one's registration; each instance only accepts tokens it issued, and unregistering is reference-counted by instance heartbeats.
- The Windows fallback carries an opaque short-lived token through a plugin-owned current-user protocol. DSH Host and a connected page must remain running. Old tokens can expire or become invalid after a plugin restart.
- Focused/visible page presence defers the **native backend fallback** only. This is not a promise that every browser notification channel is silent in the foreground.
- Window wake attempts restore, maximize and foreground the existing DSH window. It is not F11 fullscreen or another DSH instance. A `wscript.exe` entry hides the local activation helper; no DSH core or installation archive is patched.

Hide, mute bubbles, system notifications and local sound are independent. Hiding the artwork keeps in-page notice bubbles visible. There are **two separate size sliders — collapsed size and expanded size — each 80%–160%, independent and remembered separately**; both keep the whole body. "Notify when focused" is off by default; enabling it sends system notifications even while DSH is visible and focused. Local cues are off by default, use browser WebAudio with user-interaction unlock and one-second throttling, and do not access a microphone. The volume slider only controls WebAudio; Windows manages its fallback notification sound.

On viewports narrower than 520 px the panel keeps every control and the expanded mascot yields instead of clipping the panel. The panel surface follows the OS dark preference; the artwork keeps its own palette. Settings update optimistically and are submitted once after a short pause, retrying twice on failure, so "saved" is never shown for a write that did not happen.

The expanded pose animates with a gentle whole-body float and a pulse at the pointing hand. It deliberately has no separate blinking or head layer: rotating a clipped copy of the same bitmap tears the silhouette at the cut edge, so that approach was removed.

Current verification: 146 automated tests passed; the connected page reported version 2.0.0 with artwork id `whale-it-seated-v1`, a live `activationReady: true`, a channel test that left history and the finished count unchanged, a preference write that read back at 1.2 and could be restored, and a panel that opened at 330 px and closed again. A direct `wscript` invocation of the registered launcher wrote the expected one-time click file. Narrow-viewport and dark-mode rules exist in the stylesheet but were not measured on a 520 px viewport or a dark desktop theme; a real banner click and two-instance parallel run remain unverified. See the [detailed record](<docs/ACCEPTANCE.md>).

See [artwork provenance](<docs/ARTWORK.md>) and [attribution](<ATTRIBUTION.md>): AI generation or renaming does not remove third-party character/reference rights. This is an unofficial community plugin and is not affiliated with DeepSeek.
