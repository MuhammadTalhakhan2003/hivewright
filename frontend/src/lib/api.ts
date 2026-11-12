import type { Plan, Provider } from './types'

// Backend origin. Empty = same origin (local dev via the Vite proxy).
// In production it points at the hosted runtime, e.g. https://hivewright-api.onrender.com
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

/** Sign-in is on when the Clerk publishable key is configured at build time. */
export const AUTH_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

// Set by <TokenBridge> inside ClerkProvider; plain modules can then attach the session token.
let tokenGetter: (() => Promise<string | null>) | null = null
export function setTokenGetter(fn: (() => Promise<string | null>) | null) { tokenGetter = fn }
export async function authHeaders(): Promise<Record<string, string>> {
  const t = tokenGetter ? await tokenGetter().catch(() => null) : null
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch(API_BASE + path, { headers: { 'Content-Type': 'application/json' }, ...init })
  } catch {
    throw new ApiError(0, 'Cannot reach the Hivewright runtime.')
  }
  if (!r.ok) {
    let msg: string = r.statusText
    try {
      const j = await r.json()
      if (j.detail) msg = typeof j.detail === 'string' ? j.detail : j.detail.map((d: any) => d.msg).join(', ')
    } catch { /* non-JSON error */ }
    throw new ApiError(r.status, msg)
  }
  return r.json() as Promise<T>
}

export const api = {
  providers: () => req<{ default: string; providers: Provider[]; fast_models: string[]; house_runs_per_day: number }>('/api/providers'),
  models: (name: string) => req<{ models: string[]; live: boolean }>(`/api/providers/${name}/models`),
  plans: () => req<{ plans: Plan[] }>('/api/plans'),
  health: () => req<{ ok: boolean; default_provider: string }>('/api/health'),
}
