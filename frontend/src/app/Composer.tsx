import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Crown, Loader2, Lock, Sparkles, TriangleAlert } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from './store'
import { api, ApiError } from '../lib/api'
import { go, takePrefill } from '../lib/router'
import { Button, Eyebrow } from '../components/ui'

const EXAMPLES = [
  'Design the backend for a food-delivery app: services, database schema, APIs and scaling plan.',
  'Research the AI note-taking market and write a positioning strategy for a new entrant.',
  'Plan a 30-day launch for a developer tool, with channels, content calendar and KPIs.',
  'Review the security risks of storing user API keys in a SaaS and propose a safe design.',
]

export default function Composer() {
  const { providers, defaultProvider, fastModels, account, refreshRuns, refreshAccount } = useApp()
  const [task, setTask] = useState('')
  const [provider, setProvider] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [models, setModels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ msg: string; upgrade: boolean } | null>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  const isFree = account?.plan.models === 'fast'

  useEffect(() => {
    const p = takePrefill()
    if (p) setTask(p)
    ta.current?.focus()
  }, [])
  useEffect(() => { if (!provider && defaultProvider) setProvider(defaultProvider) }, [defaultProvider, provider])

  useEffect(() => {
    if (!provider) return
    const spec = providers.find((p) => p.name === provider)
    setModels(spec?.models ?? [])
    let alive = true
    api.models(provider).then((r) => { if (alive) setModels(r.models) }).catch(() => {})
    return () => { alive = false }
  }, [provider, providers])

  useEffect(() => {
    if (!models.length) return
    const spec = providers.find((p) => p.name === provider)
    const allowed = (m: string) => !isFree || provider === 'mock' || fastModels.includes(m)
    const pref = spec && models.includes(spec.default_model) && allowed(spec.default_model) ? spec.default_model : models.find(allowed)
    setModel((cur) => (cur && models.includes(cur) && allowed(cur) ? cur : pref ?? models[0]))
  }, [models, provider, providers, isFree, fastModels])

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [task])

  const submit = async () => {
    if (task.trim().length < 3 || busy) return
    setBusy(true)
    setError(null)
    try {
      const run = await api.createRun(task.trim(), provider || undefined, model || undefined)
      await Promise.all([refreshRuns(), refreshAccount()])
      go(`/app/run/${run.id}`)
    } catch (e) {
      const err = e as ApiError
      setError({ msg: err.message, upgrade: err.status === 402 })
    } finally {
      setBusy(false)
    }
  }

  const locked = (m: string) => isFree && provider !== 'mock' && !fastModels.includes(m)

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-sun/[0.08] blur-[110px]" />
      <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-16 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Eyebrow>New society run</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            What should the society <span className="text-sun">build</span> today?
          </h1>
          <p className="mt-4 text-mute">Describe the outcome. The Orchestrator assembles the right specialists.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="group relative mt-10 rounded-3xl p-px">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-sun/40 via-line to-line opacity-60 transition-opacity group-focus-within:opacity-100" />
          <div className="relative rounded-3xl bg-ink-2 p-3">
            <textarea
              ref={ta}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              rows={3}
              placeholder="e.g. Design a multi-tenant SaaS billing system with usage-based pricing…"
              className="w-full resize-none bg-transparent px-3 pt-2 text-[16px] leading-relaxed text-cloud outline-none placeholder:text-dim"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
              <div className="flex flex-wrap gap-1 rounded-full bg-ink-3/70 p-1">
                {providers.map((p) => (
                  <button key={p.name} disabled={!p.configured} onClick={() => setProvider(p.name)}
                    title={p.configured ? p.label : `Set ${p.key_env} in backend/.env`}
                    className={clsx('relative rounded-full px-3 py-1 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                      provider === p.name ? 'text-ink' : 'text-mute hover:text-cloud')}>
                    {provider === p.name && <motion.span layoutId="prov" className="absolute inset-0 rounded-full bg-cloud" transition={{ type: 'spring', stiffness: 450, damping: 34 }} />}
                    <span className="relative">{p.name === 'mock' ? 'Simulation' : p.label.replace(' (local)', '')}</span>
                  </button>
                ))}
              </div>
              {provider !== 'mock' && models.length > 0 && (
                <select value={model} onChange={(e) => setModel(e.target.value)}
                  className="h-8 max-w-[220px] rounded-full border border-line bg-ink-3/70 px-3 font-mono text-[12px] text-cloud outline-none">
                  {models.map((m) => <option key={m} value={m} disabled={locked(m)}>{locked(m) ? '🔒 ' : ''}{m}</option>)}
                </select>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden font-mono text-[11px] text-dim sm:inline">Ctrl ↵</span>
                <motion.button whileTap={{ scale: 0.92 }} onClick={submit} disabled={busy || task.trim().length < 3}
                  className="grid h-10 w-10 place-items-center rounded-full bg-sun text-ink shadow-[0_6px_24px_-6px_rgb(255_201_40/0.6)] transition-opacity disabled:opacity-30"
                  aria-label="Start run">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={clsx('mt-4 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-[13.5px]',
                error.upgrade ? 'border-sun/40 bg-sun/10 text-cloud' : 'border-err/30 bg-err/10 text-err')}>
              {error.upgrade ? <Crown size={16} className="text-sun" /> : <TriangleAlert size={16} />}
              <span className="flex-1">{error.msg}</span>
              {error.upgrade && <Button size="sm" onClick={() => go('/app/billing')}>Upgrade</Button>}
            </motion.div>
          )}
        </AnimatePresence>

        {provider === 'mock' && (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12.5px] text-dim">
            <Sparkles size={13} className="text-peach" />Simulation mode shows the full flow with placeholder output. Add a GROQ_API_KEY for real results.
          </p>
        )}
        {isFree && provider !== 'mock' && (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12.5px] text-dim">
            <Lock size={12} />Free plan uses fast models · <button className="text-sun hover:underline" onClick={() => go('/app/billing')}>unlock GPT-OSS 120B & Qwen with Pro</button>
          </p>
        )}

        <div className="mt-12">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">Try one</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXAMPLES.map((ex, i) => (
              <motion.button key={ex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                whileHover={{ y: -2 }} onClick={() => { setTask(ex); ta.current?.focus() }}
                className="rounded-2xl border border-line bg-ink-2/60 p-4 text-left text-[13.5px] leading-snug text-mute transition-colors hover:border-sun/30 hover:text-cloud">
                {ex}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
