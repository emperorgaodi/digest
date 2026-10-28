# HTTPS and use away from home (Stages 6 and 10)

## Why HTTPS matters

Browsers only allow three phone features on a secure origin: installing Digest as an app (standalone window, home-screen icon), the offline cache (service worker), and notifications. A plain `http://192.168.x.x` address is not secure, so there Digest still works as a normal web page (pair, read, edit, live sync) but without those three.

HTTPS also encrypts the traffic on your Wi-Fi. Without it, someone on the same network could in principle read it.

## Recommended: Tailscale (gives HTTPS and away-from-home access)

Tailscale is a free private network between your own devices. It also issues real HTTPS certificates for your computer's name, which is what browsers need.

1. Install Tailscale on the computer and on the phone, sign in with the same account.
2. In the Tailscale admin console turn on **MagicDNS** and **HTTPS certificates**.
3. On the computer, in a terminal: `tailscale cert your-pc.your-tailnet.ts.net` (use the name shown in the Tailscale app). It writes a `.crt` and a `.key` file.
4. Create the folder `%APPDATA%\digest\tls` and put three files in it:
   - `cert.pem` (the `.crt` file, renamed)
   - `key.pem` (the `.key` file, renamed)
   - `host.txt` containing just the name, for example `your-pc.your-tailnet.ts.net`
5. Restart Digest. The Phone link dialog now shows an `https://` address and the QR code uses it.
6. On the phone, with Tailscale connected, scan the QR code. Android Chrome / Samsung Internet will offer **Install app**; on iPhone use Safari > Share > **Add to Home Screen**.

This also covers Stage 10 (away from home): while Tailscale is on, the same address works on mobile data, with nothing opened to the public internet. Tailscale certificates expire after 90 days; run the `tailscale cert` command again and replace the two files.

**Status:** the server's HTTPS code path is implemented but has not been tested against a real certificate, because none was available while building it. The plain-HTTP path is fully tested.

## Alternatives

- **Android only, for development:** in Chrome open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://YOUR-PC-IP:47821`, enable it and relaunch. This lets a test phone install the app over plain http. Not for everyday use.
- **A relay service or port forwarding:** not recommended. Digest holds personal data, and exposing it to the public internet is a larger security job than this app is built for.

## Decision record (Stage 10)

Away-from-home access is done with a private network (Tailscale), not a cloud relay. Reasons: no new server to run or secure, no accounts inside Digest, and it solves HTTPS at the same time. The cost is that both devices need Tailscale installed.
