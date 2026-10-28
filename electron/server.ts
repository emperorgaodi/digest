import http from 'node:http'
import https from 'node:https'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pair, verify, touch } from './devices'
import type { Handlers } from './handlers'
import type { AppData } from './types'

// Opt-in LAN server for the phone client. Static UI files are public; every
// data route needs a device token obtained by pairing (see devices.ts).
const DEFAULT_PORT = 47821
const MAX_BODY = 1_000_000

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
}

let server: http.Server | https.Server | null = null
let port = 0
let handlers: Handlers = {}
let staticDir = ''
let latest: AppData | null = null
const clients = new Map<ServerResponse, string>() // event stream -> device id

export interface ServerStatus { running: boolean; port: number; urls: string[] }

// Optional HTTPS (needed for installing the phone app as a PWA). `host` is the
// name the certificate was issued for, e.g. my-pc.tailnet.ts.net.
export interface Tls { cert: string; key: string; host: string }
let tlsHost = ''

export function status(): ServerStatus {
  if (!server) return { running: false, port: 0, urls: [] }
  if (tlsHost) return { running: true, port, urls: [`https://${tlsHost}:${port}`] }
  const ips = Object.values(os.networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)
  return { running: true, port, urls: ips.map((ip) => `http://${ip}:${port}`) }
}

function send(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

async function authed(req: IncomingMessage) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
  const device = m ? await verify(m[1]) : null
  if (device) void touch(device.id)
  return device
}

// A phone must not be able to switch the phone link off or on for the desktop.
function sanitize(channel: string, args: unknown[]): unknown[] {
  if (channel === 'settings:update' && args[0] && typeof args[0] === 'object') {
    const { phoneLink: _ignored, ...rest } = args[0] as Record<string, unknown>
    return [rest]
  }
  return args
}

async function serveStatic(urlPath: string, res: ServerResponse) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '')
  const full = path.resolve(staticDir, rel)
  if (!full.startsWith(staticDir + path.sep)) { res.writeHead(403); res.end(); return }
  try {
    const buf = await fs.readFile(full)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] ?? 'application/octet-stream' })
    res.end(buf)
  } catch {
    res.writeHead(404); res.end()
  }
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://x')
  const json = (req.headers['content-type'] ?? '').startsWith('application/json')

  if (url.pathname === '/api/ping' && req.method === 'GET') return send(res, 200, { app: 'digest' })

  // application/json forces a CORS preflight from web pages, so other sites cannot guess codes.
  if (url.pathname === '/api/pair' && req.method === 'POST') {
    if (!json) return send(res, 415, { error: 'json required' })
    const body = (await readJson(req)) as { code?: string; name?: string }
    const token = await pair(String(body.code ?? ''), String(body.name ?? ''))
    return token ? send(res, 200, { token }) : send(res, 401, { error: 'invalid or expired code' })
  }

  if (url.pathname === '/api/rpc' && req.method === 'POST') {
    if (!(await authed(req))) return send(res, 401, { error: 'unauthorized' })
    if (!json) return send(res, 415, { error: 'json required' })
    const { channel, args } = (await readJson(req)) as { channel?: string; args?: unknown[] }
    const fn = typeof channel === 'string' && Object.hasOwn(handlers, channel) ? handlers[channel] : null
    if (!fn) return send(res, 404, { error: 'unknown channel' })
    const result = await fn(...sanitize(channel!, Array.isArray(args) ? args : []))
    return send(res, 200, { result: result ?? null })
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    const device = await authed(req)
    if (!device) return send(res, 401, { error: 'unauthorized' })
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
    if (latest) res.write(`data: ${JSON.stringify(latest)}\n\n`)
    clients.set(res, device.id)
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    req.on('close', () => { clearInterval(ping); clients.delete(res) })
    return
  }

  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' })
  if (req.method === 'GET') return serveStatic(url.pathname, res)
  res.writeHead(405); res.end()
}

function listen(srv: http.Server | https.Server, p: number, tries = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    srv.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && tries > 1) listen(srv, p + 1, tries - 1).then(resolve, reject)
      else reject(err)
    })
    srv.listen(p, '0.0.0.0', () => resolve(p))
  })
}

export async function start(h: Handlers, dir: string, tls?: Tls): Promise<void> {
  if (server) return
  handlers = h
  staticDir = path.resolve(dir)
  const onRequest = (req: IncomingMessage, res: ServerResponse) => {
    route(req, res).catch(() => { if (!res.headersSent) send(res, 500, { error: 'server error' }); else res.end() })
  }
  const srv = tls ? https.createServer({ cert: tls.cert, key: tls.key }, onRequest) : http.createServer(onRequest)
  port = await listen(srv, DEFAULT_PORT)
  tlsHost = tls?.host ?? ''
  server = srv
}

export async function stop(): Promise<void> {
  if (!server) return
  for (const c of clients.keys()) c.end()
  clients.clear()
  const s = server
  server = null
  s.closeAllConnections()
  await new Promise<void>((r) => s.close(() => r()))
}

// Called on every state change; pushes to connected phones.
export function pushState(data: AppData): void {
  latest = data
  const msg = `data: ${JSON.stringify(data)}\n\n`
  for (const c of clients.keys()) c.write(msg)
}

// Cut live streams of a revoked device so it stops receiving data at once.
export function kick(deviceId: string): void {
  for (const [res, id] of clients) if (id === deviceId) { res.end(); clients.delete(res) }
}
