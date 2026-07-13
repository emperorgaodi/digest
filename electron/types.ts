// Shared data model — used by both main process and renderer.
// This is the exact shape persisted to data.json (readable/backup-friendly).

export interface FeedItem {
  id: string          // stable sha1 of link — used for dedupe + read state
  tabId: string
  title: string
  link: string
  source: string
  publishedAt: string // ISO 8601
  snippet: string
  read: boolean
  fetchedAt: string   // ISO 8601 — when this app first saw the item
}

export interface Tab {
  id: string
  name: string
  keywords: string        // raw query text, e.g. "F1 OR Formula 1"
  intervalMinutes: number // refresh cadence; drives the scheduler live
  lastFetched: string | null
  error: string | null    // last fetch error, null when healthy
}

export interface Reminder {
  id: string
  text: string
  dueAt: string | null // ISO 8601, null = no due date (just a to-do)
  done: boolean
  notified: boolean     // true once the desktop notification has fired
  createdAt: string
}

export interface Note {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
  // Notes are never lost on close — closing just deselects. Explicit delete
  // sets deletedAt (soft delete) so an accidental delete can be undone.
  deletedAt: string | null
}

export interface Region {
  hl: string   // language, e.g. "en-SG"
  gl: string   // country, e.g. "SG"
  ceid: string // combined, e.g. "SG:en"
}

export interface Settings {
  region: Region
  accent: string
}

export interface AppData {
  version: 1
  tabs: Tab[]
  items: FeedItem[]
  reminders: Reminder[]
  notes: Note[]
  settings: Settings
}

export const INTERVAL_PRESETS = [
  { label: 'Hourly', minutes: 60 },
  { label: 'Every 6 hours', minutes: 360 },
  { label: 'Daily', minutes: 1440 },
]

export const MAX_ITEMS_PER_TAB = 200
