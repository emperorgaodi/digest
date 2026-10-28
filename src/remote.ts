import type { AppData } from '../electron/types'
import type { DigestApi } from '../electron/preload'

// The phone client: same `window.digest` API the desktop UI uses, but backed by
// the desktop's LAN server (electron/server.ts) instead of Electron IPC.
const TOKEN_KEY = 'digest.token'
const CACHE_KEY = 'digest.cache'

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}

export const hasToken = () => !!store.get(TOKEN_KEY)
export const unpair = () => { store.del(TOKEN_KEY); location.reload() }

function deviceName(): string {
  const ua = navigator.userAgent
  const kind = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : 'Browser'
  return `${kind} phone`
}

// Exchange a pairing code (from the desktop QR or typed by hand) for a token.
export async function pairWithCode(code: string): Promise<boolean> {
  try {
    const res = await fetch('/api/pair', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name: deviceName() }),
    })
    if (!res.ok) return false
    store.set(TOKEN_KEY, (await res.json()).token)
    return true
  } catch {
    return false
  }
}

// If the page was opened from the QR (?pair=CODE), pair now and clean the URL.
export async function pairFromUrl(): Promise<void> {
  const url = new URL(location.href)
  const code = url.searchParams.get('pair')
  if (!code) return
  url.searchParams.delete('pair')
  history.replaceState(null, '', url.pathname + url.search)
  await pairWithCode(code)
}

const auth = () => ({ Authorization: `Bearer ${store.get(TOKEN_KEY)}` })

async function rpc(channel: string, ...args: unknown[]): Promise<unknown> {
  const res = await fetch('/api/rpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() },
    body: JSON.stringify({ channel, args }),
  })
  if (res.status === 401) { if (hasToken()) unpair(); throw new Error('unpaired') }
  if (!res.ok) throw new Error(`rpc ${channel} failed`)
  return (await res.json()).result
}

function cache(data: AppData) { store.set(CACHE_KEY, JSON.stringify(data)) }
function cached(): AppData | null {
  const raw = store.get(CACHE_KEY)
  try { return raw ? (JSON.parse(raw) as AppData) : null } catch { return null }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Server-sent events over fetch (EventSource cannot send the auth header).
function subscribe(cb: (data: AppData) => void): () => void {
  let stopped = false
  let ctrl: AbortController | null = null

  const run = async () => {
    let delay = 1000
    while (!stopped) {
      try {
        ctrl = new AbortController()
        const res = await fetch('/api/events', { headers: auth(), signal: ctrl.signal })
        if (res.status === 401) { if (hasToken()) unpair(); return }
        if (!res.ok || !res.body) throw new Error('no stream')
        delay = 1000
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          let end: number
          while ((end = buf.indexOf('\n\n')) >= 0) {
            const line = buf.slice(0, end).split('\n').find((l) => l.startsWith('data: '))
            buf = buf.slice(end + 2)
            if (line) { const d = JSON.parse(line.slice(6)) as AppData; cache(d); cb(d) }
          }
        }
      } catch { /* offline or server stopped: retry below */ }
      if (stopped) return
      await sleep(delay)
      delay = Math.min(delay * 2, 15_000)
    }
  }
  void run()
  return () => { stopped = true; ctrl?.abort() }
}

const noop = async () => {}

export function createRemoteApi(): DigestApi {
  return {
    // When the PC is off, fall back to the last state this phone saw.
    getState: async () => {
      try { const d = (await rpc('state:get')) as AppData; cache(d); return d } catch (e) {
        const c = cached()
        if (c) return c
        throw e
      }
    },
    onUpdate: subscribe,
    addTab: (input) => rpc('tab:add', input) as Promise<void>,
    updateTab: (id, patch) => rpc('tab:update', id, patch) as Promise<void>,
    deleteTab: (id) => rpc('tab:delete', id) as Promise<void>,
    refreshTab: (id) => rpc('tab:refresh', id) as Promise<void>,
    markRead: (itemId, read) => rpc('item:read', itemId, read) as Promise<void>,
    markAllRead: (tabId) => rpc('item:readAll', tabId) as Promise<void>,
    updateSettings: (patch) => rpc('settings:update', patch) as Promise<void>,
    addReminder: (input) => rpc('reminder:add', input) as Promise<void>,
    updateReminder: (id, patch) => rpc('reminder:update', id, patch) as Promise<void>,
    deleteReminder: (id) => rpc('reminder:delete', id) as Promise<void>,
    createNote: () => rpc('note:create') as Promise<never>,
    updateNote: (id, patch) => rpc('note:update', id, patch) as Promise<void>,
    deleteNote: (id) => rpc('note:delete', id) as Promise<void>,
    restoreNote: (id) => rpc('note:restore', id) as Promise<void>,
    purgeNote: (id) => rpc('note:purge', id) as Promise<void>,
    // Articles open in the phone's own browser; window controls do not exist here.
    openArticle: async (link) => { window.open(link, '_blank', 'noopener') },
    toggleWidget: noop, openDataFolder: noop, minimizeWindow: noop, toggleMaximize: noop, closeWindow: noop,
    phoneStatus: async () => ({ running: true, port: 0, urls: [] }),
    phoneNewCode: async () => { throw new Error('desktop only') },
    phoneDevices: async () => [],
    phoneRevoke: noop,
    mode: 'app',
    platform: 'phone',
  }
}
