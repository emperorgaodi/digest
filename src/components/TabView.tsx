import { useState } from 'react'
import type { AppData, Tab } from '../../electron/types'
import { api } from '../useDigest'
import { tabItems, timeAgo, intervalLabel } from '../util'
import ArticleCard from './ArticleCard'

export default function TabView({ data, tab }: { data: AppData; tab: Tab }) {
  const items = tabItems(data, tab.id)
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    await api.refreshTab(tab.id)
    setRefreshing(false)
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="metal drag sticky top-3 z-10 mx-3 rounded-[22px] px-8 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="engraved text-[28px] font-bold tracking-tight">{tab.name}</h1>
            <p className="mt-1 text-[13px] text-[#6b7078]" style={{ textShadow: '0 1px 0 rgba(255,255,255,.6)' }}>
              {intervalLabel(tab.intervalMinutes)} · {tab.lastFetched ? `updated ${timeAgo(tab.lastFetched)}` : 'never updated'}
              {tab.error && <span className="text-amber-700"> · error: {tab.error}</span>}
            </p>
          </div>
          <div className="no-drag flex gap-2.5">
            <button onClick={refresh} disabled={refreshing} className="btn-metal px-3 py-2 text-[13px] font-medium disabled:opacity-50">
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={() => api.markAllRead(tab.id)} className="btn-metal px-3 py-2 text-[13px] font-medium">Mark all read</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-3 px-8 py-6">
        {items.length === 0 && (
          <p className="mt-16 text-center text-[14px] embossed">
            {tab.error ? 'Could not load this feed. Try Refresh.' : 'No articles yet — refreshing…'}
          </p>
        )}
        {items.map((it) => <ArticleCard key={it.id} item={it} />)}
      </div>
    </div>
  )
}
