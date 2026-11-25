import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SlideCanvas } from '../components/post/SlideCanvas'
import { listContent, slideImageUrls, statusColor, STATUS_LABEL, type ContentItem, type ContentStatus } from '../lib/content'
import { useWorkspace } from '../lib/workspace-context'

const FILTERS: (ContentStatus | 'all')[] = ['all', 'ready_for_review', 'revision_requested', 'approved', 'rejected']

export function ReviewStudio() {
  const ws = useWorkspace()
  const [items, setItems] = useState<ContentItem[] | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<ContentStatus | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listContent(ws.id)
      .then(async (list) => { setItems(list); setUrls(await slideImageUrls(list)) })
      .catch((e: Error) => setError(e.message))
  }, [ws.id])

  const shown = useMemo(() => (items ?? []).filter((i) => filter === 'all' || i.status === filter), [items, filter])
  const count = (s: ContentStatus | 'all') => (items ?? []).filter((i) => s === 'all' || i.status === s).length

  return (
    <div className="pt-10 pb-20">
      <header className="grid grid-cols-12 items-end gap-x-[2%] gap-y-6 pb-8">
        <span className="col-span-12 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] md:col-span-2 md:self-start">Room IV<br className="hidden md:block" /> Review</span>
        <div className="col-span-12 md:col-span-10">
          <h1 className="m-0 font-display text-[clamp(52px,8vw,120px)] font-normal leading-[0.9] tracking-[-0.025em]">
            The Review <em className="text-[var(--accent)]">Studio</em><span className="text-cherry">.</span>
          </h1>
          <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed">
            Every post the studio makes lands here first. Nothing is approved, scheduled or published without you.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[var(--rule)] py-4">
        {FILTERS.map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`text-[12px] uppercase tracking-[0.12em] ${filter === f ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>
            {f === 'all' ? 'Everything' : STATUS_LABEL[f]} <sup className="tabular-nums">{count(f)}</sup>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-6 border-l-2 border-cherry pl-3 text-sm">{error}</p>}
      {!items && !error && <p className="py-16 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Opening the studio…</p>}
      {items && items.length === 0 && (
        <div className="grid gap-3 py-16">
          <p className="font-display text-3xl italic">Nothing to review yet.</p>
          <p className="max-w-[52ch] text-[var(--muted)]">
            Ask the <Link to="/creative-director" className="text-[var(--accent)] underline underline-offset-4">Creative Director</Link> for an idea,
            then press “Make this a post” under its reply.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((it) => (
          <Link key={it.id} to={`/review/${it.id}`} className="group block">
            <div className="relative flex justify-center overflow-hidden transition-transform duration-500 group-hover:-translate-y-1">
              {it.slides[0] && (
                <SlideCanvas slide={it.slides[0]} aspect={it.aspect} imageUrl={it.slides[0].asset_id ? urls[it.slides[0].asset_id] : undefined} imageUrl2={it.slides[0].asset_id_2 ? urls[it.slides[0].asset_id_2] : undefined}
                  index={0} total={it.slides.length} wordmark={ws.name} scale={0.26} />
              )}
              {it.slides.length > 1 && (
                <span className="absolute right-3 top-3 bg-[var(--bg)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">{it.slides.length} slides</span>
              )}
            </div>
            <div className="mt-3 grid gap-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{it.content_code} · {it.kind}</span>
              <span className="font-display text-xl leading-tight transition-colors group-hover:text-[var(--accent)]">{it.title}</span>
              <span className={`text-[11px] uppercase tracking-[0.12em] ${statusColor(it.status)}`}>● {STATUS_LABEL[it.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
