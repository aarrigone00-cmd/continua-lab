import { useMemo, useState } from 'react'
import { missingFacts } from '../../lib/products'
import { PRODUCT_CATEGORIES, type BrandAsset, type Product, type ProductCategory } from '../../lib/types'
import { fieldClass } from '../ui'
import { AssetPreview } from './AssetPreview'

export function ProductList({ products, assetsById, urls, onOpen }: {
  products: Product[]
  assetsById: Record<string, BrandAsset>
  urls: Record<string, string>
  onOpen: (p: Product) => void
}) {
  const [cat, setCat] = useState<ProductCategory | 'all'>('all')
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) =>
      (cat === 'all' || p.category === cat) &&
      (!s || [p.name, p.collection, p.designer, p.sku, ...p.materials].some((v) => v?.toLowerCase().includes(s))),
    )
  }, [products, cat, q])

  if (products.length === 0) {
    return (
      <p className="py-16 font-display text-2xl italic text-[var(--muted)]">
        No products yet. Add the first one to start the catalog.
      </p>
    )
  }

  return (
    <div>
      <div className="grid gap-4 border-y border-[var(--rule)] py-4 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {[{ value: 'all' as const, label: 'All' }, ...PRODUCT_CATEGORIES].map((c) => {
            const n = c.value === 'all' ? products.length : products.filter((p) => p.category === c.value).length
            if (n === 0 && c.value !== 'all') return null
            return (
              <button key={c.value} onClick={() => setCat(c.value)} aria-pressed={cat === c.value}
                className={`text-[12px] uppercase tracking-[0.12em] ${cat === c.value ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>
                {c.label} <sup className="tabular-nums">{n}</sup>
              </button>
            )
          })}
        </div>
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <input id="product-search" type="search" placeholder="Search name, designer, material" className={`${fieldClass} lg:w-64`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <ol className="divide-y divide-[var(--rule)]">
        {shown.map((p, i) => {
          const links = p.product_assets ?? []
          const cover = assetsById[(links.find((l) => l.is_primary) ?? links[0])?.asset_id ?? '']
          const missing = missingFacts(p, links.length)
          return (
            <li key={p.id}>
              <button onClick={() => onOpen(p)} className="group grid w-full grid-cols-[2.5rem_4.5rem_1fr] items-center gap-4 py-4 text-left sm:grid-cols-[2.5rem_5.5rem_1fr_auto]">
                <span className="font-display text-lg tabular-nums text-[var(--muted)]">{String(i + 1).padStart(2, '0')}</span>
                <div className="aspect-square overflow-hidden bg-paper/60 [&_img]:h-full [&_img]:object-cover">
                  {cover && <AssetPreview asset={cover} url={urls[cover.storage_path]} />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-2xl transition-colors group-hover:text-[var(--accent)]">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    {[p.category, p.collection, p.designer].filter(Boolean).join(' · ')}
                  </p>
                  {missing.length > 0 && <p className="mt-1 text-xs text-cherry">Missing: {missing.join(', ')}</p>}
                </div>
                <span className={`col-span-full text-[11px] uppercase tracking-[0.12em] sm:col-span-1 ${p.fact_status === 'verified' ? 'text-olive' : 'text-[var(--muted)]'}`}>
                  ● {p.fact_status === 'verified' ? 'Verified' : 'Needs review'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
