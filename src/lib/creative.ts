import { supabase } from './supabase'

export type Conversation = { id: string; title: string; updated_at: string }
export type ChatMessage = { id: number | string; role: 'user' | 'assistant'; content: string; usage?: { estimated_cost_usd?: number } | null }

export type Brief = {
  workspace_id: string
  summary: string | null
  offerings: string | null
  showroom: string | null
  brands: string | null
  audience: string | null
  voice: string | null
  never_sound: string | null
  avoid_words: string | null
  inspirations: string | null
  language: string
  presenter: string | null
  off_limits: string | null
}

export async function listConversations(workspaceId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('cd_conversations')
    .select('id, title, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('cd_messages')
    .select('id, role, content, usage')
    .eq('conversation_id', conversationId)
    .order('id')
  if (error) throw new Error(error.message)
  return data as ChatMessage[]
}

export async function deleteConversation(id: string) {
  const { error } = await supabase.from('cd_conversations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export type StreamDone = { estimated_cost_usd: number; month_spend_usd: number; budget_usd: number; truncated: boolean }

/** Sends a message and streams Claude's reply. Resolves when the reply is complete. */
export async function streamChat(
  params: { workspaceId: string; conversationId: string | null; message: string },
  handlers: { onStart: (conversationId: string) => void; onText: (t: string) => void },
): Promise<StreamDone> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again.')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creative-director`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspace_id: params.workspaceId, conversation_id: params.conversationId, message: params.message }),
  })

  if (!res.ok || !res.body) {
    let msg = `The Creative Director couldn't respond (error ${res.status}).`
    try { msg = (await res.json()).error ?? msg } catch { /* not JSON */ }
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: StreamDone | null = null

  for (;;) {
    const { value, done: finished } = await reader.read()
    if (finished) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const line = chunk.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const evt = JSON.parse(line.slice(6))
      if (evt.type === 'start') handlers.onStart(evt.conversation_id)
      else if (evt.type === 'text') handlers.onText(evt.text)
      else if (evt.type === 'done') done = evt
      else if (evt.type === 'error') throw new Error(evt.message)
    }
  }
  if (!done) throw new Error('The connection closed before Claude finished. The partial reply was not saved.')
  return done
}

export async function getBrief(workspaceId: string): Promise<Brief | null> {
  const { data, error } = await supabase.from('brand_brief').select('*').eq('workspace_id', workspaceId).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Brief | null
}

export async function saveBrief(brief: Brief) {
  const { error } = await supabase.from('brand_brief').upsert(brief)
  if (error) throw new Error(error.message)
}
