import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { WorkspaceContext } from '../lib/workspace-context'
import type { Role, Workspace } from '../lib/types'

type Row = { role: Role; workspaces: { id: string; name: string; slug: string } | null }

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [ws, setWs] = useState<Workspace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, slug)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle<Row>()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else if (!data?.workspaces) setError('Your account is not a member of any brand workspace yet.')
        else setWs({ ...data.workspaces, role: data.role })
      })
  }, [userId])

  if (error) {
    return <p role="alert" className="py-16 text-sm">The studio couldn't load your workspace: {error}</p>
  }
  if (!ws) {
    return (
      <p className="py-16 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Opening the studio…</p>
    )
  }
  return <WorkspaceContext.Provider value={ws}>{children}</WorkspaceContext.Provider>
}
