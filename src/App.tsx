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
import Pair from './components/Pair'
import MobileNav from './components/MobileNav'
import { hasToken } from './remote'
import { askNotifications, canAskNotifications, fireDueReminders } from './notify'

export type View = 'digest' | 'notes' | 'reminders' | 'clock' | 'home' | string

const phone = api.platform === 'phone'

export default function App() {
  const data = useDigest()
  const [view, setView] = useState<View>(phone ? 'home' : 'digest')
  const [canAsk, setCanAsk] = useState(phone && canAskNotifications())

  const accent = data?.settings.accent ?? '#0A84FF'
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-rgb', hexToRgbChannels(accent))
  }, [accent])

  // Phone only: the desktop's main process handles reminders there.
  useEffect(() => {
    if (!phone || !data) return
    const check = () => fireDueReminders(data.reminders)
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [data])

  if (api.mode === 'widget') return <Widget data={data} />
  if (phone && !hasToken()) return <Pair />
  if (!data) return <div className="linen flex h-full items-center justify-center embossed">Loading…</div>

  const tab = data.tabs.find((t) => t.id === view)

  if (phone) {
    return (
      <div className="flex h-full linen flex-col gap-3 p-3">
        <main className="relative min-h-0 flex-1">
          {view === 'home' && <Widget data={data} />}
          {view === 'digest' && <Digest data={data} onOpenTab={setView} />}
          {view === 'notes' && <Notes data={data} />}
          {view === 'reminders' && <Reminders data={data} />}
          {view === 'clock' && <Clock data={data} />}
          {tab && <TabView data={data} tab={tab} />}
        </main>
        {canAsk && (
          <button onClick={async () => { await askNotifications(); setCanAsk(canAskNotifications()) }}
            className="btn-metal shrink-0 py-2 text-[13px] font-semibold">Enable reminder notifications</button>
        )}
        <MobileNav view={tab ? 'digest' : view} onSelect={setView} />
      </div>
    )
  }

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
