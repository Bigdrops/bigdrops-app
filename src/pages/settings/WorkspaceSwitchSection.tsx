import * as React from 'react'
import { Building2, Check, Info, Plus, Save } from 'lucide-react'
import { useWorkspace } from '@/lib/tenant/contexts'
import { hasActionableInvitation } from '@/domain/tenant/tenantGate'
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  slugify,
} from '@/domain/tenant/tenantCreation'
import { feedback } from '@/lib/feedback'

type View = 'list' | 'create'

function getCreateError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e).toLowerCase()
  if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
    return 'A workspace with a similar name already exists. Try a different name.'
  }
  if (msg.includes('permission') || msg.includes('policy') || msg.includes('denied')) {
    return 'You do not have permission to create a workspace.'
  }
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed')
  ) {
    return "Couldn't reach BigDrops. Check your connection and try again."
  }
  return "Couldn't create the workspace. Try again."
}

export function WorkspaceSwitchSection() {
  const {
    workspace,
    activeWorkspaces,
    selectWorkspace,
    isLoading,
    error,
    pendingInvitation,
    invitationDismissed,
    dismissInvitation,
    refresh,
  } = useWorkspace()

  const [view, setView] = React.useState<View>('list')
  const [accepting, setAccepting] = React.useState(false)
  const [acceptError, setAcceptError] = React.useState<string | null>(null)

  // Create workspace form state
  const [wsName, setWsName] = React.useState('')
  const [wsSlug, setWsSlug] = React.useState('')
  const [slugManual, setSlugManual] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)

  const showInvitation = hasActionableInvitation(pendingInvitation, invitationDismissed)

  // Auto-derive slug from name unless user has manually edited it
  React.useEffect(() => {
    if (!slugManual) {
      setWsSlug(slugify(wsName))
    }
  }, [wsName, slugManual])

  const resetCreateForm = () => {
    setWsName('')
    setWsSlug('')
    setSlugManual(false)
    setCreateError(null)
  }

  const handleBack = () => {
    resetCreateForm()
    setView('list')
  }

  const handleAccept = async () => {
    if (!pendingInvitation) return
    setAccepting(true)
    setAcceptError(null)
    try {
      await acceptWorkspaceInvitation(pendingInvitation.id)
      refresh()
    } catch (e) {
      setAcceptError(String((e as Error)?.message ?? e))
    } finally {
      setAccepting(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = wsName.trim()
    const trimmedSlug = wsSlug.trim()
    if (!trimmedName) {
      setCreateError('Workspace name is required.')
      return
    }
    if (!trimmedSlug) {
      setCreateError('Slug is required.')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      await createWorkspace({ name: trimmedName, slug: trimmedSlug })
      feedback.success('Workspace created', {
        description: `${trimmedName} is pending approval.`,
      })
      resetCreateForm()
      setView('list')
      refresh()
    } catch (err) {
      setCreateError(getCreateError(err))
    } finally {
      setCreating(false)
    }
  }

  // ── Create Workspace view ──────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="su-team">
        <form onSubmit={handleCreate}>
          <div className="su-form-section">
            <div className="su-form-section-title">Workspace Details</div>
            <div className="su-form-card">
              <div className="su-field" style={{ marginTop: 0 }}>
                <label htmlFor="ws-create-name">Workspace name</label>
                <input
                  id="ws-create-name"
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. ACME Corp"
                  autoFocus
                  required
                  disabled={creating}
                  aria-describedby={createError ? 'ws-create-error' : undefined}
                />
              </div>
              <div className="su-field">
                <label htmlFor="ws-create-slug">
                  Slug{' '}
                  <span
                    style={{
                      fontSize: 7,
                      fontWeight: 600,
                      color: 'var(--su-ink-3)',
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}
                  >
                    (auto-generated)
                  </span>
                </label>
                <input
                  id="ws-create-slug"
                  type="text"
                  value={wsSlug}
                  onChange={(e) => {
                    setSlugManual(true)
                    setWsSlug(e.target.value)
                  }}
                  placeholder="e.g. acme-corp"
                  required
                  disabled={creating}
                />
              </div>
              <p className="su-ia-note" style={{ margin: '10px 0 0' }}>
                <Info size={11} aria-hidden="true" />
                <span>
                  Workspace goes to <strong>pending approval</strong> after creation. A 30-day
                  soft-delete retention period applies.
                </span>
              </p>
            </div>
          </div>

          {createError && (
            <p
              id="ws-create-error"
              role="alert"
              className="su-field-err"
              style={{ margin: '8px 2px 0' }}
            >
              {createError}
            </p>
          )}

          {/* Primary action */}
          <button
            type="submit"
            className="su-primarybtn"
            style={{ marginTop: 16 }}
            disabled={creating || !wsName.trim()}
          >
            <Plus size={14} aria-hidden="true" />
            {creating ? 'Creating…' : 'Create Workspace'}
          </button>

          <button
            type="button"
            onClick={handleBack}
            disabled={creating}
            style={{
              width: '100%',
              height: 40,
              marginTop: 8,
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--su-ink-3)',
              background: 'none',
            }}
          >
            Cancel
          </button>
        </form>
        <p className="su-footer">BIGDROPS ERP</p>
      </div>
    )
  }

  // ── Workspace list view ───────────────────────────────────────────────────
  return (
    <div className="su-team">
      <div className="su-sechead">
        <h2>Switch Workspace</h2>
      </div>

      {isLoading ? (
        <p role="status" className="su-ia-note">
          Loading workspaces…
        </p>
      ) : error ? (
        <p role="alert" className="su-error">
          {error}
        </p>
      ) : (
        <div className="su-scope-card" style={{ marginTop: 8 }}>
          {activeWorkspaces.map((ws) => {
            const current = ws.id === workspace?.id
            return (
              <div
                key={ws.id}
                className={`su-irow${current ? ' su-ws-current' : ''}`}
              >
                <span className="su-irow-icon">
                  <Building2 size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="su-who-name su-ws-name">
                    {ws.name ?? ws.slug ?? '—'}
                    {current && <span className="su-pill you">Current</span>}
                  </div>
                  <div className="su-irow-when">
                    {ws.slug}
                    {ws.role ? ` · ${ws.role}` : ''}
                  </div>
                </div>
                {current ? (
                  <span className="su-ghostbtn su-ws-actions">
                    <Check size={11} aria-hidden="true" />
                    Active
                  </span>
                ) : (
                  <button
                    type="button"
                    className="su-ghostbtn su-ws-actions"
                    onClick={() => selectWorkspace(ws.id)}
                  >
                    Switch
                  </button>
                )}
              </div>
            )
          })}
          {!activeWorkspaces.length && (
            <p className="su-ia-note">No active workspaces available.</p>
          )}
        </div>
      )}

      <p className="su-ia-note">
        <Info aria-hidden="true" />
        <span>Switching workspace changes your active workspace. Your memberships stay.</span>
      </p>

      {/* Pending workspace invitation */}
      {showInvitation ? (
        <div
          style={{
            marginTop: 8,
            borderRadius: 12,
            border: '1px solid var(--su-line)',
            background: 'var(--su-surface)',
            padding: '12px',
          }}
        >
          <div
            style={{ fontSize: 12, fontWeight: 800, color: 'var(--su-ink)' }}
          >
            Workspace invitation
          </div>
          <p style={{ marginTop: 4, fontSize: 10, color: 'var(--su-ink-3)' }}>
            You have been invited to join another workspace. Accepting adds it to your workspaces.
          </p>
          {acceptError ? (
            <p
              role="alert"
              style={{
                marginTop: 6,
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--su-caution)',
                wordBreak: 'break-all',
              }}
            >
              {acceptError}
            </p>
          ) : null}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                background: 'var(--su-primary)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {accepting ? 'Accepting…' : 'Accept invitation'}
            </button>
            <button
              type="button"
              onClick={dismissInvitation}
              disabled={accepting}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--su-line)',
                background: 'var(--su-surface)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--su-ink)',
              }}
            >
              Pass for now
            </button>
          </div>
        </div>
      ) : null}

      {/* Create Workspace FAB */}
      <button
        type="button"
        className="su-fab"
        aria-label="Create Workspace"
        title="Create Workspace"
        onClick={() => setView('create')}
      >
        <Plus aria-hidden="true" />
      </button>

      <p className="su-footer">BIGDROPS ERP</p>
    </div>
  )
}
