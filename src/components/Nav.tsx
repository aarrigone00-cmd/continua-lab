import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

const links = [
  { to: '/', label: 'Studio' },
  { to: '/brand-dna', label: 'Brand DNA' },
  { to: '/creative-director', label: 'Creative Director' },
  { to: '/trend-radar', label: 'Trend Radar' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/review', label: 'Review' },
]

export function Nav() {
  const { signOut } = useAuth()
  return (
    <nav className="flex flex-wrap items-center gap-x-7 gap-y-2.5 border-b border-[var(--rule-strong)] pb-3.5 text-xs uppercase tracking-[0.12em]">
      <NavLink to="/" className="mr-auto font-display text-xl font-semibold normal-case tracking-[0.02em]">
        Continua <em className="text-[var(--accent)]">Lab</em>
      </NavLink>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) =>
            `transition-colors hover:text-[var(--accent)] ${isActive ? 'text-[var(--accent)]' : ''}`
          }
        >
          {l.label}
        </NavLink>
      ))}
      <button
        onClick={signOut}
        className="uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-cherry"
      >
        Sign out
      </button>
    </nav>
  )
}
