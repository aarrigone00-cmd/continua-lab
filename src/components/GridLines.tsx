/** The 12-column Swiss grid, drawn as hairlines that grow in on arrival. */
export function GridLines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 grid grid-cols-12 px-[4%]"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="origin-top animate-draw-y border-l border-[var(--rule)]"
          style={{ animationDelay: `${(i % 2) * 0.1}s` }}
        />
      ))}
    </div>
  )
}
