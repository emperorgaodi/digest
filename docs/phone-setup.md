# Using Digest on your phone

Works on Android (developed against a Samsung Galaxy S25+) and iPhone. The phone shows the same Digest as the desktop and stays in sync both ways.

## Set up

1. On the computer, open Digest and click **Phone link** in the sidebar, then **Turn on phone link**.
2. Windows may ask to allow Digest through the firewall. Choose **Private networks**. (If you missed it: Windows Security > Firewall > Allow an app, tick Digest for Private.)
3. Put the phone on the same Wi-Fi as the computer and scan the QR code with the camera app. Tap the link it offers.
4. The phone opens Digest and pairs itself. It now appears under **Paired phones**, where you can **Revoke** it at any time.

If scanning is awkward, open the address shown under the QR code in the phone browser and type the code shown on the computer.

## What you get

- Home: the widget tiles (clock with world clocks, news, reminders, notes).
- News, Notes, Reminders and Clock tabs, with the same features as the desktop.
- Edits on either side show up on the other within a second.
- If the computer is off, the phone shows the last data it saw (read only in practice; changes need the computer).

## Install it like an app

This needs HTTPS, see [phone-https.md](phone-https.md). Once set up:

- **Android (Chrome or Samsung Internet):** menu > Install app.
- **iPhone (Safari only):** Share > Add to Home Screen. An installed iPhone app keeps its own storage, so open it once and enter the pairing code by hand (a new code from Phone link on the computer).

Over plain http you can still use the page in the browser, and on Android add a shortcut to the home screen, but it opens with the browser bar.

## Notifications

- The desktop always shows its own reminder notifications.
- The phone shows reminders and timers only while the installed app is open or recently in the background, and only over HTTPS with permission granted (a button appears at the bottom of the phone screen).
- Phones do not let web apps wake up on a schedule, so a reminder that comes due while the app is fully closed will not notify. A native app would be needed for that, see the Android widget below.

## Widgets

- **Android:** a native widget app is in [`android/`](../android/README.md). It is written but has not been built yet.
- **iPhone:** needs Xcode on a Mac, see [`ios/README.md`](../ios/README.md). Not built.

## Known limits

- The computer must be on, with Digest running and Phone link switched on.
- Reordering widget tiles by dragging may not work on touch screens; you can still hide and show tiles.
- Timers run on the device that started them.
