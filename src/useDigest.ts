import { useEffect, useState } from 'react'
import type { AppData } from '../electron/types'
import type { DigestApi } from '../electron/preload'
import { createRemoteApi } from './remote'

declare global {
  interface Window { digest: DigestApi }
}

// In Electron the preload script provides window.digest; in a phone browser we
// talk to the desktop's LAN server instead (see remote.ts).
export const api = window.digest ?? createRemoteApi()

// Single source of truth in the renderer: the main process pushes full state on every change.
export function useDigest(): AppData | null {
  const [data, setData] = useState<AppData | null>(null)
  useEffect(() => {
    api.getState().then(setData).catch(() => { /* phone not paired yet, or PC off with no cache */ })
    return api.onUpdate(setData)
  }, [])
  return data
}
