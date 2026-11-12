import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, CircleDashed, Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { useApp } from './store'
import { Badge, Button, Eyebrow, SpotlightCard } from '../components/ui'

function OwnKeyCard() {
  const { ownKey, setOwnKey, houseRunsLeft, houseRunsPerDay } = useApp()
  const [draft, setDraft] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const masked = ownKey ? `${ownKey.slice(0, 7)}…${ownKey.slice(-4)}` : ''

  const save = () => {
    const k = draft.trim()
    if (!/^gsk_[A-Za-z0-9]{20,}$/.test(k)) { setError('Groq keys start with "gsk_". Copy it from console.groq.com/keys.'); return }
    setOwnKey(k); setDraft(''); setError('')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-sun/40 bg-gradient-to-b from-sun/[0.08] to-ink-2 p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-xl"><KeyRound size={18} className="text-sun" />Your Groq key</div>
          <p className="mt-1.5 max-w-xl text-[14px] text-mute">
            {ownKey
              ? 'Unlimited real runs, powered by your own free Groq account.'
              : <>You get <span className="text-cloud">{houseRunsPerDay} free runs a day</span> on our key ({houseRunsLeft} left today). Add your own free key for unlimited runs.</>}
          </p>
        </div>
        {ownKey && <Badge color="#7ee2a0">active · {masked}</Badge>}
      </div>

      {ownKey ? (
        <Button variant="ghost" size="sm" className="mt-5" onClick={() => setOwnKey('')}><Trash2 size={14} />Remove my key</Button>
      ) : (
        <div className="mt-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input type={show ? 'text' : 'password'} value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save() }} placeholder="gsk_…" autoComplete="off" spellCheck={false}
                className="h-11 w-full rounded-full border border-line bg-ink px-4 pr-11 font-mono text-[13px] text-cloud outline-none focus:border-sun/50" />
              <button onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-dim hover:text-cloud" aria-label="Show key">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <Button onClick={save} disabled={!draft.trim()}>Save key</Button>
          </div>
          {error && <p className="mt-2 text-[12.5px] text-err">{error}</p>}
          <p className="mt-3 text-[12.5px] text-dim">
            Free in 1 minute at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-sun hover:underline">console.groq.com/keys</a>.
          </p>
        </div>
      )}
      <p className="mt-5 flex items-start gap-2 border-t border-line/70 pt-4 text-[12.5px] text-dim">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-ok" />
        Stored only in this browser. It's sent with your own runs and never saved on our server.
      </p>
    </motion.div>
  )
}

export default function Providers() {
  const { providers, defaultProvider } = useApp()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Eyebrow>Provider manager</Eyebrow>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">Bring any model</h1>
      <p className="mt-3 max-w-2xl text-mute">
        Orchestration is separate from inference, so each run can use a different provider.
      </p>
      <div className="mt-8"><OwnKeyCard /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
