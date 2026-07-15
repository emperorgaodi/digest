import { useEffect, useState } from 'react'
import { DEFAULT_WIDGET_TILES } from '../../electron/types'
import type { AppData, WidgetTile, WidgetTileId } from '../../electron/types'
import { api } from '../useDigest'
import { isOverdue, formatDue, timeAgo } from '../util'
import { zoneCity } from './Clock'
import ArticleCard from './ArticleCard'

const TILE_LABELS: Record<WidgetTileId, string> = {
  clock: 'Clock', news: 'News', reminders: 'Reminders', notes: 'Notes',
}

export default function Widget({ data }: { data: AppData | null }) {
  const [now, setNow] = useState(() => new Date())
  const [editMode, setEditMode] = useState(false)
  const [dragId, setDragId] = useState<WidgetTileId | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const tiles = data?.settings.widgetTiles ?? DEFAULT_WIDGET_TILES
  const visible = editMode ? tiles : tiles.filter((t) => t.enabled)

  function persist(next: WidgetTile[]) {
    if (data) api.updateSettings({ widgetTiles: next })
  }

  function dropOn(targetId: WidgetTileId) {
    if (!dragId || dragId === targetId) return
    const moved = tiles.find((t) => t.id === dragId)
    if (!moved) return
    const next = tiles.filter((t) => t.id !== dragId)
    next.splice(next.findIndex((t) => t.id === targetId), 0, moved)
    persist(next)
    setDragId(null)
  }

  const items = data
    ? [...data.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6)
    : []
  const reminders = data
    ? data.reminders.filter((r) => !r.done).sort((a, b) => (a.dueAt || '~').localeCompare(b.dueAt || '~')).slice(0, 5)
    : []
  const notes = data
    ? data.notes.filter((n) => !n.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
    : []
  const zones = data?.settings.worldClocks ?? []

  return (
    <div className="leather flex h-full flex-col overflow-hidden rounded-[22px]">
      <div className="drag flex flex-col">
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-white/30" title="Drag to move" />
        </div>
        <header className="flex items-center gap-2 px-4 pb-2 pt-2">
          <span className="embossed text-[15px] font-bold tracking-tight">Digest</span>
          <span className="embossed ml-auto text-[12px] font-semibold tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <span className="ml-1.5 font-medium opacity-75">{now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </span>
          <button onClick={() => setEditMode((e) => !e)}
            className={`no-drag px-2.5 py-1 text-[12px] font-medium ${editMode ? 'gloss rounded-[9px]' : 'btn-metal'}`}
            title="Rearrange tiles">{editMode ? 'Done' : 'Tiles'}</button>
          <button onClick={() => api.toggleWidget()} className="btn-metal no-drag px-2.5 py-1 text-[12px] font-medium" title="Open full app">Expand</button>
        </header>
      </div>

      <div className="fade-scroll-edges no-drag flex-1 overflow-y-auto px-3 pb-4 pt-1">
        <div className="space-y-2.5">
          {visible.map((tile) => (
            <Tile key={tile.id} tile={tile} editMode={editMode} isDragging={dragId === tile.id}
              onDragStart={() => setDragId(tile.id)} onDragEnd={() => setDragId(null)} onDrop={() => dropOn(tile.id)}
              onToggle={() => persist(tiles.map((t) => t.id === tile.id ? { ...t, enabled: !t.enabled } : t))}>
              {tile.id === 'clock' && (
                <div className="px-1 pb-1">
                  <div className="embossed text-[30px] font-bold leading-none tracking-tight tabular-nums">
                    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-white/70">
                    {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  {zones.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                      {zones.map((z) => (
                        <div key={z} className="flex items-baseline gap-2 text-[12px]">
                          <span className="font-medium text-white/80">{zoneCity(z)}</span>
                          <span className="ml-auto font-semibold text-white/90 tabular-nums">
                            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: z })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tile.id === 'news' && (
                <div className="space-y-2">
                  {items.length === 0 && <Empty>No headlines yet.</Empty>}
                  {items.map((it) => <ArticleCard key={it.id} item={it} compact />)}
                </div>
              )}

              {tile.id === 'reminders' && (
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

              {tile.id === 'notes' && (
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
            </Tile>
          ))}
        </div>
      </div>
    </div>
  )
}

// A widget cube. No backdrop-filter here on purpose — many small blurred
// panels make window resize glitch (see project gotchas); the leather shell
// behind already provides the glass.
function Tile({
  tile, editMode, isDragging, onDragStart, onDragEnd, onDrop, onToggle, children,
}: {
  tile: WidgetTile; editMode: boolean; isDragging: boolean
  onDragStart: () => void; onDragEnd: () => void; onDrop: () => void; onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
      className={`rounded-2xl bg-black/25 p-2.5 transition-opacity ${isDragging ? 'opacity-40' : ''} ${editMode && !tile.enabled ? 'opacity-50' : ''}`}
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.14)' }}>
      <div className="mb-2 flex cursor-grab items-center gap-2 px-1 active:cursor-grabbing">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{TILE_LABELS[tile.id]}</span>
        {editMode && (
          <button onClick={onToggle} className="ml-auto text-[11px] font-semibold text-white/70 hover:text-white">
            {tile.enabled ? 'Hide' : 'Show'}
          </button>
        )}
        {!editMode && <span className="ml-auto text-[11px] tracking-widest text-white/30" title="Drag to reorder">::</span>}
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center text-[13px] embossed opacity-80">{children}</p>
}
