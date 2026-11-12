import type { Account, Plan, Provider, RunSummary } from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
  } catch {
    throw new ApiError(0, 'Cannot reach the Hivewright runtime. Is the backend running on port 8000?')
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
  providers: () => req<{ default: string; providers: Provider[]; fast_models: string[] }>('/api/providers'),
  models: (name: string) => req<{ models: string[]; live: boolean }>(`/api/providers/${name}/models`),
  account: () => req<Account>('/api/account'),
  plans: () => req<{ plans: Plan[] }>('/api/plans'),
  setPlan: (plan_id: string) =>
    req<Account>('/api/account/plan', { method: 'POST', body: JSON.stringify({ plan_id }) }),
  runs: () => req<{ runs: RunSummary[] }>('/api/runs'),
  createRun: (task: string, provider?: string, model?: string) =>
    req<RunSummary>('/api/runs', { method: 'POST', body: JSON.stringify({ task, provider, model }) }),
  deleteRun: (id: string) => req<{ ok: boolean }>(`/api/runs/${id}`, { method: 'DELETE' }),
}
