import Parser from 'rss-parser'
import { createHash } from 'node:crypto'
import type { FeedItem, Tab, Region } from './types'

const parser = new Parser({ timeout: 20000 })

// Google News keyword-search RSS. No API key, keyword-native, stable.
export function feedUrl(keywords: string, region: Region): string {
  const q = encodeURIComponent(keywords.trim())
  return `https://news.google.com/rss/search?q=${q}&hl=${region.hl}&gl=${region.gl}&ceid=${encodeURIComponent(region.ceid)}`
}

function itemId(link: string): string {
  return createHash('sha1').update(link).digest('hex').slice(0, 16)
}

// Google News titles are "Headline - Source". Split off the source for cleaner display.
function splitTitle(raw: string): { title: string; source: string } {
  const i = raw.lastIndexOf(' - ')
  if (i > 0 && i > raw.length - 60) {
    return { title: raw.slice(0, i).trim(), source: raw.slice(i + 3).trim() }
  }
  return { title: raw.trim(), source: '' }
}

export async function fetchTab(tab: Tab, region: Region): Promise<FeedItem[]> {
  const url = feedUrl(tab.keywords, region)
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Digest/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const feed = await parser.parseString(xml)
  const now = new Date().toISOString()

  return (feed.items || [])
    .filter((it) => it.link)
    .map((it) => {
      const { title, source } = splitTitle(it.title || '(untitled)')
      const snippet = (it.contentSnippet || '').replace(/\s+/g, ' ').trim().slice(0, 220)
      return {
        id: itemId(it.link!),
        tabId: tab.id,
        title,
        link: it.link!,
        source: source || (it as any).source || '',
        publishedAt: it.isoDate || (it.pubDate ? new Date(it.pubDate).toISOString() : now),
        snippet,
        read: false,
        fetchedAt: now,
      }
    })
}
