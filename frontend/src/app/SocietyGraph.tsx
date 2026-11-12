import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Agent } from '../lib/types'
import { KIND_COLOR } from '../lib/brand'

const DX = 132
const DY = 118
const PAD = 70

function initials(name: string) {
  const w = name.split(/\s+/).filter(Boolean)
  return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase()
}

export default function SocietyGraph({ agents, order, selected, onSelect }: {
  agents: Record<string, Agent>; order: string[]; selected: string | null; onSelect: (id: string) => void
}) {
  const layout = useMemo(() => {
    const children: Record<string, string[]> = {}
    const roots: string[] = []
    for (const id of order) {
      const a = agents[id]
      if (!a) continue
      if (a.parent_id && agents[a.parent_id]) (children[a.parent_id] ??= []).push(id)
      else roots.push(id)
    }
    const pos: Record<string, { x: number; y: number }> = {}
    let leaf = 0
    let maxDepth = 0
    const place = (id: string, depth: number) => {
      maxDepth = Math.max(maxDepth, depth)
      const ch = children[id] ?? []
      if (!ch.length) {
        pos[id] = { x: leaf++, y: depth }
        return
      }
      ch.forEach((c) => place(c, depth + 1))
      pos[id] = { x: (pos[ch[0]].x + pos[ch[ch.length - 1]].x) / 2, y: depth }
    }
    roots.forEach((r) => place(r, 0))
    const width = Math.max(1, leaf) * DX + PAD * 2 - DX
    const height = maxDepth * DY + PAD * 2 + 20
    const px = (id: string) => ({ x: PAD + pos[id].x * DX, y: PAD + pos[id].y * DY })
    return { pos, px, width: Math.max(width, 320), height, offset: Math.max(0, (320 - width) / 2) }
  }, [agents, order])

  const ids = order.filter((id) => layout.pos[id])

  if (!ids.length) {
    return (
      <div className="grid h-64 place-items-center text-sm text-dim">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>Assembling the society…</motion.div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="mx-auto block" style={{ width: layout.width, maxWidth: '100%', minWidth: Math.min(layout.width, 520) }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <g transform={`translate(${layout.offset},0)`}>
          {ids.map((id) => {
            const a = agents[id]
            if (!a.parent_id || !layout.pos[a.parent_id]) return null
            const p = layout.px(a.parent_id)
            const c = layout.px(id)
            const my = (p.y + c.y) / 2
            const d = `M${p.x},${p.y + 26} C${p.x},${my} ${c.x},${my} ${c.x},${c.y - 26}`
            const live = a.status === 'thinking'
            return (
              <g key={`e-${id}`}>
                <motion.path d={d} fill="none" stroke="#3a3b41" strokeWidth="1.5"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                {live && <path d={d} fill="none" stroke={KIND_COLOR[a.kind]} strokeWidth="1.8" strokeDasharray="4 4" className="animate-dash" />}
              </g>
            )
          })}
          <AnimatePresence>
            {ids.map((id) => {
              const a = agents[id]
              const { x, y } = layout.px(id)
              const col = KIND_COLOR[a.kind] ?? '#8DB9F0'
              const r = a.kind === 'orchestrator' ? 28 : 24
              const thinking = a.status === 'thinking'
              const sel = selected === id
              return (
                <motion.g key={id} initial={{ opacity: 0, scale: 0.3, x, y }} animate={{ opacity: 1, scale: 1, x, y }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  onClick={() => onSelect(id)} style={{ cursor: 'pointer' }} role="button" aria-label={a.name}>
                  {thinking && (
                    <>
                      <circle r={r + 6} fill={col} opacity=".25" filter="url(#glow)" />
                      <motion.circle r={r} fill="none" stroke={col} strokeWidth="1.5"
                        initial={{ r, opacity: 0.8 }} animate={{ r: r + 16, opacity: 0 }} transition={{ duration: 1.3, repeat: Infinity }} />
                    </>
                  )}
                  <circle r={r} fill={sel ? '#2f3036' : '#222327'} stroke={a.status === 'failed' ? '#ff7a6b' : col}
                    strokeWidth={sel ? 2.5 : 1.6} strokeOpacity={a.status === 'idle' ? 0.5 : 1} />
                  <text textAnchor="middle" dy="4.5" fill={col} fontSize={a.kind === 'orchestrator' ? 13 : 12} fontFamily="JetBrains Mono" fontWeight="600">{initials(a.name)}</text>
                  {a.status === 'done' && (
                    <g transform={`translate(${r * 0.72},${-r * 0.72})`}>
                      <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <circle r="8" fill="#7ee2a0" />
                        <path d="M-3.4 0.2 L-1 2.6 L3.6 -2.2" stroke="#1c1d20" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.g>
                    </g>
                  )}
                  <text textAnchor="middle" y={r + 18} fill="#f2f4f1" fontSize="12" fontFamily="Inter" fontWeight="500">
                    {a.name.length > 20 ? a.name.slice(0, 19) + '…' : a.name}
                  </text>
                  <text textAnchor="middle" y={r + 32} fill="#6c6e6a" fontSize="10" fontFamily="JetBrains Mono">
                    {thinking ? 'thinking…' : a.kind === 'spawned' ? 'spawned' : a.status}
                  </text>
                </motion.g>
              )
            })}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  )
}
