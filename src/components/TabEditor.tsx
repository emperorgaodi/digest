import { useState } from 'react'
import type { Tab } from '../../electron/types'
import { INTERVAL_PRESETS } from '../../electron/types'
import { api } from '../useDigest'

export default function TabEditor({ tab, onClose }: { tab: Tab | null; onClose: () => void }) {
  const editing = !!tab
  const [name, setName] = useState(tab?.name ?? '')
  const [keywords, setKeywords] = useState(tab?.keywords ?? '')
  const [interval, setInterval] = useState(tab?.intervalMinutes ?? 360)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!keywords.trim()) return
    setBusy(true)
    if (editing && tab) await api.updateTab(tab.id, { name, keywords, intervalMinutes: interval })
    else await api.addTab({ name, keywords, intervalMinutes: interval })
    onClose()
  }
  async function remove() { if (editing && tab) { await api.deleteTab(tab.id); onClose() } }

  const field = 'mt-1 w-full rounded-[7px] bg-white/70 px-3 py-2.5 text-[15px] text-[#2e2c26] outline-none'
  const fieldStyle = { boxShadow: 'inset 0 2px 4px rgba(0,0,0,.22)', border: '1px solid #cfc9b6' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="paper card-enter w-[420px] p-6">
        <h2 className="engraved text-[19px] font-bold">{editing ? 'Edit tab' : 'New tab'}</h2>
        <p className="mt-1 text-[13px] text-[#8a8474]">Keywords drive both this tab and its slice of the digest.</p>

        <label className="engraved mt-5 block text-[12px] font-bold">NAME</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Formula 1" className={field} style={fieldStyle} />

        <label className="engraved mt-4 block text-[12px] font-bold">KEYWORDS</label>
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder='e.g. Formula 1 OR "F1 racing"' className={field} style={fieldStyle} />

        <label className="engraved mt-4 block text-[12px] font-bold">REFRESH EVERY</label>
        <div className="mt-1 flex gap-2.5">
          {INTERVAL_PRESETS.map((p) => (
            <button key={p.minutes} onClick={() => setInterval(p.minutes)}
              className={`flex-1 px-3 py-2 text-[13px] font-semibold ${interval === p.minutes ? 'gloss' : 'btn-metal'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2.5">
          {editing && <button onClick={remove} className="btn-metal mr-auto px-3 py-2 text-[14px] font-medium text-red-600">Delete</button>}
          <button onClick={onClose} className="btn-metal px-4 py-2 text-[14px] font-medium">Cancel</button>
          <button onClick={save} disabled={busy || !keywords.trim()} className="gloss px-4 py-2 text-[14px] font-semibold disabled:opacity-40">
            {editing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
