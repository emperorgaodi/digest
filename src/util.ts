import type { AppData, FeedItem } from '../electron/types'

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m ago`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h ago`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}d ago`
  return new Date(iso).toLocaleDateString()
}

export function tabItems(data: AppData, tabId: string): FeedItem[] {
  return data.items
    .filter((it) => it.tabId === tabId)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function unreadCount(data: AppData, tabId: string): number {
  return data.items.filter((it) => it.tabId === tabId && !it.read).length
}

export function intervalLabel(min: number): string {
  if (min <= 60) return 'Hourly'
  if (min <= 360) return 'Every 6h'
  return 'Daily'
}

// Human due label for a reminder, e.g. "Today, 3:00 PM" / "Tomorrow, 9:00 AM".
export function formatDue(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = new Date(); const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.round((day.getTime() - t0.getTime()) / 86400000)
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Tomorrow, ${time}`
  if (diffDays === -1) return `Yesterday, ${time}`
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`
}

export function isOverdue(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() < Date.now()
}

// Convert an ISO string to the value a <input type="datetime-local"> expects.
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
