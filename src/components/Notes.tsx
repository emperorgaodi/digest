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

  const emptyPrompt = (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-50">
      <p className="text-[15px] font-medium text-[#5b6472]">Select a note to read, or start a new one</p>
      <button onClick={newNote} className="gloss px-4 py-2 text-[14px] font-semibold">Create a new note</button>
    </div>
  )

  return (
    <div className="h-full p-3">
      {/* One cohesive panel: list + editor share a single frosted surface. */}
      <div className="paper flex h-full overflow-hidden">
        {live.length === 0 ? (
          emptyPrompt
        ) : (
          <>
            <div className="flex w-60 shrink-0 flex-col border-r border-black/10 bg-black/[0.03]">
              <div className="drag flex items-center justify-between px-3 pb-3 pt-4">
                <h2 className="engraved text-[17px] font-bold tracking-tight">Notes</h2>
                <button onClick={newNote} className="gloss no-drag px-2.5 py-1 text-[12px] font-semibold">New</button>
              </div>
              <div className="no-drag flex-1 overflow-y-auto px-2 pb-2">
                {live.map((n) => (
                  <button key={n.id} onClick={() => { setSelectedId(n.id); setShowTrash(false) }}
                    className={`mb-1 block w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                      !showTrash && selectedId === n.id ? 'bg-accent/15 ring-1 ring-accent/40' : 'hover:bg-black/5'
                    }`}>
                    <div className="truncate text-[14px] font-semibold text-[#2e2c26]">{n.title || 'New note'}</div>
                    <div className="mt-0.5 truncate text-[12px] text-[#7c766a]">{n.body.replace(/\n/g, ' ').trim() || 'No additional text'}</div>
                    <div className="mt-0.5 text-[11px] text-[#a49e8e]">{timeAgo(n.updatedAt)}</div>
                  </button>
                ))}

                {trashed.length > 0 && (
                  <div className="mt-3 border-t border-black/10 pt-2">
                    <button onClick={() => setShowTrash((s) => !s)} className="w-full px-2 py-1 text-left text-[12px] font-medium text-[#8a8474] hover:text-[#5b5548]">
                      {showTrash ? 'Hide' : 'Show'} recently deleted ({trashed.length})
                    </button>
                    {showTrash && trashed.map((n) => (
                      <div key={n.id} className="mb-1 mt-1 flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-black/5">
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
            </div>

            <div className="flex-1 overflow-hidden">
              {selected ? <Editor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} /> : emptyPrompt}
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
