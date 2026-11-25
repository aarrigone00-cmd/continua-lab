import { supabase } from './supabase'

export type Aspect = '4:5' | '1:1' | '9:16'
export type Layout = 'editorial' | 'split' | 'type' | 'monument' | 'masthead' | 'field' | 'issue' | 'framed' | 'quiet'
export type FieldColor = 'burnt' | 'cobalt' | 'olive' | 'burgundy' | 'ink' | 'ivory'
export type ContentStatus =
  | 'idea' | 'draft' | 'ready_for_review' | 'revision_requested' | 'approved'
  | 'scheduled' | 'published' | 'rejected' | 'failed'

export type Slide = { asset_id: string | null; layout: Layout; kicker: string; headline: string; body: string; color?: FieldColor }

export type ContentItem = {
  id: string
  workspace_id: string
  content_code: string | null
  kind: 'post' | 'carousel' | 'story' | 'video'
  status: ContentStatus
  title: string
  concept: string | null
  aspect: Aspect
  slides: Slide[]
  caption: string | null
  hashtags: string[]
  cta: string | null
  alt_text: string | null
  missing_facts: string[]
  feedback: string | null
  version: number
  approved_at: string | null
  created_at: string
  updated_at: string
}

export const SIZES: Record<Aspect, { w: number; h: number; label: string }> = {
  '4:5': { w: 1080, h: 1350, label: 'Feed 4:5' },
  '1:1': { w: 1080, h: 1080, label: 'Square 1:1' },
  '9:16': { w: 1080, h: 1920, label: 'Story 9:16' },
}

export const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: 'Idea', draft: 'Draft', ready_for_review: 'Ready for review', revision_requested: 'Revision requested',
  approved: 'Approved', scheduled: 'Scheduled', published: 'Published', rejected: 'Rejected', failed: 'Failed',
}

export async function listContent(workspaceId: string): Promise<ContentItem[]> {
  const { data, error } = await supabase.from('content_items').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(300)
  if (error) throw new Error(error.message)
  return data as ContentItem[]
}

export async function getContent(id: string): Promise<ContentItem> {
  const { data, error } = await supabase.from('content_items').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as ContentItem
}

export async function updateContent(id: string, patch: Partial<ContentItem>): Promise<ContentItem> {
  const { data, error } = await supabase.from('content_items').update(patch).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as ContentItem
}

export async function deleteContent(id: string) {
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Claude art-directs a post from an idea; returns the new content item id. */
export async function composePost(params: { workspaceId: string; idea: string; format: 'auto' | 'post' | 'carousel' | 'story'; conversationId?: string | null }) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again.')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compose-post`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: params.workspaceId, idea: params.idea, format: params.format, conversation_id: params.conversationId ?? null }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Composing the post failed (error ${res.status}).`)
  return body as { id: string; estimated_cost_usd: number }
}

/** Signed URLs for the photos used in a set of content items. */
export async function slideImageUrls(items: ContentItem[]): Promise<Record<string, string>> {
  const ids = [...new Set(items.flatMap((i) => i.slides.map((s) => s.asset_id).filter(Boolean)))] as string[]
  if (ids.length === 0) return {}
  const { data, error } = await supabase.from('brand_assets').select('id, storage_path').in('id', ids)
  if (error || !data) return {}
  const { data: signed } = await supabase.storage.from('brand-assets').createSignedUrls(data.map((d) => d.storage_path), 3600)
  const byPath = Object.fromEntries((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path, s.signedUrl]))
  return Object.fromEntries(data.map((d) => [d.id, byPath[d.storage_path]]).filter(([, u]) => u))
}

export function statusColor(s: ContentStatus) {
  if (s === 'approved' || s === 'published' || s === 'scheduled') return 'text-olive'
  if (s === 'rejected' || s === 'failed') return 'text-cherry'
  if (s === 'revision_requested') return 'text-burnt'
  return 'text-[var(--accent)]'
}
