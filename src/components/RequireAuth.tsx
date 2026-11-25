import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

/** Lets signed-in users through; sends everyone else to /login. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p className="py-24 text-center text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Opening the studio…
      </p>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
