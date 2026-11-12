// Rename the product in one place.
export const BRAND = {
  name: 'Hivewright',
  company: 'Hivewright',
  tagline: 'One model answers. A society builds.',
  author: 'Muhammad Talha Khan',
  authorUrl: 'https://muhammadtalhakhan2003.github.io/PortFolio_Talha/',
  repoUrl: 'https://github.com/MuhammadTalhakhan2003/hivewright',
  joke: 'One human, managing a team of AI agents that never ask for a raise.',
}

export const STATUS_COLOR: Record<string, string> = {
  queued: '#9d9f9a', planning: '#FFC928', executing: '#8DB9F0', reviewing: '#E9E8F8', revising: '#F5B69E',
  synthesizing: '#FFC928', completed: '#7ee2a0', failed: '#ff7a6b',
}

export const KIND_COLOR: Record<string, string> = {
  orchestrator: '#FFC928',
  specialist: '#8DB9F0',
  spawned: '#F5B69E',
  reviewer: '#E9E8F8',
}
