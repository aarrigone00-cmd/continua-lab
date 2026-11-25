import { useState } from 'react'
import { logActivity } from '../../lib/assets'
import { deleteProduct, emptyDraft, missingFacts, saveProduct, setProductAssets, splitList, type ProductDraft } from '../../lib/products'
import { PRODUCT_CATEGORIES, type BrandAsset, type Product, type ProductCategory } from '../../lib/types'
import { fieldClass, ghostBtn, labelClass, solidBtn, textBtn } from '../ui'
import { AssetPreview } from './AssetPreview'

export function ProductEditor({ workspaceId, product, photos, urls, onSaved, onDeleted, onClose }: {
  workspaceId: string
  product: Product | null
  photos: BrandAsset[] // real photos/videos only
  urls: Record<string, string>
  onSaved: () => void
  onDeleted: () => void
  onClose: () => void
}) {
  const init: ProductDraft = product ? { ...emptyDraft, ...pick(product) } : emptyDraft
  const [d, setD] = useState<ProductDraft>(init)
  const [materials, setMaterials] = useState(init.materials.join(', '))
  const [finishes, setFinishes] = useState(init.finishes.join(', '))
  const [linked, setLinked] = useState<string[]>(product?.product_assets?.map((l) => l.asset_id) ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const text = (k: keyof ProductDraft) => (e: { target: { value: string } }) => set(k, (e.target.value || null) as never)

  const draftNow = { ...d, materials: splitList(materials), finishes: splitList(finishes) }
  const missing = missingFacts(draftNow, linked.length)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!d.name.trim()) throw new Error('Give the product a name.')
      const saved = await saveProduct(workspaceId, { ...draftNow, name: d.name.trim() }, product?.id)
      await setProductAssets(workspaceId, saved.id, linked)
      await logActivity(workspaceId, product ? 'product_updated' : 'product_created', 'product', saved.id, { name: saved.name })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!product) return
    setBusy(true)
    try {
      await deleteProduct(product.id)
      await logActivity(workspaceId, 'product_deleted', 'product', product.id, { name: product.name })
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const toggle = (id: string) => setLinked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const F = ({ id, label, k, placeholder }: { id: string; label: string; k: keyof ProductDraft; placeholder?: string }) => (
    <label className="grid gap-1" htmlFor={id}>
      <span className={labelClass}>{label}</span>
      <input id={id} className={fieldClass} placeholder={placeholder} value={(d[k] as string | null) ?? ''} onChange={text(k)} />
    </label>
  )

  return (
    <section aria-labelledby="product-editor-title" className="border-t border-[var(--rule-strong)] py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="product-editor-title" className="font-display text-3xl font-normal">
          {product ? 'Edit product' : 'New product'}
        </h2>
        <button className={textBtn} onClick={onClose}>Close</button>
      </div>

      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <label className="grid gap-1" htmlFor="p-name">
            <span className={labelClass}>Name (required)</span>
            <input id="p-name" className={`${fieldClass} font-display text-2xl`} value={d.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1" htmlFor="p-category">
              <span className={labelClass}>Category</span>
              <select id="p-category" className={fieldClass} value={d.category} onChange={(e) => set('category', e.target.value as ProductCategory)}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            {F({ id: 'p-sku', label: 'SKU / code', k: 'sku' })}
            {F({ id: 'p-collection', label: 'Collection', k: 'collection' })}
            {F({ id: 'p-designer', label: 'Designer', k: 'designer' })}
            {F({ id: 'p-maker', label: 'Maker / brand', k: 'maker' })}
            {F({ id: 'p-dimensions', label: 'Dimensions', k: 'dimensions', placeholder: 'e.g. W 240 × D 98 × H 72 cm' })}
          </div>
          <label className="grid gap-1" htmlFor="p-materials">
            <span className={labelClass}>Materials, separated by commas</span>
            <input id="p-materials" className={fieldClass} value={materials} onChange={(e) => setMaterials(e.target.value)} />
          </label>
          <label className="grid gap-1" htmlFor="p-finishes">
            <span className={labelClass}>Finishes, separated by commas</span>
            <input id="p-finishes" className={fieldClass} value={finishes} onChange={(e) => setFinishes(e.target.value)} />
          </label>
          <label className="grid gap-1" htmlFor="p-description">
            <span className={labelClass}>Description</span>
            <textarea id="p-description" rows={4} className={fieldClass} value={d.description ?? ''} onChange={text('description')} />
          </label>
          {F({ id: 'p-source', label: 'Source of these facts', k: 'source', placeholder: 'e.g. 2026 catalog p. 14, or supplier URL' })}
        </div>

        <div className="grid content-start gap-5">
          <div>
            <p className={labelClass}>Photography ({linked.length} linked)</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Only real photos and videos can represent a product. AI concepts are excluded.</p>
            {photos.length === 0 ? (
              <p className="mt-4 text-sm italic text-[var(--muted)]">Upload real product photography in the Archive first.</p>
            ) : (
              <div className="mt-3 grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {photos.map((p) => {
                  const on = linked.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      aria-pressed={on}
                      aria-label={`${on ? 'Unlink' : 'Link'} ${p.title}`}
                      className={`relative overflow-hidden outline-offset-2 ${on ? 'outline outline-2 outline-[var(--accent)]' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <div className="aspect-square overflow-hidden [&_img]:h-full [&_img]:object-cover [&_video]:h-full [&_video]:object-cover">
                        <AssetPreview asset={p} url={urls[p.storage_path]} />
                      </div>
                      {on && linked[0] === p.id && (
                        <span className="absolute bottom-1 left-1 bg-[var(--accent)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-ivory">Cover</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--rule)] pt-5">
            <p className={labelClass}>Fact check</p>
            {missing.length > 0 ? (
              <p className="mt-2 text-sm">
                <span className="text-cherry">Missing: </span>{missing.join(', ')}.{' '}
                <span className="text-[var(--muted)]">Claude will never fill these in by guessing.</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-olive">All key facts are present.</p>
            )}
            <label className="mt-4 flex items-start gap-3" htmlFor="p-verified">
              <input
                id="p-verified"
                type="checkbox"
                className="mt-1 accent-[var(--accent)]"
                checked={d.fact_status === 'verified'}
                onChange={(e) => set('fact_status', e.target.checked ? 'verified' : 'needs_review')}
              />
              <span className="text-sm">
                I've checked these facts against the source. <span className="text-[var(--muted)]">Only verified products are used by Claude.</span>
              </span>
            </label>
            <label className="mt-4 grid gap-1" htmlFor="p-notes">
              <span className={labelClass}>Review notes</span>
              <input id="p-notes" className={fieldClass} value={d.review_notes ?? ''} onChange={text('review_notes')} />
            </label>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-6 border-l-2 border-cherry pl-3 text-sm">{error}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button className={solidBtn} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        <button className={ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
        {product && !confirmDelete && <button className={`${textBtn} text-cherry`} onClick={() => setConfirmDelete(true)}>Delete product</button>}
        {product && confirmDelete && (
          <span className="flex flex-wrap items-center gap-4 text-sm">
            Delete “{product.name}”? Its photos stay in the archive.
            <button className={`${textBtn} text-cherry`} onClick={remove} disabled={busy}>Yes, delete</button>
            <button className={textBtn} onClick={() => setConfirmDelete(false)}>Keep it</button>
          </span>
        )}
      </div>
    </section>
  )
}

function pick(p: Product): ProductDraft {
  const { name, sku, category, collection, designer, maker, materials, finishes, dimensions, description, source, fact_status, review_notes } = p
  return { name, sku, category, collection, designer, maker, materials, finishes, dimensions, description, source, fact_status, review_notes }
}
