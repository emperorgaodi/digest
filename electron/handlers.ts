import { randomUUID } from 'node:crypto'
import { load, save } from './store'
import type { Tab, Reminder, Note } from './types'

// Data operations shared by Electron IPC and the phone HTTP server. Window
// controls (minimize, widget toggle, open folder, article reader) are not here
// on purpose: they only make sense on the desktop.
export interface HandlerDeps {
  runTab: (id: string) => Promise<void>
  reschedule: () => Promise<void>
  broadcast: () => Promise<void>
}

// ponytail: args are untyped at the transport boundary; each handler below types its own params.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handlers = Record<string, (...args: any[]) => Promise<unknown>>

export function createHandlers({ runTab, reschedule, broadcast }: HandlerDeps): Handlers {
  return {
    'state:get': () => load(),

    // --- Feeds -----------------------------------------------------------
    'tab:add': async (input: { name: string; keywords: string; intervalMinutes: number }) => {
      const data = await load()
      const tab: Tab = {
        id: randomUUID(), name: input.name.trim() || 'Untitled', keywords: input.keywords.trim(),
        intervalMinutes: input.intervalMinutes, lastFetched: null, error: null,
      }
      data.tabs.push(tab)
      await save(data); await broadcast()
      await runTab(tab.id); await reschedule()
    },

    'tab:update': async (id: string, patch: Partial<Tab>) => {
      const data = await load()
      const tab = data.tabs.find((t) => t.id === id)
      if (!tab) return
      Object.assign(tab, patch)
      await save(data); await broadcast(); await reschedule()
    },

    'tab:delete': async (id: string) => {
      const data = await load()
      data.tabs = data.tabs.filter((t) => t.id !== id)
      data.items = data.items.filter((it) => it.tabId !== id)
      await save(data); await broadcast(); await reschedule()
    },

    'tab:refresh': (id: string) => runTab(id),

    'item:read': async (itemId: string, read: boolean) => {
      const data = await load()
      const it = data.items.find((x) => x.id === itemId)
      if (it) it.read = read
      await save(data); await broadcast()
    },

    'item:readAll': async (tabId?: string) => {
      const data = await load()
      for (const it of data.items) if (!tabId || it.tabId === tabId) it.read = true
      await save(data); await broadcast()
    },

    'settings:update': async (patch: Record<string, unknown>) => {
      const data = await load()
      data.settings = { ...data.settings, ...patch }
      await save(data); await broadcast()
    },

    // --- Reminders -------------------------------------------------------
    'reminder:add': async (input: { text: string; dueAt: string | null }) => {
      const data = await load()
      const r: Reminder = {
        id: randomUUID(), text: input.text.trim(), dueAt: input.dueAt,
        done: false, notified: false, createdAt: new Date().toISOString(),
      }
      data.reminders.push(r)
      await save(data); await broadcast()
    },

    'reminder:update': async (id: string, patch: Partial<Reminder>) => {
      const data = await load()
      const r = data.reminders.find((x) => x.id === id)
      if (!r) return
      Object.assign(r, patch)
      if ('dueAt' in patch) r.notified = false
      await save(data); await broadcast()
    },

    'reminder:delete': async (id: string) => {
      const data = await load()
      data.reminders = data.reminders.filter((x) => x.id !== id)
      await save(data); await broadcast()
    },

    // --- Notes (autosaved; delete is soft so it can be undone) -----------
    'note:create': async () => {
      const data = await load()
      const now = new Date().toISOString()
      const note: Note = { id: randomUUID(), title: '', body: '', createdAt: now, updatedAt: now, deletedAt: null }
      data.notes.unshift(note)
      await save(data); await broadcast()
      return note
    },

    'note:update': async (id: string, patch: Partial<Note>) => {
      const data = await load()
      const note = data.notes.find((n) => n.id === id)
      if (!note) return
      Object.assign(note, patch, { updatedAt: new Date().toISOString() })
      await save(data); await broadcast()
    },

    'note:delete': async (id: string) => {
      const data = await load()
      const note = data.notes.find((n) => n.id === id)
      if (note) note.deletedAt = new Date().toISOString()
      await save(data); await broadcast()
    },

    'note:restore': async (id: string) => {
      const data = await load()
      const note = data.notes.find((n) => n.id === id)
      if (note) note.deletedAt = null
      await save(data); await broadcast()
    },

    'note:purge': async (id: string) => {
      const data = await load()
      data.notes = data.notes.filter((n) => n.id !== id)
      await save(data); await broadcast()
    },
  }
}
