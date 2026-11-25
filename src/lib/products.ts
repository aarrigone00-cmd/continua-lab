import { supabase } from './supabase'
import type { Product } from './types'

export type ProductDraft = Omit<Product, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'product_assets'>

export const emptyDraft: ProductDraft = {
  name: '', sku: null, category: 'furniture', collection: null, designer: null, maker: null,
  materials: [], finishes: [], dimensions: null, description: null, source: null,
  fact_status: 'needs_review', review_notes: null,
}

export async function listProducts(workspaceId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_assets(asset_id, is_primary)')
    .eq('workspace_id', workspaceId)
    .order('name')
  if (error) throw new Error(error.message)
  return data as Product[]
}

export async function saveProduct(workspaceId: string, draft: ProductDraft, id?: string): Promise<Product> {
  const q = id
    ? supabase.from('products').update(draft).eq('id', id)
    : supabase.from('products').insert({ ...draft, workspace_id: workspaceId })
  const { data, error } = await q.select().single<Product>()
  if (error) {
    if (error.message.includes('verified_products_cite_a_source'))
      throw new Error('A product can only be marked verified once its source is filled in.')
    if (error.message.includes('products_workspace_id_sku_key'))
      throw new Error('Another product already uses this SKU.')
    throw new Error(error.message)
  }
  return data
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Replace a product's linked photos with exactly `assetIds`. */
export async function setProductAssets(workspaceId: string, productId: string, assetIds: string[], primaryId?: string) {
  const { error: delErr } = await supabase.from('product_assets').delete().eq('product_id', productId)
  if (delErr) throw new Error(delErr.message)
  if (assetIds.length === 0) return
  const rows = assetIds.map((asset_id) => ({
    product_id: productId, asset_id, workspace_id: workspaceId, is_primary: asset_id === (primaryId ?? assetIds[0]),
  }))
  const { error } = await supabase.from('product_assets').insert(rows)
  if (error) throw new Error(error.message)
}

/** Facts Claude would need that are still empty. Never filled in by AI. */
export function missingFacts(p: Pick<Product, 'collection' | 'materials' | 'dimensions' | 'description' | 'source'>, photoCount: number) {
  const missing: string[] = []
  if (!p.source) missing.push('source')
  if (!p.description) missing.push('description')
  if (p.materials.length === 0) missing.push('materials')
  if (!p.dimensions) missing.push('dimensions')
  if (!p.collection) missing.push('collection')
  if (photoCount === 0) missing.push('photo')
  return missing
}

export const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
