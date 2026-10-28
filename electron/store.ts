import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DEFAULT_WIDGET_TILES } from './types'
import type { AppData } from './types'

const DEFAULT_DATA: AppData = {
  version: 1,
  tabs: [],
  items: [],
  reminders: [],
  notes: [],
  settings: {
    region: { hl: 'en-SG', gl: 'SG', ceid: 'SG:en' },
    accent: '#0A84FF',
    worldClocks: [],
    widgetTiles: DEFAULT_WIDGET_TILES,
    phoneLink: false,
  },
}

function filePath(): string {
  return path.join(app.getPath('userData'), 'data.json')
}

let cache: AppData | null = null

export async function load(): Promise<AppData> {
  if (cache) return cache
  try {
    const raw = await fs.readFile(filePath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppData>
    // Merge defaults so older files gain new fields without crashing.
    cache = {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
    }
  } catch {
    cache = structuredClone(DEFAULT_DATA)
  }
  return cache
}

// Atomic write: tmp file then rename, so a crash mid-write never corrupts data.json.
export async function save(data: AppData): Promise<void> {
  cache = data
  const target = filePath()
  const tmp = target + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, target)
}

export function dataFilePath(): string {
  return filePath()
}
