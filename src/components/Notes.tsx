import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppData, Note } from '../../electron/types'
import { api } from '../useDigest'
import { timeAgo } from '../util'

export default function Notes({ data }: { data: AppData }) {
  const live = useMemo(
    () => data.notes.filter((n) => !n.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.notes],
  )
  const trashed = useMemo(
    () => data.notes.filter((n) => n.deletedAt).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')),
    [data.notes],
  )
  const [selectedId, setSelectedId] = useState<string | null>(live[0]?.id ?? null)
  const [showTrash, setShowTrash] = useState(false)
  const selected = live.find((n) => n.id === selectedId) ?? null

  async function newNote() {
    const note = await api.createNote()
    setSelectedId(note.id); setShowTrash(false)
  }

  return (
    <div className="flex h-full">
      <div className="flex w-72 shrink-0 flex-col px-3">
        <header className="drag flex items-center justify-between px-2 pb-3 pt-10">
          <h1 className="embossed text-[22px] font-bold tracking-tight">Notes</h1>
          <button onClick={newNote} className="gloss no-drag px-3 py-1.5 text-[13px] font-semibold">＋ New</button>
        </header>
        <div className="flex-1 overflow-y-auto pr-1 pb-2">
          {live.length === 0 && <p className="px-2 py-6 text-center text-[13px] embossed opacity-80">No notes yet.</p>}
          {live.map((n) => (
            <button key={n.id} onClick={() => { setSelectedId(n.id); setShowTrash(false) }}
              className="paper mb-2.5 block w-full px-3 py-2.5 text-left transition-transform active:translate-y-px"
              style={!showTrash && selectedId === n.id ? { boxShadow: '0 0 0 2px rgb(var(--accent-rgb)), 0 2px 5px rgba(0,0,0,.32)' } : undefined}>
              <div className="truncate text-[14px] font-semibold text-[#2e2c26]">{n.title || 'New note'}</div>
              <div className="mt-0.5 truncate text-[12px] text-[#7c766a]">{n.body.replace(/\n/g, ' ').trim() || 'No additional text'}</div>
              <div className="mt-0.5 text-[11px] text-[#a49e8e]">{timeAgo(n.updatedAt)}</div>
            </button>
          ))}

          {trashed.length > 0 && (
            <div className="mt-3 pt-2">
              <button onClick={() => setShowTrash((s) => !s)} className="w-full px-2 py-1 text-left text-[12px] font-medium embossed opacity-80 hover:opacity-100">
                {showTrash ? '▾' : '▸'} Recently deleted ({trashed.length})
              </button>
              {showTrash && trashed.map((n) => (
                <div key={n.id} className="paper mb-2 mt-1 flex items-center gap-2 px-3 py-2 opacity-90">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-[#7c766a]">{n.title || 'New note'}</div>
                    <div className="truncate text-[11px] text-[#a49e8e]">deleted {timeAgo(n.deletedAt!)}</div>
                  </div>
                  <button onClick={() => { api.restoreNote(n.id); setSelectedId(n.id); setShowTrash(false) }} className="text-[12px] font-semibold text-accent">Restore</button>
                  <button onClick={() => api.purgeNote(n.id)} title="Delete forever" className="text-[12px] text-[#a49e8e] hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {selected ? (
          <Editor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center embossed">
            <p className="text-[15px]">Select a note, or</p>
            <button onClick={newNote} className="gloss mt-3 px-4 py-2 text-[14px] font-semibold">Create a new note</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Autosaving editor on a yellow legal pad — local draft, debounced persist, flush on blur.
function Editor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  function scheduleSave(next: { title: string; body: string }) {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => api.updateNote(note.id, next), 400)
  }
  function flush() { clearTimeout(timer.current); api.updateNote(note.id, { title, body }) }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="legal flex h-full flex-col py-6 pl-[52px] pr-8">
      <div className="mb-1 flex items-center">
        <input value={title} onChange={(e) => { setTitle(e.target.value); scheduleSave({ title: e.target.value, body }) }} onBlur={flush}
          placeholder="Title" className="flex-1 bg-transparent text-[22px] font-bold tracking-tight text-[#3a3524] outline-none placeholder:text-[#bcb075]" />
        <button onClick={() => { api.deleteNote(note.id); onDeleted() }} className="btn-metal px-2.5 py-1.5 text-[12px] font-medium">Delete</button>
      </div>
      <div className="mb-2 text-[11px] text-[#8a7f52]">Edited {timeAgo(note.updatedAt)} · saved automatically</div>
      <textarea value={body} onChange={(e) => { setBody(e.target.value); scheduleSave({ title, body: e.target.value }) }} onBlur={flush}
        placeholder="Start writing…" className="flex-1 bg-transparent text-[15px] leading-[28px] text-[#3a3524] outline-none placeholder:text-[#bcb075]" />
    </div>
  )
}
