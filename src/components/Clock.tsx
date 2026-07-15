import { useEffect, useState } from 'react'

// Timer lives at module scope so navigating to another view (which unmounts
// this component) doesn't kill the countdown or the finished notification.
let timerEnd: number | null = null
let timerTimeout: ReturnType<typeof setTimeout> | undefined

function startTimer(minutes: number) {
  clearTimeout(timerTimeout)
  timerEnd = Date.now() + minutes * 60_000
  timerTimeout = setTimeout(() => {
    timerEnd = null
    new Notification('Timer finished', { body: `${minutes} minute timer is up.` })
  }, minutes * 60_000)
}

function cancelTimer() {
  clearTimeout(timerTimeout)
  timerEnd = null
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

const PRESETS = [5, 10, 15, 25, 60]

export default function Clock() {
  const [now, setNow] = useState(() => new Date())
  const [customMin, setCustomMin] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(id)
  }, [])

  const remaining = timerEnd ? timerEnd - now.getTime() : null

  function startCustom() {
    const min = Number(customMin)
    if (!Number.isFinite(min) || min <= 0) return
    startTimer(min)
    setCustomMin('')
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

          {/* Timer card */}
          <div className="paper p-5">
            <h2 className="engraved mb-3 text-[12px] font-bold uppercase tracking-wider">Timer</h2>

            {remaining !== null ? (
              <div className="text-center">
                <div className="text-[52px] font-bold leading-none tracking-tight text-[#2e2c26] tabular-nums">
                  {formatRemaining(remaining)}
                </div>
                <button onClick={cancelTimer} className="btn-metal mt-5 px-5 py-1.5 text-[13px] font-semibold">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((min) => (
                  <button key={min} onClick={() => startTimer(min)}
                    className="rounded-full bg-black/[0.06] px-3 py-1 text-[12px] font-semibold text-[#5b5548] transition-colors hover:bg-black/[0.12]">
                    {min} min
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <input value={customMin} onChange={(e) => setCustomMin(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && startCustom()}
                    placeholder="min" inputMode="numeric"
                    className="w-16 rounded-lg bg-black/[0.06] px-2 py-1.5 text-center text-[13px] text-[#2e2c26] outline-none placeholder:text-[#7c766a]" />
                  <button onClick={startCustom} disabled={!customMin}
                    className="gloss px-4 py-1.5 text-[13px] font-semibold disabled:opacity-40">Start</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
