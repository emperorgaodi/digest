// Show a notification wherever the platform allows it.
// Android Chrome forbids `new Notification()` and only accepts a service worker
// registration; desktop Electron is the opposite. Both need permission, and the
// phone path also needs a secure context (HTTPS), see docs/phone-https.md.
export async function notify(title: string, body: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  let reg: ServiceWorkerRegistration | undefined
  try { reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined } catch { /* e.g. file:// in Electron */ }
  try {
    if (reg) await reg.showNotification(title, { body, icon: './icon-192.png' })
    else new Notification(title, { body })
  } catch { /* unsupported in this context */ }
}

// Phone only: the desktop app fires reminder notifications from the main process.
// Remembers what already fired so a reconnect or reload never repeats one.
const FIRED_KEY = 'digest.fired'
export function fireDueReminders(reminders: { id: string; text: string; dueAt: string | null; done: boolean }[]): void {
  let fired: string[] = []
  try { fired = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '[]') } catch { /* start fresh */ }
  const now = Date.now()
  let changed = false
  for (const r of reminders) {
    const key = `${r.id}@${r.dueAt}`
    if (r.done || !r.dueAt || new Date(r.dueAt).getTime() > now || fired.includes(key)) continue
    // Skip anything already overdue by a day so first pairing does not spam old reminders.
    if (now - new Date(r.dueAt).getTime() < 86_400_000) void notify('Reminder', r.text)
    fired.push(key); changed = true
  }
  if (changed) { try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired.slice(-200))) } catch { /* ignore */ } }
}

export const canAskNotifications = () =>
  typeof Notification !== 'undefined' && window.isSecureContext && Notification.permission === 'default'

export const askNotifications = () => Notification.requestPermission()
