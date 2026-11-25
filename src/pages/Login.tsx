import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MagneticButton } from '../components/MagneticButton'
import { RevealHeadline } from '../components/RevealHeadline'
import { useAuth } from '../lib/auth-context'

export function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setError(error)
    else navigate(from, { replace: true })
  }

  const field =
    'w-full border-0 border-b border-[var(--rule-strong)] bg-transparent py-3 text-lg outline-none transition-colors focus:border-[var(--accent)]'
  const label = 'text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]'

  return (
    <div className="grid min-h-[80vh] grid-cols-12 items-center gap-x-[2%] gap-y-10 py-12">
      <div className="col-span-12 md:col-span-7">
        <p className="mb-6 font-display text-sm">
          Continua <em className="text-[var(--accent)]">Lab</em> · LACASACONTINUA
        </p>
        <RevealHeadline
          lines={[
            'The studio',
            <>is <em key="p" className="text-[var(--accent)]">private</em><span className="text-cherry">.</span></>,
          ]}
        />
      </div>

      <form onSubmit={onSubmit} className="col-span-12 grid max-w-md gap-7 md:col-span-4 md:col-start-9" noValidate>
        <label className="grid gap-1" htmlFor="email">
          <span className={label}>Email</span>
          <input id="email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="grid gap-1" htmlFor="password">
          <span className={label}>Password</span>
          <input id="password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className={field} />
        </label>

        {error && (
          <p role="alert" className="border-l-2 border-cherry pl-3 text-sm">
            {error}
          </p>
        )}

        <div>
          <MagneticButton type="submit" disabled={busy || !email || !password} className="disabled:opacity-40">
            {busy ? 'Opening…' : 'Enter the studio'} <span aria-hidden="true">→</span>
          </MagneticButton>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Access is by invitation only. New accounts can't be created from this page.
        </p>
      </form>
    </div>
  )
}
