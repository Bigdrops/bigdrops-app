import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/supabase'
import type { TeamMember } from '@/domain/team/teamTypes'
import { deriveInitials, deriveNameFromEmail } from '@/domain/team/teamTypes'

type WorkspaceMemberRow = {
  id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

type ProfileRow = {
  id: string
  email: string | null
}

export function useTeamMembers(workspaceId: string | null, currentUserId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: rows, error: mErr } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, joined_at')
        .eq('workspace_id', workspaceId)
        .order('joined_at', { ascending: true })

      if (mErr) throw mErr

      const memberRows = (rows as WorkspaceMemberRow[]) || []
      if (memberRows.length === 0) {
        setMembers([])
        return
      }

      const userIds = memberRows.map((r) => r.user_id)
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      if (pErr) throw pErr

      const emailById = new Map<string, string>()
      for (const p of (profiles as ProfileRow[]) || []) {
        if (p.id && p.email) emailById.set(p.id, p.email)
      }

      const normalized: TeamMember[] = memberRows.map((r) => {
        const email = emailById.get(r.user_id) || ''
        const fallbackEmail = email || r.user_id.slice(0, 8)
        const name = email ? deriveNameFromEmail(email) : fallbackEmail
        return {
          userId: r.user_id,
          membershipId: r.id,
          email: email || fallbackEmail,
          name,
          initials: deriveInitials(name, email || fallbackEmail),
          avatarUrl: null,
          joinedAt: r.joined_at,
          role: r.role,
          isCurrentUser: currentUserId ? r.user_id === currentUserId : false,
        }
      })

      // YOU first? Keep joined_at order; plan shows Owner last — keep DB order for determinism
      setMembers(normalized)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, currentUserId])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refresh: fetchMembers }
}
