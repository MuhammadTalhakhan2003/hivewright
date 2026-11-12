import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { Account, Provider, RunSummary } from '../lib/types'

interface Ctx {
  account: Account | null
  providers: Provider[]
  defaultProvider: string
  fastModels: string[]
  runs: RunSummary[]
  offline: boolean
  refreshAccount: () => Promise<void>
  refreshRuns: () => Promise<void>
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  // Empty until /api/providers answers, so the composer doesn't lock onto a placeholder.
  const [defaultProvider, setDefault] = useState('')
  const [fastModels, setFast] = useState<string[]>([])
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [offline, setOffline] = useState(false)

  const refreshAccount = useCallback(async () => {
    try { setAccount(await api.account()); setOffline(false) } catch { setOffline(true) }
  }, [])
  const refreshRuns = useCallback(async () => {
    try { setRuns((await api.runs()).runs); setOffline(false) } catch { setOffline(true) }
  }, [])

  useEffect(() => {
    refreshAccount()
    refreshRuns()
    api.providers().then((p) => { setProviders(p.providers); setDefault(p.default); setFast(p.fast_models) }).catch(() => setOffline(true))
  }, [refreshAccount, refreshRuns])

  // Poll while something is running so the sidebar statuses stay fresh.
  const anyActive = runs.some((r) => r.status !== 'completed' && r.status !== 'failed')
  useEffect(() => {
    const t = setInterval(() => { refreshRuns(); if (anyActive) refreshAccount() }, anyActive ? 2500 : 10000)
    return () => clearInterval(t)
  }, [anyActive, refreshRuns, refreshAccount])

  return (
    <AppCtx.Provider value={{ account, providers, defaultProvider, fastModels, runs, offline, refreshAccount, refreshRuns }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}
