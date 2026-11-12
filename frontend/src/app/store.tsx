import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { getOwnKey, loadAccount, setOwnKey as saveOwnKey, setPlan as savePlan } from '../lib/account'
import { listRuns, useRunsVersion } from '../lib/runs'
import type { Account, Plan, Provider, RunSummary } from '../lib/types'

type Conn = 'connecting' | 'waking' | 'online' | 'offline'

interface Ctx {
  account: Account | null
  plans: Plan[]
  providers: Provider[]
  defaultProvider: string
  fastModels: string[]
  runs: RunSummary[]
  conn: Conn
  ownKey: string
  houseRunsLeft: number
  houseRunsPerDay: number
  refreshAccount: () => void
  setPlan: (id: 'free' | 'pro') => void
  setOwnKey: (k: string) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  // Empty until /api/providers answers, so the composer doesn't lock onto a placeholder.
  const [defaultProvider, setDefault] = useState('')
  const [fastModels, setFast] = useState<string[]>([])
  const [houseRunsPerDay, setHousePerDay] = useState(5)
  const [conn, setConn] = useState<Conn>('connecting')
  const [acct, setAcct] = useState(loadAccount)
  const [ownKey, setOwnKeyState] = useState(getOwnKey)
  const runsVersion = useRunsVersion()

  // Free hosting sleeps when idle: keep retrying for ~90s while it wakes up.
  useEffect(() => {
    let alive = true
    const started = Date.now()
    const connect = async () => {
      while (alive) {
        try {
          const [p, pl] = await Promise.all([api.providers(), api.plans()])
          if (!alive) return
          setProviders(p.providers); setDefault(p.default); setFast(p.fast_models)
          setHousePerDay(p.house_runs_per_day ?? 5); setPlans(pl.plans); setConn('online')
          return
        } catch {
          if (!alive) return
          const waited = Date.now() - started
          setConn(waited > 90_000 ? 'offline' : waited > 2_500 ? 'waking' : 'connecting')
          await new Promise((r) => setTimeout(r, waited > 90_000 ? 15_000 : 3_000))
        }
      }
    }
    connect()
    return () => { alive = false }
  }, [])

  const refreshAccount = useCallback(() => setAcct(loadAccount()), [])
  // Usage changes whenever a run starts or finishes.
  useEffect(() => { refreshAccount() }, [runsVersion, refreshAccount])

  const runs = useMemo(() => listRuns(), [runsVersion])

  const account: Account | null = useMemo(() => {
    const plan = plans.find((p) => p.id === acct.plan_id) ?? plans[0]
    if (!plan) return null
    return {
      plan,
      usage: { runs_today: acct.runs_today, runs_per_day: plan.runs_per_day, total_runs: acct.total_runs, total_tokens: acct.total_tokens },
    }
  }, [plans, acct])

  const setPlan = useCallback((id: 'free' | 'pro') => { savePlan(id); setAcct(loadAccount()) }, [])
  const setOwnKey = useCallback((k: string) => { saveOwnKey(k.trim()); setOwnKeyState(k.trim()) }, [])

  return (
    <AppCtx.Provider value={{
      account, plans, providers, defaultProvider, fastModels, runs, conn, ownKey,
      houseRunsLeft: Math.max(0, houseRunsPerDay - acct.house_runs_today), houseRunsPerDay,
      refreshAccount, setPlan, setOwnKey,
    }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}
