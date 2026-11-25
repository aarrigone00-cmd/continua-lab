import { useMemo, useState } from 'react'
import { ASSET_KINDS, type Approval, type AssetKind, type AssetOrigin, type BrandAsset } from '../../lib/types'
import { fieldClass } from '../ui'
import { AssetPreview } from './AssetPreview'

type Filters = { kind: AssetKind | 'all'; origin: AssetOrigin | 'all'; approval: Approval | 'all'; q: string }

export function Gallery({ assets, urls, onOpen }: {
  assets: BrandAsset[]
  urls: Record<string, string>
  onOpen: (a: BrandAsset) => void
}) {
  const [f, setF] = useState<Filters>({ kind: 'all', origin: 'all', approval: 'all', q: '' })

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

  const Chip = ({ on, label, n, onClick }: { on: boolean; label: string; n: number; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`whitespace-nowrap text-[12px] uppercase tracking-[0.12em] transition-colors ${on ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
    >
      {label} <sup className="tabular-nums">{n}</sup>
    </button>
  )

  return (
    <div>
      <div className="grid gap-4 border-y border-[var(--rule)] py-4 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Chip on={f.kind === 'all'} label="Everything" n={assets.length} onClick={() => setF({ ...f, kind: 'all' })} />
          {kindsPresent.map((k) => (
            <Chip key={k.value} on={f.kind === k.value} label={k.label} n={count((a) => a.kind === k.value)} onClick={() => setF({ ...f, kind: k.value })} />
          ))}
          <span className="text-[var(--rule-strong)]" aria-hidden="true">/</span>
          <Chip on={f.origin === 'real'} label="Real" n={count((a) => a.origin === 'real')} onClick={() => setF({ ...f, origin: f.origin === 'real' ? 'all' : 'real' })} />
          <Chip on={f.origin === 'ai_generated'} label="AI concepts" n={count((a) => a.origin === 'ai_generated')} onClick={() => setF({ ...f, origin: f.origin === 'ai_generated' ? 'all' : 'ai_generated' })} />
          <span className="text-[var(--rule-strong)]" aria-hidden="true">/</span>
          <Chip on={f.approval === 'pending'} label="Pending" n={count((a) => a.approval === 'pending')} onClick={() => setF({ ...f, approval: f.approval === 'pending' ? 'all' : 'pending' })} />
          <Chip on={f.approval === 'approved'} label="Approved" n={count((a) => a.approval === 'approved')} onClick={() => setF({ ...f, approval: f.approval === 'approved' ? 'all' : 'approved' })} />
        </div>
        <label htmlFor="asset-search" className="sr-only">Search the archive</label>
        <input id="asset-search" type="search" placeholder="Search titles and tags" className={`${fieldClass} lg:w-64`} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
      </div>

      {shown.length === 0 ? (
        <p className="py-16 font-display text-2xl italic text-[var(--muted)]">Nothing matches these filters.</p>
      ) : (
        <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
          {shown.map((a, i) => (
            <figure key={a.id} className="mb-8 break-inside-avoid">
              <button onClick={() => onOpen(a)} className="group block w-full overflow-hidden text-left" aria-label={`Open ${a.title}`}>
                <div className="relative overflow-hidden bg-paper/60">
                  <div className="transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:scale-[1.03]">
                    <AssetPreview asset={a} url={urls[a.storage_path]} />
                  </div>
                  {a.origin === 'ai_generated' && (
                    <span className="absolute left-2 top-2 bg-burnt px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-ivory">AI concept</span>
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
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
