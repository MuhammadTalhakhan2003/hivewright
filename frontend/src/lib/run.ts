import type { Agent, HivewrightEvent, MemoryEntry, Message, RunStatus, RunSummary, Subtask } from './types'

export interface RunState {
  summary: RunSummary | null
  agents: Record<string, Agent>
  order: string[]
  messages: Message[]
  memory: MemoryEntry[]
  events: HivewrightEvent[]
  subtasks: Subtask[]
  status: RunStatus
  result: string
  error: string
  tokens: number
  seq: number
  connected: boolean
}

export const emptyRun = (): RunState => ({
  summary: null, agents: {}, order: [], messages: [], memory: [], events: [], subtasks: [],
  status: 'queued', result: '', error: '', tokens: 0, seq: 0, connected: false,
})

export function applyEvent(s: RunState, ev: HivewrightEvent): RunState {
  if (ev.seq <= s.seq) return s
  const n: RunState = { ...s, seq: ev.seq, events: [...s.events, ev] }
  switch (ev.type) {
    case 'run_created':
      n.summary = ev.run
      n.status = ev.run.status
      break
    case 'run_status':
      n.status = ev.status
      break
    case 'agent_spawned':
      n.agents = { ...n.agents, [ev.agent.id]: ev.agent }
      n.order = [...n.order, ev.agent.id]
      break
    case 'agent_updated':
      n.agents = { ...n.agents, [ev.agent.id]: ev.agent }
      break
    case 'message':
      n.messages = [...n.messages, ev.message]
      break
    case 'memory_write':
      n.memory = [...n.memory, ev.entry]
      break
    case 'plan':
      n.subtasks = ev.subtasks
      break
    case 'usage':
      n.tokens = ev.tokens
      break
    case 'run_completed':
      n.status = 'completed'
      n.result = ev.result
      n.tokens = ev.tokens ?? n.tokens
      break
    case 'run_failed':
      n.status = 'failed'
      n.error = ev.error
      break
  }
  return n
}

export const isActive = (s: RunStatus) => s !== 'completed' && s !== 'failed'

export const PHASES: { key: RunStatus[]; label: string }[] = [
  { key: ['queued', 'planning'], label: 'Plan' },
  { key: ['executing'], label: 'Execute' },
  { key: ['reviewing', 'revising'], label: 'Review' },
  { key: ['synthesizing'], label: 'Synthesize' },
  { key: ['completed'], label: 'Delivered' },
]

export function phaseIndex(s: RunStatus): number {
  const i = PHASES.findIndex((p) => p.key.includes(s))
  return i < 0 ? 0 : i
}
