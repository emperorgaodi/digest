import { useEffect, useState } from 'react'
import type { AppData } from '../../electron/types'
import { api } from '../useDigest'

// Timers live at module scope so navigating to another view (which unmounts
// this component) doesn't kill a countdown or its finished notification.
type ActiveTimer = { id: string; name: string; end: number }
let running: ActiveTimer[] = []
const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

function startTimer(name: string, totalSeconds: number) {
  const id = crypto.randomUUID()
  running = [...running, { id, name, end: Date.now() + totalSeconds * 1000 }]
  timeouts.set(id, setTimeout(() => {
    running = running.filter((t) => t.id !== id)
    timeouts.delete(id)
    new Notification(name || 'Timer finished', { body: name ? `${name} is done.` : 'Time is up.' })
  }, totalSeconds * 1000))
}

function cancelTimer(id: string) {
  clearTimeout(timeouts.get(id))
  timeouts.delete(id)
  running = running.filter((t) => t.id !== id)
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatRemaining(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

export function zoneCity(zone: string): string {
  return (zone.split('/').pop() || zone).replace(/_/g, ' ')
}

const PRESETS = [5, 10, 15, 25, 60]
const ALL_ZONES: string[] =
  (Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf?.('timeZone') ?? []

export default function Clock({ data }: { data: AppData }) {
  const [now, setNow] = useState(() => new Date())
  const [name, setName] = useState('')
  const [hrs, setHrs] = useState('')
  const [min, setMin] = useState('')
  const [sec, setSec] = useState('')
  const [zonePick, setZonePick] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(id)
  }, [])

  const totalSeconds = (Number(hrs) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(sec) || 0)
  const zones = data.settings.worldClocks

  function start() {
    if (totalSeconds <= 0) return
    startTimer(name.trim(), totalSeconds)
    setName(''); setHrs(''); setMin(''); setSec('')
  }

  function addZone() {
    if (zonePick && !zones.includes(zonePick)) api.updateSettings({ worldClocks: [...zones, zonePick] })
    setZonePick('')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="metal drag shrink-0 z-10 rounded-[26px] px-8 pb-4 pt-5">
        <h1 className="embossed text-[28px] font-bold tracking-tight">Clock</h1>
      </header>

      <div className="fade-scroll-edges flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-6">
          {/* Clock card */}
          <div className="paper mb-7 px-8 py-10 text-center">
            <div className="text-[64px] font-bold leading-none tracking-tight text-[#2e2c26] tabular-nums">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="mt-3 text-[15px] font-semibold text-[#5b5548]">
              {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* World clock card */}
          <div className="paper mb-7 p-5">
            <h2 className="engraved mb-3 text-[12px] font-bold uppercase tracking-wider">World clock</h2>
            {zones.length > 0 && (
              <div className="mb-3 space-y-2">
                {zones.map((z) => (
                  <div key={z} className="group flex items-baseline gap-3">
                    <span className="text-[15px] font-medium text-[#2e2c26]">{zoneCity(z)}</span>
                    <span className="text-[12px] text-[#8a8474]">
                      {now.toLocaleDateString([], { weekday: 'short', timeZone: z })}
                    </span>
                    <span className="ml-auto text-[17px] font-semibold text-[#2e2c26] tabular-nums">
                      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: z })}
                    </span>
                    <button onClick={() => api.updateSettings({ worldClocks: zones.filter((x) => x !== z) })}
                      className="text-[#b3ac9c] opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100" title="Remove">x</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <select value={zonePick} onChange={(e) => setZonePick(e.target.value)}
                className="flex-1 rounded-lg bg-black/[0.06] px-2 py-1.5 text-[13px] text-[#2e2c26] outline-none">
                <option value="">Choose a time zone…</option>
                {ALL_ZONES.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
              </select>
              <button onClick={addZone} disabled={!zonePick}
                className="gloss px-4 py-1.5 text-[13px] font-semibold disabled:opacity-40">Add</button>
            </div>
          </div>

          {/* Timer card */}
          <div className="paper p-5">
            <h2 className="engraved mb-3 text-[12px] font-bold uppercase tracking-wider">Timers</h2>

            {running.length > 0 && (
              <div className="mb-4 space-y-2">
                {running.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-black/[0.06] px-3.5 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#2e2c26]">{t.name || 'Timer'}</span>
                    <span className="text-[20px] font-bold text-[#2e2c26] tabular-nums">{formatRemaining(t.end - now.getTime())}</span>
                    <button onClick={() => cancelTimer(t.id)} className="btn-metal px-3 py-1 text-[12px] font-semibold">Cancel</button>
                  </div>
                ))}
              </div>
            )}

            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder="Timer name (optional)"
              className="mb-3 w-full rounded-lg bg-black/[0.06] px-3 py-2 text-[14px] text-[#2e2c26] outline-none placeholder:text-[#7c766a]" />

            <div className="flex flex-wrap items-center gap-2">
              <DurField label="hr" value={hrs} onChange={setHrs} />
              <DurField label="min" value={min} onChange={setMin} />
              <DurField label="sec" value={sec} onChange={setSec} />
              <button onClick={start} disabled={totalSeconds <= 0}
                className="gloss ml-auto px-5 py-1.5 text-[13px] font-semibold disabled:opacity-40">Start</button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((m) => (
                <button key={m} onClick={() => { setHrs(''); setMin(String(m)); setSec('') }}
                  className="rounded-full bg-black/[0.06] px-3 py-1 text-[12px] font-semibold text-[#5b5548] transition-colors hover:bg-black/[0.12]">
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DurField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        inputMode="numeric" placeholder="0"
        className="w-14 rounded-lg bg-black/[0.06] px-2 py-1.5 text-center text-[14px] text-[#2e2c26] outline-none placeholder:text-[#7c766a] tabular-nums" />
      <span className="text-[12px] font-semibold text-[#5b5548]">{label}</span>
    </label>
  )
}
