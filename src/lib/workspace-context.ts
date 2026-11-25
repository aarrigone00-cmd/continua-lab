import { createContext, useContext } from 'react'
import type { Workspace } from './types'

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace(): Workspace {
  const ws = useContext(WorkspaceContext)
  if (!ws) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ws
}
