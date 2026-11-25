import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BriefForm } from '../components/brand/BriefForm'
import { DescribePanel } from '../components/brand/DescribePanel'
import { AssetDrawer } from '../components/brand/AssetDrawer'
import { Gallery } from '../components/brand/Gallery'
import { ProductEditor } from '../components/brand/ProductEditor'
import { ProductList } from '../components/brand/ProductList'
import { Uploader } from '../components/brand/Uploader'
import { MagneticButton } from '../components/MagneticButton'
import { listAssets, logActivity, setApproval, signedUrls } from '../lib/assets'
import { listProducts } from '../lib/products'
import type { Approval, BrandAsset, Product } from '../lib/types'
import { useWorkspace } from '../lib/workspace-context'

type Tab = 'archive' | 'products' | 'brief'

export function BrandDNA() {
  const ws = useWorkspace()
  const canEdit = ws.role !== 'viewer'
  const [params, setParams] = useSearchParams()
  const tab: Tab = (['archive', 'products', 'brief'] as const).find((t) => t === params.get('tab')) ?? 'archive'
  const setTab = (t: Tab) => setParams(t === 'archive' ? {} : { tab: t }, { replace: true })
  const [assets, setAssets] = useState<BrandAsset[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState<BrandAsset | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  const loadProducts = useCallback(() => listProducts(ws.id).then(setProducts), [ws.id])

  useEffect(() => {
    Promise.all([listAssets(ws.id), listProducts(ws.id)])
      .then(async ([a, p]) => {
        setAssets(a)
        setProducts(p)
        setUrls(await signedUrls(a.map((x) => x.storage_path)))
      })
      .catch((e: Error) => setError(e.message))
  }, [ws.id])

  const onUploaded = async (a: BrandAsset) => {
    setAssets((prev) => [a, ...(prev ?? [])])
    const u = await signedUrls([a.storage_path]).catch(() => ({}))
    setUrls((prev) => ({ ...prev, ...u }))
  }

  const onSetApproval = async (ids: string[], approval: Approval) => {
    const updated = await setApproval(ids, approval)
    const byId = new Map(updated.map((a) => [a.id, a]))
    setAssets((prev) => prev?.map((a) => byId.get(a.id) ?? a) ?? null)
    await logActivity(ws.id, `assets_${approval}`, 'brand_asset', undefined, { count: updated.length })
  }

  const assetsById = useMemo(() => Object.fromEntries((assets ?? []).map((a) => [a.id, a])), [assets])
  const realPhotos = useMemo(() => (assets ?? []).filter((a) => a.origin === 'real' && (a.kind === 'photo' || a.kind === 'video')), [assets])

  const stats = assets && products
    ? [
        { n: assets.length, label: 'assets' },
        { n: assets.filter((a) => a.approval === 'approved').length, label: 'approved' },
        { n: products.length, label: 'products' },
        { n: products.filter((p) => p.fact_status === 'verified').length, label: 'verified' },
      ]
    : []

  return (
    <div className="pb-20">
      <header className="grid grid-cols-12 items-end gap-x-[2%] gap-y-6 pt-10 pb-8">
        <span className="col-span-12 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] md:col-span-2 md:self-start">
          Room II<br className="hidden md:block" /> {ws.name}
        </span>
        <div className="col-span-12 md:col-span-6">
          <h1 className="m-0 font-display text-[clamp(52px,8vw,120px)] font-normal leading-[0.9] tracking-[-0.025em]">
            Brand <em className="text-[var(--accent)]">DNA</em><span className="text-cherry">.</span>
          </h1>
          <p className="mt-5 max-w-[50ch] text-[16px] leading-relaxed">
            Everything Claude is allowed to know about {ws.name}: real photography, catalogs, logos, typefaces
            and verified product facts. Nothing here is used until you approve it.
          </p>
        </div>
        <dl className="col-span-12 grid grid-cols-4 gap-4 md:col-span-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{s.label}</dt>
              <dd className="m-0 font-display text-4xl tabular-nums">{s.n}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--rule-strong)] pt-4">
        <div role="tablist" aria-label="Brand DNA sections" className="flex gap-8">
          {(['archive', 'products', 'brief'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`font-display text-2xl transition-colors ${tab === t ? 'text-[var(--fg)] italic' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>
              {t === 'archive' ? 'The Archive' : t === 'products' ? 'Products' : 'Brief'}
            </button>
          ))}
        </div>
        {canEdit && tab === 'archive' && !uploading && <MagneticButton onClick={() => setUploading(true)}>Add files <span aria-hidden="true">+</span></MagneticButton>}
        {canEdit && tab === 'products' && !editing && <MagneticButton onClick={() => setEditing('new')}>New product <span aria-hidden="true">+</span></MagneticButton>}
      </div>

      {error && <p role="alert" className="mt-6 border-l-2 border-cherry pl-3 text-sm">The library couldn't load: {error}</p>}

      {!assets || !products ? (
        !error && <p className="py-16 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Opening the archive…</p>
      ) : tab === 'brief' ? (
        <BriefForm workspaceId={ws.id} canEdit={canEdit} />
      ) : tab === 'archive' ? (
        <div className="mt-6">
          {uploading && <Uploader workspaceId={ws.id} onUploaded={onUploaded} onClose={() => setUploading(false)} />}
          {assets.length === 0 && !uploading ? (
            <div className="grid gap-4 py-16">
              <p className="font-display text-3xl italic">The archive is empty.</p>
              <p className="max-w-[52ch] text-[var(--muted)]">
                Start with your logo, your brand typefaces and 20–50 of your best real product and showroom photographs.
                Use “Add files” above; you can drop many at once.
              </p>
            </div>
          ) : (
            assets.length > 0 && <>
              {canEdit && <DescribePanel workspaceId={ws.id} assets={assets} onUpdated={setAssets} />}
              <Gallery assets={assets} urls={urls} canEdit={canEdit} onOpen={setOpen} onSetApproval={onSetApproval} />
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {editing ? (
            <ProductEditor
              key={editing === 'new' ? 'new' : editing.id}
              workspaceId={ws.id}
              product={editing === 'new' ? null : editing}
              photos={realPhotos}
              urls={urls}
              onSaved={() => { setEditing(null); loadProducts() }}
              onDeleted={() => { setEditing(null); loadProducts() }}
              onClose={() => setEditing(null)}
            />
          ) : (
            <ProductList products={products} assetsById={assetsById} urls={urls} onOpen={(p) => canEdit && setEditing(p)} />
          )}
        </div>
      )}

      {open && (
        <AssetDrawer
          key={open.id}
          asset={open}
          url={urls[open.storage_path]}
          canEdit={canEdit}
          onChange={(a) => { setAssets((prev) => prev?.map((x) => (x.id === a.id ? a : x)) ?? null); setOpen(a) }}
          onDelete={(id) => { setAssets((prev) => prev?.filter((x) => x.id !== id) ?? null); setOpen(null); loadProducts() }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
