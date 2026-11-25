export type Role = 'owner' | 'editor' | 'viewer'

export type Workspace = {
  id: string
  name: string
  slug: string
  role: Role
}

export type AssetKind = 'photo' | 'video' | 'catalog' | 'logo' | 'font' | 'guideline' | 'document' | 'other'
export type AssetOrigin = 'real' | 'ai_generated'
export type Approval = 'pending' | 'approved' | 'rejected'

export type BrandAsset = {
  id: string
  workspace_id: string
  kind: AssetKind
  origin: AssetOrigin
  ai_model: string | null
  title: string
  description: string | null
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  tags: string[]
  approval: Approval
  source: string | null
  auto_described_at?: string | null
  created_at: string
  updated_at: string
}

export type ProductCategory = 'furniture' | 'surface' | 'finish' | 'lighting' | 'accessory' | 'other'
export type FactStatus = 'needs_review' | 'verified'

export type Product = {
  id: string
  workspace_id: string
  name: string
  sku: string | null
  category: ProductCategory
  collection: string | null
  designer: string | null
  maker: string | null
  materials: string[]
  finishes: string[]
  dimensions: string | null
  description: string | null
  source: string | null
  fact_status: FactStatus
  review_notes: string | null
  created_at: string
  updated_at: string
  product_assets?: { asset_id: string; is_primary: boolean }[]
}

export const ASSET_KINDS: { value: AssetKind; label: string }[] = [
  { value: 'photo', label: 'Photography' },
  { value: 'video', label: 'Video' },
  { value: 'catalog', label: 'Catalogs' },
  { value: 'logo', label: 'Logos' },
  { value: 'font', label: 'Fonts' },
  { value: 'guideline', label: 'Guidelines' },
  { value: 'document', label: 'Documents' },
  { value: 'other', label: 'Other' },
]

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'surface', label: 'Surfaces' },
  { value: 'finish', label: 'Finishes' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'accessory', label: 'Accessories' },
  { value: 'other', label: 'Other' },
]
