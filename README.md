# Digest — personal newsletter aggregator

Fully local. No accounts, no servers beyond fetching public RSS. Your data is a
single readable JSON file you can back up.

## Run it

```bash
npm install      # first time only
npm run dev      # launches the app (Vite + Electron)
```

## Build a standalone installer (so it runs without the terminal)

```bash
npm run package  # outputs a Windows installer under release/
```

Install it and launch "Digest" from the Start menu like any app.

## Where your data lives

`%APPDATA%\digest\data.json` — tabs, settings, saved items, and read/unread
state. Plain JSON. Copy it anywhere to back up; delete it to start fresh.
"Open data folder" in the sidebar jumps straight there.

## How it works

- **Tabs** = a name + keywords. Keywords build a Google News RSS search
  (`news.google.com/rss/search`), region-tuned to Singapore/English (stored in data.json `settings.region`)
- **Scheduler** lives in the Electron main process: one timer per tab, re-armed
  on every change, so editing a tab's frequency takes effect on the next tick —
  no restart. (`electron/scheduler.ts`)
- **Digest / tab / widget** are three views over one store. The main process is
  the single writer and pushes full state to every open window on each change,
  so marking an item read anywhere updates everywhere.
- **Widget** is a frameless always-on-top window (`?widget`), toggled from the
  sidebar; "Expand ↗" swaps back to the full app.
- **Clicking a headline** opens the article in an in-app reader window and marks
  it read.

## Code map

```
electron/
  main.ts       windows, IPC, fetch→merge→persist→broadcast loop
  store.ts      atomic JSON read/write (data.json)
  feeds.ts      Google News RSS URL + parse
  scheduler.ts  per-tab timers, live reschedule
  types.ts      the AppData shape persisted to disk
src/
  App.tsx       app vs widget routing
  components/   Sidebar, Digest, TabView, TabEditor, Widget, ArticleCard
  useDigest.ts  subscribes to main-process state pushes
```

## Notes & Reminders

The sidebar has three areas that all share the same `data.json`:

- **Front Page / Topics** — the news digest.
- **Notes** — autosaved on every keystroke. Closing a note never loses it;
  reopen any note from the list. Deleting is a soft delete → "Recently deleted"
  lets you Restore (or delete forever).
- **Reminders** — add text with an optional date/time. When one comes due the
  app fires a native Windows notification (checked every 30s, even in widget
  mode). The widget shows your upcoming reminders above the headlines.
