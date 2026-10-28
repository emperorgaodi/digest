import { useState } from 'react'
import { pairWithCode } from '../remote'

// Shown on a phone that has no device token yet. Normally the QR code pairs
// automatically; this is the manual fallback (and the path inside an installed
// iOS home-screen app, which does not share storage with Safari).
export default function Pair() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true); setError('')
    if (await pairWithCode(code.trim())) location.reload()
    else { setError('That code did not work. Make a new one on your computer.'); setBusy(false) }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="paper card-enter w-full max-w-sm p-6">
        <h1 className="mb-1 text-[22px] font-bold tracking-tight text-[#2e2c26]">Connect to Digest</h1>
        <p className="mb-4 text-[14px] text-[#5b5548]">
          On your computer open Digest, choose Phone link, and scan the QR code. Or type the code shown there.
        </p>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && code && submit()}
          placeholder="Pairing code" autoCapitalize="characters" autoComplete="off" spellCheck={false}
          className="mb-3 w-full rounded-lg bg-black/[0.06] px-3 py-3 text-center text-[20px] font-semibold tracking-[0.25em] text-[#2e2c26] outline-none placeholder:text-[14px] placeholder:font-medium placeholder:tracking-normal placeholder:text-[#7c766a]" />
        {error && <p className="mb-3 text-[13px] font-medium text-red-700">{error}</p>}
        <button onClick={submit} disabled={!code || busy} className="gloss w-full py-2.5 text-[15px] font-semibold disabled:opacity-40">
          {busy ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
