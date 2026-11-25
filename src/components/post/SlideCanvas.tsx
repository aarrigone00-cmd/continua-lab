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
const MONO = "'Space Mono', 'Courier New', monospace"
const FIELD = { burnt: '#D9622B', cobalt: '#1F3FBF', olive: '#5F6B2A', burgundy: '#6B1E2A', ink: '#1E1D1B', ivory: '#F6F2EA', acid: '#D7FF3D', red: '#E1251B' } as const
const LIGHT_FIELDS = new Set<string>([FIELD.ivory, FIELD.acid])
/** Paper texture for the zine look: CSS-only so it survives PNG export. */
const PAPER_TEXTURE = 'radial-gradient(rgba(30,29,27,0.07) 1px, transparent 1.4px)'
const DEFAULT_FIELDS = ['burnt', 'cobalt', 'olive', 'burgundy'] as const

function longestLine(text: string) {
  return Math.max(1, ...text.split('\n').map((l) => l.trim().length))
}

type Props = { slide: Slide; aspect: Aspect; imageUrl?: string; imageUrl2?: string; index: number; total: number; wordmark: string; scale?: number }

export const SlideCanvas = forwardRef<HTMLDivElement, Props>(function SlideCanvas(
  { slide, aspect, imageUrl, imageUrl2, index, total, wordmark, scale = 1 },
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
    imageUrl ? <img src={imageUrl} crossOrigin="anonymous" alt="" style={{ objectFit: 'cover', display: 'block', maxWidth: 'none', ...style }} /> : (
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

  const pickBg = (fallback: keyof typeof FIELD) => FIELD[slide.color && slide.color !== 'ink' ? slide.color : fallback]
  const mono = slide.color === 'ink' // "ink" on photo layouts = black-and-white treatment
  const words = slide.headline.includes('\n') ? slide.headline.split('\n') : slide.headline.split(/\s+/)

  let body
  if (slide.layout === 'cinema') {
    // Kargo-like: graded cinematic photo, tiny credits spread along one line.
    const items = [slide.kicker || 'Lacasacontinua', slide.headline.replace(/\n/g, ' '), counter ?? 'Miami', wordmark]
    body = (
      <div style={{ position: 'absolute', inset: 0, background: '#0E0E0E' }}>
        {img({ position: 'absolute', inset: 0, width: w, height: h, filter: mono ? 'grayscale(1) contrast(1.2) brightness(0.8)' : 'contrast(1.15) saturate(0.82) brightness(0.8)' })}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 100%)' }} />
        <div style={{ position: 'absolute', left: 44, right: 44, top: '50%', transform: 'translateY(-50%)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: '#F2F0EA', fontFamily: WIDE, fontStretch: '110%', fontSize: 19, letterSpacing: 2.5, textTransform: 'uppercase' }}>
          {items.map((t, i) => <span key={i} style={i === 1 ? { fontWeight: 800, fontSize: 30, letterSpacing: 4 } : { opacity: 0.85 }}>{t}</span>)}
        </div>
        {slide.body && <div style={{ position: 'absolute', left: 44, bottom: tall ? 110 : 44, maxWidth: 520, fontFamily: SANS, fontSize: 20, lineHeight: 1.45, color: '#E8E5DE', opacity: 0.9 }}>{slide.body}</div>}
      </div>
    )
  } else if (slide.layout === 'billboard') {
    // WAIRK-like: close photo, one giant heavy word anchored to the bottom edge.
    const word = slide.headline.replace(/\n/g, ' ').toUpperCase()
    const size = Math.min(520, Math.max(120, Math.floor((w - 24) / (Math.max(3, word.length) * 0.8))))
    body = (
      <div style={{ position: 'absolute', inset: 0, background: C.ink }}>
        {img({ position: 'absolute', inset: 0, width: w, height: h, filter: mono ? 'grayscale(1) contrast(1.25)' : 'contrast(1.1) saturate(1.05)' })}
        <div style={{ position: 'absolute', left: 36, top: 34, color: C.ivory, fontFamily: WIDE, fontSize: 17, lineHeight: 1.45, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
          <div>{wordmark}</div>
          {slide.kicker && <div style={{ fontWeight: 500 }}>{slide.kicker}</div>}
          {counter && <div style={{ fontWeight: 500 }}>{counter}</div>}
        </div>
        {slide.body && <div style={{ position: 'absolute', right: 36, top: 34, maxWidth: 380, textAlign: 'right', color: C.ivory, fontFamily: WIDE, fontSize: 17, lineHeight: 1.45, letterSpacing: 1.5, textTransform: 'uppercase' }}>{slide.body}</div>}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: tall ? 60 : -Math.round(size * 0.1), textAlign: 'center', whiteSpace: 'nowrap', fontFamily: WIDE, fontStretch: '100%', fontWeight: 900, fontSize: size, lineHeight: 0.8, letterSpacing: -size * 0.035, color: '#FFFFFF' }}>{word}</div>
      </div>
    )
  } else if (slide.layout === 'signature') {
    // Heat-like: near-black (or brand color), one small signature title, tiny line at the bottom.
    const bg = slide.color && slide.color !== 'ink' ? FIELD[slide.color] : '#1C1C1B'
    const fg = LIGHT_FIELDS.has(bg) ? C.ink : '#F2EFE6'
    body = (
      <div style={{ position: 'absolute', inset: 0, background: bg, color: fg }}>
        <div style={{ position: 'absolute', left: 44, right: 44, top: 38, display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 17, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.85 }}>
          <span>{wordmark}</span><span>{slide.kicker}</span><span>{counter ?? '© 2026'}</span>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 140 }}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 400, fontSize: 76, lineHeight: 1, letterSpacing: -1, whiteSpace: 'pre-line' }}>{slide.headline}</div>
        </div>
        {slide.body && <div style={{ position: 'absolute', left: 0, right: 0, bottom: tall ? 110 : 44, textAlign: 'center', fontFamily: SANS, fontSize: 17, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8 }}>{slide.body}</div>}
      </div>
    )
  } else if (slide.layout === 'crop') {
    // Fashion campaign: extreme zoom into the photo, vertical title on the edge, tiny corner text.
    const origins = ['32% 38%', '68% 30%', '45% 68%', '72% 62%']
    body = (
      <div style={{ position: 'absolute', inset: 0, background: C.ink }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {img({ position: 'absolute', inset: 0, width: w, height: h, transform: 'scale(2.1)', transformOrigin: origins[index % origins.length], filter: mono ? 'grayscale(1) contrast(1.35)' : 'contrast(1.12) saturate(1.08)' })}
        </div>
        <div style={{ position: 'absolute', left: 44, top: 40, fontFamily: WIDE, fontStretch: '125%', fontWeight: 700, fontSize: 20, letterSpacing: 6, color: C.ivory, textTransform: 'uppercase' }}>{wordmark}</div>
        <div style={{ position: 'absolute', right: 34, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: WIDE, fontStretch: '125%', fontWeight: 800, fontSize: 64, letterSpacing: 14, color: C.ivory, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{slide.headline.replace(/\n/g, ' ')}</div>
        </div>
        <div style={{ position: 'absolute', left: 44, bottom: tall ? 110 : 40, fontFamily: MONO, fontSize: 20, color: C.ivory, letterSpacing: 1, maxWidth: 620, lineHeight: 1.4 }}>
          {slide.kicker}{slide.body ? <><br />{slide.body}</> : null}
        </div>
        {counter && <div style={{ position: 'absolute', right: 120, bottom: tall ? 110 : 40, fontFamily: MONO, fontSize: 20, color: C.ivory }}>{counter}</div>}
      </div>
    )
  } else if (slide.layout === 'collage') {
    // Underground zine: overlapping xeroxed photos, tape, typewriter label, rubber stamp.
    const second = imageUrl2 ?? imageUrl
    body = (
      <div style={{ position: 'absolute', inset: 0, background: '#E6E0D4', backgroundImage: PAPER_TEXTURE, backgroundSize: '7px 7px' }}>
        {img({ position: 'absolute', left: 64, top: tall ? 220 : 110, width: 640, height: 800, transform: 'rotate(-4deg)', filter: 'grayscale(1) contrast(1.55) brightness(1.05)', boxShadow: '0 18px 30px -18px rgba(0,0,0,.5)' })}
        <div style={{ position: 'absolute', right: 70, top: tall ? 820 : 560, transform: 'rotate(5deg)', background: C.ivory, padding: 14, boxShadow: '0 18px 30px -16px rgba(0,0,0,.45)' }}>
          {second
            ? <img src={second} crossOrigin="anonymous" alt="" style={{ display: 'block', maxWidth: 'none', width: 430, height: 520, objectFit: 'cover', objectPosition: imageUrl2 ? 'center' : '80% 70%', filter: 'contrast(1.15) saturate(1.1)' }} />
            : <div style={{ width: 430, height: 520, background: C.paper }} />}
        </div>
        <div style={{ position: 'absolute', left: 300, top: tall ? 196 : 86, width: 220, height: 52, background: 'rgba(240,228,200,.75)', transform: 'rotate(-9deg)' }} />
        <div style={{ position: 'absolute', right: 180, top: tall ? 800 : 540, width: 200, height: 48, background: 'rgba(240,228,200,.75)', transform: 'rotate(12deg)' }} />
        <div style={{ position: 'absolute', left: 54, bottom: tall ? 200 : 96, transform: 'rotate(-2deg)', background: C.ivory, padding: '16px 22px', maxWidth: 600 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 52, lineHeight: 1.05, textTransform: 'uppercase', color: C.ink, whiteSpace: 'pre-line' }}>{slide.headline}</div>
          {slide.body && <div style={{ fontFamily: MONO, fontSize: 22, marginTop: 10, color: C.graphite }}>{slide.body}</div>}
        </div>
        {slide.kicker && (
          <div style={{ position: 'absolute', right: 70, top: tall ? 240 : 120, transform: 'rotate(9deg)', border: `5px solid ${FIELD.red}`, color: FIELD.red, padding: '10px 18px', fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.88 }}>{slide.kicker}</div>
        )}
        <div style={{ position: 'absolute', right: 56, bottom: tall ? 110 : 40, fontFamily: MONO, fontSize: 18, color: C.ink }}>{wordmark.toUpperCase()}{counter ? `  ·  ${counter}` : ''}</div>
      </div>
    )
  } else if (slide.layout === 'poster') {
    // Studio poster: giant type bleeding off the frame over a cut-in photo.
    const bg = pickBg('acid')
    const fg = LIGHT_FIELDS.has(bg) ? C.ink : C.ivory
    const size = Math.min(360, Math.max(200, Math.floor(1500 / Math.max(3, ...words.map((x) => x.length)))))
    body = (
      <div style={{ position: 'absolute', inset: 0, background: bg, color: fg }}>
        {imageUrl && img({ position: 'absolute', right: 0, bottom: 0, width: 640, height: tall ? 1000 : 780, filter: mono ? 'grayscale(1) contrast(1.3)' : 'contrast(1.1)' })}
        <div style={{ position: 'absolute', left: -24, top: tall ? 90 : -18, right: -60, fontFamily: WIDE, fontStretch: '62%', fontWeight: 900, fontSize: size, lineHeight: 0.8, letterSpacing: -size * 0.03, textTransform: 'uppercase', color: fg }}>
          {words.map((wd, i) => <div key={i}>{wd}</div>)}
        </div>
        <div style={{ position: 'absolute', left: 44, bottom: tall ? 110 : 40, fontFamily: MONO, fontSize: 20, lineHeight: 1.5, maxWidth: 360 }}>
          {slide.kicker && <div style={{ textTransform: 'uppercase' }}>{slide.kicker}</div>}
          <div>{wordmark}{counter ? ` · ${counter}` : ''}</div>
        </div>
      </div>
    )
  } else if (slide.layout === 'strips') {
    // Fashion/art: the photo sliced into shifting vertical strips.
    const n = 6
    const sw = w / n
    body = (
      <div style={{ position: 'absolute', inset: 0, background: C.ink }}>
        {Array.from({ length: n }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: i * sw, top: 0, width: sw - 6, height: h, overflow: 'hidden', transform: `translateY(${(i % 2 ? 1 : -1) * (30 + (i * 17) % 50)}px)` }}>
            {img({ position: 'absolute', left: -i * sw, top: 0, width: w, height: h, filter: mono ? 'grayscale(1) contrast(1.3)' : 'none' })}
          </div>
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: tall ? 120 : 56, textAlign: 'center', fontFamily: WIDE, fontStretch: '125%', fontWeight: 700, fontSize: 46, letterSpacing: 16, color: C.ivory, textTransform: 'uppercase', mixBlendMode: 'difference' }}>{slide.headline.replace(/\n/g, ' ')}</div>
        {slide.kicker && <div style={{ position: 'absolute', left: 44, top: 40, fontFamily: MONO, fontSize: 20, color: C.ivory }}>{slide.kicker}</div>}
        {counter && <div style={{ position: 'absolute', right: 44, top: 40, fontFamily: MONO, fontSize: 20, color: C.ivory }}>{counter}</div>}
      </div>
    )
  } else if (slide.layout === 'lookbook') {
    // Fashion lookbook: small photo floating in vast space, tiny index text.
    const bg = slide.color === 'ink' ? C.ink : C.ivory
    const fg = bg === C.ink ? C.ivory : C.ink
    body = (
      <div style={{ position: 'absolute', inset: 0, background: bg, color: fg }}>
        {img({ position: 'absolute', right: 96, top: tall ? 260 : 110, width: 470, height: 600 })}
        <div style={{ position: 'absolute', left: 64, top: tall ? 120 : 60, fontFamily: MONO, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase' }}>{slide.kicker || `Look ${String(index + 1).padStart(2, '0')}`}</div>
        <div style={{ position: 'absolute', left: 64, bottom: tall ? 260 : 150, maxWidth: 640, fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 64, lineHeight: 1.02, whiteSpace: 'pre-line' }}>{slide.headline}</div>
        {slide.body && <div style={{ position: 'absolute', left: 64, bottom: tall ? 180 : 80, maxWidth: 560, fontFamily: MONO, fontSize: 19, lineHeight: 1.5 }}>{slide.body}</div>}
        <div style={{ position: 'absolute', right: 96, bottom: tall ? 120 : 60, fontFamily: MONO, fontSize: 18, letterSpacing: 2 }}>{wordmark.toUpperCase()}{counter ? ` — ${counter}` : ''}</div>
      </div>
    )
  } else if (slide.layout === 'monument') {
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
    const fg = LIGHT_FIELDS.has(bg) ? C.ink : C.ivory
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
