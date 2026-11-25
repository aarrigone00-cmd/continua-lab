import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { AssetPreview } from '../components/brand/AssetPreview'
import { SlideCanvas } from '../components/post/SlideCanvas'
import { fieldClass, ghostBtn, labelClass, solidBtn, textBtn } from '../components/ui'
import { listAssets, signedUrls } from '../lib/assets'
import {
  deleteContent, getContent, SIZES, statusColor, STATUS_LABEL, updateContent,
  type Aspect, type ContentItem, type ContentStatus, type FieldColor, type Layout, type Slide,
} from '../lib/content'
import type { BrandAsset } from '../lib/types'
import { useWorkspace } from '../lib/workspace-context'

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: 'monument', label: 'Monument' },
  { value: 'masthead', label: 'Masthead' },
  { value: 'field', label: 'Color field' },
  { value: 'issue', label: 'Issue' },
  { value: 'framed', label: 'Framed' },
  { value: 'quiet', label: 'Quiet' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'split', label: 'Split' },
  { value: 'type', label: 'Typographic' },
]

const FIELD_COLORS: { value: FieldColor; hex: string; label: string }[] = [
  { value: 'burnt', hex: '#D9622B', label: 'Burnt orange' },
  { value: 'cobalt', hex: '#1F3FBF', label: 'Cobalt' },
  { value: 'olive', hex: '#5F6B2A', label: 'Olive' },
  { value: 'burgundy', hex: '#6B1E2A', label: 'Burgundy' },
  { value: 'ink', hex: '#1E1D1B', label: 'Charcoal' },
  { value: 'ivory', hex: '#F6F2EA', label: 'Ivory' },
]

export function PostEditor() {
  const { id } = useParams()
  const ws = useWorkspace()
  const navigate = useNavigate()
  const canEdit = ws.role !== 'viewer'

  const [item, setItem] = useState<ContentItem | null>(null)
  const [draft, setDraft] = useState<ContentItem | null>(null)
  const [photos, setPhotos] = useState<BrandAsset[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({}) // by storage_path
  const [sel, setSel] = useState(0)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const exportRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([getContent(id), listAssets(ws.id)])
      .then(async ([c, assets]) => {
        setItem(c); setDraft(c); setFeedback(c.feedback ?? '')
        const usable = assets.filter((a) => a.approval === 'approved' && a.kind === 'photo')
        setPhotos(usable)
        setUrls(await signedUrls(usable.map((a) => a.storage_path)))
      })
      .catch((e: Error) => setError(e.message))
  }, [id, ws.id])

  const byId = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos])
  const urlFor = (assetId: string | null) => (assetId && byId[assetId] ? urls[byId[assetId].storage_path] : undefined)

  if (error && !item) return <p role="alert" className="py-16 text-sm">{error}</p>
  if (!item || !draft) return <p className="py-16 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Opening the post…</p>

  const dirty = JSON.stringify({ ...draft, status: item.status }) !== JSON.stringify(item)
  const slide = draft.slides[sel] ?? draft.slides[0]
  const setSlide = (patch: Partial<Slide>) =>
    setDraft({ ...draft, slides: draft.slides.map((s, i) => (i === sel ? { ...s, ...patch } : s)) })

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  const save = () => run('save', async () => {
    const next = await updateContent(item.id, {
      title: draft.title, aspect: draft.aspect, slides: draft.slides, caption: draft.caption,
      hashtags: draft.hashtags, cta: draft.cta, alt_text: draft.alt_text,
    })
    setItem(next); setDraft(next)
  })

  const setStatus = (status: ContentStatus) => run(status, async () => {
    if (dirty) throw new Error('Save your changes first.')
    const next = await updateContent(item.id, { status, feedback: status === 'revision_requested' ? feedback : item.feedback })
    setItem(next); setDraft(next)
  })

  const download = () => run('download', async () => {
    const { w, h } = SIZES[draft.aspect]
    for (let i = 0; i < draft.slides.length; i++) {
      const node = exportRefs.current[i]
      if (!node) continue
      const dataUrl = await toPng(node, { width: w, height: h, pixelRatio: 1, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${draft.content_code ?? 'post'}-${String(i + 1).padStart(2, '0')}.png`
      a.click()
    }
  })

  const copyCaption = () => {
    const text = `${draft.caption ?? ''}\n\n${draft.hashtags.map((h) => `#${h}`).join(' ')}`
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const remove = () => run('delete', async () => { await deleteContent(item.id); navigate('/review') })

  const previewScale = draft.aspect === '9:16' ? 0.3 : 0.42

  return (
    <div className="pt-8 pb-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-5">
        <div className="min-w-0 flex-1">
          <Link to="/review" className={textBtn}>← Review Studio</Link>
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {draft.content_code} · {draft.kind} · {SIZES[draft.aspect].label} · version {item.version}
          </p>
          <input id="post-title" aria-label="Post title" className="mt-1 w-full border-0 bg-transparent font-display text-[clamp(32px,4.5vw,60px)] leading-tight outline-none"
            value={draft.title} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
        <span className={`text-[12px] uppercase tracking-[0.14em] ${statusColor(item.status)}`}>● {STATUS_LABEL[item.status]}</span>
      </div>

      {draft.concept && <p className="mt-5 max-w-[70ch] font-display text-lg italic text-[var(--muted)]">{draft.concept}</p>}
      {draft.missing_facts.length > 0 && (
        <p className="mt-3 max-w-[70ch] border-l-2 border-cherry pl-3 text-sm">
          <span className="text-cherry">Confirm before publishing: </span>{draft.missing_facts.join(' · ')}
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[auto_1fr]">
        {/* Preview */}
        <div className="grid content-start justify-items-start gap-4">
          <div className="bg-paper/60 p-5 shadow-sm">
            <SlideCanvas slide={slide} aspect={draft.aspect} imageUrl={urlFor(slide.asset_id)} index={sel} total={draft.slides.length} wordmark={ws.name} scale={previewScale} />
          </div>
          {draft.slides.length > 1 && (
            <div className="flex max-w-full flex-wrap gap-2" role="tablist" aria-label="Slides">
              {draft.slides.map((s, i) => (
                <button key={i} role="tab" aria-selected={i === sel} onClick={() => { setSel(i); setPicking(false) }}
                  className={`outline-offset-2 ${i === sel ? 'outline outline-2 outline-[var(--accent)]' : 'opacity-70 hover:opacity-100'}`}>
                  <SlideCanvas slide={s} aspect={draft.aspect} imageUrl={urlFor(s.asset_id)} index={i} total={draft.slides.length} wordmark={ws.name} scale={0.07} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid content-start gap-6">
          <section className="grid gap-4 border-b border-[var(--rule)] pb-6">
            <p className={labelClass}>Slide {sel + 1} of {draft.slides.length}</p>
            <div className="flex flex-wrap gap-2">
              {LAYOUTS.map((l) => (
                <button key={l.value} disabled={!canEdit} aria-pressed={slide.layout === l.value} onClick={() => setSlide({ layout: l.value })}
                  className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] ${slide.layout === l.value ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]' : 'border-[var(--rule-strong)]'}`}>
                  {l.label}
                </button>
              ))}
              {draft.kind !== 'story' && (
                <select aria-label="Format" className="border border-[var(--rule-strong)] bg-transparent px-2 py-1.5 text-[11px] uppercase tracking-[0.12em]"
                  value={draft.aspect} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, aspect: e.target.value as Aspect })}>
                  <option value="4:5">Feed 4:5</option>
                  <option value="1:1">Square 1:1</option>
                </select>
              )}
            </div>
            {(slide.layout === 'field' || slide.layout === 'framed') && (
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Field color">
                {FIELD_COLORS.map((c) => (
                  <button key={c.value} role="radio" aria-checked={slide.color === c.value} title={c.label} aria-label={c.label} disabled={!canEdit}
                    onClick={() => setSlide({ color: c.value })}
                    className={`h-8 w-8 border ${slide.color === c.value ? 'outline outline-2 outline-offset-2 outline-[var(--accent)]' : 'border-[var(--rule-strong)]'}`}
                    style={{ background: c.hex }} />
                ))}
              </div>
            )}
            {['monument', 'masthead', 'field'].includes(slide.layout) && (
              <p className="text-xs text-[var(--muted)]">These layouts work best with one to three words. Press Enter in the headline for a line break.</p>
            )}
            <label className="grid gap-1" htmlFor="s-kicker"><span className={labelClass}>Kicker</span>
              <input id="s-kicker" className={fieldClass} value={slide.kicker} disabled={!canEdit} onChange={(e) => setSlide({ kicker: e.target.value })} /></label>
            <label className="grid gap-1" htmlFor="s-headline"><span className={labelClass}>Headline</span>
              <textarea id="s-headline" rows={2} className={`${fieldClass} font-display text-2xl`} value={slide.headline} disabled={!canEdit} onChange={(e) => setSlide({ headline: e.target.value })} /></label>
            <label className="grid gap-1" htmlFor="s-body"><span className={labelClass}>Body</span>
              <textarea id="s-body" rows={3} className={fieldClass} value={slide.body} disabled={!canEdit} onChange={(e) => setSlide({ body: e.target.value })} /></label>
            <div className="flex flex-wrap items-center gap-4">
              <span className={labelClass}>Photo: {slide.asset_id && byId[slide.asset_id] ? byId[slide.asset_id].title : 'none'}</span>
              {canEdit && <button className={textBtn} onClick={() => setPicking((p) => !p)}>{picking ? 'Close photos' : 'Change photo'}</button>}
              {canEdit && slide.asset_id && <button className={textBtn} onClick={() => setSlide({ asset_id: null })}>Remove photo</button>}
            </div>
            {picking && (
              <div className="grid max-h-[360px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
                {photos.map((p) => (
                  <button key={p.id} title={p.title} aria-label={`Use ${p.title}`} onClick={() => { setSlide({ asset_id: p.id }); setPicking(false) }}
                    className={`aspect-square overflow-hidden [&_img]:h-full [&_img]:object-cover ${slide.asset_id === p.id ? 'outline outline-2 outline-[var(--accent)]' : 'opacity-80 hover:opacity-100'}`}>
                    <AssetPreview asset={p} url={urls[p.storage_path]} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 border-b border-[var(--rule)] pb-6">
            <label className="grid gap-1" htmlFor="p-caption"><span className={labelClass}>Caption</span>
              <textarea id="p-caption" rows={7} className={fieldClass} value={draft.caption ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} /></label>
            <label className="grid gap-1" htmlFor="p-tags"><span className={labelClass}>Hashtags, separated by spaces</span>
              <input id="p-tags" className={fieldClass} value={draft.hashtags.map((h) => `#${h}`).join(' ')} disabled={!canEdit}
                onChange={(e) => setDraft({ ...draft, hashtags: e.target.value.split(/\s+/).map((t) => t.replace(/^#/, '')).filter(Boolean) })} /></label>
            <label className="grid gap-1" htmlFor="p-alt"><span className={labelClass}>Alt text (accessibility)</span>
              <input id="p-alt" className={fieldClass} value={draft.alt_text ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, alt_text: e.target.value })} /></label>
            <div className="flex flex-wrap gap-5">
              <button className={textBtn} onClick={copyCaption}>Copy caption + hashtags</button>
              <button className={textBtn} onClick={download} disabled={busy !== null}>{busy === 'download' ? 'Preparing images…' : `Download ${draft.slides.length > 1 ? `${draft.slides.length} images` : 'image'} (PNG)`}</button>
            </div>
          </section>

          {error && <p role="alert" className="border-l-2 border-cherry pl-3 text-sm">{error}</p>}

          {canEdit && (
            <section className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button className={solidBtn} onClick={save} disabled={!dirty || busy !== null}>{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
                {dirty && <span className="text-xs text-[var(--muted)]">Unsaved changes{item.status === 'approved' ? ' · saving will send it back for review' : ''}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button className={`${solidBtn} !border-olive !bg-olive`} onClick={() => setStatus('approved')} disabled={dirty || busy !== null || item.status === 'approved'}>Approve</button>
                <button className={ghostBtn} onClick={() => setStatus('rejected')} disabled={dirty || busy !== null || item.status === 'rejected'}>Reject</button>
                {item.status !== 'ready_for_review' && <button className={textBtn} onClick={() => setStatus('ready_for_review')} disabled={dirty || busy !== null}>Back to review</button>}
              </div>
              <label className="grid gap-1" htmlFor="p-feedback"><span className={labelClass}>Feedback for a revision</span>
                <textarea id="p-feedback" rows={2} className={fieldClass} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. Warmer photo on slide 2, shorter headline." /></label>
              <button className={`${textBtn} justify-self-start`} onClick={() => setStatus('revision_requested')} disabled={dirty || busy !== null || !feedback.trim()}>Request revision</button>
              <div className="border-t border-[var(--rule)] pt-4">
                {!confirmDelete
                  ? <button className={`${textBtn} text-cherry`} onClick={() => setConfirmDelete(true)}>Delete post</button>
                  : <span className="flex flex-wrap items-center gap-4 text-sm">Delete this post permanently?
                      <button className={`${textBtn} text-cherry`} onClick={remove}>Yes, delete</button>
                      <button className={textBtn} onClick={() => setConfirmDelete(false)}>Keep it</button></span>}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Full-size copies used only for PNG export */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
        {draft.slides.map((s, i) => (
          <SlideCanvas key={i} ref={(el) => { exportRefs.current[i] = el }} slide={s} aspect={draft.aspect}
            imageUrl={urlFor(s.asset_id)} index={i} total={draft.slides.length} wordmark={ws.name} />
        ))}
      </div>
    </div>
  )
}
