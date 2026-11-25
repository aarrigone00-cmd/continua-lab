import { useMemo, useState } from 'react'
import { ASSET_KINDS, type Approval, type AssetKind, type AssetOrigin, type BrandAsset } from '../../lib/types'
import { fieldClass, ghostBtn, solidBtn, textBtn } from '../ui'
import { AssetPreview } from './AssetPreview'

type Filters = { kind: AssetKind | 'all'; origin: AssetOrigin | 'all'; approval: Approval | 'all'; q: string }

export function Gallery({ assets, urls, canEdit, onOpen, onSetApproval }: {
  assets: BrandAsset[]
  urls: Record<string, string>
  canEdit: boolean
  onOpen: (a: BrandAsset) => void
  onSetApproval: (ids: string[], approval: Approval) => Promise<void>
}) {
  const [f, setF] = useState<Filters>({ kind: 'all', origin: 'all', approval: 'all', q: '' })
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return assets.filter((a) =>
      (f.kind === 'all' || a.kind === f.kind) &&
      (f.origin === 'all' || a.origin === f.origin) &&
      (f.approval === 'all' || a.approval === f.approval) &&
      (!q || a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)) || (a.description ?? '').toLowerCase().includes(q)),
    )
  }, [assets, f])

  const count = (pred: (a: BrandAsset) => boolean) => assets.filter(pred).length
  const kindsPresent = ASSET_KINDS.filter((k) => assets.some((a) => a.kind === k.value))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const stopSelecting = () => { setSelecting(false); setSelected(new Set()) }

  const apply = async (ids: string[], approval: Approval) => {
    setBusy(true)
    setError(null)
    try {
      await onSetApproval(ids, approval)
      if (selecting) stopSelecting()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const chip = (key: string, on: boolean, label: string, n: number, onClick: () => void) => (
    <button
      key={key}
      onClick={onClick}
      aria-pressed={on}
      className={`whitespace-nowrap text-[12px] uppercase tracking-[0.12em] transition-colors ${on ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
    >
      {label} <sup className="tabular-nums">{n}</sup>
    </button>
  )

  const pendingShown = shown.filter((a) => a.approval === 'pending')

  return (
    <div className="pb-24">
      <div className="grid gap-4 border-y border-[var(--rule)] py-4 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {chip('all', f.kind === 'all', 'Everything', assets.length, () => setF({ ...f, kind: 'all' }))}
          {kindsPresent.map((k) => chip(k.value, f.kind === k.value, k.label, count((a) => a.kind === k.value), () => setF({ ...f, kind: k.value })))}
          <span className="text-[var(--rule-strong)]" aria-hidden="true">/</span>
          {chip('real', f.origin === 'real', 'Real', count((a) => a.origin === 'real'), () => setF({ ...f, origin: f.origin === 'real' ? 'all' : 'real' }))}
          {chip('ai', f.origin === 'ai_generated', 'AI concepts', count((a) => a.origin === 'ai_generated'), () => setF({ ...f, origin: f.origin === 'ai_generated' ? 'all' : 'ai_generated' }))}
          <span className="text-[var(--rule-strong)]" aria-hidden="true">/</span>
          {chip('pending', f.approval === 'pending', 'Pending', count((a) => a.approval === 'pending'), () => setF({ ...f, approval: f.approval === 'pending' ? 'all' : 'pending' }))}
          {chip('approved', f.approval === 'approved', 'Approved', count((a) => a.approval === 'approved'), () => setF({ ...f, approval: f.approval === 'approved' ? 'all' : 'approved' }))}
          {chip('rejected', f.approval === 'rejected', 'Rejected', count((a) => a.approval === 'rejected'), () => setF({ ...f, approval: f.approval === 'rejected' ? 'all' : 'rejected' }))}
        </div>
        <div className="flex flex-wrap items-end gap-5">
          <label htmlFor="asset-search" className="sr-only">Search the archive</label>
          <input id="asset-search" type="search" placeholder="Search titles and tags" className={`${fieldClass} w-56`} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          {canEdit && !selecting && (
            <button className={textBtn} onClick={() => setSelecting(true)}>Select several</button>
          )}
        </div>
      </div>

      {canEdit && !selecting && pendingShown.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-[var(--muted)]">{pendingShown.length} pending in this view.</span>
          <button className={textBtn} disabled={busy} onClick={() => { setSelecting(true); setSelected(new Set(pendingShown.map((a) => a.id))) }}>
            Review them all at once
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-4 border-l-2 border-cherry pl-3 text-sm">Couldn't update: {error}</p>}

      {shown.length === 0 ? (
        <p className="py-16 font-display text-2xl italic text-[var(--muted)]">Nothing matches these filters.</p>
      ) : (
        <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
          {shown.map((a, i) => {
            const isSel = selected.has(a.id)
            return (
              <figure key={a.id} className="group/fig relative mb-8 break-inside-avoid">
                <button
                  onClick={() => (selecting ? toggle(a.id) : onOpen(a))}
                  aria-pressed={selecting ? isSel : undefined}
                  className="group block w-full overflow-hidden text-left"
                  aria-label={selecting ? `${isSel ? 'Deselect' : 'Select'} ${a.title}` : `Open ${a.title}`}
                >
                  <div className={`relative overflow-hidden bg-paper/60 ${selecting && isSel ? 'outline outline-3 -outline-offset-3 outline-[var(--accent)]' : ''}`}>
                    <div className={`transition-[transform,opacity] duration-700 ease-[var(--ease-editorial)] ${selecting ? (isSel ? '' : 'opacity-60') : 'group-hover:scale-[1.03]'}`}>
                      <AssetPreview asset={a} url={urls[a.storage_path]} />
                    </div>
                    {a.origin === 'ai_generated' && (
                      <span className="absolute left-2 top-2 bg-burnt px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-ivory">AI concept</span>
                    )}
                    {selecting && (
                      <span
                        aria-hidden="true"
                        className={`absolute right-2 top-2 grid h-7 w-7 place-items-center border-2 text-sm ${isSel ? 'border-[var(--accent)] bg-[var(--accent)] text-ivory' : 'border-ivory bg-ink/30'}`}
                      >
                        {isSel ? '✓' : ''}
                      </span>
                    )}
                  </div>
                  <figcaption className="mt-2.5 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 text-[12px]">
                    <span className="font-display tabular-nums text-[var(--muted)]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 truncate">{a.title}</span>
                    <span
                      title={a.approval}
                      className={`text-[10px] uppercase tracking-[0.12em] ${a.approval === 'approved' ? 'text-olive' : a.approval === 'rejected' ? 'text-cherry' : 'text-[var(--muted)]'}`}
                    >
                      ● {a.approval}
                    </span>
                  </figcaption>
                </button>

                {/* One-click approve on pending items, outside selection mode */}
                {canEdit && !selecting && a.approval === 'pending' && (
                  <button
                    onClick={() => apply([a.id], 'approved')}
                    disabled={busy}
                    className="absolute right-2 top-2 bg-[var(--bg)]/90 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--fg)] shadow-sm transition-colors hover:bg-olive hover:text-ivory focus-visible:opacity-100 sm:opacity-0 sm:group-hover/fig:opacity-100"
                    aria-label={`Approve ${a.title}`}
                  >
                    ✓ Approve
                  </button>
                )}
              </figure>
            )
          })}
        </div>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--rule-strong)] bg-[var(--bg)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_30px_-20px_rgba(0,0,0,.4)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-[4%] py-4">
            <span className="font-display text-2xl tabular-nums">{selected.size}<span className="ml-2 font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">selected</span></span>
            <button className={textBtn} onClick={() => setSelected(new Set(shown.map((a) => a.id)))}>Select all {shown.length} shown</button>
            {selected.size > 0 && <button className={textBtn} onClick={() => setSelected(new Set())}>Clear</button>}
            <span className="flex-1" />
            <button className={solidBtn} disabled={busy || selected.size === 0} onClick={() => apply([...selected], 'approved')}>
              {busy ? 'Saving…' : `Approve ${selected.size || ''}`}
            </button>
            <button className={ghostBtn} disabled={busy || selected.size === 0} onClick={() => apply([...selected], 'rejected')}>Reject</button>
            <button className={textBtn} disabled={busy} onClick={stopSelecting}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
