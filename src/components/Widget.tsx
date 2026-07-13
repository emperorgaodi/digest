import { useState } from 'react'
import type { AppData } from '../../electron/types'
import { api } from '../useDigest'
import { isOverdue, formatDue, timeAgo } from '../util'
import ArticleCard from './ArticleCard'

type WTab = 'news' | 'reminders' | 'notes'
const TABS: WTab[] = ['news', 'reminders', 'notes']

export default function Widget({ data }: { data: AppData | null }) {
  const [tab, setTab] = useState<WTab>('news')

  const items = data
    ? [...data.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 25)
    : []
  const reminders = data
    ? data.reminders.filter((r) => !r.done).sort((a, b) => (a.dueAt || '~').localeCompare(b.dueAt || '~'))
    : []
  const notes = data
    ? data.notes.filter((n) => !n.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : []

  return (
    <div className="leather flex h-full flex-col overflow-hidden rounded-[22px]">
      <div className="drag flex flex-col">
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-white/30" title="Drag to move" />
        </div>
        <header className="flex items-center gap-2 px-4 pb-2 pt-2">
          <span className="embossed text-[15px] font-bold tracking-tight">Digest</span>
          <button onClick={() => api.toggleWidget()} className="btn-metal no-drag ml-auto px-2.5 py-1 text-[12px] font-medium" title="Open full app">Expand</button>
        </header>
      </div>

      {/* Segmented toggle */}
      <div className="no-drag px-3 pb-2">
        <div className="flex gap-1 rounded-xl bg-black/25 p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-2 py-1 text-[12px] font-semibold capitalize transition-colors ${
                tab === t ? 'gloss' : 'text-white/65 hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="fade-scroll-edges flex-1 overflow-y-auto px-3 pb-4">
        {tab === 'news' && (
          <div className="space-y-2.5">
            {items.length === 0 && <Empty>No headlines yet.</Empty>}
            {items.map((it) => <ArticleCard key={it.id} item={it} compact />)}
          </div>
        )}

        {tab === 'reminders' && (
          <div className="space-y-2">
            {reminders.length === 0 && <Empty>Nothing to do.</Empty>}
            {reminders.map((r) => (
              <div key={r.id} className="paper flex items-center gap-2.5 px-3 py-2">
                <button onClick={() => api.updateReminder(r.id, { done: true })} title="Complete"
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ background: '#faf8f1', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.3)', border: '1px solid #cfc9b6' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight text-[#2e2c26]">{r.text}</div>
                  {r.dueAt && <div className={`text-[11px] ${isOverdue(r.dueAt) ? 'stamp font-semibold' : 'text-[#8a8474]'}`}>{formatDue(r.dueAt)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-2">
            {notes.length === 0 && <Empty>No notes yet.</Empty>}
            {notes.map((n) => (
              <button key={n.id} onClick={() => api.toggleWidget()} title="Open in full app"
                className="paper block w-full px-3 py-2 text-left">
                <div className="truncate text-[13px] font-semibold text-[#2e2c26]">{n.title || 'New note'}</div>
                <div className="truncate text-[12px] text-[#7c766a]">{n.body.replace(/\n/g, ' ').trim() || 'No additional text'}</div>
                <div className="mt-0.5 text-[11px] text-[#a49e8e]">{timeAgo(n.updatedAt)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-10 text-center text-[13px] embossed opacity-80">{children}</p>
}
