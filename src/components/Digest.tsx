import type { AppData } from '../../electron/types'
import { api } from '../useDigest'
import { tabItems } from '../util'
import ArticleCard from './ArticleCard'

const PER_TOPIC = 6

export default function Digest({ data, onOpenTab }: { data: AppData; onOpenTab: (id: string) => void }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const hasAny = data.items.length > 0

  return (
    <div className="h-full overflow-y-auto fade-scroll-edges">
      <header className="metal drag sticky top-3 z-10 mx-3 rounded-[22px] px-8 pb-4 pt-5">
        <p className="stamp text-[12px] font-bold uppercase tracking-wide">{today}</p>
        <h1 className="engraved text-[28px] font-bold tracking-tight">Front Page</h1>
      </header>

      <div className="mx-auto max-w-3xl px-8 py-6">
        {!hasAny && (
          <div className="mt-20 text-center embossed">
            <p className="text-[17px] font-semibold">Your digest is empty</p>
            <p className="mt-1 text-[14px] opacity-80">Create a topic tab with keywords to start pulling in articles.</p>
          </div>
        )}

        {data.tabs.map((tab) => {
          const items = tabItems(data, tab.id).slice(0, PER_TOPIC)
          if (items.length === 0) return null
          return (
            <section key={tab.id} className="mb-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="embossed text-[19px] font-bold tracking-tight">{tab.name}</h2>
                <button onClick={() => onOpenTab(tab.id)} className="embossed text-[13px] font-semibold hover:brightness-125">View all →</button>
              </div>
              <div className="space-y-3">{items.map((it) => <ArticleCard key={it.id} item={it} />)}</div>
            </section>
          )
        })}

        {hasAny && (
          <div className="pb-10 pt-2 text-center">
            <button onClick={() => api.markAllRead()} className="btn-metal px-4 py-2 text-[13px] font-medium">Mark everything read</button>
          </div>
        )}
      </div>
    </div>
  )
}
