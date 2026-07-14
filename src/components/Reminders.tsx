import { useState } from 'react'
import type { AppData, Reminder } from '../../electron/types'
import { api } from '../useDigest'
import { formatDue, isOverdue } from '../util'
import DateTimePicker from './DateTimePicker'

type Quick = 'none' | 'today' | 'tomorrow' | 'custom'

function defaultDue(): string {
  const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d.toISOString()
}

// Turn a quick choice into an ISO due date (or null). `custom` is already ISO.
function quickDue(q: Quick, custom: string): string | null {
  if (q === 'none') return null
  if (q === 'custom') return custom || null
  const d = new Date()
  if (q === 'today') {
    d.setHours(18, 0, 0, 0)
    if (d.getTime() <= Date.now()) { const n = new Date(); n.setHours(n.getHours() + 2, 0, 0, 0); return n.toISOString() }
    return d.toISOString()
  }
  d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

const CHIPS: { id: Quick; label: string }[] = [
  { id: 'none', label: 'No date' },
  { id: 'today', label: 'Later today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'custom', label: 'Pick…' },
]

export default function Reminders({ data }: { data: AppData }) {
  const [text, setText] = useState('')
  const [quick, setQuick] = useState<Quick>('none')
  const [custom, setCustom] = useState('')

  const active = data.reminders.filter((r) => !r.done)
  const done = data.reminders.filter((r) => r.done)
  const overdue = active.filter((r) => isOverdue(r.dueAt)).sort(byDue)
  const scheduled = active.filter((r) => r.dueAt && !isOverdue(r.dueAt)).sort(byDue)
  const someday = active.filter((r) => !r.dueAt)

  async function add() {
    if (!text.trim()) return
    await api.addReminder({ text, dueAt: quickDue(quick, custom) })
    setText(''); setQuick('none'); setCustom('')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="metal drag shrink-0 z-10 rounded-[26px] px-8 pb-4 pt-5">
        <h1 className="embossed text-[28px] font-bold tracking-tight">Reminders</h1>
      </header>

      <div className="fade-scroll-edges flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-6">
          {/* Add card */}
          <div className="paper mb-7 p-3.5">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="What do you need to remember?"
              className="w-full bg-transparent px-1 text-[16px] font-medium text-[#2e2c26] outline-none placeholder:text-[#7c766a]" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {CHIPS.map((c) => (
                <button key={c.id} onClick={() => { setQuick(c.id); if (c.id === 'custom' && !custom) setCustom(defaultDue()) }}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                    quick === c.id ? 'gloss' : 'bg-black/[0.06] text-[#5b5548] hover:bg-black/[0.12]'
                  }`}>
                  {c.label}
                </button>
              ))}
              <button onClick={add} disabled={!text.trim()}
                className="gloss ml-auto px-5 py-1.5 text-[13px] font-semibold disabled:opacity-40">Add</button>
            </div>
            {quick === 'custom' && (
              <div className="mt-3">
                <DateTimePicker value={custom || null} onChange={setCustom} />
              </div>
            )}
          </div>

          <Group title="Overdue" stamp list={overdue} />
          <Group title="Scheduled" list={scheduled} />
          <Group title="No date" list={someday} />
          {done.length > 0 && <Group title="Completed" list={done} />}

          {data.reminders.length === 0 && <p className="mt-16 text-center text-[14px] embossed">Nothing yet. Add your first reminder above.</p>}
        </div>
      </div>
    </div>
  )
}

const byDue = (a: Reminder, b: Reminder) => (a.dueAt || '').localeCompare(b.dueAt || '')

function Group({ title, list, stamp }: { title: string; list: Reminder[]; stamp?: boolean }) {
  if (list.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className={`mb-3 px-1 text-[12px] font-bold uppercase tracking-wider ${stamp ? 'stamp' : 'embossed'}`}>{title}</h2>
      <div className="space-y-3">{list.map((r) => <Item key={r.id} r={r} />)}</div>
    </section>
  )
}

function Item({ r }: { r: Reminder }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(r.text)
  const [due, setDue] = useState<string | null>(r.dueAt)

  function saveEdit() {
    setEditing(false)
    api.updateReminder(r.id, { text: text.trim() || r.text, dueAt: due })
  }

  return (
    <div className="paper card-enter flex items-start gap-3 px-4 py-3">
      <button onClick={() => api.updateReminder(r.id, { done: !r.done })}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${r.done ? 'gloss' : ''}`}
        style={r.done ? undefined : { background: '#faf8f1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.25)', border: '1px solid #cfc9b6' }}>
        {r.done && <span className="text-[12px] font-bold leading-none text-white">v</span>}
      </button>

      {editing ? (
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="flex-1 rounded-lg bg-black/[0.06] px-2 py-1.5 text-[14px] text-[#2e2c26] outline-none" />
            <button onClick={() => setDue(null)} className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#7c766a] hover:bg-black/[0.06]">Clear</button>
            <button onClick={saveEdit} className="gloss px-3 py-1.5 text-[12px] font-semibold">Save</button>
          </div>
          <div className="mt-2"><DateTimePicker value={due} onChange={setDue} /></div>
        </div>
      ) : (
        <div className="min-w-0 flex-1 cursor-text" onClick={() => setEditing(true)}>
          <div className={`text-[15px] ${r.done ? 'text-[#a49e8e] line-through decoration-red-400' : 'font-medium text-[#2e2c26]'}`}>{r.text}</div>
          {r.dueAt && <div className={`text-[12px] ${!r.done && isOverdue(r.dueAt) ? 'stamp font-semibold' : 'text-[#8a8474]'}`}>{formatDue(r.dueAt)}</div>}
        </div>
      )}

      <button onClick={() => api.deleteReminder(r.id)} className="mt-0.5 shrink-0 text-[#b3ac9c] hover:text-red-600" title="Delete">x</button>
    </div>
  )
}
