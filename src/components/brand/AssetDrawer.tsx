import { useEffect, useState } from 'react'
import { deleteAsset, formatBytes, logActivity, updateAsset } from '../../lib/assets'
import { ASSET_KINDS, type Approval, type AssetKind, type BrandAsset } from '../../lib/types'
import { fieldClass, ghostBtn, labelClass, solidBtn, textBtn } from '../ui'
import { AssetPreview } from './AssetPreview'

export function AssetDrawer({ asset, url, canEdit, onChange, onDelete, onClose }: {
  asset: BrandAsset
  url?: string
  canEdit: boolean
  onChange: (a: BrandAsset) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(asset.title)
  const [description, setDescription] = useState(asset.description ?? '')
  const [tags, setTags] = useState(asset.tags.join(', '))
  const [source, setSource] = useState(asset.source ?? '')
  const [kind, setKind] = useState<AssetKind>(asset.kind)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const save = () => run(async () => {
    const next = await updateAsset(asset.id, {
      title: title.trim() || asset.title,
      description: description.trim() || null,
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      source: source.trim() || null,
      kind,
    })
    onChange(next)
  })

  const setApproval = (approval: Approval) => run(async () => {
    const next = await updateAsset(asset.id, { approval })
    await logActivity(asset.workspace_id, `asset_${approval}`, 'brand_asset', asset.id)
    onChange(next)
  })

  const remove = () => run(async () => {
    await deleteAsset(asset)
    await logActivity(asset.workspace_id, 'asset_deleted', 'brand_asset', asset.id, { title: asset.title })
    onDelete(asset.id)
  })

  const dirty =
    title !== asset.title || description !== (asset.description ?? '') || tags !== asset.tags.join(', ') ||
    source !== (asset.source ?? '') || kind !== asset.kind

  return (
    <div className="fixed inset-0 z-30 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="asset-title">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[880px] flex-col overflow-y-auto bg-[var(--bg)] shadow-2xl">
        <div className="grid min-h-full gap-0 md:grid-cols-[1.1fr_1fr]">
          <div className="bg-paper/60 p-6 dark:bg-white/5">
            <AssetPreview asset={asset} url={url} large />
            {url && <a href={url} target="_blank" rel="noreferrer" className={`${textBtn} mt-4 inline-block`}>Open original ↗</a>}
          </div>

          <div className="grid content-start gap-5 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <p className={`${labelClass} ${asset.origin === 'ai_generated' ? 'text-burnt' : ''}`}>
                {asset.origin === 'real' ? 'Real · ' : `AI-generated · ${asset.ai_model} · `}
                {asset.kind} · {formatBytes(asset.size_bytes)}
                {asset.width ? ` · ${asset.width}×${asset.height}` : ''}
                {asset.auto_described_at ? ' · described by Claude' : ''}
              </p>
              <button className={textBtn} onClick={onClose}>Close</button>
            </div>

            <label className="grid gap-1" htmlFor="asset-title">
              <span className={labelClass}>Title</span>
              <input id="asset-title" className={`${fieldClass} font-display text-2xl`} value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="grid gap-1" htmlFor="asset-kind">
              <span className={labelClass}>Type</span>
              <select id="asset-kind" className={fieldClass} value={kind} disabled={!canEdit} onChange={(e) => setKind(e.target.value as AssetKind)}>
                {ASSET_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="asset-desc">
              <span className={labelClass}>Description</span>
              <textarea id="asset-desc" rows={3} className={fieldClass} value={description} disabled={!canEdit} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="grid gap-1" htmlFor="asset-tags">
              <span className={labelClass}>Tags, separated by commas</span>
              <input id="asset-tags" className={fieldClass} placeholder="travertine, living room, warm light" value={tags} disabled={!canEdit} onChange={(e) => setTags(e.target.value)} />
            </label>
            <label className="grid gap-1" htmlFor="asset-src">
              <span className={labelClass}>Source</span>
              <input id="asset-src" className={fieldClass} value={source} disabled={!canEdit} onChange={(e) => setSource(e.target.value)} />
            </label>

            {canEdit && (
              <button className={`${ghostBtn} justify-self-start`} onClick={save} disabled={busy || !dirty}>Save changes</button>
            )}

            <div className="mt-2 border-t border-[var(--rule)] pt-5">
              <p className={labelClass}>
                Status:{' '}
                <span className={asset.approval === 'approved' ? 'text-olive' : asset.approval === 'rejected' ? 'text-cherry' : ''}>
                  {asset.approval}
                </span>
              </p>
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button className={solidBtn} onClick={() => setApproval('approved')} disabled={busy || asset.approval === 'approved'}>Approve</button>
                  <button className={ghostBtn} onClick={() => setApproval('rejected')} disabled={busy || asset.approval === 'rejected'}>Reject</button>
                  {asset.approval !== 'pending' && (
                    <button className={textBtn} onClick={() => setApproval('pending')} disabled={busy}>Back to pending</button>
                  )}
                </div>
              )}
            </div>

            {error && <p role="alert" className="border-l-2 border-cherry pl-3 text-sm">{error}</p>}

            {canEdit && (
              <div className="mt-4 border-t border-[var(--rule)] pt-5">
                {!confirmDelete ? (
                  <button className={`${textBtn} text-cherry`} onClick={() => setConfirmDelete(true)}>Delete this asset</button>
                ) : (
                  <div className="grid gap-3">
                    <p className="text-sm">This permanently removes the file and its record. It can't be undone.</p>
                    <div className="flex gap-4">
                      <button className={`${solidBtn} !border-cherry !bg-cherry`} onClick={remove} disabled={busy}>Delete permanently</button>
                      <button className={textBtn} onClick={() => setConfirmDelete(false)}>Keep it</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
