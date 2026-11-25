import type { ReactNode } from 'react'

/** Oversized editorial headline; each line rises through a mask. */
export function RevealHeadline({ lines, className = '' }: { lines: ReactNode[]; className?: string }) {
  return (
    <h1
      className={`m-0 font-display text-[clamp(46px,9vw,132px)] font-normal leading-[0.92] tracking-[-0.025em] ${className}`}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.04em]">
          <span className="block animate-rise" style={{ animationDelay: `${i * 0.12}s` }}>
            {line}
          </span>
        </span>
      ))}
    </h1>
  )
}
