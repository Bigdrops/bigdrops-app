import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import SettingsSheet from '@/components/settings/SettingsSheet'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog'
import type { PermissionTemplate } from '@/hooks/usePermissionTemplates'
import { ROLE_ACTIONS, ROLE_RESOURCES, categoryState, markCategory, permissionCovers, removedPermissions, type PermissionPair } from '@/domain/team/role-permissions'
import { createPermissionTemplate, updatePermissionTemplate, duplicatePermissionTemplate, deletePermissionTemplate, enforcePermissionTemplate } from '@/domain/team/role-management'
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

export function RoleBuilder({ workspaceId, workspaceName, templates, isOwner, callerPermissions, assignmentsByUser, refresh }: Props) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<PermissionPair[]>([])
  const [markResource, setMarkResource] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ kind: 'delete' | 'sync'; template: PermissionTemplate } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // M8 makes template writes owner-only. Owners have the full template ceiling.
  const canGrant = (pair: PermissionPair) => isOwner || callerPermissions.some(row => permissionCovers(row, pair))
  const readOnly = !isOwner || editor?.mode === 'duplicate'
  const removed = editor?.mode === 'edit' ? removedPermissions(editor.template?.items ?? [], items) : []

  const openEditor = (next: Editor) => {
    setEditor(next)
    setName(next.mode === 'duplicate' ? `${next.template?.name ?? ''} (copy)`.slice(0, 100) : next.template?.name ?? '')
    setDescription(next.template?.description ?? '')
    setItems(next.template?.items.map(pair => ({ ...pair })) ?? [])
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
        setNotice('Role saved. Additions apply immediately to holders in every company. Removed permissions remain effective until explicitly synchronized.')
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
        setNotice(`Synchronization complete. ${removedCount} permission rows removed across companies.`)
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">Role Builder</h3>
          <p className="text-sm text-bd-text-muted">Role library · {workspaceName}</p>
        </div>
        {isOwner && <Button className="min-h-11" onClick={() => openEditor({ mode: 'create' })}>Create role</Button>}
      </div>
      <p className="text-sm text-bd-text-muted">Define company permissions here, then assign roles to members in each company. Workspace membership and invitations are managed separately.</p>
      {!isOwner && <p className="text-sm text-bd-text-muted">Only the workspace owner can change roles. Permissions above your company authority are disabled.</p>}
      {notice && <p role="status" className="rounded-lg border border-bd-border bg-bd-surface p-3 text-sm">{notice}</p>}
      {templates.length === 0 && <p className="text-sm text-bd-text-muted">No roles yet.</p>}
      <div className="divide-y divide-bd-border overflow-hidden rounded-[18px] border border-bd-border bg-bd-card-bg">
        {templates.map(template => (
          <button type="button" key={template.id} className="flex min-h-14 w-full items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" disabled={busy} onClick={() => openEditor({ mode: 'edit', template })}>
            <ShieldCheck size={18} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1 basis-40">
              <h4 className="break-words text-xs font-extrabold">{template.name}</h4>
              <p className="break-words text-[11px] text-bd-text-muted">{template.description || `${template.items.length} permission rows`}</p>
              <p className="mt-1 text-[10px] text-bd-text-muted">{[...assignmentsByUser.values()].filter(roles => roles.has(template.id)).length} holders in the active company · {template.items.length} permission rows</p>
            </div>
            <ChevronRight size={15} className="shrink-0 text-bd-text-muted" />
          </button>
        ))}
      </div>

      <SettingsSheet open={!!editor} onClose={() => { if (!busy) setEditor(null) }}
        title={editor?.mode === 'create' ? 'Create role' : editor?.mode === 'duplicate' ? 'Duplicate role' : isOwner ? 'Edit role' : 'Inspect role'}
        subtitle={`Company permissions · ${workspaceName}. Definitions are shared across this workspace.`}>
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save() }}>
            <label className="block space-y-2 text-sm font-semibold">Role name
              <Input className="min-h-11" value={name} maxLength={100} required disabled={busy || !isOwner} onChange={event => setName(event.target.value)} />
            </label>
            <label className="block space-y-2 text-sm font-semibold">Description
              <Input className="min-h-11" value={description} disabled={busy || readOnly} onChange={event => setDescription(event.target.value)} />
            </label>
            <p className="text-sm text-bd-text-muted">Each checkbox adds one permission row. “All company resources” uses a wildcard and includes future resources. Category states count explicit selections.</p>
            {editor?.mode === 'duplicate' && <p className="text-sm">The copy keeps the saved description and permission rows. Edit it after duplication.</p>}
            <div className="space-y-3">
              {ROLE_RESOURCES.map(([resource, label]) => (
                <fieldset key={resource} className="rounded-lg border border-bd-border p-3" disabled={busy}>
                  <legend className="px-1 text-sm font-semibold">{label} · {categoryState(items, resource)}</legend>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {ROLE_ACTIONS.map(action => {
                      const pair = { resource, action }
                      return <label key={action} className="flex min-h-11 items-center gap-2 text-sm capitalize">
                        <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" aria-label={`${label}: ${action}`} disabled={readOnly || !canGrant(pair)}
                          checked={items.some(row => row.resource === resource && row.action === action)}
                          onChange={event => setItems(previous => event.target.checked ? [...previous, pair] : previous.filter(row => row.resource !== resource || row.action !== action))} />
                        {action}
                      </label>
                    })}
                    <Button type="button" variant="ghost" className="min-h-11" disabled={readOnly} onClick={() => setMarkResource(resource)}>Mark all</Button>
                  </div>
                  {markResource === resource && <div className="mt-2 space-y-2 rounded-lg bg-bd-surface p-3">
                    <p className="text-sm">Include delete permissions for {label.toLowerCase()}?</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => { setItems(previous => markCategory(previous, resource, false, canGrant)); setMarkResource(null) }}>Exclude Delete</Button>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => { setItems(previous => markCategory(previous, resource, true, canGrant)); setMarkResource(null) }}>Include Delete</Button>
                      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setMarkResource(null)}>Cancel</Button>
                    </div>
                  </div>}
                </fieldset>
              ))}
            </div>
            <details className="rounded-lg border border-bd-border p-3">
              <summary className="cursor-pointer py-2 text-sm font-semibold">Exact permission rows ({items.length})</summary>
              <p className="mb-2 text-sm text-bd-text-muted">Assignment copies these resource/action pairs for the selected company and member. Existing grants remain.</p>
              <ul className="space-y-1 font-mono text-xs">{items.map(pair => <li key={`${pair.resource}:${pair.action}`}>{pair.resource} / {pair.action}</li>)}</ul>
              {!items.length && <p className="text-sm">This role grants no permissions.</p>}
            </details>
            {editor?.mode === 'edit' && isOwner && <div className="rounded-lg border border-bd-border bg-bd-surface p-3 text-sm">
              Save immediately adds permissions for holders in all companies. Removed permissions remain effective until you explicitly synchronize access.
              {removed.length > 0 && <p className="mt-2 font-semibold">{removed.length} permission rows are removed from this definition. Save does not revoke them from members.</p>}
            </div>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {isOwner && editor?.mode === 'edit' && editor.template && <div className="flex flex-wrap gap-2 border-t border-bd-border pt-3">
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => openEditor({ mode: 'duplicate', template: editor.template })}>Duplicate saved role</Button>
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { setError(null); setConfirmation({ kind: 'sync', template: editor.template! }); setEditor(null) }}>Synchronize saved role</Button>
              <Button type="button" variant="outline" className="min-h-11 text-destructive" disabled={busy} onClick={() => { setError(null); setConfirmation({ kind: 'delete', template: editor.template! }); setEditor(null) }}>Delete role</Button>
            </div>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>Close</Button>
              {isOwner && <Button type="submit" disabled={busy || !name.trim() || items.some(pair => !canGrant(pair))}>{busy ? 'Saving…' : editor?.mode === 'duplicate' ? 'Create copy' : 'Save role'}</Button>}
            </div>
          </form>
      </SettingsSheet>

      <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !busy) setConfirmation(null) }}>
        <AlertDialogContent className="bd-settings-surface rounded-[var(--bd-overlay-radius)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.kind === 'delete' ? 'Delete role' : 'Synchronize and revoke access'}: {confirmation?.template.name}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.kind === 'delete'
              ? 'This deletes the role and its assignment records across the workspace, even when members hold it. Their existing effective permissions remain. This cannot be undone.'
              : 'This affects every holder of this role in every company in the workspace. It adds the current role permissions, then removes effective permission rows not covered by any of each holder’s assigned roles. Direct or invitation grants can also be removed: the database cannot identify their source. Workspace owners and the all-resources view baseline are protected. This cannot be undone automatically.'}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void confirm()}>{busy ? 'Working…' : confirmation?.kind === 'delete' ? 'Delete role' : 'Synchronize and revoke'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
