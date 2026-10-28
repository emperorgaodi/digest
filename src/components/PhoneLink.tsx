import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import type { AppData } from '../../electron/types'
import { api } from '../useDigest'

type Status = Awaited<ReturnType<typeof api.phoneStatus>>
type Device = Awaited<ReturnType<typeof api.phoneDevices>>[number]

// Desktop-only dialog: turn the phone server on, show the pairing QR, manage devices.
export default function PhoneLink({ data, onClose }: { data: AppData; onClose: () => void }) {
  const enabled = data.settings.phoneLink
  const [status, setStatus] = useState<Status>({ running: false, port: 0, urls: [] })
  const [devices, setDevices] = useState<Device[]>([])
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')

  // The server starts a moment after the setting flips, so poll while open.
  useEffect(() => {
    let live = true
    const tick = async () => {
      const [s, d] = await Promise.all([api.phoneStatus(), api.phoneDevices()])
      if (live) { setStatus(s); setDevices(d) }
    }
    void tick()
    const id = setInterval(tick, 1500)
    return () => { live = false; clearInterval(id) }
  }, [enabled])

  const url = status.urls[0] ?? ''

  async function newCode() { setCode((await api.phoneNewCode()).code) }
  useEffect(() => { if (status.running && !code) void newCode() }, [status.running, code])

  useEffect(() => {
    if (!url || !code) { setQr(''); return }
    QRCode.toDataURL(`${url}/?pair=${code}`, { margin: 1, width: 220 }).then(setQr)
  }, [url, code])

  // Portal: the sidebar's backdrop-filter would otherwise trap this fixed overlay inside the sidebar.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onClick={onClose}>
      <div className="paper card-enter no-drag w-[400px] max-w-full p-5" onClick={(e) => e.stopPropagation()}
        style={{ background: 'linear-gradient(135deg, rgba(251,250,245,0.98), rgba(241,239,231,0.97))' }}>
        <div className="mb-3 flex items-center">
          <h2 className="text-[20px] font-bold tracking-tight text-[#2e2c26]">Phone link</h2>
          <button onClick={onClose} className="ml-auto text-[#5b5548] hover:text-[#2e2c26]" title="Close">x</button>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-[#5b5548]">
          Use Digest on your phone over your home Wi-Fi. Your data stays on this computer and the phone only
          connects while this app is running.
        </p>

        <button onClick={() => api.updateSettings({ phoneLink: !enabled })}
          className={`${enabled ? 'btn-metal' : 'gloss'} mb-4 w-full py-2 text-[14px] font-semibold`}>
          {enabled ? 'Turn off phone link' : 'Turn on phone link'}
        </button>

        {enabled && !status.running && <p className="text-[13px] text-[#5b5548]">Starting...</p>}

        {status.running && (
          <>
            <div className="mb-3 flex flex-col items-center">
              {qr ? <img src={qr} alt="Pairing QR code" className="h-[220px] w-[220px] rounded-xl bg-white p-1" /> : <div className="h-[220px]" />}
              <p className="mt-2 text-[12px] text-[#5b5548]">Scan with your phone camera, same Wi-Fi.</p>
              <p className="mt-1 break-all text-center text-[12px] text-[#5b5548]">{url}</p>
              <p className="mt-2 text-[12px] text-[#5b5548]">Or enter this code on the phone:</p>
              <p className="text-[22px] font-bold tracking-[0.25em] text-[#2e2c26]">{code}</p>
              <button onClick={newCode} className="mt-1 text-[12px] font-semibold text-[#5b5548] underline">New code</button>
              <p className="mt-0.5 text-[11px] text-[#5b5548]">Codes work once and expire after 5 minutes.</p>
            </div>

            <h3 className="engraved mb-2 text-[12px] font-bold uppercase tracking-wider">Paired phones</h3>
            {devices.length === 0 && <p className="text-[13px] text-[#5b5548]">None yet.</p>}
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl bg-black/[0.06] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-[#2e2c26]">{d.name}</div>
                    <div className="text-[11px] text-[#5b5548]">
                      {d.lastSeen ? `Last seen ${new Date(d.lastSeen).toLocaleString()}` : 'Not seen yet'}
                    </div>
                  </div>
                  <button onClick={() => api.phoneRevoke(d.id)} className="btn-metal px-3 py-1 text-[12px] font-semibold">Revoke</button>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-[#5b5548]">
              Windows may ask to allow Digest through the firewall the first time. Choose Private networks.
              Traffic on your Wi-Fi is not encrypted unless you set up HTTPS (docs/phone-https.md).
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
