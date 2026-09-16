import { useCallback, useState } from 'react'
import { ShieldCheck, Mail, UserPlus, ChevronRight, ArrowLeft } from 'lucide-react'
import { supabase } from '@/supabase'
import { getErrorMessage } from './settings-helpers'
import type { SettingsSession } from './settings-types'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { SettingsLoadingState } from './SettingsLoadingState'
import { cn } from '@/lib/utils'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useTeamInvitations } from '@/hooks/useTeamInvitations'
import { usePermissionTemplates } from '@/hooks/usePermissionTemplates'
import { RoleBuilder } from './RoleBuilder'
import SettingsSheet from '@/components/settings/SettingsSheet'
import type { PermissionTemplate } from '@/hooks/usePermissionTemplates'
import { createWorkspaceInvitation, revokeWorkspaceInvitation, assignRoleToCompanyMember, removeRoleFromCompanyMember, transferWorkspaceOwnership } from '@/domain/tenant/tenantCreation'
import type { TeamMember, TeamInvitation } from '@/domain/team/teamTypes'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type MemberConfirmProps = {
  member: TeamMember
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function MemberConfirmModal({ member, onConfirm, onCancel, loading, transfer = false }: MemberConfirmProps & { transfer?: boolean }) {
  const [emailInput, setEmailInput] = useState('')
  const matches = emailInput.trim().toLowerCase() === member.email.toLowerCase()
  return <AlertDialog open onOpenChange={open => { if (!open && !loading) onCancel() }}>
    <AlertDialogContent className="bd-settings-surface rounded-[var(--bd-overlay-radius)]">
      <AlertDialogHeader>
        <AlertDialogTitle>{transfer ? 'Transfer workspace ownership' : 'Remove workspace member'}</AlertDialogTitle>
        <AlertDialogDescription>{transfer
          ? `Transfer ownership to ${member.email}. You become a member and lose owner privileges. Only the new owner can transfer ownership back.`
          : `Remove ${member.email} from this workspace. Their login and history remain. They need a new invitation to return.`}</AlertDialogDescription>
      </AlertDialogHeader>
      <label className="block space-y-2 text-sm">Type {member.email} to confirm
        <Input type="email" value={emailInput} disabled={loading} onChange={event => setEmailInput(event.target.value)} className="min-h-11" />
      </label>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading} className="min-h-11">Cancel</AlertDialogCancel>
        <Button variant="destructive" className="min-h-11" disabled={!matches || loading} onClick={onConfirm}>{loading ? 'Working…' : transfer ? 'Transfer ownership' : 'Remove member'}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

function RemoveConfirmModal(props: MemberConfirmProps) {
  return <MemberConfirmModal {...props} />
}

function TransferConfirmModal(props: MemberConfirmProps) {
  return <MemberConfirmModal {...props} transfer />
}
export function TeamSettingsSection({ session }: { session: SettingsSession }) {
  const { workspace, refresh: refreshWorkspace } = useWorkspace()
  const workspaceId = workspace?.id ?? null
  const isOwner = workspace?.role === 'owner'
  const currentUserId = session?.user?.id ?? null
  const { members, loading, error, refresh } = useTeamMembers(workspaceId, currentUserId)
  const { invitations, refresh: refreshInvitations } = useTeamInvitations(workspaceId)
  const { entity } = useEntity()
  const entityId = entity?.id ?? null
  const { templates, effectiveByUser, assignmentsByUser, loading: rolesLoading, error: rolesError, refresh: refreshRoles } = usePermissionTemplates(workspaceId, entityId)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [showRoles, setShowRoles] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [modalMember, setModalMember] = useState<TeamMember | null>(null)
  const [roleActionKey, setRoleActionKey] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [transferMember, setTransferMember] = useState<TeamMember | null>(null)
  const [transferring, setTransferring] = useState(false)

  const closeModal = useCallback(() => setModalMember(null), [])

  const closeInvite = useCallback(() => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteError(null)
    setInviteSuccess(null)
  }, [])

  const handleInvite = async () => {
    if (!workspaceId) return
    const normalized = inviteEmail.trim().toLowerCase()
    setInviteError(null)
    setInviteSuccess(null)

    if (!EMAIL_RE.test(normalized)) {
      setInviteError('Enter a valid email address.')
      return
    }
    const alreadyMember = members.some((m) => m.email.toLowerCase() === normalized)
    if (alreadyMember) {
      setInviteError('This person is already a member of this workspace.')
      return
    }
    const alreadyInvited = invitations.some((i) => i.email.toLowerCase() === normalized)
    if (alreadyInvited) {
      setInviteError('An invitation is already pending for this email.')
      return
    }

    setInviteSubmitting(true)
    try {
      await createWorkspaceInvitation({ workspaceId, email: normalized, entityId: entityId ?? undefined })
      setInviteSuccess(normalized)
      setInviteEmail('')
      await refreshInvitations()
    } catch (e) {
      setInviteError(getErrorMessage(e))
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleRevoke = async (invite: TeamInvitation) => {
    setRevokingId(invite.id)
    try {
      await revokeWorkspaceInvitation(invite.id)
      feedback.success(`Invitation to ${invite.email} revoked`)
      await refreshInvitations()
    } catch (e) {
      feedback.error('Error: ' + getErrorMessage(e))
    } finally {
      setRevokingId(null)
    }
  }

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

  const handleTransfer = async () => {
    if (!transferMember || !workspaceId) return
    setTransferring(true)
    try {
      await transferWorkspaceOwnership({ workspaceId, newOwnerId: transferMember.userId })
      feedback.success(`Ownership transferred to ${transferMember.name}`)
      setTransferMember(null)
      refreshWorkspace()
      await refresh()
    } catch (e) {
      feedback.error('Error: ' + getErrorMessage(e))
    } finally {
      setTransferring(false)
    }
  }

  const handleToggleRole = async (m: TeamMember, template: PermissionTemplate) => {
    if (!entityId) return
    if (!isOwner || rolesLoading || rolesError || roleActionKey) return
    const granted = assignmentsByUser.get(m.userId)?.has(template.id) === true
    setRoleActionKey(`${m.membershipId}:${template.id}`)
    try {
      if (granted) {
        await removeRoleFromCompanyMember({ templateId: template.id, entityId, userId: m.userId })
        feedback.success(`${template.name} removed for ${m.name}`)
      } else {
        await assignRoleToCompanyMember({ templateId: template.id, entityId, userId: m.userId })
        feedback.success(`${template.name} granted to ${m.name}`)
      }
      await refreshRoles()
    } catch (e) {
      feedback.error('Error: ' + getErrorMessage(e))
    } finally {
      setRoleActionKey(null)
    }
  }

  if (!workspaceId) return <p className="text-sm text-bd-text-muted">No workspace selected.</p>
  if (loading) return <SettingsLoadingState />
  if (error) return <div role="alert" className="space-y-3"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>Retry</Button></div>

  const selectedMember = members.find(member => member.userId === selectedMemberId)
  const search = memberSearch.trim().toLowerCase()
  const visibleMembers = members.filter(member => `${member.name} ${member.email}`.toLowerCase().includes(search))
  const memberPairs = selectedMember ? effectiveByUser.get(selectedMember.userId) ?? [] : []
  const memberRoles = selectedMember ? assignmentsByUser.get(selectedMember.userId) : undefined

  if (showRoles) return (
    <div className="space-y-3">
      <Button variant="ghost" className="min-h-11" onClick={() => setShowRoles(false)}><ArrowLeft size={16} className="mr-2" />Team Hub</Button>
      {rolesLoading && !templates.length ? <SettingsLoadingState /> : rolesError ? <div role="alert"><p>{rolesError}</p><Button onClick={() => void refreshRoles()}>Retry roles</Button></div> :
        <RoleBuilder key={workspaceId} workspaceId={workspaceId} workspaceName={workspace?.name ?? 'Workspace'} templates={templates} isOwner={isOwner} callerPermissions={effectiveByUser.get(currentUserId ?? '') ?? []} assignmentsByUser={assignmentsByUser} refresh={refreshRoles} />}
    </div>
  )

  return (
    <div className="space-y-4">
      {modalMember ? <RemoveConfirmModal member={modalMember} onConfirm={handleRemove} onCancel={closeModal} loading={!!actionId} /> : null}
      {transferMember ? <TransferConfirmModal member={transferMember} onConfirm={() => void handleTransfer()} onCancel={() => setTransferMember(null)} loading={transferring} /> : null}

      <SettingsSheet open={inviteOpen} onClose={() => { if (!inviteSubmitting) closeInvite() }} title="Invite member" subtitle={`Workspace · ${workspace?.name ?? ''}`}>
        {inviteSuccess ? <div className="space-y-3"><p role="status">Invitation sent to {inviteSuccess}.</p><Button onClick={closeInvite}>Done</Button></div> :
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); void handleInvite() }}>
            <p className="text-sm text-bd-text-muted">The invitee joins this workspace after acceptance.{entity ? ` The invitation also grants view access in ${entity.name}.` : ''} Assign roles separately after they join.</p>
            <label className="block space-y-2 text-sm font-semibold">Email address
              <Input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="name@example.com" required disabled={inviteSubmitting} className="min-h-11" />
            </label>
            {inviteError && <p role="alert" className="text-sm text-destructive">{inviteError}</p>}
            <Button type="submit" disabled={inviteSubmitting} className="min-h-11 w-full">{inviteSubmitting ? 'Sending…' : 'Send invitation'}</Button>
          </form>}
      </SettingsSheet>

      <section className="grid grid-cols-2 gap-2" aria-label="Team summary">
        {[
          ['Members', members.length, 'Workspace-wide'],
          ['Pending invites', invitations.length, 'Awaiting response'],
          ['Roles', rolesLoading ? '…' : rolesError ? '—' : templates.length, 'Assigned per company'],
          ['Company', entity?.name ?? 'None selected', 'Current company'],
        ].map(([label, value, detail]) => <div key={label} className="min-w-0 rounded-[18px] border border-bd-border bg-bd-card-bg p-3">
          <p className="text-[11px] font-semibold text-bd-text-muted">{label}</p>
          <p className={cn('mt-1 truncate text-[17px] font-medium tracking-tight text-bd-text', label !== 'Company' && 'font-mono')}>{value}</p>
          <p className="mt-1 text-[10px] text-bd-text-muted">{detail}</p>
        </div>)}
      </section>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Team members <span className="ml-1 text-bd-text-muted">{members.length}</span></h3>
        {isOwner && <Button className="min-h-11 rounded-xl" onClick={() => setInviteOpen(true)}><UserPlus size={15} className="mr-2" />Invite member</Button>}
      </div>
      <p className="text-[11px] text-bd-text-muted">Select a member to manage roles in {entity?.name ?? 'the active company'}.</p>
      <Input type="search" aria-label="Search members by name or email" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search by name or email" className="min-h-11 rounded-[13px]" />
      {rolesError && <div role="alert" className="text-sm text-destructive">Roles could not load: {rolesError} <Button variant="outline" onClick={() => void refreshRoles()}>Retry</Button></div>}
      <div className="space-y-2">
        {visibleMembers.map(member => {
          const roles = assignmentsByUser.get(member.userId)
          return <button key={member.membershipId} type="button" onClick={() => setSelectedMemberId(member.userId)}
            className={cn('w-full rounded-xl border border-bd-border bg-bd-card-bg p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', member.isCurrentUser && 'bg-[hsl(var(--primary)/0.06)] border-[hsl(var(--primary)/0.24)]')}>
            <span className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bd-surface-muted text-xs font-extrabold">{member.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold">{member.name}
                  <Badge variant="outline" className="text-[9px]">{member.role === 'owner' ? 'Workspace owner' : 'Member'}</Badge>
                  {member.isCurrentUser && <Badge variant="secondary" className="text-[9px]">You</Badge>}
                </span>
                <span className="mt-1 block truncate text-[10px] text-bd-text-muted">{member.email}</span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-bd-text-muted" />
            </span>
            <span className="mt-2.5 block text-[10px] text-bd-text-muted">Assigned roles · {entity?.name ?? 'Select a company'}</span>
            <span className="mt-1 flex flex-wrap gap-1">
              {rolesLoading ? <span className="text-[11px]">Loading roles…</span> : rolesError ? <span className="text-[11px]">Roles unavailable</span> : roles?.size ?
                templates.filter(template => roles.has(template.id)).map(template => <span key={template.id} className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-1 text-[10px] font-bold text-primary"><ShieldCheck size={10} />{template.name}</span>) :
                <span className="text-[11px] text-bd-text-muted">No assigned roles. Effective access may still exist.</span>}
            </span>
          </button>
        })}
        {!visibleMembers.length && <p className="py-4 text-center text-sm text-bd-text-muted">No members match that search.</p>}
      </div>

      <SettingsSheet open={!!selectedMember} onClose={() => { if (!roleActionKey) setSelectedMemberId(null) }} title={selectedMember?.name ?? 'Member'} subtitle={selectedMember?.email}>
        {selectedMember && <div className="space-y-4">
          <div className="rounded-xl border border-bd-border p-3">
            <p className="text-xs font-bold">Workspace membership · {workspace?.name}</p>
            <p className="mt-1 text-sm">{selectedMember.role === 'owner' ? 'Owner' : 'Member'} · Joined {selectedMember.joinedAt ? new Date(selectedMember.joinedAt).toLocaleDateString() : '—'}</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold">Roles in {entity?.name ?? 'the active company'}</h3>
            {!entity ? <p className="text-sm">Select a company to manage roles.</p> : rolesLoading ? <p role="status">Loading access…</p> : rolesError ? <p role="alert">{rolesError}</p> : <>
              <p className="text-xs text-bd-text-muted">Company access: {memberPairs.length ? 'confirmed by visible permission rows.' : 'not confirmed by visible rows. The server checks company membership before assignment.'}</p>
              <p className="text-xs text-bd-text-muted">Multiple roles can coexist. Removing one preserves pairs covered by other roles and the company view baseline. Direct grants have no source record and can overlap.</p>
              <div className="divide-y divide-bd-border rounded-xl border border-bd-border px-3">
                {templates.map(template => {
                  const assigned = memberRoles?.has(template.id) === true
                  return <div key={template.id} className="flex min-h-14 items-center justify-between gap-2 py-1">
                    <span className="min-w-0 text-xs font-bold">{template.name}<span className="mt-1 block text-[10px] font-medium text-bd-text-muted">{assigned ? 'Assigned' : 'Not assigned'}</span></span>
                    {isOwner && !selectedMember.isCurrentUser && <Button variant="outline" className="min-h-11 shrink-0" disabled={!!roleActionKey} onClick={() => void handleToggleRole(selectedMember, template)}>{roleActionKey === `${selectedMember.membershipId}:${template.id}` ? 'Working…' : assigned ? 'Remove role' : 'Assign role'}</Button>}
                  </div>
                })}
                {!templates.length && <p className="py-3 text-sm">No roles defined yet.</p>}
              </div>
              <details className="rounded-xl border border-bd-border p-3">
                <summary className="cursor-pointer py-2 text-xs font-bold">Effective permissions · visible rows ({memberPairs.length})</summary>
                <p className="mb-2 text-xs text-bd-text-muted">These rows determine access, independently of role labels. You can see rows held by you or granted by you; other grants may be hidden. A wildcard (*) covers all resources or actions.</p>
                <ul className="space-y-1 font-mono text-xs">{memberPairs.map(pair => <li key={`${pair.resource}:${pair.action}`}>{pair.resource} / {pair.action}</li>)}</ul>
                {!memberPairs.length && <p className="text-xs">No permission rows are visible to you.</p>}
              </details>
            </>}
          </div>
          {isOwner && !selectedMember.isCurrentUser && <div className="space-y-2 border-t border-bd-border pt-3">
            <Button variant="outline" className="min-h-11 w-full" disabled={transferring} onClick={() => { setSelectedMemberId(null); setTransferMember(selectedMember) }}>Transfer workspace ownership</Button>
            <Button variant="outline" className="min-h-11 w-full text-destructive" disabled={!!actionId} onClick={() => { setSelectedMemberId(null); setModalMember(selectedMember) }}>Remove from workspace</Button>
          </div>}
        </div>}
      </SettingsSheet>

      <section className="space-y-2">
        <h3 className="text-sm font-bold">Pending invitations <span className="ml-1 text-bd-text-muted">{invitations.length}</span></h3>
        {!invitations.length && <p className="text-xs text-bd-text-muted">No pending invitations.</p>}
        {invitations.map(invitation => <div key={invitation.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-bd-border bg-bd-card-bg p-3">
          <Mail size={18} className="text-bd-text-muted" />
          <div className="min-w-0 flex-1 basis-36">
            <p className="break-all text-xs font-bold">{invitation.email}</p>
            <p className="mt-1 text-[10px] text-bd-text-muted">Invited {new Date(invitation.createdAt).toLocaleDateString()}{invitation.expiresAt ? ` · Expires ${new Date(invitation.expiresAt).toLocaleDateString()}` : ''}</p>
          </div>
          {isOwner && <Button variant="outline" className="min-h-11" disabled={revokingId === invitation.id} onClick={() => void handleRevoke(invitation)}>{revokingId === invitation.id ? 'Revoking…' : 'Revoke'}</Button>}
        </div>)}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold text-bd-text-muted">Access control</h3>
        <button type="button" onClick={() => setShowRoles(true)} className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-bd-border bg-bd-card-bg p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <ShieldCheck size={18} className="text-primary" />
          <span className="flex-1"><span className="block text-xs font-bold">Roles &amp; access</span><span className="text-[10px] text-bd-text-muted">Define what company members can do</span></span>
          <ChevronRight size={15} />
        </button>
      </section>
    </div>
  )
}
