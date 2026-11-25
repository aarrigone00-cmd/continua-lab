// CONTINUA LAB · Auto-describe
// Claude looks at approved/pending photos and writes a factual title, description and tags.
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'
import { createClient } from 'npm:@supabase/supabase-js@2.58.0'

const MODEL = 'claude-opus-5-5'
const PRICE = { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 } // USD per million tokens (estimate)
const MAX_PER_CALL = 4

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function envKey(jsonName: string, legacyName: string): string | undefined {
  const raw = Deno.env.get(jsonName)
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>
      const v = map.default ?? Object.values(map)[0]
      if (v) return v
    } catch { /* fall back */ }
  }
  return Deno.env.get(legacyName)
}

const SYSTEM = `You catalogue photographs for the private brand library of an Italian design showroom in Miami (furniture, natural stone, porcelain slabs, surfaces, finishes, wallpaper, bathroom and kitchen fixtures).
Describe ONLY what is visible. Do not guess brand names, product names, designers, prices or exact materials you cannot see; if a material is uncertain, describe its appearance (e.g. "white stone with grey veining", not "Calacatta marble"). Only name a brand if its name or logo is clearly legible in the image.
Write in American English, concise and editorial, no marketing language.
- title: 3-8 words, specific and evocative but factual (e.g. "Veined stone wall behind walnut console").
- description: 1-2 sentences about subject, setting, light and composition.
- tags: 5-12 lowercase tags: objects, apparent materials, colors, mood, room type.
- shot: one of "wide", "medium", "detail", "close-up".
- setting: e.g. "showroom vignette", "bathroom display", "material sample", "exterior", "product on white".
- people_visible: true if any person is identifiable or visible.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'tags', 'shot', 'setting', 'people_visible'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    shot: { type: 'string', enum: ['wide', 'medium', 'detail', 'close-up'] },
    setting: { type: 'string' },
    people_visible: { type: 'boolean' },
  },
}

type Result = { id: string; ok: boolean; error?: string; title?: string; cost?: number }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = envKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const serviceKey = envKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey) return json(500, { error: 'The Claude API key is not configured.' })
  if (!anonKey || !serviceKey) return json(500, { error: 'The backend is missing its Supabase keys.' })

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return json(401, { error: 'Please sign in again.' })

  let body: { workspace_id?: string; asset_ids?: string[] }
  try { body = await req.json() } catch { return json(400, { error: 'Invalid request.' }) }
  const ws = body.workspace_id
  const ids = (body.asset_ids ?? []).slice(0, MAX_PER_CALL)
  if (!ws || ids.length === 0) return json(400, { error: 'Nothing to describe.' })

  const { data: member, error: memberErr } = await userClient.from('workspace_members').select('role').eq('workspace_id', ws).eq('user_id', userData.user.id).maybeSingle()
  if (memberErr) return json(500, { error: `Couldn't check access: ${memberErr.message}` })
  if (!member || member.role === 'viewer') return json(403, { error: 'You do not have access to this workspace.' })

  const admin = createClient(url, serviceKey)

  // Budget guard (same rule as the Creative Director).
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
  const [{ data: settings }, { data: spendRows, error: spendErr }] = await Promise.all([
    admin.from('workspace_settings').select('monthly_budget_usd').eq('workspace_id', ws).maybeSingle(),
    admin.from('api_usage').select('estimated_cost_usd').eq('workspace_id', ws).gte('created_at', monthStart),
  ])
  if (spendErr) return json(500, { error: `The backend couldn't reach the database: ${spendErr.message}` })
  const spent = (spendRows ?? []).reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0)
  const budget = Number(settings?.monthly_budget_usd ?? 0)
  if (budget > 0 && spent >= budget) return json(402, { error: `This month's AI budget ($${budget.toFixed(2)}) has been reached.` })

  const { data: assets, error: aErr } = await admin.from('brand_assets')
    .select('id, workspace_id, kind, origin, mime_type, storage_path, tags')
    .eq('workspace_id', ws).in('id', ids)
  if (aErr) return json(500, { error: aErr.message })

  const anthropic = new Anthropic({ apiKey })

  const results: Result[] = await Promise.all((assets ?? []).map(async (a): Promise<Result> => {
    try {
      if (!a.mime_type?.startsWith('image/') || a.mime_type === 'image/svg+xml') return { id: a.id, ok: false, error: 'Only photos can be described.' }
      const { data: signed, error: sErr } = await admin.storage.from('brand-assets').createSignedUrl(a.storage_path, 300)
      if (sErr || !signed) return { id: a.id, ok: false, error: 'Could not read the file.' }

      const msg = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: signed.signedUrl } },
            { type: 'text', text: `Catalogue this ${a.origin === 'real' ? 'real photograph' : 'AI-generated concept image'}.` },
          ],
        }],
      })

      const u = msg.usage
      const cost = ((u.input_tokens ?? 0) * PRICE.input + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
        (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.output_tokens ?? 0) * PRICE.output) / 1_000_000
      await admin.from('api_usage').insert({
        workspace_id: ws, provider: 'anthropic', operation: 'auto_describe_asset',
        units: { model: msg.model, asset_id: a.id, input: u.input_tokens, output: u.output_tokens },
        estimated_cost_usd: Number(cost.toFixed(4)),
      })

      if (msg.stop_reason === 'refusal') return { id: a.id, ok: false, error: 'Claude declined to describe this image.', cost }
      if (msg.stop_reason === 'max_tokens') return { id: a.id, ok: false, error: 'The description was cut off. Try again.', cost }
      const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
      const out = JSON.parse(text) as { title: string; description: string; tags: string[]; shot: string; setting: string; people_visible: boolean }

      const tags = Array.from(new Set([
        ...(a.tags as string[] ?? []),
        ...out.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
        out.shot, out.setting.toLowerCase(),
        ...(out.people_visible ? ['people visible'] : []),
      ])).slice(0, 20)

      const { error: upErr } = await admin.from('brand_assets').update({
        title: out.title.trim().slice(0, 120) || 'Untitled',
        description: out.description.trim(),
        tags,
        auto_described_at: new Date().toISOString(),
        auto_description_model: msg.model,
      }).eq('id', a.id)
      if (upErr) return { id: a.id, ok: false, error: upErr.message, cost }
      return { id: a.id, ok: true, title: out.title, cost }
    } catch (err) {
      console.error('describe failed', a.id, err)
      const message = err instanceof Anthropic.APIError ? `Claude API error (${err.status}): ${err.message}` : 'Description failed.'
      return { id: a.id, ok: false, error: message }
    }
  }))

  return json(200, { results })
})
