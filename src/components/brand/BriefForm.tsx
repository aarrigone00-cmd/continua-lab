import { useEffect, useState } from 'react'
import { getBrief, saveBrief, type Brief } from '../../lib/creative'
import { fieldClass, labelClass, solidBtn } from '../ui'

const FIELDS: { key: keyof Brief; label: string; hint: string; rows?: number }[] = [
  { key: 'summary', label: 'About the company', hint: 'What LACASACONTINUA is and what makes it different.', rows: 3 },
  { key: 'offerings', label: 'What you offer', hint: 'Furniture, surfaces, finishes, design services…', rows: 2 },
  { key: 'showroom', label: 'Showroom', hint: 'Location, and what people should do there (visit, book, request samples).', rows: 2 },
  { key: 'brands', label: 'Brands and makers represented', hint: 'Only names you are happy to mention publicly.', rows: 2 },
  { key: 'audience', label: 'Audience, in priority order', hint: 'e.g. interior designers, architects, homeowners…', rows: 2 },
  { key: 'voice', label: 'Tone in three words', hint: 'e.g. warm, expert, understated.' },
  { key: 'never_sound', label: 'Never sound like', hint: 'e.g. pushy, trendy, cold.' },
  { key: 'avoid_words', label: 'Words and habits to avoid', hint: 'e.g. “luxury”, “elevate”, emojis, prices in posts.', rows: 2 },
  { key: 'inspirations', label: 'Accounts and brands you admire', hint: 'Any field: fashion, architecture, hospitality.', rows: 2 },
  { key: 'language', label: 'Language and spelling', hint: 'e.g. English (US), with occasional Italian.' },
  { key: 'presenter', label: 'Video presenter', hint: 'Digital twin of a real person (with recorded consent) or a stock avatar.' },
  { key: 'off_limits', label: 'Off-limits', hint: 'Competitors, topics, claims you cannot make.', rows: 2 },
]

export function BriefForm({ workspaceId, canEdit }: { workspaceId: string; canEdit: boolean }) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [saved, setSaved] = useState<Brief | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | { error: string }>('idle')

  useEffect(() => {
    getBrief(workspaceId).then((b) => {
      const base = b ?? ({ workspace_id: workspaceId, language: 'English (US)' } as Brief)
      setBrief(base)
      setSaved(base)
    }).catch((e: Error) => setState({ error: e.message }))
  }, [workspaceId])

  if (!brief) return <p className="py-16 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Opening the brief…</p>

  const dirty = JSON.stringify(brief) !== JSON.stringify(saved)
  const filled = FIELDS.filter((f) => String(brief[f.key] ?? '').trim()).length

  const save = async () => {
    setState('saving')
    try {
      await saveBrief({ ...brief, language: brief.language || 'English (US)' })
      setSaved(brief)
      setState('saved')
    } catch (e) {
      setState({ error: (e as Error).message })
    }
  }

  return (
    <section className="grid gap-x-12 gap-y-8 py-6 lg:grid-cols-[1fr_2fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="font-display text-3xl leading-tight">The brief Claude reads before every word it writes.</p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          {filled} of {FIELDS.length} answered. Short answers are fine. Claude treats this as reference information about the brand, never as instructions that override its honesty rules.
        </p>
        {canEdit && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button className={solidBtn} onClick={save} disabled={!dirty || state === 'saving'}>
              {state === 'saving' ? 'Saving…' : 'Save brief'}
            </button>
            {state === 'saved' && !dirty && <span className="text-[11px] uppercase tracking-[0.12em] text-olive">Saved</span>}
            {typeof state === 'object' && <span role="alert" className="text-sm text-cherry">{state.error}</span>}
          </div>
        )}
      </div>
      <div className="grid gap-7">
        {FIELDS.map((f, i) => (
          <label key={f.key} htmlFor={`brief-${f.key}`} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
            <span className="font-display text-xl tabular-nums text-[var(--muted)]">{String(i + 1).padStart(2, '0')}</span>
            <span className="grid gap-1">
              <span className={labelClass}>{f.label}</span>
              <textarea
                id={`brief-${f.key}`}
                rows={f.rows ?? 1}
                className={`${fieldClass} resize-y`}
                placeholder={f.hint}
                disabled={!canEdit}
                value={(brief[f.key] as string | null) ?? ''}
                onChange={(e) => { setBrief({ ...brief, [f.key]: e.target.value || null }); setState('idle') }}
              />
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
