import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Trash2, Users, ShieldCheck } from 'lucide-react'
import { supabase } from '@/supabase'
import { getErrorMessage } from './settings-helpers'
import type { SettingsSession } from './settings-types'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsLoadingState } from './SettingsLoadingState'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/tenant/contexts'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import type { TeamMember } from '@/domain/team/teamTypes'

function RemoveConfirmModal({
  member,
  onConfirm,
  onCancel,
  loading,
}: {
  member: TeamMember
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [emailInput, setEmailInput] = useState('')
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const emailMatch = emailInput.trim().toLowerCase() === member.email.toLowerCase()

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full max-w-sm overflow-hidden rounded-[var(--bd-radius-xl)] bg-bd-card-bg shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <h3 className="text-base font-black text-foreground">Remove member</h3>
        </div>
        <div className="px-5 pb-5">
          <p className="text-sm leading-relaxed text-slate-700">
            This will <span className="font-bold text-red-700">remove</span> <span className="font-bold text-foreground">{member.email}</span> from this workspace.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Their profile and login remain; they lose access to this workspace only. History is preserved.</p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="mt-0.5 text-sm text-red-500">!</span>
            <p className="text-xs font-semibold text-red-700">This cannot be undone without re-inviting. Type the email to confirm.</p>
          </div>
          <input ref={inputRef} value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder={member.email} className="mt-3 w-full rounded-lg border border-input px-3 py-2.5 text-sm font-mono focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
          {emailInput && !emailMatch ? <p className="mt-1 text-[11px] font-bold text-red-500">Email doesn&apos;t match</p> : null}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button ref={cancelRef} onClick={onCancel} disabled={loading} className="flex-1 rounded-xl border border-bd-border py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted/50 disabled:opacity-50">Cancel</button>
          <button onClick={emailMatch ? onConfirm : undefined} disabled={!emailMatch || loading} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold', emailMatch ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed bg-slate-200 text-slate-400')}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
        <p className="pb-3 text-center text-[10px] font-bold text-slate-300">Press Esc to cancel</p>
      </div>
    </div>
  )
}

export function TeamSettingsSection({ session }: { session: SettingsSession }) {
  const { workspace } = useWorkspace()
  const workspaceId = workspace?.id ?? null
  const isOwner = workspace?.role === 'owner'
  const currentUserId = session?.user?.id ?? null
  const { members, loading, error, refresh } = useTeamMembers(workspaceId, currentUserId)
  const [actionId, setActionId] = useState<string | null>(null)
  const [modalMember, setModalMember] = useState<TeamMember | null>(null)

  const closeModal = useCallback(() => setModalMember(null), [])

  const handleRemove = async () => {
    if (!modalMember || !workspaceId) return
    setActionId(modalMember.membershipId)
    try {
      const { error: delErr } = await supabase.from('workspace_members').delete().eq('id', modalMember.membershipId).eq('workspace_id', workspaceId)
      if (delErr) throw delErr
      feedback.success(modalMember.email + ' removed from workspace')
      await refresh()
    } catch (e) {
      feedback.error('Error: ' + getErrorMessage(e))
    }
    setActionId(null)
    setModalMember(null)
  }

  if (!workspaceId) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="px-1"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">Team</p></div>
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-8 text-center text-sm text-bd-text-muted">No workspace selected.</div>
      </div>
    )
  }

  if (loading) return <SettingsLoadingState />
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <Button variant="outline" onClick={() => void refresh()}>Retry</Button>
      </div>
    )
  }

  const activeCount = members.length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {modalMember ? <RemoveConfirmModal member={modalMember} onConfirm={handleRemove} onCancel={closeModal} loading={!!actionId} /> : null}

      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">Team</p>
      </div>

      <div className="grid gap-6">
        <SettingsSummaryCard title="Team" description="Manage the people who have access to this business.">
          <SettingsSummaryRow
            label="Members"
            value={
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{members.length} Members</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 h-5 px-1.5 text-[9px] font-black uppercase">{activeCount} Active</Badge>
              </div>
            }
            icon={<ShieldCheck size={16} />}
          />
        </SettingsSummaryCard>

        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Team Members</h5>
            <Badge variant="outline" className="bg-bd-surface-muted text-bd-text-muted border-[hsl(var(--bd-border)/0.5)] text-[9px] font-black uppercase">
              <Users className="mr-1 h-2.5 w-2.5" />
              {members.length} Members
            </Badge>
          </div>

          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-bd-text-muted">No members yet.</p>
          ) : null}

          {members.map((m) => (
            <div key={m.membershipId} className={cn('rounded-[var(--bd-radius-lg)] border p-4 transition-all', m.isCurrentUser ? 'border-blue-200 bg-blue-50/20' : 'border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg')}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bd-surface-muted text-[11px] font-black text-bd-text-muted">{m.initials}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-bold text-bd-text">{m.name}</p>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest', m.role === 'owner' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-slate-50 text-slate-600 border border-slate-200')}>{m.role === 'owner' ? 'Owner' : 'Member'}</span>
                      {m.isCurrentUser ? <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">You</span> : null}
                    </div>
                    <p className="truncate text-[11px] text-bd-text-muted">{m.email}</p>
                    <p className="mt-0.5 text-[11px] text-bd-text-muted">Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">Active</span>
              </div>

              {!m.isCurrentUser && isOwner ? (
                <div className="flex gap-2 pt-2 border-t border-[hsl(var(--bd-border)/0.3)] justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setModalMember(m)} disabled={!!actionId} className="h-8 px-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-[11px] font-bold">
                    {actionId === m.membershipId ? <Loader2 size={12} className="animate-spin mr-1" /> : <Trash2 size={12} className="mr-1" />}
                    Remove
                  </Button>
                </div>
              ) : null}
              {m.isCurrentUser ? <p className="pt-2 border-t border-[hsl(var(--bd-border)/0.3)] text-[10px] font-medium text-bd-text-muted">You cannot remove yourself from this view.</p> : null}
            </div>
          ))}

          <Button variant="outline" disabled className="w-full mt-2 h-10 rounded-xl border-dashed text-[11px] font-black uppercase tracking-widest">+ Invite member</Button>
          <p className="text-center text-[10px] text-bd-text-muted">Invitations are sent by workspace owners. Ask an owner to invite by email.</p>
        </div>
      </div>
    </div>
  )
}

// Compatibility alias — Settings.tsx still handles 'admin' → 'team' mapping
export const AdminSettingsSection = TeamSettingsSection
