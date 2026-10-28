import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

// Paired phones. Lives in its own file (never inside AppData) so tokens can
// never be broadcast to a window or a phone by accident. Only SHA-256 hashes
// of the tokens are stored.
export interface Device {
  id: string
  name: string
  tokenHash: string // hex sha256 of the bearer token
  createdAt: string
  lastSeen: string | null
}

export type PublicDevice = Omit<Device, 'tokenHash'>

const CODE_TTL_MS = 5 * 60_000
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
const MAX_FAILED_PAIRS = 10 // per CODE_TTL_MS window, across all callers

let devices: Device[] | null = null
let code: { value: string; expires: number } | null = null
let failures: number[] = []

const filePath = () => path.join(app.getPath('userData'), 'devices.json')
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

async function loadDevices(): Promise<Device[]> {
  if (devices) return devices
  try {
    devices = (JSON.parse(await fs.readFile(filePath(), 'utf-8')) as { devices: Device[] }).devices ?? []
  } catch {
    devices = []
  }
  return devices
}

async function saveDevices(): Promise<void> {
  const target = filePath()
  const tmp = target + '.tmp'
  await fs.writeFile(tmp, JSON.stringify({ devices }, null, 2), 'utf-8')
  await fs.rename(tmp, target)
}

const strip = ({ tokenHash: _h, ...rest }: Device): PublicDevice => rest

// A fresh single-use code replaces any earlier one.
export function newPairingCode(): { code: string; expiresAt: string } {
  const bytes = randomBytes(8)
  const value = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
  code = { value, expires: Date.now() + CODE_TTL_MS }
  return { code: value, expiresAt: new Date(code.expires).toISOString() }
}

// Exchanges a valid code for a device token, or returns null.
export async function pair(submitted: string, name: string): Promise<string | null> {
  const now = Date.now()
  failures = failures.filter((t) => now - t < CODE_TTL_MS)
  if (failures.length >= MAX_FAILED_PAIRS) return null

  const ok = !!code && code.expires > now && submitted.trim().toUpperCase() === code.value
  if (!ok) { failures.push(now); return null }

  code = null // single use
  const token = randomBytes(32).toString('base64url')
  const list = await loadDevices()
  list.push({
    id: randomUUID(), name: name.trim().slice(0, 60) || 'Phone',
    tokenHash: hash(token), createdAt: new Date().toISOString(), lastSeen: null,
  })
  await saveDevices()
  return token
}

// Returns the device for a valid token, else null. Constant-time hash compare.
export async function verify(token: string): Promise<Device | null> {
  if (!token) return null
  const want = Buffer.from(hash(token), 'hex')
  for (const d of await loadDevices()) {
    const have = Buffer.from(d.tokenHash, 'hex')
    if (have.length === want.length && timingSafeEqual(have, want)) return d
  }
  return null
}

export async function touch(id: string): Promise<void> {
  const d = (await loadDevices()).find((x) => x.id === id)
  if (!d) return
  const now = Date.now()
  // Throttle disk writes: lastSeen only needs minute precision.
  if (d.lastSeen && now - new Date(d.lastSeen).getTime() < 60_000) return
  d.lastSeen = new Date(now).toISOString()
  await saveDevices()
}

export async function listDevices(): Promise<PublicDevice[]> {
  return (await loadDevices()).map(strip)
}

export async function revokeDevice(id: string): Promise<void> {
  devices = (await loadDevices()).filter((d) => d.id !== id)
  await saveDevices()
}
