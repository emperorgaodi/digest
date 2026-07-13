import { useState } from 'react'
import type { AppData, Reminder } from '../../electron/types'
import { api } from '../useDigest'
import { formatDue, isOverdue, toLocalInput } from '../util'

export default function Reminders({ data }: { data: AppData }) {
  const [text, setText] = useState('')
  const [due, setDue] = useState('')

  const active = data.reminders.filter((r) => !r.done)
  const done = data.reminders.filter((r) => r.done)
  const overdue = active.filter((r) => isOverdue(r.dueAt)).sort(byDue)
  const scheduled = active.filter((r) => r.dueAt && !isOverdue(r.dueAt)).sort(byDue)
  const someday = active.filter((r) => !r.dueAt)

  async function add() {
    if (!text.trim()) return
    await api.addReminder({ text, dueAt: due ? new Date(due).toISOString() : null })
    setText(''); setDue('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="metal drag sticky top-3 z-10 mx-3 rounded-[22px] px-8 pb-4 pt-5">
        <h1 className="engraved text-[28px] font-bold tracking-tight">Reminders</h1>
      </header>

      <div className="mx-auto max-w-2xl px-8 py-6">
        <div className="paper mb-7 flex items-center gap-2 p-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add a reminder…" className="flex-1 rounded-[6px] bg-white/70 px-2 py-1.5 text-[15px] text-[#2e2c26] outline-none"
            style={{ boxShadow: 'inset 0 2px 3px rgba(0,0,0,.18)', border: '1px solid #d7d2c2' }} />
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)}
            className="no-drag rounded-[6px] bg-white/70 px-2 py-1.5 text-[13px] text-[#4a5058] outline-none" style={{ border: '1px solid #d7d2c2' }} />
          <button onClick={add} disabled={!text.trim()} className="gloss px-4 py-2 text-[14px] font-semibold disabled:opacity-40">Add</button>
        </div>

        <Group title="Overdue" stamp list={overdue} />
        <Group title="Scheduled" list={scheduled} />
        <Group title="No date" list={someday} />
        {done.length > 0 && <Group title="Completed" list={done} />}

        {data.reminders.length === 0 && <p className="mt-16 text-center text-[14px] embossed">Nothing yet. Add your first reminder above.</p>}
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
  const [due, setDue] = useState(toLocalInput(r.dueAt))

  function saveEdit() {
    setEditing(false)
    api.updateReminder(r.id, { text: text.trim() || r.text, dueAt: due ? new Date(due).toISOString() : null })
  }

  return (
    <div className="paper card-enter flex items-center gap-3 px-4 py-3">
      <button onClick={() => api.updateReminder(r.id, { done: !r.done })}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${r.done ? 'gloss' : ''}`}
        style={r.done ? undefined : { background: '#faf8f1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.25)', border: '1px solid #cfc9b6' }}>
        {r.done && <span className="text-[12px] leading-none text-white">✓</span>}
      </button>

      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            className="flex-1 rounded-[6px] bg-white/70 px-2 py-1.5 text-[14px] text-[#2e2c26] outline-none" style={{ boxShadow: 'inset 0 2px 3px rgba(0,0,0,.18)' }} />
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-[6px] bg-white/70 px-2 py-1.5 text-[12px]" />
          <button onClick={saveEdit} className="text-[13px] font-semibold text-accent">Save</button>
        </div>
      ) : (
        <div className="min-w-0 flex-1 cursor-text" onClick={() => setEditing(true)}>
          <div className={`text-[15px] ${r.done ? 'text-[#a49e8e] line-through decoration-red-400' : 'font-medium text-[#2e2c26]'}`}>{r.text}</div>
          {r.dueAt && <div className={`text-[12px] ${!r.done && isOverdue(r.dueAt) ? 'stamp font-semibold' : 'text-[#8a8474]'}`}>{formatDue(r.dueAt)}</div>}
        </div>
      )}

      <button onClick={() => api.deleteReminder(r.id)} className="shrink-0 text-[#b3ac9c] hover:text-red-600" title="Delete">✕</button>
    </div>
  )
}
