import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../lib/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return { error: null }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: "That email and password don't match. Check both and try again." }
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'This account has not been confirmed yet. Confirm it in the Supabase dashboard, then try again.' }
    }
    return { error: `The studio couldn't sign you in: ${error.message}` }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}
