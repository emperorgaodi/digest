import { useEffect, useState } from 'react'
import { api, useDigest } from './useDigest'
import { hexToRgbChannels } from './themes'
import Sidebar from './components/Sidebar'
import Digest from './components/Digest'
import TabView from './components/TabView'
import Notes from './components/Notes'
import Reminders from './components/Reminders'
import Widget from './components/Widget'

export type View = 'digest' | 'notes' | 'reminders' | string

export default function App() {
  const data = useDigest()
  const [view, setView] = useState<View>('digest')

  // Apply the chosen accent to the whole document (app + widget windows alike).
  const accent = data?.settings.accent ?? '#0A84FF'
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-rgb', hexToRgbChannels(accent))
  }, [accent])

  if (api.mode === 'widget') return <Widget data={data} />
  if (!data) return <div className="linen flex h-full items-center justify-center embossed">Loading…</div>

  const tab = data.tabs.find((t) => t.id === view)

  return (
    <div className="flex h-full linen gap-3 p-3">
      <TrafficLights />
      <Sidebar data={data} view={view} onSelect={setView} />
      <main className="relative flex-1 overflow-hidden rounded-[26px]">
        {view === 'digest' && <Digest data={data} onOpenTab={setView} />}
        {view === 'notes' && <Notes data={data} />}
        {view === 'reminders' && <Reminders data={data} />}
        {tab && <TabView data={data} tab={tab} />}
      </main>
    </div>
  )
}

// macOS-style window controls (top-left). Symbols reveal on hover of the cluster.
function TrafficLights() {
  const dot = 'grid h-[13px] w-[13px] place-items-center rounded-full text-[9px] font-bold leading-none text-black/55 opacity-0 transition group-hover:opacity-100'
  return (
    <div className="no-drag group absolute left-[18px] top-[15px] z-50 flex items-center gap-2">
      <button onClick={() => api.closeWindow()} title="Close" className="h-[13px] w-[13px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)]">
        <span className={dot}>✕</span>
      </button>
      <button onClick={() => api.minimizeWindow()} title="Minimise" className="h-[13px] w-[13px] rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)]">
        <span className={dot}>–</span>
      </button>
      <button onClick={() => api.toggleMaximize()} title="Zoom" className="h-[13px] w-[13px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)]">
        <span className={dot}>+</span>
      </button>
    </div>
  )
}
