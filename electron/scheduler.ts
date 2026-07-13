import type { Tab } from './types'

// One live timer per tab. Rescheduling on config change is just: clear all, re-arm.
// setTimeout (not setInterval) so an interval edit takes effect on the very next tick.
type Timers = Map<string, NodeJS.Timeout>
const timers: Timers = new Map()

export function rescheduleAll(tabs: Tab[], runTab: (tabId: string) => void): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  for (const tab of tabs) arm(tab, runTab)
}

function arm(tab: Tab, runTab: (tabId: string) => void): void {
  const ms = Math.max(1, tab.intervalMinutes) * 60_000
  const handle = setTimeout(() => {
    runTab(tab.id)
    // Re-arm after each run using the current interval (caller may have changed it).
    arm(tab, runTab)
  }, ms)
  timers.set(tab.id, handle)
}

export function clearAll(): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}
