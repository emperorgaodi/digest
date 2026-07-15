import { useEffect, useState } from 'react'
import { useDigest, api } from './useDigest'
import { hexToRgbChannels } from './themes'
import Sidebar from './components/Sidebar'
import Digest from './components/Digest'
import TabView from './components/TabView'
import Notes from './components/Notes'
import Reminders from './components/Reminders'
import Clock from './components/Clock'
import Widget from './components/Widget'

export type View = 'digest' | 'notes' | 'reminders' | 'clock' | string

export default function App() {
  const data = useDigest()
  const [view, setView] = useState<View>('digest')

  const accent = data?.settings.accent ?? '#0A84FF'
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-rgb', hexToRgbChannels(accent))
  }, [accent])

  if (api.mode === 'widget') return <Widget data={data} />
  if (!data) return <div className="linen flex h-full items-center justify-center embossed">Loading…</div>

  const tab = data.tabs.find((t) => t.id === view)

  return (
    <div className="flex h-full linen gap-6 p-6">
      <Sidebar data={data} view={view} onSelect={setView} />
      <main className="relative flex-1">
        {view === 'digest' && <Digest data={data} onOpenTab={setView} />}
        {view === 'notes' && <Notes data={data} />}
        {view === 'reminders' && <Reminders data={data} />}
        {view === 'clock' && <Clock data={data} />}
        {tab && <TabView data={data} tab={tab} />}
      </main>
    </div>
  )
}
