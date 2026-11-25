import { useRef, type ButtonHTMLAttributes, type PointerEvent } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'ghost'
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A button that drifts gently toward the cursor. */
export function MagneticButton({ variant = 'solid', className = '', children, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null)

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left - r.width / 2) * 0.18
    const y = (e.clientY - r.top - r.height / 2) * 0.3
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  const base =
    'inline-flex items-center gap-3.5 border px-5.5 py-4 text-[13px] uppercase tracking-[0.1em] transition-[transform,background-color,color,border-color] duration-300 ease-[var(--ease-editorial)]'
  const look =
    variant === 'solid'
      ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-ivory'
      : 'border-[var(--fg)] bg-transparent text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)]'

  return (
    <button
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`${base} ${look} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
