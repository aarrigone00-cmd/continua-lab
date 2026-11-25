import { forwardRef, type CSSProperties } from 'react'
import { SIZES, type Aspect, type Slide } from '../../lib/content'

/**
 * One designed slide at true Instagram pixel size (1080 wide).
 * Colors are fixed brand colors (not theme tokens): this is the exported artwork.
 */
const C = { ivory: '#F6F2EA', paper: '#EFE9DE', ink: '#1E1D1B', cobalt: '#1F3FBF', cherry: '#C8102E', graphite: '#5E5850' }
const DISPLAY = "'Bodoni Moda', 'Didot', Georgia, serif"
const SANS = "'Inter Tight', 'Helvetica Neue', Arial, sans-serif"

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

  let body
  if (slide.layout === 'split') {
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
