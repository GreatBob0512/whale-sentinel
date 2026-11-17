# Whale Sentinel 1.8.8 · task radar

[中文完整说明与图解](<../README.md>) · [验收记录](<ACCEPTANCE.md>)

The mascot is a child-form character with **two runtime artworks**. While the panel is collapsed she **sits at a small work desk** in five task states: idle waving, typing during a running task, raising a hand while waiting for you, stretching after completion, and troubleshooting from under the desk on error. Opening the panel swaps her for a **standing pose that grips the panel edge and points at the tasks**; closing it switches back. There is no age selector or outfit switching.

![Current five-state artwork guide; illustration, not a live screenshot](<state-handbook.png>)

- Real committed session events determine running, pending-response and terminal outcomes. Going idle does not imply success.
- The top list shows only sessions that are running or waiting for you; it is **not filtered by a recent time window**. Waiting rows sort first, the rest by recent activity. Ended or released sessions leave the list and their events appear as recent activity.
- A real todo list supplies completed/total progress; phase, step and tool activity do not become invented percentages.
- Click a task, result, bubble body or fresh notification to request its bound session. The bubble × only dismisses it.
- Recent activity shows three rows by default and expands on demand. The panel scrolls within its height limit.
- Page notification delivery is acknowledged on `onshow`; a constructor or native submission is not proof of display or reading.
- The Windows fallback carries an opaque short-lived token through a plugin-owned current-user protocol. DSH Host and a connected page must remain running. Old tokens can expire or become invalid after a plugin restart.
- Focused/visible page presence defers the **native backend fallback** only. This is not a promise that every browser notification channel is silent in the foreground.
- Window wake attempts restore, maximize and foreground the existing DSH window. It is not F11 fullscreen or another DSH instance. A `wscript.exe` entry hides the local activation helper; no DSH core or installation archive is patched.

Hide, mute bubbles, system notifications and local sound are independent. Hiding the artwork keeps in-page notice bubbles visible. There are **two separate size sliders — collapsed size and expanded size — each 80%–160%, independent and remembered separately**; both keep the whole body. "Notify when focused" is off by default; enabling it sends system notifications even while DSH is visible and focused. Local cues are off by default, use browser WebAudio with user-interaction unlock and one-second throttling, and do not access a microphone. The volume slider only controls WebAudio; Windows manages its fallback notification sound.

The expanded pose animates with a gentle whole-body float and a pulse at the pointing hand. It deliberately has no separate blinking or head layer: rotating a clipped copy of the same bitmap tears the silhouette at the cut edge, so that approach was removed.

Current verification: 128 automated tests passed; the connected page reported version 1.8.8 with artwork id `whale-it-seated-v1`, the DOM artwork marker matched the manifest, and all five states decoded at 384×576 with zero failures. The two size sliders were measured independently: raising only the expanded size grew the expanded character from 114 to 172 wide while the collapsed one stayed at 96→94, and raising only the collapsed size grew it from 96 to 178 while the expanded pose stayed unchanged. These results do not claim human visual, OS-banner click or listening acceptance; see the [detailed record](<ACCEPTANCE.md>).

See [artwork provenance](<ARTWORK.md>) and [attribution](<../ATTRIBUTION.md>): AI generation or renaming does not remove third-party character/reference rights. This is an unofficial community plugin and is not affiliated with DeepSeek.
