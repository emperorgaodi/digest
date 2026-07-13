import type { AppData } from '../../electron/types'
import { api } from '../useDigest'
import { isOverdue, formatDue } from '../util'
import ArticleCard from './ArticleCard'

const WIDGET_LIMIT = 25

export default function Widget({ data }: { data: AppData | null }) {
  const items = data
    ? [...data.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, WIDGET_LIMIT)
    : []
  const unread = data ? data.items.filter((i) => !i.read).length : 0
  const dueReminders = data
    ? data.reminders.filter((r) => !r.done && r.dueAt).sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || '')).slice(0, 4)
    : []

  return (
    <div className="leather flex h-full flex-col rounded-[22px] overflow-hidden">
      {/* Grab handle — the whole top strip drags the window. */}
      <div className="drag flex flex-col items-stretch">
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-white/30" title="Drag to move" />
        </div>
        <header className="flex items-center gap-2 px-4 pb-3 pt-2">
          <span className="embossed text-[15px] font-bold tracking-tight">Digest</span>
          {unread > 0 && <span className="gloss rounded-full px-2 py-0.5 text-[11px] font-bold">{unread}</span>}
          <button onClick={() => api.toggleWidget()} className="btn-metal no-drag ml-auto px-2.5 py-1 text-[12px] font-medium" title="Open full app">Expand ↗</button>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 fade-scroll-edges">
        {dueReminders.length > 0 && (
          <div className="paper mb-3.5 p-2.5">
            {dueReminders.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-1 py-1.5">
                <button onClick={() => api.updateReminder(r.id, { done: true })} className="h-4 w-4 shrink-0 rounded-full"
                  style={{ background: '#faf8f1', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.3)', border: '1px solid #cfc9b6' }} title="Complete" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight text-[#2e2c26]">{r.text}</div>
                  <div className={`text-[11px] ${isOverdue(r.dueAt) ? 'stamp font-semibold' : 'text-[#8a8474]'}`}>{formatDue(r.dueAt!)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {items.length === 0 && <p className="mt-10 text-center text-[13px] embossed">No headlines yet.</p>}
          {items.map((it) => <ArticleCard key={it.id} item={it} compact />)}
        </div>
      </div>
    </div>
  )
}
