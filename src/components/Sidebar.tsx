import { useState } from 'react'
import type { AppData } from '../../electron/types'
import { api } from '../useDigest'
import { unreadCount, isOverdue } from '../util'
import { THEMES } from '../themes'
import TabEditor from './TabEditor'

export default function Sidebar({
  data, view, onSelect,
}: { data: AppData; view: string; onSelect: (v: string) => void }) {
  const [editorFor, setEditorFor] = useState<string | null>(null)
  const [showTheme, setShowTheme] = useState(false)
  const editingTab = editorFor && editorFor !== 'new' ? data.tabs.find((t) => t.id === editorFor) ?? null : null

  const totalUnread = data.items.filter((i) => !i.read).length
  const activeReminders = data.reminders.filter((r) => !r.done)
  const dueSoon = activeReminders.filter((r) => isOverdue(r.dueAt)).length
  const liveNotes = data.notes.filter((n) => !n.deletedAt).length
  const accent = data.settings.accent

  return (
    <aside className="leather drag flex h-full w-64 shrink-0 flex-col rounded-[26px] px-3 pt-4">
      <div className="no-drag group mb-3 flex items-center gap-2 px-1">
        <button onClick={() => api.closeWindow()} title="Close" className="grid h-[13px] w-[13px] place-items-center rounded-full bg-[#ff5f57]"><span className="text-[9px] font-bold leading-none text-black/55 opacity-0 group-hover:opacity-100">×</span></button>
        <button onClick={() => api.minimizeWindow()} title="Minimise" className="grid h-[13px] w-[13px] place-items-center rounded-full bg-[#febc2e]"><span className="text-[11px] font-bold leading-none text-black/55 opacity-0 group-hover:opacity-100">−</span></button>
        <button onClick={() => api.toggleMaximize()} title="Zoom" className="grid h-[13px] w-[13px] place-items-center rounded-full bg-[#28c840]"><span className="text-[9px] font-bold leading-none text-black/55 opacity-0 group-hover:opacity-100">+</span></button>
      </div>
      <div className="px-2 pb-4">
        <h1 className="embossed text-[22px] font-bold tracking-tight">Digest</h1>
      </div>

      <nav className="no-drag flex-1 overflow-y-auto pr-1">
        <Row icon="ð°" active={view === 'digest'} onClick={() => onSelect('digest')} label="Front Page" badge={totalUnread} />
        <Row icon="ðï¸" active={view === 'notes'} onClick={() => onSelect('notes')} label="Notes" badge={liveNotes} />
        <Row icon="â°" active={view === 'reminders'} onClick={() => onSelect('reminders')} label="Reminders" badge={activeReminders.length} alert={dueSoon > 0} />

        <div className="mb-2 mt-6 px-2 text-[11px] font-bold uppercase tracking-wider text-[#c3cbef]" style={{ textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>Topics</div>
        {data.tabs.map((t) => (
          <Row key={t.id} icon="â¢" active={view === t.id} onClick={() => onSelect(t.id)} label={t.name}
            badge={unreadCount(data, t.id)} error={!!t.error} onEdit={() => setEditorFor(t.id)} />
        ))}
        {data.tabs.length === 0 && <p className="px-2 py-2 text-[13px] text-[#c3cbef]">No topics yet.</p>}
      </nav>

      <div className="no-drag relative space-y-2 py-3">
        {showTheme && (
          <div className="paper card-enter absolute bottom-full left-0 right-0 mb-2 p-3">
            <div className="engraved mb-2 text-[12px] font-bold">Accent colour</div>
            <div className="grid grid-cols-5 gap-2.5">
              {THEMES.map((t) => {
                const selected = accent.toLowerCase() === t.hex.toLowerCase()
                return (
                  <button key={t.hex} title={t.name} onClick={() => api.updateSettings({ accent: t.hex })}
                    className="grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-110"
                    style={{ background: t.hex, backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.5), rgba(0,0,0,.15))', boxShadow: selected ? '0 0 0 2px #f5f2e9, 0 0 0 4px ' + t.hex : 'inset 0 1px 0 rgba(255,255,255,.5), 0 1px 2px rgba(0,0,0,.4)' }}>
                    {selected && <span className="text-[12px] font-bold text-white">â</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <FootBtn onClick={() => setEditorFor('new')} label="New topic" glyph="ï¼" />
        <FootBtn onClick={() => api.toggleWidget()} label="Widget mode" glyph="â¢" />
        <FootBtn onClick={() => setShowTheme((s) => !s)} label="Appearance" swatch={accent} />
        <button onClick={() => api.openDataFolder()} className="w-full px-2 py-1 text-left text-[12px] text-[#c3cbef] hover:text-white">
          Open data folder
        </button>
      </div>

      {editorFor && <TabEditor tab={editingTab} onClose={() => setEditorFor(null)} />}
    </aside>
  )
}

function FootBtn({ onClick, label, glyph, swatch }: { onClick: () => void; label: string; glyph?: string; swatch?: string }) {
  return (
    <button onClick={onClick} className="btn-metal flex w-full items-center gap-2.5 px-3 py-2 text-[14px] font-medium">
      {swatch ? <span className="h-3.5 w-3.5 rounded-full" style={{ background: swatch, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 0 1px 1px rgba(0,0,0,.4)' }} />
        : <span className="text-[15px] leading-none">{glyph}</span>}
      {label}
    </button>
  )
}

function Row({
  icon, active, onClick, label, badge, error, alert, onEdit,
}: {
  icon: string; active: boolean; onClick: () => void; label: string; badge: number
  error?: boolean; alert?: boolean; onEdit?: () => void
}) {
  return (
    <div onClick={onClick}
      className={`group mb-1.5 flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[14px] transition-all ${
        active ? 'gloss nav-active rounded-[9px] font-semibold' : 'embossed hover:brightness-125'
      }`}>
      <span className="w-4 text-center text-[13px]">{icon}</span>
      <span className="truncate font-medium">{label}</span>
      {error && <span title="Last refresh failed" className="text-[11px] text-amber-400">!</span>}
      {badge > 0 && (
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
          active ? 'bg-black/25 text-white' : alert ? 'bg-red-500/80 text-white' : 'bg-black/30 text-[#d8cdb8]'
        }`}>{badge}</span>
      )}
      {onEdit && (
        <button onClick={(e) => { e.stopPropagation(); onEdit() }}
          className={`${badge > 0 ? 'ml-1' : 'ml-auto'} opacity-0 transition-opacity group-hover:opacity-100 ${active ? 'text-white' : 'text-[#c3cbef]'}`}
          title="Edit topic">â¯</button>
      )}
    </div>
  )
}
