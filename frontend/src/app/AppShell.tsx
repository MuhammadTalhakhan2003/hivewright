import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CreditCard, Crown, Home, Menu, Plus, Server, X } from 'lucide-react'
import clsx from 'clsx'
import { AppProvider, useApp } from './store'
import { AuthGate, UserBadge } from '../lib/auth'
import Composer from './Composer'
import RunView from './RunView'
import Billing from './Billing'
import Providers from './Providers'
import { Button, Logo, PulseDot } from '../components/ui'
import { BRAND, STATUS_COLOR } from '../lib/brand'
import { go } from '../lib/router'

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - ts))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function Sidebar({ route, onNavigate }: { route: string; onNavigate: () => void }) {
  const { runs, account } = useApp()
  const nav = (p: string) => { go(p); onNavigate() }
  const usage = account?.usage
  const pct = usage ? Math.min(100, (usage.runs_today / usage.runs_per_day) * 100) : 0
  const isPro = account?.plan.id === 'pro'
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav('/')} className="flex items-center gap-2.5">
          <Logo size={28} /><span className="font-display text-[17px] font-semibold">{BRAND.name}</span>
        </button>
        {isPro && <span className="flex items-center gap-1 rounded-full bg-sun/15 px-2 py-0.5 font-mono text-[10px] text-sun"><Crown size={10} />PRO</span>}
      </div>
      <div className="px-3">
        <Button className="w-full" onClick={() => nav('/app/new')}><Plus size={16} />New society run</Button>
      </div>
      <nav className="mt-4 space-y-0.5 px-3">
        {[
          ['/', 'Home', Home], ['/app/billing', 'Plan & billing', CreditCard], ['/app/providers', 'Providers', Server],
        ].map(([p, label, Icon]: any) => (
          <button key={p} onClick={() => nav(p)}
            className={clsx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition-colors',
              route === p ? 'bg-ink-3 text-cloud' : 'text-mute hover:bg-ink-3/60 hover:text-cloud')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>
      <div className="mt-6 px-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">Runs</div>
      <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {runs.length === 0 && <p className="px-3 py-2 text-[13px] text-dim">No runs yet. Start one above.</p>}
        <AnimatePresence initial={false}>
          {runs.map((r) => {
            const active = route === `/app/run/${r.id}`
            const live = r.status !== 'completed' && r.status !== 'failed'
            return (
              <motion.button key={r.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                onClick={() => nav(`/app/run/${r.id}`)}
                className={clsx('relative flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                  active ? 'bg-ink-3' : 'hover:bg-ink-3/60')}>
                {active && <motion.span layoutId="run-active" className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-sun" />}
                <span className="mt-1.5"><PulseDot color={STATUS_COLOR[r.status]} active={live} /></span>
                <span className="min-w-0 flex-1">
                  <span className={clsx('line-clamp-2 text-[13px] leading-snug', active ? 'text-cloud' : 'text-cloud/80')}>{r.task}</span>
                  <span className="mt-0.5 block font-mono text-[10.5px] text-dim">{r.status} · {r.agent_count} agents · {timeAgo(r.created_at)}</span>
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
      {usage && (
        <div className="m-3 rounded-2xl border border-line bg-ink-2 p-3.5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-mute">{account!.plan.name} plan</span>
            <span className="font-mono text-cloud">{usage.runs_today}/{usage.runs_per_day}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-4">
            <motion.div className={clsx('h-full rounded-full', pct > 80 ? 'bg-err' : 'bg-sun')} initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-dim">runs used today</div>
          {!isPro && (
            <button onClick={() => nav('/app/billing')} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sun/10 py-2 text-[12.5px] font-medium text-sun transition-colors hover:bg-sun/20">
              <Crown size={13} />Upgrade to Pro
            </button>
          )}
        </div>
      )}
      <UserBadge />
      <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer"
        className="mx-3 mb-3 -mt-1 block rounded-xl px-2 py-1.5 text-center text-[11.5px] text-dim transition-colors hover:text-cloud">
        Built by <span className="text-mute underline decoration-sun/50 underline-offset-2">{BRAND.author}</span> 🐝
      </a>
    </div>
  )
}

function Shell({ route }: { route: string }) {
  const [open, setOpen] = useState(false)
  const { conn } = useApp()
  useEffect(() => setOpen(false), [route])
  const runId = route.startsWith('/app/run/') ? route.slice('/app/run/'.length) : null

  let page
  if (runId) page = <RunView id={runId} />
  else if (route === '/app/billing') page = <Billing />
  else if (route === '/app/providers') page = <Providers />
  else page = <Composer />

  return (
    <div className="flex h-dvh overflow-hidden bg-ink">
      <aside className="hidden w-[272px] shrink-0 border-r border-line bg-[#19191c] lg:block">
        <Sidebar route={route} onNavigate={() => {}} />
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-line bg-[#19191c] lg:hidden"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              <button className="absolute top-4 right-3 p-1.5 text-mute" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
              <Sidebar route={route} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="p-1.5 text-mute" aria-label="Open menu"><Menu size={20} /></button>
          <Logo size={24} /><span className="font-display font-semibold">{BRAND.name}</span>
        </div>
        {conn === 'waking' && (
          <div className="flex items-center justify-center gap-2 border-b border-sun/30 bg-sun/10 px-4 py-2 text-center text-[13px] text-cloud">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sun" />
            Waking up the hive… the free server naps when nobody's around. This takes up to a minute. 🐝
          </div>
        )}
        {conn === 'offline' && (
          <div className="border-b border-err/30 bg-err/10 px-4 py-2 text-center text-[13px] text-err">
            Can't reach the Hivewright runtime right now. Simulation and saved runs still work once it's back. Retrying…
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Plain CSS enter animation: remounts per page and can never get stuck invisible. */}
          <div key={runId ?? route} className="min-h-full animate-page-in">
            {page}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AppShell({ route }: { route: string }) {
  return <AuthGate><AppProvider><Shell route={route} /></AppProvider></AuthGate>
}
