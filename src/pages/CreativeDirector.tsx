import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, useNavigate } from 'react-router-dom'
import { composePost } from '../lib/content'
import { deleteConversation, listConversations, listMessages, streamChat, type ChatMessage, type Conversation } from '../lib/creative'
import { useWorkspace } from '../lib/workspace-context'
import { solidBtn, textBtn } from '../components/ui'

const PROMPTS = [
  'Write one video package about honed versus polished stone.',
  'Create a campaign inspired by Milan Design Week.',
  'Five educational video ideas about common lighting mistakes.',
  'Make this caption more sophisticated: ',
  'Surprise me with an unconventional campaign idea.',
  'What is missing from our Brand DNA before you can write well?',
]

type Status = { kind: 'idle' } | { kind: 'waiting' } | { kind: 'streaming' } | { kind: 'error'; message: string }

export function CreativeDirector() {
  const ws = useWorkspace()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [lastCost, setLastCost] = useState<{ cost: number; month: number; budget: number; truncated: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = status.kind === 'waiting' || status.kind === 'streaming'

  const refreshConvs = useCallback(() => listConversations(ws.id).then(setConvs).catch(() => {}), [ws.id])
  useEffect(() => { refreshConvs() }, [refreshConvs])

  const open = async (id: string | null) => {
    if (busy) return
    setActive(id)
    setLastCost(null)
    setStatus({ kind: 'idle' })
    setMessages(id ? await listMessages(id).catch(() => []) : [])
  }

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages])

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setLastCost(null)
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    const replyId = `a-${Date.now()}`
    setMessages((m) => [...m, userMsg])
    setStatus({ kind: 'waiting' })
    try {
      const done = await streamChat(
        { workspaceId: ws.id, conversationId: active, message: text },
        {
          onStart: (cid) => setActive(cid),
          onText: (t) => {
            setStatus({ kind: 'streaming' })
            setMessages((m) => {
              const last = m[m.length - 1]
              if (last?.id === replyId) return [...m.slice(0, -1), { ...last, content: last.content + t }]
              return [...m, { id: replyId, role: 'assistant', content: t }]
            })
          },
        },
      )
      setLastCost({ cost: done.estimated_cost_usd, month: done.month_spend_usd, budget: done.budget_usd, truncated: done.truncated })
      setStatus({ kind: 'idle' })
      refreshConvs()
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== replyId))
      setStatus({ kind: 'error', message: (err as Error).message })
      refreshConvs()
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const remove = async (id: string) => {
    await deleteConversation(id).catch(() => {})
    setConfirmDelete(null)
    if (active === id) open(null)
    refreshConvs()
  }

  return (
    <div className="grid gap-x-10 gap-y-8 pt-10 pb-10 lg:grid-cols-[16rem_1fr]">
      {/* Conversations */}
      <aside className="order-2 lg:order-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Room III · Conversations</p>
        <button className={`${textBtn} mt-4 block`} onClick={() => open(null)} disabled={busy}>+ New conversation</button>
        <ol className="mt-4 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
          {convs.length === 0 && <li className="py-3 text-sm italic text-[var(--muted)]">No conversations yet.</li>}
          {convs.map((c) => (
            <li key={c.id} className="group flex items-start gap-2 py-2.5">
              <button
                onClick={() => open(c.id)}
                disabled={busy}
                className={`min-w-0 flex-1 text-left text-sm leading-snug transition-colors hover:text-[var(--accent)] ${active === c.id ? 'text-[var(--accent)]' : ''}`}
              >
                <span className="line-clamp-2">{c.title}</span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {new Date(c.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </button>
              {confirmDelete === c.id ? (
                <span className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-[0.1em]">
                  <button className="text-cherry" onClick={() => remove(c.id)}>Delete</button>
                  <button onClick={() => setConfirmDelete(null)}>Keep</button>
                </span>
              ) : (
                <button aria-label={`Delete ${c.title}`} onClick={() => setConfirmDelete(c.id)} className="text-[var(--muted)] opacity-0 transition-opacity hover:text-cherry focus-visible:opacity-100 group-hover:opacity-100">×</button>
              )}
            </li>
          ))}
        </ol>
      </aside>

      {/* Chat */}
      <section className="order-1 flex min-h-[70vh] min-w-0 flex-col lg:order-2">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-strong)] pb-5">
          <div>
            <h1 className="m-0 font-display text-[clamp(40px,6vw,84px)] font-normal leading-[0.9] tracking-[-0.02em]">
              The Creative <em className="text-[var(--accent)]">Director</em><span className="text-cherry">.</span>
            </h1>
            <p className="mt-3 max-w-[60ch] text-sm text-[var(--muted)]">
              Claude, briefed on your approved Brand DNA. It never invents product facts: anything missing comes back as a [placeholder].
            </p>
          </div>
          <Link to="/brand-dna?tab=brief" className={textBtn}>Edit the brand brief →</Link>
        </header>

        <div className="flex-1 py-8">
          {messages.length === 0 ? (
            <div className="grid gap-6">
              <p className="font-display text-3xl italic leading-tight">What shall we make today?</p>
              <div className="flex flex-wrap gap-2">
                {PROMPTS.map((p) => (
                  <button key={p} onClick={() => { setDraft(p); inputRef.current?.focus() }}
                    className="border border-[var(--rule-strong)] px-3.5 py-2 text-left text-[13px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="grid gap-10">
              {messages.map((m) => (
                <li key={m.id} className={m.role === 'user' ? 'justify-self-end' : ''}>
                  {m.role === 'user' ? (
                    <div className="max-w-[60ch] border-l-2 border-[var(--accent)] pl-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">You</p>
                      <p className="mt-1 whitespace-pre-wrap text-[15px]">{m.content}</p>
                    </div>
                  ) : (
                    <article className="grid grid-cols-[3rem_1fr] gap-4">
                      <span className="font-display text-4xl italic leading-none text-[var(--accent)]" aria-hidden="true">Cl</span>
                      <div className="min-w-0">
                        <div className="md max-w-[72ch]"><Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown></div>
                        {status.kind !== 'streaming' && (
                          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                            <CopyButton text={m.content} />
                            <MakePost idea={m.content} workspaceId={ws.id} conversationId={active} />
                          </div>
                        )}
                      </div>
                    </article>
                  )}
                </li>
              ))}
            </ol>
          )}

          {status.kind === 'waiting' && (
            <p className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]" role="status">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden="true" />
              Claude is reading your Brand DNA and thinking…
            </p>
          )}
          {status.kind === 'error' && (
            <p role="alert" className="mt-8 border-l-2 border-cherry pl-3 text-sm">{status.message}</p>
          )}
          {lastCost && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {lastCost.truncated && <span className="text-cherry">Reply hit the length limit · </span>}
              Estimated cost ${lastCost.cost.toFixed(3)} · this month ${lastCost.month.toFixed(2)}
              {lastCost.budget > 0 && ` of $${lastCost.budget.toFixed(0)} budget`} · estimate, not the bill
            </p>
          )}
          <div ref={endRef} className="scroll-mb-56" />
        </div>

        <form onSubmit={send} className="sticky bottom-0 border-t border-[var(--rule-strong)] bg-[var(--bg)] pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <label htmlFor="cd-input" className="sr-only">Message to the Creative Director</label>
          <textarea
            id="cd-input"
            ref={inputRef}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="Brief your creative director…"
            className="w-full resize-y border-0 bg-transparent font-display text-xl leading-snug outline-none placeholder:italic placeholder:text-[var(--muted)]"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-[var(--muted)]">Enter to send · Shift + Enter for a new line</span>
            <button type="submit" className={solidBtn} disabled={busy || !draft.trim()}>
              {busy ? 'Claude is writing…' : 'Send'} <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={`${textBtn} text-[var(--muted)]`}
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => {})}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function MakePost({ idea, workspaceId, conversationId }: { idea: string; workspaceId: string; conversationId: string | null }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = async (format: 'auto' | 'post' | 'carousel' | 'story') => {
    setBusy(true); setError(null)
    try {
      const { id } = await composePost({ workspaceId, idea, format, conversationId })
      navigate(`/review/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  if (busy) {
    return (
      <span className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]" role="status">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden="true" />
        Claude is art-directing the post and choosing photos (usually under a minute)…
      </span>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {!open ? (
        <button className={`${textBtn} text-[var(--accent)]`} onClick={() => setOpen(true)}>Make this a post →</button>
      ) : (
        <>
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Make it a</span>
          {(['post', 'carousel', 'story', 'auto'] as const).map((f) => (
            <button key={f} className={`${textBtn} text-[var(--accent)]`} onClick={() => go(f)}>
              {f === 'post' ? 'Single post' : f === 'carousel' ? 'Carousel' : f === 'story' ? 'Story' : 'Let Claude choose'}
            </button>
          ))}
          <button className={textBtn} onClick={() => setOpen(false)}>Cancel</button>
        </>
      )}
      {error && <span role="alert" className="basis-full text-sm text-cherry">{error}</span>}
    </span>
  )
}
