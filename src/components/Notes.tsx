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
  const [selectedId, setSelectedId] = useState<string | null>(null) // null = list view
  const [showTrash, setShowTrash] = useState(false)
  const selected = live.find((n) => n.id === selectedId) ?? null

  async function newNote() {
    const note = await api.createNote()
    setSelectedId(note.id)
  }

  // ---- Editor view — text on the app's glass background (no white panel) ----
  if (selected) {
    return (
      <div className="flex h-full flex-col">
        <header className="metal drag shrink-0 z-10 flex items-center justify-between rounded-[26px] px-4 py-3">
          <button onClick={() => setSelectedId(null)}
            className="no-drag flex items-center gap-1 rounded-xl px-3 py-2 text-[14px] font-semibold embossed transition-colors hover:bg-white/10">
            <span className="text-[17px] leading-none">‹</span> Notes
          </button>
          <button onClick={() => { api.deleteNote(selected.id); setSelectedId(null) }}
            className="no-drag rounded-xl px-3 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-300">
            Delete
          </button>
        </header>
        <div className="flex-1 overflow-hidden">
          <Editor key={selected.id} note={selected} />
        </div>
      </div>
    )
  }

  // ---- List view (full width) ----
  return (
    <div className="flex h-full flex-col">
      <header className="metal drag shrink-0 z-10 flex items-center justify-between rounded-[26px] px-8 pb-4 pt-5">
        <h1 className="embossed text-[28px] font-bold tracking-tight">Notes</h1>
        <button onClick={newNote} className="no-drag gloss px-3.5 py-2 text-[13px] font-semibold">New note</button>
      </header>

      <div className="fade-scroll-edges flex-1 overflow-y-auto p-3">
        {live.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-60">
            <p className="text-[15px] font-medium embossed">No notes yet</p>
            <button onClick={newNote} className="gloss px-4 py-2 text-[14px] font-semibold">Create a new note</button>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2 pb-16 pt-3">
            {live.map((n) => (
              <button key={n.id} onClick={() => setSelectedId(n.id)}
                className="paper scroll-fade block w-full px-4 py-3 text-left">
                <div className="truncate text-[15px] font-semibold text-[#2e2c26]">{n.title || 'New note'}</div>
                <div className="mt-0.5 truncate text-[13px] text-[#7c766a]">{n.body.replace(/\n/g, ' ').trim() || 'No additional text'}</div>
                <div className="mt-1 text-[11px] text-[#a49e8e]">{timeAgo(n.updatedAt)}</div>
              </button>
            ))}

            {trashed.length > 0 && (
              <div className="pt-2">
                <button onClick={() => setShowTrash((s) => !s)} className="px-1 py-1 text-[12px] font-medium embossed opacity-80 hover:opacity-100">
                  {showTrash ? 'Hide' : 'Show'} recently deleted ({trashed.length})
                </button>
                {showTrash && trashed.map((n) => (
                  <div key={n.id} className="paper mt-2 flex items-center gap-2 px-4 py-2.5 opacity-90">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-[#7c766a]">{n.title || 'New note'}</div>
                      <div className="truncate text-[11px] text-[#a49e8e]">deleted {timeAgo(n.deletedAt!)}</div>
                    </div>
                    <button onClick={() => { api.restoreNote(n.id); setSelectedId(n.id) }} className="text-[12px] font-semibold text-accent">Restore</button>
                    <button onClick={() => api.purgeNote(n.id)} title="Delete forever" className="text-[12px] text-[#b3ac9c] hover:text-red-600">x</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Autosaving editor — light text on the dark glass background, autosaves on edit.
function Editor({ note }: { note: Note }) {
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
    <div className="mx-auto flex h-full max-w-2xl flex-col px-8 pb-4 pt-6">
      <input value={title} onChange={(e) => { setTitle(e.target.value); scheduleSave({ title: e.target.value, body }) }} onBlur={flush}
        autoFocus placeholder="Title" className="bg-transparent text-[26px] font-bold tracking-tight text-white outline-none placeholder:text-white/25" />
      <textarea value={body} onChange={(e) => { setBody(e.target.value); scheduleSave({ title, body: e.target.value }) }} onBlur={flush}
        placeholder="Start writing…" className="mt-3 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-white/85 outline-none placeholder:text-white/25" />
        <div className="pt-2 text-[11px] text-white/30">Edited {timeAgo(note.updatedAt)}</div>
    </div>
  )
}
