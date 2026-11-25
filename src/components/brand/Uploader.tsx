import { useRef, useState, type DragEvent } from 'react'
import { MAX_BYTES, guessKind, isAllowed, logActivity, uploadAsset } from '../../lib/assets'
import { ASSET_KINDS, type AssetKind, type AssetOrigin, type BrandAsset } from '../../lib/types'
import { fieldClass, labelClass, solidBtn, textBtn } from '../ui'

type Item = {
  key: string
  file: File
  kind: AssetKind
  state: 'waiting' | 'uploading' | 'done' | 'failed'
  error?: string
}

export function Uploader({ workspaceId, onUploaded, onClose }: {
  workspaceId: string
  onUploaded: (a: BrandAsset) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [origin, setOrigin] = useState<AssetOrigin>('real')
  const [aiModel, setAiModel] = useState('')
  const [source, setSource] = useState('')
  const [over, setOver] = useState(false)
  const [running, setRunning] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const add = (files: FileList | File[]) => {
    const next: Item[] = Array.from(files).map((file) => {
      const base = { key: crypto.randomUUID(), file, kind: guessKind(file) }
      if (!isAllowed(file)) return { ...base, state: 'failed', error: 'This file type is not supported.' }
      if (file.size > MAX_BYTES) return { ...base, state: 'failed', error: 'Larger than 50 MB, the current limit per file.' }
      return { ...base, state: 'waiting' }
    })
    setItems((prev) => [...prev, ...next])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) add(e.dataTransfer.files)
  }

  const patch = (key: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)))

  const waiting = items.filter((i) => i.state === 'waiting')
  const done = items.filter((i) => i.state === 'done').length
  const aiNeedsModel = origin === 'ai_generated' && !aiModel.trim()

  const start = async () => {
    setRunning(true)
    // Three at a time keeps the browser responsive with large batches.
    const queue = [...waiting]
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) {
        patch(it.key, { state: 'uploading' })
        try {
          const asset = await uploadAsset({ workspaceId, file: it.file, kind: it.kind, origin, aiModel, source })
          patch(it.key, { state: 'done' })
          onUploaded(asset)
        } catch (e) {
          patch(it.key, { state: 'failed', error: (e as Error).message })
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    await logActivity(workspaceId, 'assets_uploaded', 'brand_asset', undefined, { count: waiting.length, origin })
    setRunning(false)
  }

  return (
    <section aria-labelledby="upload-title" className="border-t border-[var(--rule-strong)] py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="upload-title" className="font-display text-3xl font-normal">Add to the archive</h2>
        <button className={textBtn} onClick={onClose} disabled={running}>Close</button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`grid min-h-56 place-items-center border border-dashed p-8 text-center transition-colors ${over ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--rule-strong)]'}`}
        >
          <div className="grid gap-3">
            <p className="font-display text-2xl italic">Drop photographs, catalogs, logos or fonts</p>
            <p className="text-sm text-[var(--muted)]">JPG, PNG, WebP, SVG, MP4, MOV, PDF, OTF, TTF, WOFF · up to 50 MB each</p>
            <div>
              <button className={textBtn} onClick={() => input.current?.click()}>or choose files</button>
              <input ref={input} id="file-input" type="file" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
            </div>
          </div>
        </div>

        <fieldset className="grid content-start gap-5" disabled={running}>
          <legend className={`${labelClass} mb-3`}>These files are</legend>
          <div className="flex flex-wrap gap-2">
            {(['real', 'ai_generated'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOrigin(o)}
                aria-pressed={origin === o}
                className={`border px-4 py-2 text-[12px] uppercase tracking-[0.1em] ${origin === o ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]' : 'border-[var(--rule-strong)]'}`}
              >
                {o === 'real' ? 'Real photography & files' : 'AI-generated concepts'}
              </button>
            ))}
          </div>
          {origin === 'ai_generated' && (
            <label className="grid gap-1" htmlFor="ai-model">
              <span className={labelClass}>Made with (required)</span>
              <input id="ai-model" className={fieldClass} placeholder="e.g. Grok Imagine, Midjourney" value={aiModel} onChange={(e) => setAiModel(e.target.value)} />
            </label>
          )}
          <label className="grid gap-1" htmlFor="asset-source">
            <span className={labelClass}>Source (optional)</span>
            <input id="asset-source" className={fieldClass} placeholder="e.g. 2026 showroom shoot, supplier press kit" value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Everything arrives as <b>pending</b>. Approve assets in the gallery before Claude may use them.
          </p>
        </fieldset>
      </div>

      {items.length > 0 && (
        <div className="mt-8">
          <ul className="divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {items.map((it) => (
              <li key={it.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-2.5 text-sm sm:grid-cols-[1fr_10rem_8rem]">
                <span className="min-w-0 truncate">{it.file.name}</span>
                <select
                  id={`kind-${it.key}`}
                  aria-label={`Type of ${it.file.name}`}
                  className="hidden bg-transparent text-xs uppercase tracking-[0.1em] sm:block"
                  value={it.kind}
                  disabled={it.state !== 'waiting' || running}
                  onChange={(e) => patch(it.key, { kind: e.target.value as AssetKind })}
                >
                  {ASSET_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <span className={`text-right text-[11px] uppercase tracking-[0.12em] ${it.state === 'failed' ? 'text-cherry' : it.state === 'done' ? 'text-olive' : 'text-[var(--muted)]'}`}>
                  {it.state === 'waiting' && 'Ready'}
                  {it.state === 'uploading' && 'Uploading…'}
                  {it.state === 'done' && 'Added'}
                  {it.state === 'failed' && 'Failed'}
                </span>
                {it.error && <span className="col-span-full text-xs text-cherry">{it.error}</span>}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <button className={solidBtn} onClick={start} disabled={running || waiting.length === 0 || aiNeedsModel}>
              {running ? `Uploading… ${done} of ${items.filter((i) => i.state !== 'failed').length} added` : `Upload ${waiting.length} file${waiting.length === 1 ? '' : 's'}`}
            </button>
            {!running && <button className={textBtn} onClick={() => setItems([])}>Clear list</button>}
            {aiNeedsModel && <span className="text-xs text-cherry">Name the AI tool before uploading.</span>}
          </div>
        </div>
      )}
    </section>
  )
}
