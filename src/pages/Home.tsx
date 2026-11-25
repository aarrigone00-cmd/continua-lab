import { MagneticButton } from '../components/MagneticButton'
import { RevealHeadline } from '../components/RevealHeadline'
import { kindLabel, team } from '../lib/team'

const today = new Date()
const issue = String(today.getMonth() + 1).padStart(2, '0')
const monthYear = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export function Home() {
  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-12 items-end gap-x-[2%] pb-8 pt-10">
        <div className="col-span-12 mb-3 flex items-baseline gap-3 font-display text-sm leading-tight md:col-span-2 md:mb-0 md:block md:self-start">
          Issue
          <b className="block font-normal text-[44px] leading-[0.9] text-[var(--accent)] md:text-7xl">N°{issue}</b>
          {monthYear}
        </div>
        <RevealHeadline
          className="col-span-12 md:col-span-10"
          lines={[
            'Where',
            <em key="i" className="text-[var(--accent)]">imagination</em>,
            <>becomes design<span className="text-cherry">.</span></>,
          ]}
        />
      </section>

      {/* Briefing + entry points */}
      <section className="grid grid-cols-12 items-start gap-x-[2%] gap-y-6 pb-12">
        <div className="col-span-12 md:col-start-3 md:col-span-5">
          <p className="max-w-[46ch] text-[17px] leading-relaxed">
            Your daily creative briefing will appear here once Claude and the Brand DNA library are
            connected. Until then, this studio is a foundation: the identity, the navigation and the rooms.
          </p>
          <span className="mt-3.5 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Creative briefing · not connected yet
          </span>
        </div>
        <div className="col-span-12 flex flex-col items-start gap-2.5 md:col-start-9 md:col-span-4">
          <MagneticButton>Create something beautiful <span aria-hidden="true">→</span></MagneticButton>
          <MagneticButton variant="ghost">Surprise me</MagneticButton>
        </div>
      </section>

      {/* The team */}
      <section aria-labelledby="team-title" className="border-t border-[var(--rule-strong)]">
        <h2 id="team-title" className="py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Your creative team
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {team.map((m) => (
            <article
              key={m.id}
              className="group grid gap-1.5 border-b border-r border-[var(--rule)] px-3.5 pb-6 pt-5 last:border-r-0"
            >
              <span
                className="text-[44px] leading-none transition-[letter-spacing,color] duration-500 group-hover:tracking-[0.06em] lg:text-[54px]"
                style={{ fontFamily: m.font, color: m.accent }}
              >
                {m.monogram}
              </span>
              <b className="text-[11px] font-semibold uppercase tracking-[0.14em]">{m.name}</b>
              <span className="text-xs text-[var(--muted)]">{m.role}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{kindLabel[m.kind]}</span>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
