/** Placeholder for rooms that are planned but not built yet. */
export function Room({ title, phase, summary }: { title: string; phase: string; summary: string }) {
  return (
    <section className="grid grid-cols-12 gap-x-[2%] py-16">
      <span className="col-span-12 mb-4 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] md:col-span-2">
        {phase}
      </span>
      <div className="col-span-12 md:col-span-10">
        <h1 className="m-0 font-display text-[clamp(40px,7vw,96px)] font-normal leading-[0.95] tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed">{summary}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-cherry">● Not built yet</p>
      </div>
    </section>
  )
}
