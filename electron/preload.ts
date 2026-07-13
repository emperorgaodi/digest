import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, Tab, Settings, Reminder, Note } from './types'

export interface DigestApi {
  getState: () => Promise<AppData>
  onUpdate: (cb: (data: AppData) => void) => () => void
  // Feeds
  addTab: (input: { name: string; keywords: string; intervalMinutes: number }) => Promise<void>
  updateTab: (id: string, patch: Partial<Tab>) => Promise<void>
  deleteTab: (id: string) => Promise<void>
  refreshTab: (id: string) => Promise<void>
  markRead: (itemId: string, read: boolean) => Promise<void>
  markAllRead: (tabId?: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  // Reminders
  addReminder: (input: { text: string; dueAt: string | null }) => Promise<void>
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  // Notes
  createNote: () => Promise<Note>
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  restoreNote: (id: string) => Promise<void>
  purgeNote: (id: string) => Promise<void>
  // Windows
  openArticle: (link: string) => Promise<void>
  toggleWidget: () => Promise<void>
  openDataFolder: () => Promise<void>
  mode: 'app' | 'widget'
}

const api: DigestApi = {
  getState: () => ipcRenderer.invoke('state:get'),
  onUpdate: (cb) => {
    const listener = (_e: unknown, data: AppData) => cb(data)
    ipcRenderer.on('state:update', listener)
    return () => ipcRenderer.removeListener('state:update', listener)
  },
  addTab: (input) => ipcRenderer.invoke('tab:add', input),
  updateTab: (id, patch) => ipcRenderer.invoke('tab:update', id, patch),
  deleteTab: (id) => ipcRenderer.invoke('tab:delete', id),
  refreshTab: (id) => ipcRenderer.invoke('tab:refresh', id),
  markRead: (itemId, read) => ipcRenderer.invoke('item:read', itemId, read),
  markAllRead: (tabId) => ipcRenderer.invoke('item:readAll', tabId),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  addReminder: (input) => ipcRenderer.invoke('reminder:add', input),
  updateReminder: (id, patch) => ipcRenderer.invoke('reminder:update', id, patch),
  deleteReminder: (id) => ipcRenderer.invoke('reminder:delete', id),
  createNote: () => ipcRenderer.invoke('note:create'),
  updateNote: (id, patch) => ipcRenderer.invoke('note:update', id, patch),
  deleteNote: (id) => ipcRenderer.invoke('note:delete', id),
  restoreNote: (id) => ipcRenderer.invoke('note:restore', id),
  purgeNote: (id) => ipcRenderer.invoke('note:purge', id),
  openArticle: (link) => ipcRenderer.invoke('article:open', link),
  toggleWidget: () => ipcRenderer.invoke('widget:toggle'),
  openDataFolder: () => ipcRenderer.invoke('data:openFolder'),
  mode: new URLSearchParams(location.search).has('widget') ? 'widget' : 'app',
}

contextBridge.exposeInMainWorld('digest', api)
