export type AgentKind = 'orchestrator' | 'specialist' | 'spawned' | 'reviewer'
export type AgentStatus = 'idle' | 'thinking' | 'done' | 'failed'
export type RunStatus =
  | 'queued' | 'planning' | 'executing' | 'reviewing' | 'revising' | 'synthesizing' | 'completed' | 'failed'

export interface Agent {
  id: string
  name: string
  role: string
  kind: AgentKind
  parent_id: string | null
  status: AgentStatus
  task: string
  output: string
  summary: string
  tokens: number
  created_at: number
}

export interface Message {
  id: string
  from: string
  to: string
  kind: string
  content: string
  ts: number
}

export interface MemoryEntry {
  id: string
  key: string
  value: string
  author: string
  ts: number
}

export interface Subtask {
  id: string
  role: string
  title: string
  instructions: string
  depends_on: string[]
}

export interface RunSummary {
  id: string
  task: string
  status: RunStatus
  provider: string
  model: string
  plan_id: string
  created_at: number
  finished_at: number | null
  agent_count: number
  tokens: number
}

export interface HivewrightEvent {
  seq: number
  ts: number
  type: string
  [k: string]: any
}

export interface Provider {
  name: string
  label: string
  base_url: string
  key_env: string | null
  default_model: string
  models: string[]
  configured: boolean
}

export interface Plan {
  id: 'free' | 'pro'
  name: string
  price_monthly: number
  runs_per_day: number
  max_specialists: number
  max_dynamic_spawns: number
  review_rounds: number
  models: 'fast' | 'all'
  features: string[]
}

export interface Account {
  plan: Plan
  usage: { runs_today: number; runs_per_day: number; total_runs: number; total_tokens: number }
}
