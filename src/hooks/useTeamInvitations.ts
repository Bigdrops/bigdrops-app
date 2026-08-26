import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/supabase'
import type { TeamInvitation } from '@/domain/team/teamTypes'

type InvitationRow = {
  id: string
  email: string
  status: string
  workspace_role: string | null
  created_at: string
  expires_at: string | null
}

export function useTeamInvitations(workspaceId: string | null) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setInvitations([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('workspace_invitations')
        .select('id, email, status, workspace_role, created_at, expires_at')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (e) throw e

      setInvitations(
        ((data as InvitationRow[]) || []).map((r) => ({
          id: r.id,
          email: r.email,
          status: r.status,
          workspaceRole: r.workspace_role ?? 'member',
          createdAt: r.created_at,
          expiresAt: r.expires_at,
        })),
      )
    } catch (err) {
      setError(String((err as Error)?.message ?? err))
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { invitations, loading, error, refresh }
}
