import { motion } from 'motion/react'
import { CheckCircle2, CircleDashed, KeyRound } from 'lucide-react'
import { useApp } from './store'
import { Badge, Eyebrow, SpotlightCard } from '../components/ui'

export default function Providers() {
  const { providers, defaultProvider } = useApp()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Eyebrow>Provider manager</Eyebrow>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">Bring any model</h1>
      <p className="mt-3 max-w-2xl text-mute">
        Orchestration is separate from inference. Add keys in <code className="rounded bg-ink-3 px-1.5 py-0.5 font-mono text-[13px] text-cloud">backend/.env</code> and
        restart the runtime. Each run can use a different provider.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {providers.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <SpotlightCard className="h-full p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-display text-xl">
                    {p.label}
                    {p.name === defaultProvider && <Badge color="#FFC928">default</Badge>}
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-dim">{p.base_url || 'in-process simulation'}</div>
                </div>
                {p.configured
                  ? <span className="flex items-center gap-1.5 text-[12.5px] text-ok"><CheckCircle2 size={15} />Ready</span>
                  : <span className="flex items-center gap-1.5 text-[12.5px] text-mute"><CircleDashed size={15} />Not configured</span>}
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.models.map((m) => <span key={m} className="rounded-full bg-ink-3 px-2.5 py-1 font-mono text-[11px] text-cloud/75">{m}</span>)}
              </div>
              {p.key_env && !p.configured && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2 font-mono text-[12px] text-mute">
                  <KeyRound size={13} className="text-sun" />{p.key_env}=…
                </div>
              )}
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
