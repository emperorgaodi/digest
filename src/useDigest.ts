import { useEffect, useState } from 'react'
import type { AppData } from '../electron/types'
import type { DigestApi } from '../electron/preload'

declare global {
  interface Window { digest: DigestApi }
}

export const api = window.digest

// Single source of truth in the renderer: the main process pushes full state on every change.
export function useDigest(): AppData | null {
  const [data, setData] = useState<AppData | null>(null)
  useEffect(() => {
    api.getState().then(setData)
    return api.onUpdate(setData)
  }, [])
  return data
}
