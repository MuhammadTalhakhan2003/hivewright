import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Crown, Info, Loader2, PartyPopper } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import type { Plan } from '../lib/types'
import { useApp } from './store'
import { Button, Card, Eyebrow, NumberTicker } from '../components/ui'

export default function Billing() {
  const { account, refreshAccount } = useApp()
  const [plans, setPlans] = useState<Plan[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => { api.plans().then((r) => setPlans(r.plans)).catch(() => {}) }, [])

  const choose = async (id: string) => {
    setBusy(id)
    try {
      await api.setPlan(id)
      await refreshAccount()
      if (id === 'pro') { setCelebrate(true); setTimeout(() => setCelebrate(false), 2600) }
    } finally {
      setBusy(null)
    }
  }

  const u = account?.usage
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Eyebrow>Plan & billing</Eyebrow>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">Scale your society</h1>

      {u && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-[12px] text-dim">Current plan</div>
            <div className="mt-1 flex items-center gap-2 font-display text-2xl">
              {account!.plan.id === 'pro' && <Crown size={20} className="text-sun" />}{account!.plan.name}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-[12px] text-dim">Runs today</div>
            <div className="mt-1 font-display text-2xl">{u.runs_today}<span className="text-base text-dim"> / {u.runs_per_day}</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-4">
              <motion.div className="h-full rounded-full bg-sun" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (u.runs_today / u.runs_per_day) * 100)}%` }} />
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-[12px] text-dim">Lifetime</div>
            <div className="mt-1 font-display text-2xl"><NumberTicker value={u.total_tokens} /> <span className="text-base text-dim">tokens</span></div>
            <div className="mt-1 text-[12px] text-dim">{u.total_runs} runs</div>
          </Card>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {plans.map((p) => {
          const current = account?.plan.id === p.id
          const pro = p.id === 'pro'
          return (
            <motion.div key={p.id} layout className={clsx('relative flex flex-col rounded-3xl border p-7',
              pro ? 'border-sun/50 bg-gradient-to-b from-sun/[0.09] to-ink-2' : 'border-line bg-ink-2')}>
              {current && <span className="absolute top-6 right-6 rounded-full bg-ok/15 px-2.5 py-1 font-mono text-[10.5px] text-ok">CURRENT</span>}
              <div className="flex items-center gap-2 font-display text-2xl">{pro && <Crown size={20} className="text-sun" />}{p.name}</div>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-5xl font-medium">${p.price_monthly}</span>
                <span className="mb-1.5 text-sm text-mute">{p.price_monthly ? '/month' : 'forever'}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-[14px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-cloud/85"><Check size={16} className={clsx('mt-0.5 shrink-0', pro ? 'text-sun' : 'text-mute')} />{f}</li>
                ))}
              </ul>
              <Button className="mt-8 w-full" variant={pro && !current ? 'primary' : 'ghost'} disabled={current || busy !== null} onClick={() => choose(p.id)}>
                {busy === p.id && <Loader2 size={15} className="animate-spin" />}
                {current ? 'Your plan' : pro ? 'Upgrade to Pro' : 'Switch to Free'}
              </Button>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-ink-2/60 p-4 text-[13px] text-mute">
        <Info size={16} className="mt-0.5 shrink-0 text-sky" />
        <span>Demo checkout: switching plans here is instant and <b className="text-cloud">no payment is taken</b>. Plan limits are enforced by the runtime, so you can try the full Pro experience. Stripe checkout comes next.</span>
      </div>

      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-sun px-6 py-3 font-medium text-ink shadow-2xl">
            <PartyPopper size={18} />Welcome to Pro. Your society just got bigger.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
