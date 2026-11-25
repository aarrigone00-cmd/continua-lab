/**
 * The creative team. `kind` keeps real AI agents distinct from
 * production services and the backend, as the brief requires.
 */
export type Member = {
  id: string
  name: string
  role: string
  kind: 'ai-agent' | 'service' | 'backend' | 'human'
  monogram: string
  font: string
  accent: string
}

export const team: Member[] = [
  { id: 'claude', name: 'Claude', role: 'Creative Director', kind: 'ai-agent', monogram: 'Cl', font: "'Bodoni Moda', serif", accent: 'var(--color-cobalt)' },
  { id: 'grok', name: 'Grok', role: 'Trend Hunter', kind: 'ai-agent', monogram: 'Gk', font: "'Inter Tight', sans-serif", accent: 'var(--color-burnt)' },
  { id: 'heygen', name: 'HeyGen', role: 'Film Director', kind: 'service', monogram: 'Hg', font: "'Bodoni Moda', serif", accent: 'var(--color-burgundy)' },
  { id: 'canva', name: 'Canva', role: 'Art Director', kind: 'service', monogram: 'Cv', font: "'Bodoni Moda', serif", accent: 'var(--color-terracotta)' },
  { id: 'scheduler', name: 'Scheduler', role: 'Studio Manager', kind: 'backend', monogram: 'Sm', font: "'Inter Tight', sans-serif", accent: 'var(--color-olive)' },
  { id: 'supabase', name: 'Supabase', role: 'Brand Memory', kind: 'backend', monogram: 'Db', font: "'Inter Tight', sans-serif", accent: 'var(--color-graphite)' },
]

export const kindLabel: Record<Member['kind'], string> = {
  'ai-agent': 'AI agent',
  service: 'Service',
  backend: 'Backend',
  human: 'You',
}
