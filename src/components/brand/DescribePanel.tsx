import { useRef, useState } from 'react'
import { describeAssets, listAssets } from '../../lib/assets'
import type { BrandAsset } from '../../lib/types'
import { ghostBtn, solidBtn, textBtn } from '../ui'

const EST_PER_PHOTO = 0.01 // USD, rough estimate shown before starting

/** Lets Claude look at undescribed photos and write titles, descriptions and tags. */
export function DescribePanel({ workspaceId, assets, onUpdated }: {
  workspaceId: string
  assets: BrandAsset[]
  onUpdated: (assets: BrandAsset[]) => void
}) {
  const todo = assets.filter((a) => a.kind === 'photo' && a.mime_type?.startsWith('image/') && !a.auto_described_at)
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'running' | 'finished'>('idle')
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState<{ id: string; error: string }[]>([])
  const [cost, setCost] = useState(0)
  const [fatal, setFatal] = useState<string | null>(null)
  const stop = useRef(false)

  if (todo.length === 0 && phase !== 'running' && phase !== 'finished') return null

  const start = async () => {
    const ids = todo.map((a) => a.id)
    stop.current = false
    setPhase('running'); setDone(0); setTotal(ids.length); setFailed([]); setCost(0); setFatal(null)
    for (let i = 0; i < ids.length && !stop.current; i += 4) {
      try {
        const results = await describeAssets(workspaceId, ids.slice(i, i + 4))
        setDone((d) => d + results.length)
        setCost((c) => c + results.reduce((s, r) => s + (r.cost ?? 0), 0))
        setFailed((f) => [...f, ...results.filter((r) => !r.ok).map((r) => ({ id: r.id, error: r.error ?? 'Failed' }))])
      } catch (e) {
        setFatal((e as Error).message)
        break
      }
    }
    onUpdated(await listAssets(workspaceId).catch(() => assets))
    setPhase('finished')
  }

  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <section className="mb-6 border border-[var(--rule-strong)] px-5 py-4" aria-live="polite">
      {phase === 'idle' && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="min-w-0 flex-1 text-sm">
            <b className="font-display text-xl font-normal">{todo.length}</b> photo{todo.length === 1 ? '' : 's'} not yet described.
            <span className="text-[var(--muted)]"> Claude can look at each one and write a factual title, description and tags, so scripts can cite the right image.</span>
          </p>
          <button className={ghostBtn} onClick={() => setPhase('confirm')}>Auto-describe with Claude</button>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="min-w-0 flex-1 text-sm">
            Describe {todo.length} photo{todo.length === 1 ? '' : 's'} for about <b>${(todo.length * EST_PER_PHOTO).toFixed(2)}</b>
            <span className="text-[var(--muted)]"> (estimate, about 1¢ each). Titles, descriptions and tags will be replaced; you can edit any of them afterwards.</span>
          </p>
          <button className={solidBtn} onClick={start}>Start</button>
          <button className={textBtn} onClick={() => setPhase('idle')}>Cancel</button>
        </div>
      )}

      {phase === 'running' && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
            <span><b className="font-display text-xl font-normal tabular-nums">{done}</b> of {total} described{failed.length > 0 && <span className="text-cherry"> · {failed.length} failed</span>}</span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">≈ ${cost.toFixed(2)} so far · estimate</span>
            <button className={textBtn} onClick={() => { stop.current = true }}>Stop after this batch</button>
          </div>
          <div className="h-[3px] w-full bg-[var(--rule)]" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            <div className="h-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="min-w-0 flex-1">
            Described {done - failed.length} of {total} photos for ≈ ${cost.toFixed(2)} (estimate).
            {failed.length > 0 && <span className="text-cherry"> {failed.length} failed: {failed[0].error}</span>}
            {fatal && <span className="text-cherry"> Stopped: {fatal}</span>}
          </span>
          <button className={textBtn} onClick={() => setPhase('idle')}>Close</button>
        </div>
      )}
    </section>
  )
}
