import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron'
import path from 'node:path'
import { load, save, dataFilePath } from './store'
import { fetchTab } from './feeds'
import { rescheduleAll, clearAll } from './scheduler'
import { createHandlers } from './handlers'
import { MAX_ITEMS_PER_TAB } from './types'

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

const handlers = createHandlers({ runTab, reschedule, broadcast })

function registerIpc() {
  // Data channels live in handlers.ts so the phone server can share them.
  for (const [channel, fn] of Object.entries(handlers)) ipcMain.handle(channel, (_e, ...args) => fn(...args))

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

  ipcMain.handle('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.handle('window:maximize', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.isMaximized() ? w.unmaximize() : w.maximize() })
  ipcMain.handle('window:close', () => app.quit())
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
