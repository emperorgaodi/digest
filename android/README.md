# Digest widget (Android)

A small native Android app that puts a Digest widget on the home screen: live clock, your next reminders and the latest headlines, read from the Digest desktop app over your Wi-Fi.

**Status: written but not yet built or run.** It was written on a machine without the Android SDK, so it has never been compiled. Expect to fix a small compile error or two on first sync. The server side it talks to (`/api/pair`, `/api/rpc` with `state:get`) is tested.

Reference device: Samsung Galaxy S25+ (One UI, Android 15).

## Build and install

1. Install [Android Studio](https://developer.android.com/studio).
2. File > Open, choose this `android/` folder. Let Gradle sync (it downloads Gradle 8.9 and the Android SDK 35 pieces it needs).
3. Plug in the phone with USB debugging on (Settings > Developer options), or use an emulator, and press Run.

## Use

1. On the computer: Digest > Phone link > Turn on.
2. Open the **Digest widget** app on the phone. Type the address shown in the Phone link dialog (for example `http://192.168.0.2:47821`) and the pairing code, then Connect.
3. Long-press the home screen > Widgets > Digest widget, and drop it on the screen. On One UI it can be resized.

Tapping the widget opens the phone web app (the same address). The widget refreshes every 15 minutes, the shortest period Android allows for background work, and keeps showing the last data when the computer is off.

## Notes and limits

- Uses plain `http` on the local network, so the manifest allows cleartext traffic for this app. If you set up HTTPS (docs/phone-https.md) use the `https://` name instead.
- If you revoke the phone in Digest, the widget notices on its next refresh and asks you to connect again.
- Android may delay refreshes when battery saver is on. Set the app to "Unrestricted" battery use for more reliable updates.
- This is separate from the installable web app (Stage 6): the web app gives full Digest, this gives the widget.
