import { useMemo, useState } from 'react'

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function sameDay(a: Date, y: number, m: number, d: number) {
  return a.getFullYear() === y && a.getMonth() === m && a.getDate() === d
}

// Custom, themed date + time picker. `value` is an ISO string; onChange emits ISO.
export default function DateTimePicker({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const initial = useMemo(() => {
    if (value) return new Date(value)
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d
  }, [value])
  const [sel, setSel] = useState<Date>(initial)
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))
  const [mode, setMode] = useState<'days' | 'months'>('days')

  const days = useMemo(() => {
    const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay()
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) arr.push(null)
    for (let d = 1; d <= count; d++) arr.push(d)
    return arr
  }, [view])

  const today = new Date()
  const h12 = ((sel.getHours() + 11) % 12) + 1
  const ampm = sel.getHours() >= 12 ? 'PM' : 'AM'
  const minute = sel.getMinutes()

  function commit(next: Date) { setSel(next); onChange(next.toISOString()) }
  function pickDay(d: number) {
    commit(new Date(view.getFullYear(), view.getMonth(), d, sel.getHours(), sel.getMinutes(), 0, 0))
  }
  function applyTime(newH12: number, newMin: number, newAmpm: string) {
    const h24 = (newH12 % 12) + (newAmpm === 'PM' ? 12 : 0)
    commit(new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), h24, newMin, 0, 0))
  }

  const navBtn = 'grid h-7 w-7 place-items-center rounded-lg text-[15px] text-[#5b5548] hover:bg-black/[0.06]'
  const timeSel = 'rounded-md bg-black/[0.06] px-1.5 py-1 text-[12px] font-medium text-[#2e2c26] outline-none'

  return (
    <div className="w-[260px] rounded-2xl border border-black/10 bg-white/70 p-3">
      {mode === 'days' ? (
        <>
          <div className="mb-1.5 flex items-center justify-between">
            <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className={navBtn}>‹</button>
            <button onClick={() => setMode('months')} className="rounded-lg px-2.5 py-1 text-[13px] font-bold text-[#2e2c26] hover:bg-black/[0.06]">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </button>
            <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className={navBtn}>›</button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#a49e8e]">
            {WD.map((w, i) => <div key={i} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => d === null ? <div key={i} /> : (
              <button key={i} onClick={() => pickDay(d)}
                className={`grid h-7 place-items-center rounded-lg text-[12px] transition-colors ${
                  sameDay(sel, view.getFullYear(), view.getMonth(), d)
                    ? 'gloss font-bold'
                    : sameDay(today, view.getFullYear(), view.getMonth(), d)
                      ? 'font-bold text-accent hover:bg-black/[0.06]'
                      : 'text-[#3a3a3c] hover:bg-black/[0.06]'
                }`}>{d}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="min-h-[196px]">
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setView(new Date(view.getFullYear() - 1, view.getMonth(), 1))} className={navBtn}>‹</button>
            <div className="text-[13px] font-bold text-[#2e2c26]">{view.getFullYear()}</div>
            <button onClick={() => setView(new Date(view.getFullYear() + 1, view.getMonth(), 1))} className={navBtn}>›</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MON3.map((m, i) => (
              <button key={i} onClick={() => { setView(new Date(view.getFullYear(), i, 1)); setMode('days') }}
                className={`rounded-lg py-2.5 text-[12px] transition-colors ${
                  i === view.getMonth() ? 'gloss font-bold' : 'text-[#3a3a3c] hover:bg-black/[0.06]'
                }`}>{m}</button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1 border-t border-black/10 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#a49e8e]">Time</span>
        <select value={h12} onChange={(e) => applyTime(Number(e.target.value), minute, ampm)} className={`ml-auto ${timeSel}`}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="font-bold text-[#a49e8e]">:</span>
        <select value={minute - (minute % 5)} onChange={(e) => applyTime(h12, Number(e.target.value), ampm)} className={timeSel}>
          {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
        </select>
        <select value={ampm} onChange={(e) => applyTime(h12, minute, e.target.value)} className={timeSel}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}
