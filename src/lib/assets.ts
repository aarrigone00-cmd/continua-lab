import { supabase } from './supabase'
import type { AssetKind, AssetOrigin, BrandAsset } from './types'

export const BUCKET = 'brand-assets'
export const MAX_BYTES = 50 * 1024 * 1024 // matches the bucket limit

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif',
  gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  pdf: 'application/pdf', otf: 'font/otf', ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
}

export function mimeOf(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

export function isAllowed(file: File) {
  return Object.values(EXT_MIME).includes(mimeOf(file))
}

export function guessKind(file: File): AssetKind {
  const m = mimeOf(file)
  if (m === 'image/svg+xml') return 'logo'
  if (m.startsWith('image/')) return 'photo'
  if (m.startsWith('video/')) return 'video'
  if (m === 'application/pdf') return 'catalog'
  if (m.startsWith('font/')) return 'font'
  return 'other'
}

export function titleFromFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return base.charAt(0).toUpperCase() + base.slice(1) || 'Untitled'
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file'
}

async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!mimeOf(file).startsWith('image/') || mimeOf(file) === 'image/svg+xml') return null
  try {
    const bmp = await createImageBitmap(file)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return null
  }
}

export async function uploadAsset(opts: {
  workspaceId: string
  file: File
  kind: AssetKind
  origin: AssetOrigin
  aiModel?: string
  source?: string
}): Promise<BrandAsset> {
  const { workspaceId, file, kind, origin, aiModel, source } = opts
  const path = `${workspaceId}/${kind}/${crypto.randomUUID()}-${safeName(file.name)}`
  const contentType = mimeOf(file)

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false })
  if (upErr) throw new Error(upErr.message)

  const size = await imageSize(file)
  const { data, error } = await supabase
    .from('brand_assets')
    .insert({
      workspace_id: workspaceId,
      kind,
      origin,
      ai_model: origin === 'ai_generated' ? aiModel || null : null,
      title: titleFromFilename(file.name),
      storage_path: path,
      mime_type: contentType,
      size_bytes: file.size,
      width: size?.width ?? null,
      height: size?.height ?? null,
      source: source || null,
    })
    .select()
    .single<BrandAsset>()

  if (error) {
    // Don't leave an orphaned file behind.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }
  return data
}

export async function listAssets(workspaceId: string): Promise<BrandAsset[]> {
  const { data, error } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw new Error(error.message)
  return data as BrandAsset[]
}

/** Short-lived private links for displaying files. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60)
  if (error) throw new Error(error.message)
  const map: Record<string, string> = {}
  for (const d of data) if (d.path && d.signedUrl) map[d.path] = d.signedUrl
  return map
}

export async function updateAsset(id: string, patch: Partial<BrandAsset>): Promise<BrandAsset> {
  const { data, error } = await supabase.from('brand_assets').update(patch).eq('id', id).select().single<BrandAsset>()
  if (error) throw new Error(error.message)
  return data
}

/** Approve, reject or reset many assets in one request. */
export async function setApproval(ids: string[], approval: BrandAsset['approval']): Promise<BrandAsset[]> {
  const out: BrandAsset[] = []
  // Batches of 100 keep each request URL short.
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('brand_assets').update({ approval }).in('id', ids.slice(i, i + 100)).select()
    if (error) throw new Error(error.message)
    out.push(...(data as BrandAsset[]))
  }
  return out
}

export async function deleteAsset(asset: BrandAsset) {
  const { error: sErr } = await supabase.storage.from(BUCKET).remove([asset.storage_path])
  if (sErr) throw new Error(sErr.message)
  const { error } = await supabase.from('brand_assets').delete().eq('id', asset.id)
  if (error) throw new Error(error.message)
}

export async function logActivity(workspaceId: string, action: string, entityType: string, entityId?: string, details: object = {}) {
  // Activity logging must never block the user's work.
  await supabase
    .from('activity_log')
    .insert({ workspace_id: workspaceId, action, entity_type: entityType, entity_id: entityId ?? null, details })
    .then(() => undefined, () => undefined)
}

export function formatBytes(n: number | null) {
  if (!n) return '—'
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export type DescribeResult = { id: string; ok: boolean; error?: string; title?: string; cost?: number }

/** Ask Claude to look at up to 4 photos and write title, description and tags. */
export async function describeAssets(workspaceId: string, assetIds: string[]): Promise<DescribeResult[]> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again.')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/describe-assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspace_id: workspaceId, asset_ids: assetIds }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Auto-describe failed (error ${res.status}).`)
  return body.results as DescribeResult[]
}
