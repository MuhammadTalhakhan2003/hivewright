import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import {
  ArrowRight, ArrowUpRight, Brain, Check, ChevronDown, Eye, GitBranch, Layers, Menu, MessagesSquare,
  Network, Plug, Rocket, ShieldCheck, Sparkles, Users, X, Zap,
} from 'lucide-react'
import clsx from 'clsx'
import HeroSociety from './HeroSociety'
import {
  BlurText, Button, Eyebrow, Logo, Marquee, NumberTicker, Reveal, SpotlightCard,
} from '../components/ui'
import { BRAND } from '../lib/brand'
import { go, scrollToId, setPrefill } from '../lib/router'
import { NavAuth } from '../lib/auth'

const NAV = [
  ['features', 'Features'], ['how', 'How it works'], ['usecases', 'Use cases'], ['pricing', 'Pricing'], ['faq', 'FAQ'],
] as const

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <motion.nav
        initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        className={clsx(
          'mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-3 pl-4 transition-all duration-300',
          scrolled ? 'border border-line bg-ink/75 shadow-2xl backdrop-blur-xl' : 'border border-transparent',
        )}
      >
        <button onClick={() => window.scrollTo({ top: 0 })} className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-display text-[17px] font-semibold tracking-tight">{BRAND.name}</span>
        </button>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => scrollToId(id)}
              className="rounded-full px-3.5 py-1.5 text-[13.5px] text-mute transition-colors hover:bg-white/5 hover:text-cloud">
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <NavAuth />
          <Button size="sm" onClick={() => go('/app')}>Get started <ArrowRight size={14} /></Button>
          <button className="ml-1 rounded-full p-2 text-mute md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-2 max-w-6xl rounded-3xl border border-line bg-ink-2/95 p-2 backdrop-blur-xl md:hidden">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => { setOpen(false); scrollToId(id) }}
                className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-mute hover:bg-white/5 hover:text-cloud">{label}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], [0, 80])
  const fade = useTransform(scrollY, [0, 500], [1, 0.3])
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40">
      <div className="grid-bg absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-sun/[0.07] blur-[120px]" />
      {/* light beam, echoing the moodboard */}
      <div className="pointer-events-none absolute -top-20 right-[8%] h-[900px] w-40 rotate-[24deg] bg-gradient-to-b from-sun/15 via-sun/[0.03] to-transparent blur-2xl" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 lg:grid-cols-[1.1fr_1fr]">
        <motion.div style={{ opacity: fade }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Eyebrow>Plan · Delegate · Deliver</Eyebrow>
          </motion.div>
          <h1 className="mt-6 font-display text-[44px] leading-[1.02] font-medium tracking-[-0.03em] sm:text-6xl lg:text-[72px]">
            <BlurText text="One model answers." className="block text-cloud/90" />
            <BlurText text="A society builds." delay={0.35} highlight={['builds']} className="block" />
          </h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-mute">
            {BRAND.name} turns one request into a coordinated team of AI specialists. They plan, split the work, share memory,
            spawn experts when they need them, and review each other before you see a single word.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}
            className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => go('/app')}>Assemble your society <ArrowRight size={16} /></Button>
            <Button size="lg" variant="ghost" onClick={() => scrollToId('how')}>
              <span className="grid h-6 w-6 place-items-center rounded-full border border-white/20">▶</span> See how it thinks
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-dim">
            {['Free plan, no card', 'Open-source runtime', 'Any OpenAI-compatible model'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check size={14} className="text-sun" />{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div style={{ y }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          <HeroSociety />
        </motion.div>
      </div>
    </section>
  )
}

const PROVIDERS = ['Groq', 'OpenAI', 'OpenRouter', 'Ollama', 'Llama', 'GPT-OSS', 'Qwen', 'Claude via OpenRouter', 'Gemini via OpenRouter', 'Any OpenAI-compatible API']

function Providers() {
  return (
    <section className="border-y border-line/70 bg-ink-2/40 py-7">
      <div className="mx-auto mb-4 max-w-6xl px-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
        Provider-independent by design
      </div>
      <Marquee>
        {PROVIDERS.map((p) => (
          <span key={p} className="mx-8 flex items-center gap-3 font-display text-lg text-mute/80">
            <span className="h-1.5 w-1.5 rotate-45 bg-sun/70" />{p}
          </span>
        ))}
      </Marquee>
    </section>
  )
}

function SectionHead({ eyebrow, title, sub, center }: { eyebrow: string; title: ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal className={clsx('mb-14 max-w-2xl', center && 'mx-auto text-center')}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 font-display text-4xl font-medium leading-[1.08] tracking-[-0.025em] sm:text-5xl">{title}</h2>
      {sub && <p className="mt-5 text-[16px] leading-relaxed text-mute">{sub}</p>}
    </Reveal>
  )
}

function Compare() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28">
      <SectionHead eyebrow="The shift" title={<>Chatbots answer. <span className="text-sun">Teams deliver.</span></>}
        sub="Hard problems need more than one model guessing in one pass. They need roles, hand-offs, shared context and a second pair of eyes. That's how real engineering orgs work, and it's how a society works." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-3xl border border-line bg-ink-2/50 p-7">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg text-mute">Single assistant</span>
              <span className="rounded-full bg-err/10 px-3 py-1 font-mono text-[11px] text-err">1 pass</span>
            </div>
            <div className="flex flex-col items-center gap-2 py-6 font-mono text-sm text-dim">
              <span className="rounded-lg border border-line px-4 py-2">You</span><span>↓</span>
              <span className="rounded-lg border border-line px-4 py-2">One model</span><span>↓</span>
              <span className="rounded-lg border border-line px-4 py-2">Best guess</span>
            </div>
            <ul className="space-y-2.5 text-[14px] text-mute">
              {['Loses context on long, multi-part work', 'No one checks the answer', 'Breadth over depth on every topic'].map((t) => (
                <li key={t} className="flex gap-2.5"><X size={16} className="mt-0.5 shrink-0 text-err/70" />{t}</li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative h-full overflow-hidden rounded-3xl border border-sun/30 bg-gradient-to-b from-sun/[0.07] to-ink-2/60 p-7">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg text-cloud">{BRAND.name} society</span>
              <span className="rounded-full bg-sun/15 px-3 py-1 font-mono text-[11px] text-sun">plan → build → review</span>
            </div>
            <div className="flex flex-col items-center gap-2 py-6 font-mono text-sm">
              <span className="rounded-lg border border-sun/40 bg-sun/10 px-4 py-2 text-sun">Orchestrator</span>
              <span className="text-dim">↙ ↓ ↘</span>
              <div className="flex flex-wrap justify-center gap-2 text-sky">
                {['Researcher', 'Architect', 'Engineer'].map((r) => <span key={r} className="rounded-lg border border-sky/30 px-3 py-2">{r}</span>)}
              </div>
              <span className="text-dim">↓</span>
              <span className="rounded-lg border border-lav/30 px-4 py-2 text-lav">Reviewer ✓</span>
            </div>
            <ul className="space-y-2.5 text-[14px] text-cloud/85">
              {['Each specialist goes deep on one thing', 'Shared memory, so no one re-reasons from scratch', 'A quality gate before anything reaches you'].map((t) => (
                <li key={t} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-sun" />{t}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const STEPS = [
  { icon: Brain, title: 'Plan', text: 'The Orchestrator breaks your request into subtasks, picks the right specialists and maps the dependencies.' },
  { icon: GitBranch, title: 'Delegate', text: 'Specialists run in parallel waves. Each one only waits on the work it actually depends on.' },
  { icon: Layers, title: 'Collaborate', text: 'Findings land on a shared memory board. Missing expertise? An agent spawns a new specialist on the spot.' },
  { icon: ShieldCheck, title: 'Review & deliver', text: 'A Reviewer scores every deliverable and sends work back if needed. Then the Orchestrator writes your final answer.' },
]

function How() {
  return (
    <section id="how" className="relative scroll-mt-24 border-y border-line/70 bg-ink-2/30 py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead eyebrow="How it works" title={<>From one prompt to a <span className="text-sun">coordinated team</span></>} />
        <div className="relative grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="absolute top-9 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-sun/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="relative">
                <div className="relative z-10 mb-6 grid h-[72px] w-[72px] place-items-center rounded-2xl border border-line bg-ink shadow-xl">
                  <s.icon size={26} className="text-sun" />
                  <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-sun font-mono text-[11px] font-semibold text-ink">{i + 1}</span>
                </div>
                <h3 className="font-display text-xl font-medium">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-mute">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  return (
    <div className="px-6 py-8 text-center">
      <div className="font-display text-5xl font-medium text-cloud"><NumberTicker value={value} suffix={suffix} /></div>
      <div className="mt-2 text-[13px] text-mute">{label}</div>
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-28">
      <SectionHead eyebrow="Features" title={<>Built like an org chart, <br className="hidden sm:block" />not a chat box</>}
        sub="Every moving part is visible, swappable and yours to extend." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-4">
          <SpotlightCard className="h-full p-8">
            <Users className="text-sun" />
            <h3 className="mt-5 font-display text-2xl font-medium">Agent society</h3>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-mute">
              Planner, Researcher, Architect, Engineers, Security Analyst, Writer, Reviewer. Roles are picked for each task, not
              hard-coded, so a launch plan gets a different team than a backend migration.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Researcher', 'Solutions Architect', 'Backend Engineer', 'Security Analyst', 'Data Analyst', 'Technical Writer', 'Product Strategist', 'DevOps Engineer'].map((r, i) => (
                <motion.span key={r} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.05 }}
                  className="rounded-full border border-line bg-ink-3/70 px-3 py-1.5 text-[12.5px] text-cloud/80">{r}</motion.span>
              ))}
            </div>
          </SpotlightCard>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.05}>
          <SpotlightCard className="h-full p-8" glow="rgb(245 182 158 / 0.14)">
            <Sparkles className="text-peach" />
            <h3 className="mt-5 font-display text-2xl font-medium">Dynamic spawning</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mute">
              When an agent hits a gap in its expertise, it hires a new specialist mid-run and delegates to it.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-[12px]">
              <span className="rounded-md bg-sky/15 px-2 py-1 text-sky">Architect</span>
              <span className="text-dim">─ spawns →</span>
              <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="rounded-md bg-peach/15 px-2 py-1 text-peach">Data Specialist</motion.span>
            </div>
          </SpotlightCard>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.05}>
          <SpotlightCard className="h-full p-8" glow="rgb(233 232 248 / 0.12)">
            <Layers className="text-lav" />
            <h3 className="mt-5 font-display text-2xl font-medium">Shared memory</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mute">A board of facts and decisions every agent reads and writes, so no one does the same thinking twice.</p>
          </SpotlightCard>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.1}>
          <SpotlightCard className="h-full p-8">
            <Eye className="text-sun" />
            <h3 className="mt-5 font-display text-2xl font-medium">Observable, not a black box</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mute">Watch the live hierarchy, every message, memory write and token as it happens.</p>
          </SpotlightCard>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.15}>
          <SpotlightCard className="h-full p-8" glow="rgb(141 185 240 / 0.14)">
            <Plug className="text-sky" />
            <h3 className="mt-5 font-display text-2xl font-medium">Bring any model</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mute">Groq for speed, local Ollama for privacy, OpenRouter for everything else. Switch per run, no rewrites.</p>
          </SpotlightCard>
        </Reveal>
      </div>
      <Reveal>
        <div className="mt-4 grid grid-cols-2 divide-line rounded-3xl border border-line bg-ink-2/50 md:grid-cols-4 md:divide-x">
          <Stat value={6} label="parallel specialists per run" />
          <Stat value={3} label="dynamic spawns per run" />
          <Stat value={5} label="providers out of the box" />
          <Stat value={100} suffix="%" label="of agent traffic observable" />
        </div>
      </Reveal>
    </section>
  )
}

const USE_CASES = [
  {
    id: 'eng', label: 'Engineering', icon: Network,
    prompt: 'Design a real-time collaborative notes app: architecture, data model, API endpoints, auth and a deployment plan.',
    team: ['Solutions Architect', 'Backend Engineer', 'Frontend Engineer', 'Security Analyst', 'DevOps Engineer'],
    out: 'Architecture doc, schema, endpoint spec, threat model, deploy checklist',
  },
  {
    id: 'research', label: 'Research', icon: Brain,
    prompt: 'Research the market for AI meeting assistants: key players, pricing, gaps, and where a new entrant could win.',
    team: ['Researcher', 'Data Analyst', 'Product Strategist', 'Technical Writer'],
    out: 'Competitive landscape, pricing table, gap analysis, positioning memo',
  },
  {
    id: 'ops', label: 'Business ops', icon: Rocket,
    prompt: 'Create a 90-day go-to-market plan for a B2B SaaS launching to small agencies, with budget and KPIs.',
    team: ['Product Strategist', 'Marketing Strategist', 'Financial Analyst', 'Reviewer'],
    out: 'Phased GTM plan, channel mix, budget split, KPI dashboard spec',
  },
  {
    id: 'content', label: 'Content', icon: MessagesSquare,
    prompt: 'Write a technical blog post explaining vector databases to backend developers, with code examples and diagrams described.',
    team: ['Researcher', 'Backend Engineer', 'Technical Writer', 'Reviewer'],
    out: 'Publish-ready article with verified code and structure',
  },
]

function UseCases() {
  const [tab, setTab] = useState(USE_CASES[0].id)
  const uc = USE_CASES.find((u) => u.id === tab)!
  return (
    <section id="usecases" className="scroll-mt-24 border-y border-line/70 bg-ink-2/30 py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead eyebrow="Use cases" title={<>Your daily work, <span className="text-sun">handled by a team</span></>} />
        <div className="mb-8 flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <button key={u.id} onClick={() => setTab(u.id)}
              className={clsx('relative flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors', tab === u.id ? 'text-ink' : 'text-mute hover:text-cloud')}>
              {tab === u.id && <motion.span layoutId="uc-pill" className="absolute inset-0 rounded-full bg-sun" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <u.icon size={15} className="relative" /><span className="relative">{u.label}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={uc.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }} className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-3xl border border-line bg-ink p-7">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-dim">Prompt</div>
              <p className="font-display text-xl leading-snug text-cloud sm:text-2xl">“{uc.prompt}”</p>
              <Button className="mt-7" onClick={() => { setPrefill(uc.prompt); go('/app/new') }}>
                Run this in {BRAND.name} <ArrowUpRight size={15} />
              </Button>
            </div>
            <div className="rounded-3xl border border-line bg-ink p-7">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-dim">Society assembled</div>
              <div className="space-y-2">
                {uc.team.map((r, i) => (
                  <motion.div key={r} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 rounded-xl bg-ink-2 px-3 py-2.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-sky" />{r}
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 border-t border-line pt-4 text-[13px] text-mute"><span className="text-sun">Output:</span> {uc.out}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

const TIERS = [
  {
    name: 'Free', monthly: 0, yearly: 0, blurb: 'For trying a society on real work.', cta: 'Start free', featured: false,
    features: ['10 society runs / day', 'Up to 3 specialists per run', '1 dynamic spawn per run', 'Live graph, feed & memory', 'Fast models (GPT-OSS 20B)'],
  },
  {
    name: 'Pro', monthly: 19, yearly: 15, blurb: 'For people who ship with AI every day.', cta: 'Go Pro', featured: true,
    features: ['200 society runs / day', 'Up to 6 specialists per run', '3 dynamic spawns per run', 'Reviewer revision loop', 'All models incl. GPT-OSS 120B & Qwen 3.8', 'Markdown export'],
  },
  {
    name: 'Team', monthly: 49, yearly: 39, blurb: 'Shared societies for whole teams.', cta: 'Join waitlist', featured: false, soon: true,
    features: ['Everything in Pro', 'Shared workspaces & memory', 'Custom skills & extensions', 'SSO & audit log', 'Priority support'],
  },
]

function Pricing() {
  const [yearly, setYearly] = useState(true)
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-28">
      <SectionHead center eyebrow="Pricing" title={<>Start free. <span className="text-sun">Scale your society.</span></>}
        sub="Bring your own model key and pay only for orchestration." />
      <div className="mb-12 flex justify-center">
        <div className="relative flex rounded-full border border-line bg-ink-2 p-1 text-sm">
          {[false, true].map((y) => (
            <button key={String(y)} onClick={() => setYearly(y)}
              className={clsx('relative rounded-full px-5 py-2 transition-colors', yearly === y ? 'text-ink' : 'text-mute')}>
              {yearly === y && <motion.span layoutId="bill" className="absolute inset-0 rounded-full bg-cloud" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative">{y ? 'Yearly' : 'Monthly'}{y && <span className="ml-1.5 text-[11px] font-semibold text-sun-2">−20%</span>}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}>
            <div className={clsx('relative flex h-full flex-col rounded-3xl border p-7',
              t.featured ? 'border-sun/50 bg-gradient-to-b from-sun/[0.09] to-ink-2 shadow-[0_30px_80px_-30px_rgb(255_201_40/0.35)]' : 'border-line bg-ink-2/60')}>
              {t.featured && <span className="absolute -top-3 left-7 rounded-full bg-sun px-3 py-1 text-[11px] font-semibold text-ink">Most popular</span>}
              {t.soon && <span className="absolute top-7 right-7 rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase text-mute">Soon</span>}
              <h3 className="font-display text-xl">{t.name}</h3>
              <p className="mt-1 text-[13.5px] text-mute">{t.blurb}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-5xl font-medium">$</span>
                <AnimatePresence mode="popLayout">
                  <motion.span key={yearly ? t.yearly : t.monthly} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                    className="font-display text-5xl font-medium tabular-nums">{yearly ? t.yearly : t.monthly}</motion.span>
                </AnimatePresence>
                <span className="mb-1.5 text-sm text-mute">{t.monthly ? (t.name === 'Team' ? '/seat/mo' : '/mo') : 'forever'}</span>
              </div>
              <ul className="mt-7 flex-1 space-y-3 text-[14px]">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-cloud/85"><Check size={16} className={clsx('mt-0.5 shrink-0', t.featured ? 'text-sun' : 'text-mute')} />{f}</li>
                ))}
              </ul>
              <Button className="mt-8 w-full" variant={t.featured ? 'primary' : 'ghost'}
                onClick={() => go(t.name === 'Pro' ? '/app/billing' : '/app')}>{t.cta}</Button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const ROADMAP = [
  ['Now', 'Agent society runtime, live dashboard, Free & Pro plans, 5 providers'],
  ['Next', 'MCP tool runtime: agents act in your apps (GitHub, Slack, Notion, Drive)'],
  ['Then', 'Skills & extensions marketplace, plus a visual workflow editor'],
  ['Vision', 'Persistent autonomous orgs across 1000+ app integrations'],
]

function Roadmap() {
  return (
    <section className="border-y border-line/70 bg-ink-2/30 py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead eyebrow="Roadmap" title={<>From assistant to <span className="text-sun">operating runtime</span></>}
          sub="AI is moving from answering questions to doing the work. Hivewright aims to be the layer where many specialised AI workers coordinate." />
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="absolute top-[11px] right-0 left-0 hidden h-px bg-line md:block" />
          <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 0.25 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute top-[11px] left-0 hidden h-px w-full origin-left bg-sun md:block" />
          {ROADMAP.map(([when, what], i) => (
            <Reveal key={when} delay={i * 0.1}>
              <div className={clsx('relative mb-5 grid h-6 w-6 place-items-center rounded-full border-2', i === 0 ? 'border-sun bg-sun' : 'border-line bg-ink')}>
                {i === 0 && <Zap size={11} className="text-ink" />}
              </div>
              <div className={clsx('font-mono text-[11px] uppercase tracking-widest', i === 0 ? 'text-sun' : 'text-dim')}>{when}</div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-cloud/85">{what}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const FAQS = [
  ['Do I need my own API key?', 'Yes. Hivewright orchestrates and you choose the model. Add a free Groq key and you get fast inference in minutes. No key yet? Simulation mode lets you explore the full experience.'],
  ['How is this different from ChatGPT or a single agent?', 'A single assistant reasons in one pass. Hivewright splits work across specialists that run in parallel, share a memory board, spawn experts when needed, and pass a reviewer before you see the result.'],
  ['Can I see what the agents are doing?', 'Yes, that is the point. The dashboard shows the live hierarchy, every message between agents, every memory write and the token cost of each agent.'],
  ['Which models are supported?', 'Groq, OpenAI, OpenRouter (which includes Claude, Gemini and Qwen), local models through Ollama, and any OpenAI-compatible endpoint. Pick a different one for each run.'],
  ['Is it open source?', 'The runtime is built to be open and extensible, with providers, skills and extensions as pluggable modules.'],
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-28">
      <SectionHead center eyebrow="FAQ" title="Questions, answered" />
      <div className="space-y-3">
        {FAQS.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.04}>
            <div className={clsx('rounded-2xl border transition-colors', open === i ? 'border-white/15 bg-ink-2' : 'border-line bg-ink-2/40')}>
              <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="font-display text-[17px]">{q}</span>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }}><ChevronDown size={18} className="text-mute" /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                    <p className="px-6 pb-6 text-[14.5px] leading-relaxed text-mute">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className="px-4 pb-24">
      <Reveal>
        <div className="noise relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-sun/30 bg-ink-2 px-6 py-20 text-center">
          <div className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 w-[70%] rounded-full bg-sun/20 blur-[100px]" />
          <div className="relative">
            <Eyebrow>Your society is waiting</Eyebrow>
            <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              Stop prompting. <span className="text-sun">Start delegating.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-mute">Your first society runs in under a minute. Free plan, no card.</p>
            <Button size="lg" className="mt-9" onClick={() => go('/app')}>Assemble your society <ArrowRight size={16} /></Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line/70 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">Designed &amp; developed by</span>
            <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 font-display text-2xl font-medium text-cloud transition-colors hover:text-sun sm:text-3xl">
              {BRAND.author}
              <ArrowUpRight size={22} className="text-sun transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <p className="max-w-md text-[14px] text-mute">
              {BRAND.joke} <span aria-hidden>🐝</span>
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-line px-4 py-1.5 text-[13px] text-mute transition-colors hover:border-sun/40 hover:text-cloud">Portfolio</a>
              <a href={BRAND.repoUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-line px-4 py-1.5 text-[13px] text-mute transition-colors hover:border-sun/40 hover:text-cloud">Source on GitHub</a>
            </div>
          </div>
        </Reveal>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line/60 pt-6 text-[13px] text-dim sm:flex-row">
          <div className="flex items-center gap-2.5"><Logo size={22} /><span className="text-mute">{BRAND.company}</span><span>© {new Date().getFullYear()} {BRAND.author}</span></div>
          <div className="font-display text-mute">{BRAND.tagline}</div>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  useEffect(() => { window.scrollTo({ top: 0 }) }, [])
  return (
    <div className="min-h-screen overflow-x-clip">
      <Nav />
      <Hero />
      <Providers />
      <Compare />
      <How />
      <Features />
      <UseCases />
      <Pricing />
      <Roadmap />
      <Faq />
      <Cta />
      <Footer />
    </div>
  )
}
