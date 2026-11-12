import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { KIND_COLOR } from '../lib/brand'

const C = 210
const R = 150
const NODES = [
  { name: 'Researcher', kind: 'specialist' },
  { name: 'Architect', kind: 'specialist' },
  { name: 'Engineer', kind: 'specialist' },
  { name: 'Security', kind: 'specialist' },
  { name: 'Writer', kind: 'specialist' },
  { name: 'Reviewer', kind: 'reviewer' },
].map((n, i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2
  return { ...n, x: C + R * Math.cos(a), y: C + R * Math.sin(a), a }
})

const LOG = [
  ['Orchestrator', 'Researcher', 'assign', 'Map the competitor landscape'],
  ['Orchestrator', 'Architect', 'assign', 'Design the service boundaries'],
  ['Researcher', 'Memory', 'write', '3 competitors lack real-time sync'],
  ['Architect', 'Data Specialist', 'spawn', 'Need a schema expert for events'],
  ['Engineer', 'Orchestrator', 'deliver', 'API + websocket layer drafted'],
  ['Security', 'Memory', 'write', 'Rate-limit the public endpoints'],
  ['Reviewer', 'Writer', 'feedback', 'Add a migration section'],
  ['Orchestrator', 'You', 'result', 'Final plan delivered ✓'],
]

const KIND_TONE: Record<string, string> = {
  assign: '#8DB9F0', write: '#E9E8F8', spawn: '#F5B69E', deliver: '#7ee2a0', feedback: '#FFC928', result: '#FFC928',
}

export default function HeroSociety() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1400)
    return () => clearInterval(t)
  }, [])
  const active = tick % NODES.length
  const showSpawn = tick % 12 >= 5
  const arch = NODES[1]
  const spawn = { x: arch.x + 62 * Math.cos(arch.a + 0.5), y: arch.y + 62 * Math.sin(arch.a + 0.5) }
  const log = [0, 1, 2].map((k) => LOG[(tick + k) % LOG.length])

  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="absolute inset-8 rounded-full bg-sun/10 blur-3xl" />
      <svg viewBox="0 0 420 420" className="relative w-full" role="img" aria-label="Animated agent society">
        <circle cx={C} cy={C} r={R} fill="none" stroke="#f2f4f1" strokeOpacity=".07" strokeDasharray="2 6" />
        <circle cx={C} cy={C} r={R * 0.55} fill="none" stroke="#f2f4f1" strokeOpacity=".05" />
        {NODES.map((n, i) => (
          <line key={n.name} x1={C} y1={C} x2={n.x} y2={n.y}
            stroke={i === active ? '#FFC928' : '#f2f4f1'} strokeOpacity={i === active ? 0.9 : 0.1}
            strokeWidth={i === active ? 1.6 : 1} strokeDasharray={i === active ? '4 4' : undefined}
            className={i === active ? 'animate-dash' : undefined} />
        ))}
        <AnimatePresence>
          {showSpawn && (
            <motion.g key="spawn" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }} style={{ transformOrigin: `${spawn.x}px ${spawn.y}px` }}>
              <line x1={arch.x} y1={arch.y} x2={spawn.x} y2={spawn.y} stroke="#F5B69E" strokeOpacity=".6" strokeDasharray="3 4" className="animate-dash" />
              <circle cx={spawn.x} cy={spawn.y} r="13" fill="#1c1d20" stroke="#F5B69E" strokeWidth="1.5" />
              <circle cx={spawn.x} cy={spawn.y} r="4" fill="#F5B69E" />
              <text x={spawn.x} y={spawn.y + 28} textAnchor="middle" fill="#F5B69E" fontSize="10" fontFamily="JetBrains Mono">spawned</text>
            </motion.g>
          )}
        </AnimatePresence>
        <motion.circle key={tick} r="4" fill="#FFC928"
          initial={{ cx: C, cy: C, opacity: 1 }}
          animate={{ cx: NODES[active].x, cy: NODES[active].y, opacity: [1, 1, 0] }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 6px #FFC928)' }} />
        {NODES.map((n, i) => {
          const col = KIND_COLOR[n.kind]
          const on = i === active
          return (
            <g key={n.name}>
              {on && (
                <motion.circle cx={n.x} cy={n.y} r="22" fill="none" stroke={col}
                  initial={{ r: 20, opacity: 0.8 }} animate={{ r: 34, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }} />
              )}
              <circle cx={n.x} cy={n.y} r="20" fill="#222327" stroke={on ? col : '#3a3b41'} strokeWidth="1.5" />
              <circle cx={n.x} cy={n.y} r="6" fill={col} opacity={on ? 1 : 0.55} />
              <text x={n.x} y={n.y + 36} textAnchor="middle" fill={on ? '#f2f4f1' : '#9d9f9a'} fontSize="11.5" fontFamily="Inter" fontWeight="500">{n.name}</text>
            </g>
          )
        })}
        <motion.circle cx={C} cy={C} r="40" fill="#FFC928" opacity=".12"
          animate={{ r: [36, 46, 36] }} transition={{ duration: 2.8, repeat: Infinity }} />
        <circle cx={C} cy={C} r="30" fill="#1c1d20" stroke="#FFC928" strokeWidth="2" />
        <circle cx={C} cy={C} r="10" fill="#FFC928" />
        <text x={C} y={C + 50} textAnchor="middle" fill="#FFC928" fontSize="11" fontFamily="JetBrains Mono" letterSpacing="2">ORCHESTRATOR</text>
      </svg>

      <div className="relative -mt-6 rounded-2xl border border-line bg-ink-2/90 p-3 shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-widest text-dim">
          <span>communication bus</span>
          <span className="flex items-center gap-1.5 text-ok"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />live</span>
        </div>
        <div className="space-y-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {log.map(([from, to, kind, text]) => (
              <motion.div key={`${tick}-${from}-${to}-${kind}`} layout
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }}
                className="flex items-center gap-2 rounded-lg bg-ink-3/60 px-2.5 py-1.5 text-[12px]">
                <span className="shrink-0 rounded px-1.5 py-px font-mono text-[9.5px] uppercase" style={{ color: KIND_TONE[kind], background: `${KIND_TONE[kind]}1f` }}>{kind}</span>
                <span className="shrink-0 text-cloud">{from}</span>
                <span className="text-dim">→</span>
                <span className="shrink-0 text-mute">{to}</span>
                <span className="truncate text-dim">· {text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
