import { useEffect, useState } from 'react'
import type { BrandAsset } from '../../lib/types'

/** Renders any asset kind: images, video, a font specimen or a typographic plate. */
export function AssetPreview({ asset, url, large = false }: { asset: BrandAsset; url?: string; large?: boolean }) {
  const mime = asset.mime_type ?? ''

  if (url && mime.startsWith('image/')) {
    return (
      <img
        src={url}
        alt={asset.title}
        loading="lazy"
        className={`block w-full ${large ? 'max-h-[70vh] object-contain' : 'h-auto'}`}
        style={!large && asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : undefined}
      />
    )
  }
  if (url && mime.startsWith('video/')) {
    return <video src={url} muted playsInline preload="metadata" controls={large} className="block w-full" />
  }
  if (url && mime.startsWith('font/')) return <FontSpecimen asset={asset} url={url} large={large} />

  const label = mime === 'application/pdf' ? 'PDF' : asset.kind
  return (
    <div className="grid aspect-[3/4] place-items-center bg-beige/60 p-6 text-center text-ink">
      <div>
        <span className="block font-display text-6xl italic">{label}</span>
        <span className="mt-2 block text-[11px] uppercase tracking-[0.14em]">{asset.kind}</span>
      </div>
    </div>
  )
}

function FontSpecimen({ asset, url, large }: { asset: BrandAsset; url: string; large: boolean }) {
  const family = `asset-${asset.id}`
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const face = new FontFace(family, `url(${url})`)
    face.load().then((f) => { document.fonts.add(f); setReady(true) }, () => setReady(false))
  }, [family, url])

  return (
    <div className="grid aspect-[4/3] place-items-center bg-paper p-6 text-ink" style={{ fontFamily: ready ? family : undefined }}>
      <div className="text-center">
        <span className={`block leading-none ${large ? 'text-[160px]' : 'text-7xl'}`}>Aa</span>
        {large && <span className="mt-4 block text-2xl">The quick brown fox · 0123456789</span>}
        {!ready && <span className="mt-2 block font-sans text-[11px] uppercase tracking-[0.14em]">Loading typeface…</span>}
      </div>
    </div>
  )
}
