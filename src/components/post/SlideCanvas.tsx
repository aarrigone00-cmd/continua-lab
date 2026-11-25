import { forwardRef, type CSSProperties } from 'react'
import { SIZES, type Aspect, type Slide } from '../../lib/content'

/**
 * One designed slide at true Instagram pixel size (1080 wide).
 * Colors are fixed brand colors (not theme tokens): this is the exported artwork.
 */
const C = { ivory: '#F6F2EA', paper: '#EFE9DE', ink: '#1E1D1B', cobalt: '#1F3FBF', cherry: '#C8102E', graphite: '#5E5850' }
const DISPLAY = "'Bodoni Moda', 'Didot', Georgia, serif"
const SANS = "'Inter Tight', 'Helvetica Neue', Arial, sans-serif"
const WIDE = "'Archivo', 'Helvetica Neue', Arial, sans-serif"
const FIELD = { burnt: '#D9622B', cobalt: '#1F3FBF', olive: '#5F6B2A', burgundy: '#6B1E2A', ink: '#1E1D1B', ivory: '#F6F2EA' } as const
const DEFAULT_FIELDS = ['burnt', 'cobalt', 'olive', 'burgundy'] as const

function longestLine(text: string) {
  return Math.max(1, ...text.split('\n').map((l) => l.trim().length))
}

type Props = { slide: Slide; aspect: Aspect; imageUrl?: string; index: number; total: number; wordmark: string; scale?: number }

export const SlideCanvas = forwardRef<HTMLDivElement, Props>(function SlideCanvas(
  { slide, aspect, imageUrl, index, total, wordmark, scale = 1 },
  ref,
) {
  const { w, h } = SIZES[aspect]
  const tall = aspect === '9:16'
  const outer: CSSProperties = { width: w * scale, height: h * scale, overflow: 'hidden', flex: 'none' }
  const inner: CSSProperties = {
    width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left',
    position: 'relative', background: C.ivory, color: C.ink, fontFamily: SANS, overflow: 'hidden',
  }
  const counter = total > 1 ? `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}` : null
  const headSize = Math.max(84, Math.min(132, 2600 / Math.max(14, slide.headline.length)))
  const img = (style: CSSProperties) =>
    imageUrl ? <img src={imageUrl} crossOrigin="anonymous" alt="" style={{ objectFit: 'cover', display: 'block', ...style }} /> : (
      <div style={{ background: C.paper, display: 'grid', placeItems: 'center', color: C.graphite, fontSize: 26, letterSpacing: 3, textTransform: 'uppercase', ...style }}>No photo</div>
    )
  const kicker = slide.kicker && (
    <div style={{ fontSize: 24, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 500, color: C.cherry }}>{slide.kicker}</div>
  )
  const mark = (color: string) => (
    <div style={{ fontFamily: DISPLAY, fontSize: 26, letterSpacing: 6, color }}>{wordmark.toUpperCase()}</div>
  )

  // Size a one-line title so it spans the canvas: shorter words get bigger.
  const fitTitle = (perChar: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.floor((w - 140) / Math.max(1, perChar * longestLine(slide.headline)))))
  const vignette = 'radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.22) 100%)'
  const fullPhoto = (
    <>
      {img({ position: 'absolute', inset: 0, width: w, height: h })}
      {imageUrl && <div style={{ position: 'absolute', inset: 0, background: vignette }} />}
    </>
  )
  const smallLabel = (color: string) => (
    <div style={{ position: 'absolute', left: 56, right: 56, bottom: tall ? 110 : 52, display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color }}>
      <span>{slide.kicker || wordmark}</span>
      <span>{counter ?? wordmark}</span>
    </div>
  )

  let body
  if (slide.layout === 'monument') {
    // Full-bleed photo, one wide spaced-out word.
    const size = fitTitle(0.98, 64, 170)
    body = (
      <>
        {fullPhoto}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 70, textAlign: 'center' }}>
          <div style={{ fontFamily: WIDE, fontStretch: '125%', fontWeight: 700, fontSize: size, letterSpacing: size * 0.12, lineHeight: 1, textTransform: 'uppercase', color: C.ivory, whiteSpace: 'pre-line' }}>{slide.headline}</div>
        </div>
        {smallLabel(C.ivory)}
      </>
    )
  } else if (slide.layout === 'masthead') {
    // Full-bleed photo, heavy serif title like a magazine cover.
    const size = fitTitle(0.78, 72, 190)
    body = (
      <>
        {fullPhoto}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 60, textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.02, lineHeight: 0.92, textTransform: 'uppercase', color: C.ivory, whiteSpace: 'pre-line' }}>{slide.headline}</div>
        </div>
        {smallLabel(C.ivory)}
      </>
    )
  } else if (slide.layout === 'field') {
    // Flat brand color with one oversized word or mark.
    const bg = FIELD[slide.color ?? DEFAULT_FIELDS[index % DEFAULT_FIELDS.length]]
    const fg = bg === C.ivory ? C.ink : C.ivory
    const size = fitTitle(0.72, 90, 420)
    body = (
      <div style={{ position: 'absolute', inset: 0, background: bg, color: fg }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 70, textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontStyle: 'italic', fontSize: size, lineHeight: 0.9, letterSpacing: -size * 0.03, whiteSpace: 'pre-line' }}>{slide.headline}</div>
        </div>
        {slide.body && (
          <div style={{ position: 'absolute', left: 72, right: 72, top: tall ? 140 : 64, fontSize: 28, lineHeight: 1.4, maxWidth: 720 }}>{slide.body}</div>
        )}
        {smallLabel(fg)}
      </div>
    )
  } else if (slide.layout === 'issue') {
    // Full-bleed photo, small centered literary text block (magazine-issue feel).
    body = (
      <>
        {fullPhoto}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 120, textAlign: 'center', color: C.ivory }}>
          <div style={{ display: 'grid', gap: 26, maxWidth: 640 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, lineHeight: 1.02, whiteSpace: 'pre-line' }}>{slide.headline}</div>
            {slide.kicker && <div style={{ fontFamily: DISPLAY, fontSize: 32, letterSpacing: 1 }}>{slide.kicker}</div>}
            {slide.body && <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 400, fontSize: 30, lineHeight: 1.3, whiteSpace: 'pre-line' }}>{slide.body}</div>}
          </div>
        </div>
      </>
    )
  } else if (slide.layout === 'framed') {
    // Solid color field with the photo as a small framed card.
    const bg = FIELD[slide.color ?? DEFAULT_FIELDS[(index + 1) % DEFAULT_FIELDS.length]]
    const cardW = 600
    const photoH = tall ? 760 : 560
    body = (
      <div style={{ position: 'absolute', inset: 0, background: bg, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: cardW, background: C.ivory, color: C.ink, padding: '34px 34px 30px', display: 'grid', gap: 22, textAlign: 'center', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.45)' }}>
          {slide.kicker && <div style={{ fontFamily: DISPLAY, fontSize: 24 }}>{slide.kicker}</div>}
          {img({ width: cardW - 68, height: photoH })}
          <div style={{ fontFamily: DISPLAY, fontSize: 40, lineHeight: 1.05, whiteSpace: 'pre-line' }}>{slide.headline}</div>
          <div style={{ fontSize: 16, letterSpacing: 4, textTransform: 'uppercase', color: C.graphite }}>{wordmark}</div>
        </div>
      </div>
    )
  } else if (slide.layout === 'quiet') {
    // Full-bleed photo; only a small gallery label.
    body = (
      <>
        {img({ position: 'absolute', inset: 0, width: w, height: h })}
        <div style={{ position: 'absolute', left: 48, bottom: tall ? 100 : 48, background: C.ivory, color: C.ink, padding: '18px 22px', maxWidth: 560, display: 'grid', gap: 6 }}>
          {slide.kicker && <span style={{ fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: C.graphite }}>{slide.kicker}</span>}
          <span style={{ fontFamily: DISPLAY, fontSize: 34, lineHeight: 1.1 }}>{slide.headline}</span>
        </div>
        {counter && <div style={{ position: 'absolute', right: 48, top: 44, color: C.ivory, fontSize: 22, letterSpacing: 4 }}>{counter}</div>}
      </>
    )
  } else if (slide.layout === 'split') {
    const photoH = Math.round(h * (tall ? 0.56 : 0.58))
    body = (
      <>
        {img({ position: 'absolute', left: 0, top: 0, width: w, height: photoH })}
        {counter && <div style={{ position: 'absolute', right: 48, top: 44, background: C.ivory, padding: '10px 18px', fontSize: 22, letterSpacing: 3 }}>{counter}</div>}
        <div style={{ position: 'absolute', left: 0, top: photoH, width: w, height: h - photoH, padding: '56px 72px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {kicker}
          <div style={{ fontFamily: DISPLAY, fontSize: headSize * 0.9, lineHeight: 1.0, letterSpacing: -1 }}>{slide.headline}</div>
          {slide.body && <div style={{ fontSize: 32, lineHeight: 1.45, color: C.graphite, maxWidth: 880 }}>{slide.body}</div>}
          <div style={{ marginTop: 'auto' }}>{mark(C.ink)}</div>
        </div>
      </>
    )
  } else if (slide.layout === 'type') {
    const dark = index === total - 1 && total > 1
    const fg = dark ? C.ivory : C.ink
    body = (
      <div style={{ position: 'absolute', inset: 0, background: dark ? C.ink : C.ivory, color: fg, padding: tall ? '160px 80px' : '96px 80px', display: 'flex', flexDirection: 'column', gap: 34 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          {kicker}
          {counter && <div style={{ fontSize: 22, letterSpacing: 3, color: dark ? C.paper : C.graphite }}>{counter}</div>}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: headSize * 1.2, lineHeight: 0.98, letterSpacing: -2 }}>{slide.headline}</div>
        {slide.body && <div style={{ fontSize: 34, lineHeight: 1.45, maxWidth: imageUrl ? 560 : 860, opacity: 0.85 }}>{slide.body}</div>}
        {imageUrl && img({ position: 'absolute', right: 80, bottom: tall ? 220 : 150, width: 380, height: tall ? 520 : 460 })}
        <div style={{ position: 'absolute', left: 80, bottom: tall ? 120 : 72, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: C.cherry, display: 'inline-block' }} />
          {mark(fg)}
        </div>
      </div>
    )
  } else {
    // editorial
    const bandH = Math.round(h * (slide.body ? 0.36 : 0.27))
    body = (
      <>
        {img({ position: 'absolute', left: 0, top: 0, width: w, height: h - bandH })}
        {counter && <div style={{ position: 'absolute', right: 48, top: 44, background: C.ivory, padding: '10px 18px', fontSize: 22, letterSpacing: 3 }}>{counter}</div>}
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: w, height: bandH, background: C.ivory, padding: '44px 72px', display: 'flex', flexDirection: 'column', gap: 16, borderTop: `6px solid ${C.cobalt}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>{kicker}{mark(C.ink)}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: headSize, lineHeight: 1.0, letterSpacing: -1 }}>{slide.headline}</div>
          {slide.body && <div style={{ fontSize: 30, lineHeight: 1.42, color: C.graphite }}>{slide.body}</div>}
        </div>
      </>
    )
  }

  return (
    <div style={outer}>
      <div ref={ref} style={inner}>{body}</div>
    </div>
  )
})
