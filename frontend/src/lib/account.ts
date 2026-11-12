// Per-browser account: plan, daily usage and the visitor's own provider key.
// The runtime is stateless, so this lives in localStorage (best effort).

const KEY = 'hivewright.account.v1'
const OWN_KEY = 'hivewright.groqKey'

export interface LocalAccount {
  plan_id: 'free' | 'pro'
  day: string
  runs_today: number
  house_runs_today: number
  total_runs: number
  total_tokens: number
}

const today = () => new Date().toISOString().slice(0, 10)

export function loadAccount(): LocalAccount {
  let a: LocalAccount = { plan_id: 'free', day: today(), runs_today: 0, house_runs_today: 0, total_runs: 0, total_tokens: 0 }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) a = { ...a, ...JSON.parse(raw) }
  } catch { /* storage unavailable */ }
  if (a.day !== today()) a = { ...a, day: today(), runs_today: 0, house_runs_today: 0 }
  return a
}

function save(a: LocalAccount) {
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* storage unavailable */ }
}

export function setPlan(plan_id: 'free' | 'pro') {
  save({ ...loadAccount(), plan_id })
}

export function recordRun(onHouseKey: boolean) {
  const a = loadAccount()
  save({ ...a, runs_today: a.runs_today + 1, total_runs: a.total_runs + 1,
    house_runs_today: a.house_runs_today + (onHouseKey ? 1 : 0) })
}

export function addTokens(n: number) {
  const a = loadAccount()
  save({ ...a, total_tokens: a.total_tokens + n })
}

export function getOwnKey(): string {
  try { return localStorage.getItem(OWN_KEY) || '' } catch { return '' }
}

export function setOwnKey(k: string) {
  try {
    if (k) localStorage.setItem(OWN_KEY, k)
    else localStorage.removeItem(OWN_KEY)
  } catch { /* storage unavailable */ }
}
