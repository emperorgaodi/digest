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

  const prompt = (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-60">
      <p className="text-[15px] font-medium embossed">Select a note to read, or start a new one</p>
      <button onClick={newNote} className="gloss px-4 py-2 text-[14px] font-semibold">Create a new note</button>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <header className="metal drag shrink-0 z-10 mx-3 mt-3 flex items-center justify-between rounded-[22px] px-8 pb-4 pt-5">
        <h1 className="engraved text-[28px] font-bold tracking-tight">Notes</h1>
        <button onClick={newNote} className="gloss px-3.5 py-2 text-[13px] font-semibold">New note</button>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {live.length === 0 ? (
          prompt
        ) : (
          <>
            {/* Note list — frosted cards on the gradient, like the front page. */}
            <div className="fade-scroll-edges flex w-64 shrink-0 flex-col gap-2 overflow-y-auto pr-0.5">
              {live.map((n) => (
                <button key={n.id} onClick={() => { setSelectedId(n.id); setShowTrash(false) }}
                  className="paper block w-full px-3.5 py-3 text-left transition-transform active:translate-y-px"
                  style={!showTrash && selectedId === n.id ? { outline: '2px solid rgb(var(--accent-rgb))', outlineOffset: '-1px' } : undefined}>
                  <div className="truncate text-[14px] font-semibold text-[#2e2c26]">{n.title || 'New note'}</div>
                  <div className="mt-0.5 truncate text-[12px] text-[#7c766a]">{n.body.replace(/\n/g, ' ').trim() || 'No additional text'}</div>
                  <div className="mt-0.5 text-[11px] text-[#a49e8e]">{timeAgo(n.updatedAt)}</div>
                </button>
              ))}

              {trashed.length > 0 && (
                <div className="mt-1">
                  <button onClick={() => setShowTrash((s) => !s)} className="w-full px-1 py-1 text-left text-[12px] font-medium embossed opacity-80 hover:opacity-100">
                    {showTrash ? 'Hide' : 'Show'} recently deleted ({trashed.length})
                  </button>
                  {showTrash && trashed.map((n) => (
                    <div key={n.id} className="paper mt-1 flex items-center gap-2 px-3 py-2 opacity-90">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#7c766a]">{n.title || 'New note'}</div>
                        <div className="truncate text-[11px] text-[#a49e8e]">deleted {timeAgo(n.deletedAt!)}</div>
                      </div>
                      <button onClick={() => { api.restoreNote(n.id); setSelectedId(n.id); setShowTrash(false) }} className="text-[12px] font-semibold text-accent">Restore</button>
                      <button onClick={() => api.purgeNote(n.id)} title="Delete forever" className="text-[12px] text-[#b3ac9c] hover:text-red-600">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor — a single frosted panel. */}
            <div className="flex-1 overflow-hidden">
              {selected ? (
                <div className="paper h-full overflow-hidden">
                  <Editor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} />
                </div>
              ) : prompt}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Autosaving editor — local draft, debounced persist, flush on blur.
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
    <div className="flex h-full flex-col px-8 py-6">
      <div className="mb-2 flex items-center">
        <input value={title} onChange={(e) => { setTitle(e.target.value); scheduleSave({ title: e.target.value, body }) }} onBlur={flush}
          placeholder="Title" className="flex-1 bg-transparent text-[24px] font-bold tracking-tight text-[#2e2c26] outline-none placeholder:text-[#b8b2a4]" />
        <button onClick={() => { api.deleteNote(note.id); onDeleted() }} className="btn-metal px-2.5 py-1.5 text-[12px] font-medium">Delete</button>
      </div>
      <div className="mb-3 text-[12px] text-[#a49e8e]">Edited {timeAgo(note.updatedAt)} · saved automatically</div>
      <textarea value={body} onChange={(e) => { setBody(e.target.value); scheduleSave({ title, body: e.target.value }) }} onBlur={flush}
        placeholder="Start writing…" className="flex-1 bg-transparent text-[15px] leading-relaxed text-[#3a3a3c] outline-none placeholder:text-[#b8b2a4]" />
    </div>
  )
}
