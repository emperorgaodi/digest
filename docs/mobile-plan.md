# Phone link: plan

Goal: use Digest on a phone, as an app and as a home-screen widget, without adding accounts or a cloud backend.

## Core idea

The desktop app stays the single source of truth. When the user turns on "Phone link", the Electron main process starts a small local HTTP server. The phone opens it over the same Wi-Fi, pairs once with a QR code, and from then on runs the same React UI against the same data. Nothing leaves the user's network.

```
phone browser/PWA  --HTTP + SSE-->  Electron main (http server)  -->  data.json
                                       same handlers as desktop IPC
```

The renderer already talks to a single `window.digest` API. On the phone a small shim provides the same API over `fetch`, so almost all UI code is reused.

## Platforms

Both Android and iOS are supported through the same web client (Stages 1-7). Development reference device is a Samsung Galaxy S25+ (Android, Chrome or Samsung Internet). On iOS, Safari is required to install the PWA ("Add to Home Screen"), and web notifications only work once it is installed (iOS 16.4+). Widgets are the only part that differs per platform (Stages 8 and 9).

## Honest constraints

| Constraint | Consequence |
| --- | --- |
| The desktop must be on and on the same network | Phone shows stale or no data when the PC is off. Offline cache mitigates reading. |
| Plain `http://192.168.x.x` is not a secure context | Service workers and "install as app" need HTTPS (or localhost). Stage 6 needs a decision. |
| Phone browsers cannot run background timers reliably | Phone reminder notifications are limited without a native app. Stage 7. |
| Web pages cannot be home-screen widgets (iOS never, Android barely) | A real widget needs a small native app. Stage 8. |
| LAN traffic over plain HTTP can be sniffed on the same Wi-Fi | Token auth now, HTTPS later, documented in the security notes. |

## Stages

Each stage is one GitHub issue (milestone "Phone link") and one or more commits. Later stages depend on earlier ones.

1. **Transport-agnostic handlers.** Move the IPC handler bodies in `electron/main.ts` into a plain handler map that both Electron IPC and HTTP can call. No behaviour change.
2. **Local HTTP + SSE server.** Opt-in, serves the built UI, a JSON RPC endpoint for the allowed handlers, and a server-sent-events stream that pushes full state like `state:update` does today.
3. **Device pairing and auth.** One-time pairing code, long-lived per-device token, stored hashed in a separate file that is never sent to any client. Revocable.
4. **Desktop "Phone link" panel.** Toggle, QR code, URL, paired-device list with revoke.
5. **Mobile web client.** `window.digest` shim over fetch/SSE, phone layout (bottom navigation, touch sizes), opens the existing views plus the widget view as the phone home screen.
6. **Installable PWA.** Manifest, icons, offline cache of last state. Needs the HTTPS decision.
7. **Phone notifications.** Reminders and timers on the phone, within what browsers allow.
8. **Android home-screen widget.** Small native Android app (Kotlin, Glance/AppWidget) that reads the same API. Reference device: Samsung Galaxy S25+ (One UI). Buildable on Windows with Android Studio.
9. **iOS home-screen widget.** WidgetKit extension reading the same API. Needs a Mac with Xcode and an Apple developer account, so it cannot be built on the current Windows machine. Documented now, built when a Mac is available.
10. **Remote access (optional).** Use away from home Wi-Fi via a private network such as Tailscale, or a relay. Out of scope for the first version.

## Status

| Stage | Issue | State |
| --- | --- | --- |
| 1 Handlers | #1 | Done, checked in the running app |
| 2 Server | #2 | Done, 28 automated end-to-end checks pass |
| 3 Pairing and auth | #3 | Done, covered by the same checks (single-use code, revoke, no secrets in state) |
| 4 Desktop panel | #4 | Done, checked visually |
| 5 Phone client | #5 | Done, checked in a phone-sized browser; not yet tried on a real phone |
| 6 PWA | #10 | Code done. Install and offline need HTTPS, see [phone-https.md](phone-https.md); HTTPS path untested |
| 7 Phone notifications | #6 | Done within browser limits, not tested on a real phone |
| 8 Android widget | #7 | Source written, never compiled (no Android SDK here) |
| 9 iOS widget | #8 | Specification only, needs a Mac |
| 10 Away from home | #9 | Decision recorded (Tailscale), see [phone-https.md](phone-https.md) |

Issue numbers differ from stage numbers after Stage 5 because one issue had to be re-created. Setup steps for the user: [phone-setup.md](phone-setup.md).

## Security model

- The server is off by default and only binds when the user enables Phone link.
- Static UI files are public on the LAN; every data and RPC route requires a bearer token.
- Pairing codes are single-use and expire in 5 minutes. Tokens are random 256-bit values, stored only as SHA-256 hashes.
- The device list and tokens live in `devices.json` next to `data.json`, never inside `AppData`, so they cannot be broadcast to a client.
- Only data operations are exposed over HTTP. Window controls, opening the data folder and toggling the widget stay desktop-only.
- Settings patches from a phone cannot change the Phone link switch itself.
- Known gap until Stage 6: traffic is plain HTTP on the local network.
