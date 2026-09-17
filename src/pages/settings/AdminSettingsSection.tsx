import { useCallback, useState } from 'react'
import { ShieldCheck, ShieldOff, Mail, UserPlus, ChevronRight, ArrowLeft, Search, Users, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/supabase'
import { getErrorMessage } from './settings-helpers'
import type { SettingsSession } from './settings-types'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
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
export function TeamSettingsSection({ session, team, showRoles, setShowRoles }: {
  session: SettingsSession
  team: ReturnType<typeof useTeamMembers>
  showRoles: boolean
  setShowRoles: (open: boolean) => void
}) {
  const { workspace, refresh: refreshWorkspace } = useWorkspace()
  const workspaceId = workspace?.id ?? null
  const isOwner = workspace?.role === 'owner'
  const currentUserId = session?.user?.id ?? null
  const { members, loading, error, refresh } = team
  const { invitations, loading: invitationsLoading, error: invitationsError, refresh: refreshInvitations } = useTeamInvitations(workspaceId)
  const { entity } = useEntity()
  const entityId = entity?.id ?? null
  const { templates, effectiveByUser, assignmentsByUser, loading: rolesLoading, error: rolesError, refresh: refreshRoles } = usePermissionTemplates(workspaceId, entityId)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
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
      <Button variant="ghost" className="su-roles-back min-h-11" onClick={() => setShowRoles(false)}><ArrowLeft size={16} className="mr-2" />Team Hub</Button>
      {rolesLoading && !templates.length ? <SettingsLoadingState /> : rolesError ? <div role="alert"><p>{rolesError}</p><Button onClick={() => void refreshRoles()}>Retry roles</Button></div> :
        <RoleBuilder key={workspaceId} workspaceId={workspaceId} workspaceName={workspace?.name ?? 'Workspace'} templates={templates} isOwner={isOwner} callerPermissions={effectiveByUser.get(currentUserId ?? '') ?? []} assignmentsByUser={assignmentsByUser} refresh={refreshRoles} />}
    </div>
  )

  return (
    <div className="su-team">
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


      <section className="su-stats" aria-label="Team summary">
        <div className="su-stat">
          <div className="su-stat-label">Workspace</div>
          <div className="su-stat-val">{members.length}</div>
          <div className="su-stat-sub">members</div>
        </div>
        <div className="su-stat">
          <div className="su-stat-label">Company</div>
          <div className="su-stat-val accent">
            {rolesLoading ? '…' : rolesError ? '—' : members.filter(member => effectiveByUser.has(member.userId)).length}
          </div>
          <div className="su-stat-sub">members</div>
        </div>
        <div className="su-stat">
          <div className="su-stat-label">Pending</div>
          <div className="su-stat-val">
            {invitationsLoading ? '…' : invitationsError ? '—' : invitations.length}
          </div>
          <div className="su-stat-sub">invites</div>
        </div>
      </section>

      <div className="su-sechead">
        <h2>Team Members</h2>
        <button type="button" onClick={() => setShowSearch(v => !v)} className="su-iconbtn" aria-label="Toggle member search" aria-expanded={showSearch}><Search size={14} /></button>
      </div>
      {showSearch && <div className="su-searchwrap active"><Search size={14} aria-hidden="true" /><input autoFocus type="search" aria-label="Search members by name or email" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search members..." /></div>}
      {rolesError && <div role="alert" className="su-error">Roles could not load: {rolesError} <Button variant="outline" onClick={() => void refreshRoles()}>Retry</Button></div>}
      <div>
        {visibleMembers.map(member => {
          const roles = assignmentsByUser.get(member.userId)
          return <button key={member.membershipId} type="button" onClick={() => setSelectedMemberId(member.userId)}
            className={cn('su-mcard', member.isCurrentUser && 'self')}>
            <span className="su-mcard-top">
              <span className={cn('su-avatar', member.isCurrentUser && 'you')}>{member.initials}</span>
              <span className="su-who">
                <span className="su-who-name">{member.name}
                  {member.role === 'owner' && <span className="su-pill owner">Owner</span>}
                  {member.isCurrentUser && <span className="su-pill you">You</span>}
                </span>
                <span className="su-who-mail">{member.email}{member.joinedAt ? ' · joined ' + new Date(member.joinedAt).toLocaleDateString() : ''}</span>
              </span>
              <span className="su-chev"><ChevronRight aria-hidden="true" /></span>
            </span>
            <span className="su-chips">
              {rolesLoading ? <span className="su-no-access">Loading roles…</span> : rolesError ? <span className="su-no-access">Roles unavailable</span> : roles?.size ?
                templates.filter(template => roles.has(template.id)).map(template => <span key={template.id} className="su-chip"><ShieldCheck size={10} />{template.name}</span>) :
                <span className="su-no-access">No roles assigned.</span>}
            </span>
          </button>
        })}
        {!visibleMembers.length && <p className="su-noresults show">No members match your search.</p>}
      </div>

      <SettingsSheet open={!!selectedMember} onClose={() => { if (!roleActionKey) setSelectedMemberId(null) }} title={selectedMember?.name ?? 'Member'} subtitle={selectedMember?.email}>
        {selectedMember && <div className="space-y-1">
          {/* ── Identity block ── */}
          <div className="su-member-profile">
            <div className={`su-member-avatar-lg${selectedMember.isCurrentUser ? ' you' : ''}`}>
              {selectedMember.initials}
            </div>
            <div className="su-member-profile-info">
              <div className="su-member-profile-name">
                {selectedMember.name}
                {selectedMember.role === 'owner' && <span className="su-pill owner">Owner</span>}
                {selectedMember.isCurrentUser && <span className="su-pill you">You</span>}
              </div>
              <div className="su-member-profile-email">{selectedMember.email}</div>
              <div className="su-member-profile-badges">
                <span className="su-role-badge">
                  <Users size={10} aria-hidden="true" />
                  {selectedMember.role === 'owner' ? 'Workspace Owner' : 'Workspace Member'}
                </span>
                {selectedMember.joinedAt && (
                  <span className="su-role-badge">
                    Joined {new Date(selectedMember.joinedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Access management ── */}
          {!entity ? (
            <p className="su-ia-note">Select a company to manage roles.</p>
          ) : rolesLoading ? (
            <p role="status" className="su-ia-note">Loading access…</p>
          ) : rolesError ? (
            <p role="alert" className="su-ia-note" style={{ color: 'var(--su-caution)' }}>{rolesError}</p>
          ) : (
            <>
              {/* Assigned roles */}
              <div className="su-acc-section">
                <div className="su-acc-section-title">
                  Roles in {entity?.name ?? 'the active company'}
                </div>
                {(() => {
                  const held = templates.filter(t => memberRoles?.has(t.id) === true)
                  return held.length > 0 ? held.map(template => (
                    <div key={template.id} className="su-role-assign-row">
                      <span className="su-role-assign-icon">
                        <ShieldCheck aria-hidden="true" />
                      </span>
                      <span className="su-role-assign-main">
                        <span className="su-role-assign-name">{template.name}</span>
                        <span className="su-role-assign-meta">
                          Assigned · {template.items.length} permission{template.items.length !== 1 ? 's' : ''}
                        </span>
                      </span>
                      {isOwner && !selectedMember.isCurrentUser && (
                        <button
                          type="button"
                          className="su-role-assign-act revoke"
                          disabled={!!roleActionKey}
                          onClick={() => void handleToggleRole(selectedMember, template)}
                        >
                          {roleActionKey === `${selectedMember.membershipId}:${template.id}` ? '…' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  )) : (
                    <p className="su-no-access" style={{ margin: '4px 2px 0' }}>No roles assigned yet.</p>
                  )
                })()}
              </div>

              {/* Unassigned roles — assign controls */}
              {isOwner && !selectedMember.isCurrentUser && (() => {
                const unassigned = templates.filter(t => memberRoles?.has(t.id) !== true)
                return unassigned.length > 0 ? (
                  <div className="su-acc-section">
                    <div className="su-acc-section-title">Assign a Role</div>
                    {unassigned.map(template => (
                      <div key={template.id} className="su-role-assign-row">
                        <span className="su-role-assign-icon off">
                          <ShieldOff aria-hidden="true" />
                        </span>
                        <span className="su-role-assign-main">
                          <span className="su-role-assign-name">{template.name}</span>
                          <span className="su-role-assign-meta">
                            {template.items.length} permission{template.items.length !== 1 ? 's' : ''}
                            {template.description ? ` · ${template.description}` : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="su-role-assign-act"
                          disabled={!!roleActionKey}
                          onClick={() => void handleToggleRole(selectedMember, template)}
                        >
                          {roleActionKey === `${selectedMember.membershipId}:${template.id}` ? '…' : 'Assign'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null
              })()}

              {/* Progressive disclosure: effective permissions */}
              <details className="su-perm-details" style={{ marginTop: 10 }}>
                <summary>
                  <span>Effective permissions · visible rows ({memberPairs.length})</span>
                  <ChevronRight size={12} aria-hidden="true" />
                </summary>
                <div className="su-perm-details-body">
                  <p style={{ fontSize: 9, color: 'var(--su-ink-3)', marginBottom: 6 }}>
                    These rows determine access independently of role labels. A wildcard (*) covers all resources or actions.
                    You can see rows held by you or granted by you; other grants may be hidden.
                  </p>
                  <ul style={{ fontFamily: 'var(--su-number)', fontSize: 10, lineHeight: 1.8, listStyle: 'none' }}>
                    {memberPairs.map(pair => (
                      <li key={`${pair.resource}:${pair.action}`}>{pair.resource} / {pair.action}</li>
                    ))}
                  </ul>
                  {!memberPairs.length && (
                    <p style={{ fontSize: 10, color: 'var(--su-ink-3)' }}>No permission rows visible to you.</p>
                  )}
                </div>
              </details>

              {/* ── Dangerous actions ── */}
              {isOwner && !selectedMember.isCurrentUser && (
                <div className="su-member-danger-zone">
                  <button
                    type="button"
                    className="su-member-danger-btn"
                    disabled={transferring}
                    onClick={() => { setSelectedMemberId(null); setTransferMember(selectedMember) }}
                  >
                    <ArrowRightLeft size={14} aria-hidden="true" />
                    Transfer workspace ownership
                  </button>
                  <button
                    type="button"
                    className="su-member-danger-btn destructive"
                    disabled={!!actionId}
                    onClick={() => { setSelectedMemberId(null); setModalMember(selectedMember) }}
                  >
                    Remove from workspace
                  </button>
                </div>
              )}
            </>
          )}
        </div>}
      </SettingsSheet>


      <section className="su-pending">
        <div className="su-sechead"><h2>Pending Invitations</h2><span className="count">{invitationsLoading ? '…' : invitationsError ? '—' : invitations.length}</span></div>
        {invitationsLoading ? <p role="status" className="su-ia-note">Loading invitations…</p> : invitationsError ? <p role="alert" className="su-error">{invitationsError} <Button onClick={() => void refreshInvitations()}>Retry invitations</Button></p> : <>
          {!invitations.length && <p className="su-ia-note">No pending invitations.</p>}
          {invitations.map(invitation => <div key={invitation.id} className="su-irow">
            <span className="su-irow-icon accent"><Mail size={15} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <div className="su-who-name break-all">{invitation.email}</div>
              <div className="su-irow-when">Invited {new Date(invitation.createdAt).toLocaleDateString()}{invitation.expiresAt ? ' · expires ' + new Date(invitation.expiresAt).toLocaleDateString() : ''}</div>
            </div>
            {isOwner && <button type="button" className="su-ghostbtn" disabled={revokingId === invitation.id} onClick={() => void handleRevoke(invitation)}>{revokingId === invitation.id ? 'Revoking…' : 'Revoke'}</button>}
          </div>)}
        </>}
      </section>

      <div className="su-scope su-pending"><div className="su-scope-card">
        <button type="button" onClick={() => setShowRoles(true)} className="su-srow">
          <span className="su-srow-icon accent"><ShieldCheck aria-hidden="true" /></span>
          <span className="su-srow-main"><span className="su-srow-label">Roles &amp; Access</span><span className="su-srow-meta">{rolesLoading ? 'Loading roles…' : rolesError ? 'Roles unavailable' : templates.length + ' roles configured'}</span></span>
          <span className="su-srow-end">{!rolesLoading && !rolesError && <span className="su-srow-count">{templates.length}</span>}<ChevronRight aria-hidden="true" /></span>
        </button>
      </div></div>
      {isOwner && <button type="button" className="su-fab" aria-label="Invite Member" title="Invite Member" onClick={() => setInviteOpen(true)}><UserPlus /></button>}
    </div>
  )
}
