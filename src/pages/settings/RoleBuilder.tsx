import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldCheck, ShieldOff, ChevronRight, Copy, Trash2, RefreshCw, Plus, Users } from 'lucide-react'
import SettingsSheet from '@/components/settings/SettingsSheet'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import type { PermissionTemplate } from '@/hooks/usePermissionTemplates'
import {
  ROLE_ACTIONS,
  ROLE_RESOURCES,
  categoryState,
  markCategory,
  permissionCovers,
  removedPermissions,
  type PermissionPair,
} from '@/domain/team/role-permissions'
import {
  createPermissionTemplate,
  updatePermissionTemplate,
  duplicatePermissionTemplate,
  deletePermissionTemplate,
  enforcePermissionTemplate,
} from '@/domain/team/role-management'
import { getErrorMessage } from './settings-helpers'

type Props = {
  workspaceId: string
  workspaceName: string
  templates: PermissionTemplate[]
  isOwner: boolean
  callerPermissions: PermissionPair[]
  assignmentsByUser: Map<string, Set<string>>
  refresh: () => Promise<void>
}

type Editor = { mode: 'create' | 'edit' | 'duplicate'; template?: PermissionTemplate }

// Map raw resource keys to human-readable category names
const RESOURCE_LABEL: Record<string, string> = Object.fromEntries(ROLE_RESOURCES)
// Group resources into logical sections for the UI
const RESOURCE_GROUPS: Array<{ group: string; resources: string[] }> = [
  { group: 'Documents', resources: ['invoice', 'quotation', 'waybill', 'boq', 'rfq', 'csr', 'letter'] },
  { group: 'Operations', resources: ['project', 'project_document', 'client', 'item', 'payment', 'receipt'] },
  { group: 'Company', resources: ['setting', 'signatory', 'bank_account', 'tax_setting', 'account', 'period', 'journal', 'source_transaction', 'audit', 'device'] },
  { group: 'All Resources', resources: ['*'] },
]

function getStateBadge(state: 'None' | 'Partial' | 'All') {
  if (state === 'All') return 'su-perm-cat-state all'
  if (state === 'Partial') return 'su-perm-cat-state partial'
  return 'su-perm-cat-state none'
}

export function RoleBuilder({
  workspaceId,
  workspaceName,
  templates,
  isOwner,
  callerPermissions,
  assignmentsByUser,
  refresh,
}: Props) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<PermissionPair[]>([])
  const [markResource, setMarkResource] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    kind: 'delete' | 'sync'
    template: PermissionTemplate
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const canGrant = (pair: PermissionPair) =>
    isOwner || callerPermissions.some((row) => permissionCovers(row, pair))
  const readOnly = !isOwner || editor?.mode === 'duplicate'
  const removed =
    editor?.mode === 'edit' ? removedPermissions(editor.template?.items ?? [], items) : []

  const openEditor = (next: Editor) => {
    setEditor(next)
    setName(
      next.mode === 'duplicate'
        ? `${next.template?.name ?? ''} (copy)`.slice(0, 100)
        : next.template?.name ?? '',
    )
    setDescription(next.template?.description ?? '')
    setItems(next.template?.items.map((pair) => ({ ...pair })) ?? [])
    setMarkResource(null)
    setError(null)
  }

  const save = async () => {
    if (!isOwner || !editor || busy || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (editor.mode === 'duplicate' && editor.template) {
        await duplicatePermissionTemplate(editor.template.id, name)
        setNotice('Role duplicated. Open the copy to change its permissions.')
      } else if (editor.mode === 'edit' && editor.template) {
        await updatePermissionTemplate(editor.template.id, { name, description, items })
        setNotice(
          'Role saved. Additions apply immediately to holders in every company. Removed permissions remain effective until explicitly synchronized.',
        )
      } else {
        await createPermissionTemplate(workspaceId, { name, description, items })
        setNotice('Role created. Return to Team Hub to assign it to existing company members.')
      }
      setEditor(null)
      await refresh()
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!isOwner || !confirmation || busy) return
    setBusy(true)
    setError(null)
    try {
      if (confirmation.kind === 'delete') {
        await deletePermissionTemplate(confirmation.template.id)
        setNotice('Role and assignment records deleted. Existing effective permissions remain.')
      } else {
        const removedCount = await enforcePermissionTemplate(confirmation.template.id)
        setNotice(
          `Synchronization complete. ${removedCount} permission rows removed across companies.`,
        )
      }
      setConfirmation(null)
      await refresh()
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3" aria-label="Workspace role library">
      {!isOwner && (
        <p className="su-ia-note">Only the workspace owner can change roles.</p>
      )}
      {notice && <p role="status" className="su-ia-note">{notice}</p>}

      {/* ── Role list ── */}
      {templates.length === 0 && (
        <p className="su-ia-note">No roles yet.</p>
      )}
      <div className="su-scope-card su-role-library">
        {templates.map((template) => {
          const holderCount = [...assignmentsByUser.values()].filter((roles) =>
            roles.has(template.id),
          ).length
          return (
            <button
              type="button"
              key={template.id}
              className="su-srow"
              disabled={busy}
              onClick={() => openEditor({ mode: 'edit', template })}
            >
              <span className="su-srow-icon accent">
                <ShieldCheck aria-hidden="true" />
              </span>
              <span className="su-srow-main">
                <span className="su-srow-label">{template.name}</span>
                <span className="su-srow-meta">
                  {holderCount} holder{holderCount !== 1 ? 's' : ''} · {template.items.length} permissions
                </span>
              </span>
              <span className="su-srow-end">
                <span className="su-srow-count">{template.items.length}</span>
                <ChevronRight aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>

      {isOwner && (
        <button
          type="button"
          className="su-primarybtn"
          onClick={() => openEditor({ mode: 'create' })}
        >
          <Plus size={14} aria-hidden="true" />
          Create Custom Role
        </button>
      )}

      {/* ── Role editor / detail sheet ── */}
      <SettingsSheet
        open={!!editor}
        onClose={() => { if (!busy) setEditor(null) }}
        title={
          editor?.mode === 'create'
            ? 'Create Role'
            : editor?.mode === 'duplicate'
              ? 'Duplicate Role'
              : isOwner
                ? 'Edit Role'
                : editor?.template?.name ?? 'Role Details'
        }
        subtitle={`Permission definitions · ${workspaceName}`}
      >
        {editor && (
          <div className="space-y-1">
            {/* ── Identity card ── */}
            <div className="su-role-identity">
              <div className="su-role-identity-icon">
                <ShieldCheck aria-hidden="true" />
              </div>
              <div className="su-role-identity-body">
                {editor.mode === 'edit' || editor.mode === 'duplicate' ? (
                  <>
                    <div className="su-role-identity-name">
                      {editor.template?.name ?? name}
                    </div>
                    {editor.template?.description && (
                      <div className="su-role-identity-desc">{editor.template.description}</div>
                    )}
                    <div className="su-role-meta-row">
                      <span className="su-role-badge accent">
                        <Users size={10} aria-hidden="true" />
                        {[...assignmentsByUser.values()].filter((r) =>
                          r.has(editor.template?.id ?? ''),
                        ).length}{' '}
                        holder{[...assignmentsByUser.values()].filter((r) =>
                          r.has(editor.template?.id ?? ''),
                        ).length !== 1 ? 's' : ''}
                      </span>
                      <span className="su-role-badge">
                        <ShieldCheck size={10} aria-hidden="true" />
                        {items.length} permission{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="su-role-identity-name">New Role</div>
                )}
              </div>
            </div>

            {/* ── Name & description fields ── */}
            <form
              id="role-editor-form"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <div className="su-form-card space-y-3">
                <label className="su-field">
                  <span>Role Name</span>
                  <Input
                    value={name}
                    maxLength={100}
                    required
                    disabled={busy || !isOwner}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Inspector"
                    className="mt-1"
                  />
                </label>
                <label className="su-field">
                  <span>Description</span>
                  <Input
                    value={description}
                    disabled={busy || readOnly}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this role"
                    className="mt-1"
                  />
                </label>
              </div>

              {editor.mode === 'duplicate' && (
                <p className="su-ia-note" style={{ marginTop: 10 }}>
                  The copy keeps the saved description and permission rows. Edit it after duplication.
                </p>
              )}

              {/* ── Permission categories ── */}
              <div className="su-perm-section">
                <div className="su-perm-section-title">Access Permissions</div>
                <p className="su-ia-note" style={{ margin: '0 2px 10px' }}>
                  Select which actions this role grants. "All company resources" uses a wildcard.
                </p>

                {RESOURCE_GROUPS.map(({ group, resources }) => {
                  // Only show resources that actually exist in ROLE_RESOURCES
                  const known = ROLE_RESOURCES.map(([k]) => k) as string[]
                  const validResources = resources.filter((r) => known.includes(r))
                  if (!validResources.length) return null

                  return (
                    <div key={group} className="su-perm-cat">
                      <div className="su-perm-cat-header">
                        <span className="su-perm-cat-name">{group}</span>
                      </div>
                      {validResources.map((resource) => {
                        const label = RESOURCE_LABEL[resource] ?? resource
                        const state = categoryState(items, resource)
                        return (
                          <div key={resource}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 12px 2px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: 'var(--su-ink-2)',
                                }}
                              >
                                {label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className={getStateBadge(state)}>{state}</span>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      setMarkResource(
                                        markResource === `${resource}:confirm` ? null : `${resource}:confirm`,
                                      )
                                    }
                                    style={{
                                      fontSize: 8,
                                      fontWeight: 800,
                                      color: 'var(--su-accent)',
                                      padding: '2px 6px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    Mark all
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Mark all confirmation inline */}
                            {markResource === `${resource}:confirm` && (
                              <div
                                style={{
                                  margin: '4px 12px 6px',
                                  padding: '8px 10px',
                                  borderRadius: 8,
                                  background: 'var(--su-surface-muted)',
                                  fontSize: 9,
                                }}
                              >
                                <span style={{ fontWeight: 700, color: 'var(--su-ink-2)' }}>
                                  Include delete?
                                </span>
                                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setItems((prev) => markCategory(prev, resource, false, canGrant))
                                      setMarkResource(null)
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      background: 'var(--su-surface)',
                                      border: '1px solid var(--su-line)',
                                      fontSize: 8,
                                      fontWeight: 800,
                                    }}
                                  >
                                    Exclude Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setItems((prev) => markCategory(prev, resource, true, canGrant))
                                      setMarkResource(null)
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      background: 'var(--su-surface)',
                                      border: '1px solid var(--su-line)',
                                      fontSize: 8,
                                      fontWeight: 800,
                                    }}
                                  >
                                    Include Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMarkResource(null)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      fontSize: 8,
                                      fontWeight: 700,
                                      color: 'var(--su-ink-3)',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="su-perm-actions">
                              {ROLE_ACTIONS.map((action) => {
                                const pair = { resource, action }
                                const checked = items.some(
                                  (row) => row.resource === resource && row.action === action,
                                )
                                const grantable = canGrant(pair)
                                return (
                                  <label
                                    key={action}
                                    className={`su-perm-action-item${checked ? ' active' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      aria-label={`${label}: ${action}`}
                                      disabled={readOnly || !grantable || busy}
                                      checked={checked}
                                      onChange={(e) =>
                                        setItems((prev) =>
                                          e.target.checked
                                            ? [...prev, pair]
                                            : prev.filter(
                                                (row) =>
                                                  row.resource !== resource ||
                                                  row.action !== action,
                                              ),
                                        )
                                      }
                                    />
                                    {action}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* ── Progressive disclosure: exact rows ── */}
              <details className="su-perm-details" style={{ marginTop: 10 }}>
                <summary>
                  <span>Exact permission rows ({items.length})</span>
                  <ChevronRight size={12} aria-hidden="true" />
                </summary>
                <div className="su-perm-details-body">
                  <p style={{ fontSize: 9, color: 'var(--su-ink-3)', marginBottom: 6 }}>
                    Assignment copies these resource/action pairs. Existing grants remain.
                  </p>
                  <ul style={{ fontFamily: 'var(--su-number)', fontSize: 10, lineHeight: 1.7, listStyle: 'none' }}>
                    {items.map((pair) => (
                      <li key={`${pair.resource}:${pair.action}`}>
                        {pair.resource} / {pair.action}
                      </li>
                    ))}
                  </ul>
                  {!items.length && (
                    <p style={{ fontSize: 10, color: 'var(--su-ink-3)' }}>This role grants no permissions.</p>
                  )}
                </div>
              </details>

              {/* ── Save-impact notice for edit mode ── */}
              {editor.mode === 'edit' && isOwner && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--su-surface-raised)',
                    border: '1px solid var(--su-line)',
                    fontSize: 10,
                    color: 'var(--su-ink-2)',
                  }}
                >
                  Save immediately adds new permissions for all holders across all companies. Removed
                  permissions remain effective until you synchronize access.
                  {removed.length > 0 && (
                    <p style={{ marginTop: 6, fontWeight: 800, color: 'var(--su-caution)' }}>
                      {removed.length} permission row{removed.length !== 1 ? 's' : ''} removed from
                      this definition. Save does not revoke them from members.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p role="alert" style={{ marginTop: 8, fontSize: 11, color: 'var(--su-caution)' }}>
                  {error}
                </p>
              )}
            </form>

            {/* ── Action strip ── */}
            <div className="su-role-actions-strip">
              {/* Destructive actions on the left (only in edit mode, owner only) */}
              {isOwner && editor.mode === 'edit' && editor.template && (
                <>
                  <button
                    type="button"
                    className="su-role-action-btn"
                    disabled={busy}
                    onClick={() => openEditor({ mode: 'duplicate', template: editor.template })}
                  >
                    <Copy size={12} aria-hidden="true" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="su-role-action-btn"
                    disabled={busy}
                    onClick={() => {
                      setError(null)
                      setConfirmation({ kind: 'sync', template: editor.template! })
                      setEditor(null)
                    }}
                  >
                    <RefreshCw size={12} aria-hidden="true" />
                    Synchronize
                  </button>
                  <button
                    type="button"
                    className="su-role-action-btn danger"
                    disabled={busy}
                    onClick={() => {
                      setError(null)
                      setConfirmation({ kind: 'delete', template: editor.template! })
                      setEditor(null)
                    }}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* ── Primary save / close ── */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                marginTop: 10,
                paddingTop: 12,
                borderTop: '1px solid var(--su-line)',
              }}
            >
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>
                Close
              </Button>
              {isOwner && (
                <Button
                  type="submit"
                  form="role-editor-form"
                  disabled={busy || !name.trim() || items.some((p) => !canGrant(p))}
                >
                  {busy
                    ? 'Saving…'
                    : editor.mode === 'duplicate'
                      ? 'Create Copy'
                      : 'Save Role'}
                </Button>
              )}
            </div>
          </div>
        )}
      </SettingsSheet>

      {/* ── Confirmation dialog ── */}
      <AlertDialog
        open={!!confirmation}
        onOpenChange={(open) => { if (!open && !busy) setConfirmation(null) }}
      >
        <AlertDialogContent className="bd-settings-surface rounded-[var(--bd-overlay-radius)]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation?.kind === 'delete'
                ? 'Delete role'
                : 'Synchronize and revoke access'}
              : {confirmation?.template.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.kind === 'delete'
                ? 'This deletes the role and its assignment records across the workspace, even when members hold it. Their existing effective permissions remain. This cannot be undone.'
                : 'This affects every holder of this role in every company in the workspace. It adds the current role permissions, then removes effective permission rows not covered by any of each holder\'s assigned roles. Direct or invitation grants can also be removed: the database cannot identify their source. Workspace owners and the all-resources view baseline are protected. This cannot be undone automatically.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy
                ? 'Working…'
                : confirmation?.kind === 'delete'
                  ? 'Delete role'
                  : 'Synchronize and revoke'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
