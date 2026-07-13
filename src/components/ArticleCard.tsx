import type { FeedItem } from '../../electron/types'
import { api } from '../useDigest'
import { timeAgo } from '../util'

export default function ArticleCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  function open() {
    api.openArticle(item.link)
    if (!item.read) api.markRead(item.id, true)
  }
  return (
    <div onClick={open} className={`paper scroll-fade group cursor-pointer px-4 ${compact ? 'py-2.5' : 'py-3.5'} transition-transform active:translate-y-px`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-accent'}`}
          style={item.read ? undefined : { boxShadow: 'inset 0 1px 1px rgba(255,255,255,.6), 0 1px 2px rgba(0,0,0,.4)' }} />
        <div className="min-w-0 flex-1">
          <h3 className={`text-[15px] leading-snug ${item.read ? 'font-normal text-[#9a9484]' : 'font-semibold text-[#2e2c26]'}`}>
            {item.title}
          </h3>
          {!compact && item.snippet && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#7c766a]">{item.snippet}</p>}
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[#9a9484]">
            {item.source && <span className="stamp font-semibold uppercase tracking-wide">{item.source}</span>}
            {item.source && <span>·</span>}
            <span>{timeAgo(item.publishedAt)}</span>
            <button onClick={(e) => { e.stopPropagation(); api.markRead(item.id, !item.read) }}
              className="no-drag ml-auto opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent">
              {item.read ? 'Mark unread' : 'Mark read'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
