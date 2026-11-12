// Client-side run store. A run executes inside one streaming POST to the
// runtime; events are kept in memory while live and saved to localStorage.
import { useMemo, useSyncExternalStore } from 'react'
import { API_BASE, ApiError } from './api'
import { addTokens, getOwnKey, recordRun } from './account'
import { applyEvent, emptyRun, type RunState } from './run'
import type { HivewrightEvent, RunSummary } from './types'

const KEY = 'hivewright.runs.v1'
const MAX_SAVED = 25
const TERMINAL = new Set(['run_completed', 'run_failed'])

interface Saved { id: string; events: HivewrightEvent[] }

const live = new Map<string, HivewrightEvent[]>()
const listeners = new Set<() => void>()
let version = 0
let cache: Saved[] | null = null

function notify() {
  version++
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const getVersion = () => version

function loadSaved(): Saved[] {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) || '[]') } catch { cache = [] }
  return cache!
}

function persist(id: string, events: HivewrightEvent[]) {
  const list = [{ id, events: [...events] }, ...loadSaved().filter((r) => r.id !== id)].slice(0, MAX_SAVED)
  cache = list
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {
    // Quota exceeded: keep fewer runs.
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8))) } catch { /* give up quietly */ }
  }
}

export function getEvents(id: string): HivewrightEvent[] | null {
  return live.get(id) ?? loadSaved().find((r) => r.id === id)?.events ?? null
}

function summarize(events: HivewrightEvent[]): RunSummary | null {
  const s = events.reduce(applyEvent, emptyRun())
  if (!s.summary) return null
  const end = events[events.length - 1]
  return {
    ...s.summary,
    status: s.status,
    agent_count: s.order.length,
    tokens: s.tokens,
    finished_at: TERMINAL.has(end?.type) ? end.ts : null,
  }
}

export function listRuns(): RunSummary[] {
  const ids = new Set<string>()
  const out: RunSummary[] = []
  for (const [id, evs] of live) { ids.add(id); const s = summarize(evs); if (s) out.push(s) }
  for (const r of loadSaved()) if (!ids.has(r.id)) { const s = summarize(r.events); if (s) out.push(s) }
  return out.sort((a, b) => b.created_at - a.created_at)
}

export function deleteRun(id: string) {
  if (live.has(id)) return
  cache = loadSaved().filter((r) => r.id !== id)
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* ignore */ }
  notify()
}

async function errorFrom(res: Response): Promise<ApiError> {
  let msg = res.statusText || 'Request failed'
  try {
    const j = await res.json()
    if (j.detail) msg = typeof j.detail === 'string' ? j.detail : j.detail.map((d: any) => d.msg).join(', ')
  } catch { /* not JSON */ }
  return new ApiError(res.status, msg)
}

/** Starts a run; resolves with its id as soon as the runtime acknowledges it. */
export function startRun(req: { task: string; provider?: string; model?: string; plan_id: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const ownKey = getOwnKey()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (ownKey && req.provider === 'groq') headers['X-Provider-Key'] = ownKey
      let res: Response
      try {
        res = await fetch(`${API_BASE}/api/society`, { method: 'POST', headers, body: JSON.stringify(req) })
      } catch {
        reject(new ApiError(0, 'Cannot reach the Hivewright runtime.'))
        return
      }
      if (!res.ok || !res.body) { reject(await errorFrom(res)); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let id: string | null = null
      let n = 0
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
          let cut: number
          while ((cut = buf.indexOf('\n\n')) >= 0) {
            const frame = buf.slice(0, cut)
            buf = buf.slice(cut + 2)
            const data = frame.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n')
            if (!data) continue
            const ev = JSON.parse(data) as HivewrightEvent
            if (!id) {
              id = (ev.run?.id as string) ?? `run_local_${Date.now()}`
              live.set(id, [])
              recordRun(req.provider !== 'mock' && req.provider !== 'ollama' && !(ownKey && req.provider === 'groq'))
              resolve(id)
            }
            live.get(id)!.push(ev)
            if (TERMINAL.has(ev.type) || ++n % 12 === 0) persist(id, live.get(id)!)
            notify()
          }
        }
      } catch { /* connection dropped; handled below */ }

      if (!id) { reject(new ApiError(0, 'The runtime closed the connection before the run started.')); return }
      const events = live.get(id)!
      const last = events[events.length - 1]
      if (!TERMINAL.has(last?.type)) {
        events.push({ seq: (last?.seq ?? 0) + 1, ts: Date.now() / 1000, type: 'run_failed',
          error: 'The connection to the runtime was lost before the run finished (it may have hit the time limit).' })
      }
      const tokens = events.reduce(applyEvent, emptyRun()).tokens
      if (tokens) addTokens(tokens)
      persist(id, events)
      live.delete(id)
      notify()
    })()
  })
}

/** Live state of one run, rebuilt from its event log. */
export function useRun(id: string | null): RunState & { missing: boolean } {
  const v = useSyncExternalStore(subscribe, getVersion)
  return useMemo(() => {
    const events = id ? getEvents(id) : null
    const state = (events ?? []).reduce(applyEvent, emptyRun())
    return { ...state, missing: events === null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, v])
}

/** Re-render on any run change (sidebar list). */
export function useRunsVersion(): number {
  return useSyncExternalStore(subscribe, getVersion)
}
