import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bot, Brain, Check, Clock, Coins, Copy, Crown, Download, MessagesSquare, Network, RotateCcw, Trash2, TriangleAlert, X,
} from 'lucide-react'
import clsx from 'clsx'
import { PHASES, isActive, phaseIndex, useRun, type RunState } from '../lib/run'
import { KIND_COLOR, STATUS_COLOR } from '../lib/brand'
import { api } from '../lib/api'
import { go, setPrefill } from '../lib/router'
import { Badge, Button, Card, LiveNumber, Markdown, PulseDot } from '../components/ui'
import SocietyGraph from './SocietyGraph'
import { useApp } from './store'
import type { Agent } from '../lib/types'

const MSG_COLOR: Record<string, string> = {
  task: '#f2f4f1', plan: '#FFC928', assign: '#8DB9F0', deliver: '#7ee2a0', delegate: '#F5B69E',
  review: '#E9E8F8', feedback: '#FFC928', revision: '#F5B69E', result: '#7ee2a0',
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now() / 1000)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

function fmtDur(s: number) {
  s = Math.max(0, Math.floor(s))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

function Stepper({ status }: { status: RunState['status'] }) {
  const idx = phaseIndex(status)
  const failed = status === 'failed'
  return (
    <div className="flex items-center gap-1.5">
      {PHASES.map((p, i) => {
        const done = !failed && (i < idx || status === 'completed')
        const cur = !failed && i === idx && status !== 'completed'
        return (
          <div key={p.label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="relative h-1 overflow-hidden rounded-full bg-ink-4">
              <motion.div className={clsx('absolute inset-y-0 left-0 rounded-full', failed ? 'bg-err/60' : 'bg-sun')}
                initial={false} animate={{ width: done ? '100%' : cur ? '55%' : '0%' }} transition={{ duration: 0.6 }} />
              {cur && <div className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />}
            </div>
            <span className={clsx('truncate font-mono text-[10px] uppercase tracking-wider', done || cur ? 'text-cloud' : 'text-dim')}>{p.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function Feed({ s, name }: { s: RunState; name: (id: string) => string }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Scroll only the feed panel, never the page.
    const box = end.current?.closest<HTMLElement>('[data-scroll]')
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
  }, [s.messages.length])
  if (!s.messages.length) return <Empty text="Agents haven't spoken yet." />
  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {s.messages.map((m) => {
          const col = MSG_COLOR[m.kind] ?? '#9d9f9a'
          const fromAgent = s.agents[m.from]
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-2xl border border-line bg-ink p-3.5">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: fromAgent ? KIND_COLOR[fromAgent.kind] : '#f2f4f1' }} />
                <span className="font-medium text-cloud">{name(m.from)}</span>
                <span className="text-dim">→</span>
                <span className="text-mute">{name(m.to)}</span>
                <Badge color={col} className="ml-auto">{m.kind}</Badge>
              </div>
              <div className="max-h-56 overflow-y-auto"><Markdown text={m.content} small /></div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      <div ref={end} />
    </div>
  )
}

function MemoryBoard({ s, name }: { s: RunState; name: (id: string) => string }) {
  if (!s.memory.length) return <Empty text="The shared memory board is empty." />
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <AnimatePresence initial={false}>
        {s.memory.map((m) => {
          const a = s.agents[m.author]
          return (
            <motion.div key={m.id} initial={{ opacity: 0, scale: 0.92, rotate: -1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
              className="rounded-2xl border border-line bg-ink p-3.5" style={{ borderTopColor: a ? KIND_COLOR[a.kind] : undefined, borderTopWidth: 2 }}>
              <div className="font-mono text-[10.5px] uppercase tracking-wider text-sun">{m.key}</div>
              <p className="mt-1.5 text-[13px] leading-snug text-cloud/90">{m.value}</p>
              <div className="mt-2 text-[11px] text-dim">by {name(m.author)}</div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function describe(ev: any, name: (id: string) => string): [string, string] | null {
  switch (ev.type) {
    case 'run_created': return ['#f2f4f1', 'Run created']
    case 'run_status': return ['#FFC928', `Phase → ${ev.status}`]
    case 'agent_spawned': return [KIND_COLOR[ev.agent.kind], `${ev.agent.kind === 'spawned' ? 'Dynamically spawned' : 'Spawned'} ${ev.agent.name}`]
    case 'agent_updated':
      if (ev.agent.status === 'done') return ['#7ee2a0', `${ev.agent.name} finished`]
      if (ev.agent.status === 'failed') return ['#ff7a6b', `${ev.agent.name} failed`]
      if (ev.agent.status === 'thinking') return ['#8DB9F0', `${ev.agent.name} thinking`]
      return null
    case 'message': return [MSG_COLOR[ev.message.kind] ?? '#9d9f9a', `${name(ev.message.from)} → ${name(ev.message.to)} · ${ev.message.kind}`]
    case 'memory_write': return ['#E9E8F8', `${name(ev.entry.author)} wrote “${ev.entry.key}”`]
    case 'plan': return ['#FFC928', `Plan: ${ev.subtasks.length} subtasks`]
    case 'log': return ['#F5B69E', ev.text]
    case 'run_completed': return ['#7ee2a0', 'Run completed']
    case 'run_failed': return ['#ff7a6b', `Run failed: ${ev.error}`]
    default: return null
  }
}

function Timeline({ s, name }: { s: RunState; name: (id: string) => string }) {
  const t0 = s.events[0]?.ts ?? 0
  const rows = s.events.map((e) => ({ e, d: describe(e, name) })).filter((r) => r.d)
  if (!rows.length) return <Empty text="No events yet." />
  return (
    <div className="relative pl-5">
      <div className="absolute top-1 bottom-1 left-[5px] w-px bg-line" />
      {rows.map(({ e, d }) => (
        <motion.div key={e.seq} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-3 py-1.5">
          <span className="absolute top-[11px] -left-[18px] h-2 w-2 rounded-full ring-4 ring-ink-2" style={{ background: d![0] }} />
          <span className="w-12 shrink-0 font-mono text-[11px] text-dim">+{(e.ts - t0).toFixed(1)}s</span>
          <span className="text-[13px] text-cloud/85">{d![1]}</span>
        </motion.div>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="grid h-40 place-items-center text-[13px] text-dim">{text}</div>
}

function AgentDrawer({ agent, onClose, name }: { agent: Agent | null; onClose: () => void; name: (id: string) => string }) {
  return (
    <AnimatePresence>
      {agent && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-ink-2">
            <div className="flex items-start gap-3 border-b border-line p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${KIND_COLOR[agent.kind]}22`, color: KIND_COLOR[agent.kind] }}>
                <Bot size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl">{agent.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge color={KIND_COLOR[agent.kind]}>{agent.kind}</Badge>
                  <Badge color={agent.status === 'done' ? '#7ee2a0' : agent.status === 'failed' ? '#ff7a6b' : '#8DB9F0'}>{agent.status}</Badge>
                  <span className="font-mono text-[11px] text-dim">{agent.tokens.toLocaleString()} tokens</span>
                  {agent.parent_id && <span className="text-[12px] text-dim">reports to {name(agent.parent_id)}</span>}
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-mute hover:bg-white/5" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {agent.task && (
                <section>
                  <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-dim">Assignment</div>
                  <p className="text-[14px] leading-relaxed text-cloud/85">{agent.task}</p>
                </section>
              )}
              {agent.summary && (
                <section>
                  <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-dim">Summary</div>
                  <p className="text-[14px] text-cloud/85">{agent.summary}</p>
                </section>
              )}
              <section>
                <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-dim">Output</div>
                {agent.output ? <Markdown text={agent.output} /> : <p className="text-[13px] text-dim">{agent.status === 'thinking' ? 'Working on it…' : 'No output yet.'}</p>}
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

const TABS = [
  { id: 'feed', label: 'Messages', icon: MessagesSquare },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'timeline', label: 'Timeline', icon: Clock },
] as const

function toMarkdown(s: RunState, name: (id: string) => string) {
  const lines = [`# ${s.summary?.task ?? 'Hivewright run'}`, '', `_Provider: ${s.summary?.provider} · ${s.summary?.model} · ${s.tokens} tokens_`, '', '## Result', '', s.result, '', '## Team', '']
  for (const id of s.order) { const a = s.agents[id]; lines.push(`- **${a.name}** (${a.kind}): ${a.summary || a.status}`) }
  lines.push('', '## Transcript', '')
  for (const m of s.messages) lines.push(`**${name(m.from)} → ${name(m.to)}** _(${m.kind})_`, '', m.content, '')
  return lines.join('\n')
}

export default function RunView({ id }: { id: string }) {
  const s = useRun(id)
  const { account, refreshRuns } = useApp()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('feed')
  const [sel, setSel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const active = isActive(s.status)
  const now = useNow(active)
  const start = s.summary?.created_at ?? s.events[0]?.ts ?? now
  const end = s.status === 'completed' || s.status === 'failed' ? (s.events[s.events.length - 1]?.ts ?? now) : now
  const isPro = account?.plan.id === 'pro'

  const name = useMemo(() => (aid: string) => {
    if (aid === 'user') return 'You'
    if (aid === 'all') return 'Everyone'
    return s.agents[aid]?.name ?? aid
  }, [s.agents])

  const roster = s.order.map((i) => s.agents[i]).filter(Boolean)
  const thinking = roster.filter((a) => a.status === 'thinking').length

  const copy = async () => {
    try { await navigator.clipboard.writeText(s.result); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ }
  }
  const exportMd = () => {
    const blob = new Blob([toMarkdown(s, name)], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hivewright-${id}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const del = async () => {
    try { await api.deleteRun(id); await refreshRuns(); go('/app/new') } catch { /* still running */ }
  }

  if (!s.summary && s.seq === 0) {
    return <div className="grid h-[60vh] place-items-center text-sm text-dim"><motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4 }}>Connecting to the society…</motion.span></div>
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PulseDot color={STATUS_COLOR[s.status]} active={active} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: STATUS_COLOR[s.status] }}>{s.status}</span>
            <span className="font-mono text-[11px] text-dim">· {s.summary?.provider} / {s.summary?.model}</span>
          </div>
          <h1 className="mt-2 line-clamp-3 font-display text-2xl leading-tight font-medium tracking-tight sm:text-[28px]">{s.summary?.task}</h1>
        </div>
        <div className="flex gap-2">
          {s.summary && <Button variant="ghost" size="sm" onClick={() => { setPrefill(s.summary!.task); go('/app/new') }}><RotateCcw size={14} />Rerun</Button>}
          {!active && <Button variant="danger" size="sm" onClick={del} aria-label="Delete run"><Trash2 size={14} /></Button>}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [Clock, 'Elapsed', fmtDur(end - start)],
          [Network, 'Agents', <><LiveNumber value={roster.length} />{thinking > 0 && <span className="ml-1.5 text-[12px] text-sky">{thinking} active</span>}</>],
          [MessagesSquare, 'Messages', <LiveNumber value={s.messages.length} />],
          [Coins, 'Tokens', <LiveNumber value={s.tokens} />],
        ].map(([Icon, label, val]: any) => (
          <Card key={label} className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11.5px] text-dim"><Icon size={13} />{label}</div>
            <div className="mt-1 font-display text-xl font-medium">{val}</div>
          </Card>
        ))}
      </div>

      <div className="mt-5"><Stepper status={s.status} /></div>

      {s.status === 'failed' && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-start gap-3 rounded-2xl border border-err/30 bg-err/10 p-4 text-[13.5px] text-err">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" /><span className="break-words">{s.error}</span>
        </motion.div>
      )}

      <AnimatePresence>
        {s.status === 'completed' && s.result && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-6 overflow-hidden rounded-3xl border border-sun/30 bg-ink-2">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-sun/10 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sun text-ink"><Check size={16} /></span>
              <div className="flex-1">
                <div className="font-display text-lg">Final answer</div>
                <div className="text-[12px] text-dim">Merged by the Orchestrator from {roster.length - 1} agents, reviewed for quality</div>
              </div>
              <Button size="sm" variant="ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</Button>
              <Button size="sm" variant={isPro ? 'ghost' : 'subtle'} onClick={() => (isPro ? exportMd() : go('/app/billing'))}
                title={isPro ? 'Export result & transcript' : 'Export is a Pro feature'}>
                {isPro ? <Download size={14} /> : <Crown size={14} className="text-sun" />}Export .md
              </Button>
            </div>
            <div className="relative px-6 py-6"><Markdown text={s.result} /></div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2 font-display"><Network size={16} className="text-sun" />Society hierarchy</div>
              <div className="hidden gap-3 text-[11px] text-dim sm:flex">
                {Object.entries(KIND_COLOR).map(([k, c]) => <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{k}</span>)}
              </div>
            </div>
            <div className="grid-bg absolute inset-0 top-12 opacity-60" />
            <div className="relative p-3"><SocietyGraph agents={s.agents} order={s.order} selected={sel} onSelect={setSel} /></div>
          </Card>

          <Card>
            <div className="border-b border-line px-5 py-3.5 font-display">Agents</div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              <AnimatePresence initial={false}>
                {roster.map((a) => (
                  <motion.button key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                    onClick={() => setSel(a.id)}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-ink p-3 text-left transition-colors hover:border-white/15">
                    <span className="mt-1"><PulseDot color={KIND_COLOR[a.kind]} active={a.status === 'thinking'} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium">{a.name}</span>
                        {a.status === 'done' && <Check size={13} className="shrink-0 text-ok" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-mute">
                        {a.summary || (a.status === 'thinking' ? 'Thinking…' : a.task || 'Waiting')}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-dim">{a.tokens ? `${(a.tokens / 1000).toFixed(1)}k` : ''}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        <Card className="flex max-h-[calc(100dvh-120px)] min-h-[420px] flex-col lg:sticky lg:top-4">
          <div className="flex gap-1 border-b border-line p-1.5">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx('relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] transition-colors', tab === t.id ? 'text-cloud' : 'text-mute hover:text-cloud')}>
                {tab === t.id && <motion.span layoutId="run-tab" className="absolute inset-0 rounded-xl bg-ink-3" transition={{ type: 'spring', stiffness: 450, damping: 36 }} />}
                <t.icon size={14} className="relative" />
                <span className="relative">{t.label}</span>
                <span className="relative font-mono text-[10.5px] text-dim">
                  {t.id === 'feed' ? s.messages.length : t.id === 'memory' ? s.memory.length : ''}
                </span>
              </button>
            ))}
          </div>
          <div data-scroll className="flex-1 overflow-y-auto p-3">
            {tab === 'feed' && <Feed s={s} name={name} />}
            {tab === 'memory' && <MemoryBoard s={s} name={name} />}
            {tab === 'timeline' && <Timeline s={s} name={name} />}
          </div>
        </Card>
      </div>

      <AgentDrawer agent={sel ? s.agents[sel] ?? null : null} onClose={() => setSel(null)} name={name} />
    </div>
  )
}
