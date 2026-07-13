import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { load, save, dataFilePath } from './store'
import { fetchTab } from './feeds'
import { rescheduleAll, clearAll } from './scheduler'
import { MAX_ITEMS_PER_TAB } from './types'
import type { Tab, Reminder, Note } from './types'

const DEV_URL = process.env.VITE_DEV_SERVER_URL
const INDEX = path.join(__dirname, '../dist/index.html')
const PRELOAD = path.join(__dirname, 'preload.js')

let mainWin: BrowserWindow | null = null
let widgetWin: BrowserWindow | null = null
let readerWin: BrowserWindow | null = null

function loadInto(win: BrowserWindow, widget: boolean) {
  if (DEV_URL) win.loadURL(widget ? DEV_URL + '?widget' : DEV_URL)
  else win.loadFile(INDEX, widget ? { search: '?widget' } : undefined)
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1120, height: 800, minWidth: 760, minHeight: 540,
    backgroundColor: '#12162e',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: 'rgba(0,0,0,0)', symbolColor: '#1f2c58', height: 40 },
    webPreferences: { preload: PRELOAD },
  })
  loadInto(mainWin, false)
  mainWin.on('closed', () => (mainWin = null))
}

function createWidgetWindow() {
  widgetWin = new BrowserWindow({
    width: 360, height: 540, frame: false, resizable: true,
    transparent: true, alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#00000000',
    webPreferences: { preload: PRELOAD }, show: false,
  })
  widgetWin.setAlwaysOnTop(true, 'floating')
  loadInto(widgetWin, true)
  widgetWin.on('closed', () => (widgetWin = null))
}

async function broadcast() {
  const data = await load()
  for (const w of [mainWin, widgetWin]) w?.webContents.send('state:update', data)
}

async function runTab(tabId: string) {
  const data = await load()
  const tab = data.tabs.find((t) => t.id === tabId)
  if (!tab) return
  try {
    const fresh = await fetchTab(tab, data.settings.region)
    const existing = new Map(data.items.map((it) => [it.id, it]))
    for (const it of fresh) {
      const prev = existing.get(it.id)
      existing.set(it.id, prev ? { ...it, read: prev.read, fetchedAt: prev.fetchedAt } : it)
    }
    const all = [...existing.values()]
    const mine = all
      .filter((it) => it.tabId === tabId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, MAX_ITEMS_PER_TAB)
    data.items = [...all.filter((it) => it.tabId !== tabId), ...mine]
    tab.lastFetched = new Date().toISOString()
    tab.error = null
  } catch (err) {
    tab.error = err instanceof Error ? err.message : String(err)
    tab.lastFetched = new Date().toISOString()
  }
  await save(data)
  await broadcast()
}

async function reschedule() {
  const data = await load()
  rescheduleAll(data.tabs, (id) => void runTab(id))
}

// Fire a desktop notification for any reminder whose time has come.
async function checkReminders() {
  const data = await load()
  const now = Date.now()
  let changed = false
  for (const r of data.reminders) {
    if (r.done || r.notified || !r.dueAt) continue
    if (new Date(r.dueAt).getTime() <= now) {
      r.notified = true
      changed = true
      if (Notification.isSupported()) {
        const n = new Notification({ title: 'Reminder', body: r.text })
        n.on('click', () => { mainWin?.show(); mainWin?.focus() })
        n.show()
      }
    }
  }
  if (changed) { await save(data); await broadcast() }
}

function registerIpc() {
  ipcMain.handle('state:get', () => load())

  // --- Feeds -------------------------------------------------------------
  ipcMain.handle('tab:add', async (_e, input: { name: string; keywords: string; intervalMinutes: number }) => {
    const data = await load()
    const tab: Tab = {
      id: randomUUID(), name: input.name.trim() || 'Untitled', keywords: input.keywords.trim(),
      intervalMinutes: input.intervalMinutes, lastFetched: null, error: null,
    }
    data.tabs.push(tab)
    await save(data); await broadcast()
    await runTab(tab.id); await reschedule()
  })

  ipcMain.handle('tab:update', async (_e, id: string, patch: Partial<Tab>) => {
    const data = await load()
    const tab = data.tabs.find((t) => t.id === id)
    if (!tab) return
    Object.assign(tab, patch)
    await save(data); await broadcast(); await reschedule()
  })

  ipcMain.handle('tab:delete', async (_e, id: string) => {
    const data = await load()
    data.tabs = data.tabs.filter((t) => t.id !== id)
    data.items = data.items.filter((it) => it.tabId !== id)
    await save(data); await broadcast(); await reschedule()
  })

  ipcMain.handle('tab:refresh', (_e, id: string) => runTab(id))

  ipcMain.handle('item:read', async (_e, itemId: string, read: boolean) => {
    const data = await load()
    const it = data.items.find((x) => x.id === itemId)
    if (it) it.read = read
    await save(data); await broadcast()
  })

  ipcMain.handle('item:readAll', async (_e, tabId?: string) => {
    const data = await load()
    for (const it of data.items) if (!tabId || it.tabId === tabId) it.read = true
    await save(data); await broadcast()
  })

  ipcMain.handle('settings:update', async (_e, patch) => {
    const data = await load()
    data.settings = { ...data.settings, ...patch }
    await save(data); await broadcast()
  })

  // --- Reminders ---------------------------------------------------------
  ipcMain.handle('reminder:add', async (_e, input: { text: string; dueAt: string | null }) => {
    const data = await load()
    const r: Reminder = {
      id: randomUUID(), text: input.text.trim(), dueAt: input.dueAt,
      done: false, notified: false, createdAt: new Date().toISOString(),
    }
    data.reminders.push(r)
    await save(data); await broadcast()
  })

  ipcMain.handle('reminder:update', async (_e, id: string, patch: Partial<Reminder>) => {
    const data = await load()
    const r = data.reminders.find((x) => x.id === id)
    if (!r) return
    Object.assign(r, patch)
    if ('dueAt' in patch) r.notified = false
    await save(data); await broadcast()
  })

  ipcMain.handle('reminder:delete', async (_e, id: string) => {
    const data = await load()
    data.reminders = data.reminders.filter((x) => x.id !== id)
    await save(data); await broadcast()
  })

  // --- Notes (autosaved; delete is soft so it can be undone) --------------
  ipcMain.handle('note:create', async () => {
    const data = await load()
    const now = new Date().toISOString()
    const note: Note = { id: randomUUID(), title: '', body: '', createdAt: now, updatedAt: now, deletedAt: null }
    data.notes.unshift(note)
    await save(data); await broadcast()
    return note
  })

  ipcMain.handle('note:update', async (_e, id: string, patch: Partial<Note>) => {
    const data = await load()
    const note = data.notes.find((n) => n.id === id)
    if (!note) return
    Object.assign(note, patch, { updatedAt: new Date().toISOString() })
    await save(data); await broadcast()
  })

  ipcMain.handle('note:delete', async (_e, id: string) => {
    const data = await load()
    const note = data.notes.find((n) => n.id === id)
    if (note) note.deletedAt = new Date().toISOString()
    await save(data); await broadcast()
  })

  ipcMain.handle('note:restore', async (_e, id: string) => {
    const data = await load()
    const note = data.notes.find((n) => n.id === id)
    if (note) note.deletedAt = null
    await save(data); await broadcast()
  })

  ipcMain.handle('note:purge', async (_e, id: string) => {
    const data = await load()
    data.notes = data.notes.filter((n) => n.id !== id)
    await save(data); await broadcast()
  })

  // --- Windows -----------------------------------------------------------
  ipcMain.handle('article:open', async (_e, link: string) => {
    if (!readerWin || readerWin.isDestroyed()) {
      readerWin = new BrowserWindow({
        width: 980, height: 840, backgroundColor: '#ffffff',
        autoHideMenuBar: true, title: 'Reading',
      })
      readerWin.on('closed', () => (readerWin = null))
    }
    readerWin.loadURL(link)
    readerWin.show(); readerWin.focus()
  })

  ipcMain.handle('widget:toggle', () => {
    if (!widgetWin || widgetWin.isDestroyed()) createWidgetWindow()
    const showingWidget = widgetWin!.isVisible()
    if (showingWidget) {
      widgetWin!.hide()
      if (!mainWin || mainWin.isDestroyed()) createMainWindow()
      else mainWin.show()
    } else {
      mainWin?.hide()
      widgetWin!.show()
    }
  })

  ipcMain.handle('data:openFolder', () => shell.showItemInFolder(dataFilePath()))
}

app.whenReady().then(async () => {
  registerIpc()
  createMainWindow()
  createWidgetWindow()
  await reschedule()
  const data = await load()
  for (const t of data.tabs) void runTab(t.id)
  setInterval(() => void checkReminders(), 30_000)
  void checkReminders()
})

app.on('window-all-closed', () => {
  clearAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})
