import type { Plan, Provider } from './types'

// Backend origin. Empty = same origin (local dev via the Vite proxy).
// In production it points at the hosted runtime, e.g. https://hivewright-api.onrender.com
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

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
