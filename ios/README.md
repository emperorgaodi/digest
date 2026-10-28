# Digest widget (iOS) - specification only

**Status: not built.** iOS widgets are made with WidgetKit, which needs Xcode, and Xcode only runs on a Mac. This was developed on Windows, so there is no code here yet, only the design so it can be built quickly on a Mac.

## What it should do

Same content as the Android widget (see [`android/`](../android/README.md)): clock, next three reminders, latest three headlines, read from the desktop over the Digest server API. Small, medium and large sizes.

## Design

- A SwiftUI app target (pairing screen) plus a WidgetKit extension.
- Pairing screen: address + code, calls `POST /api/pair` with `{ "code": "...", "name": "iPhone widget" }`, gets `{ "token": "..." }`.
- Store `url` and `token` in an **App Group** shared container (`UserDefaults(suiteName:)`) so the extension can read them.
- Timeline provider: `POST /api/rpc` with header `Authorization: Bearer <token>` and body `{"channel":"state:get","args":[]}`; response is `{ "result": <AppData> }` (fields in `electron/types.ts`). Build entries from `reminders` (not done, sorted by `dueAt`) and `items` (sorted by `publishedAt`). Ask for a refresh every 15 minutes; iOS decides the real schedule.
- If the server returns 401 the token was revoked: show "Open Digest to reconnect".
- Cache the last timeline entry so the widget still draws when the computer is off.

## Constraints to plan for

- Plain `http://` needs an App Transport Security exception for the local address, or use the HTTPS setup in [docs/phone-https.md](../docs/phone-https.md) (preferred).
- Running on a physical iPhone needs an Apple ID. A free account re-signs every 7 days; a paid developer account ($99/year) avoids that.
- iOS widgets cannot run continuously and are not interactive beyond tap targets.
