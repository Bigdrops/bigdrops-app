import * as React from 'react'
import { Building2, Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import {
  createEntity,
  provisionEntity,
  getEntityProvisioningStatus,
  waitForTenantExposure,
  buildTenantSchemaName,
  slugify,
} from '@/domain/tenant/tenantCreation'
import { isUniqueViolation, isPermissionError } from '@/domain/tenant/tenantGate'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { feedback } from '@/lib/feedback'

interface CreateCompanySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CreationPhase = 'form' | 'creating' | 'provisioning' | 'success' | 'error'

/** Poll interval in ms between provisioning status checks. */
const POLL_INTERVAL_MS = 2000
/** Maximum number of polling attempts before timeout. */
const MAX_POLL_ATTEMPTS = 15

export function CreateCompanySheet({ open, onOpenChange }: CreateCompanySheetProps) {
  const { workspace } = useWorkspace()
  const { refresh: refreshEntity, selectEntity } = useEntity()

  // ── Form fields ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = React.useState('')
  const [businessType, setBusinessType] = React.useState('')
  const [regNumber, setRegNumber] = React.useState('')
  const [taxId, setTaxId] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [address, setAddress] = React.useState('')

  // ── Provisioning state ───────────────────────────────────────────────────
  const [error, setError] = React.useState('')
  const [phase, setPhase] = React.useState<CreationPhase>('form')
  const [createdName, setCreatedName] = React.useState('')
  const [extendedWait, setExtendedWait] = React.useState(false)
  const cancelledRef = React.useRef(false)

  /**
   * Map backend failures to user-facing copy. Raw Supabase/Postgres
   * details stay in the console for developers, never in the UI.
   */
  const toFriendlyError = (e: unknown): string => {
    if (isUniqueViolation(e)) {
      return 'A company with a similar name already exists. Try a different name.'
    }
    if (isPermissionError(e)) {
      return 'You do not have permission to create a company in this workspace.'
    }
    const message = String((e as Error)?.message ?? e).toLowerCase()
    if (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('load failed') ||
      message.includes('network request failed')
    ) {
      return "Couldn't reach BigDrops. Check your connection and try again."
    }
    console.error('[company-creation-sheet]', e)
    return "Couldn't create the company. Try again."
  }

  const resetForm = () => {
    setDisplayName('')
    setBusinessType('')
    setRegNumber('')
    setTaxId('')
    setPhone('')
    setEmail('')
    setAddress('')
    setError('')
    setPhase('form')
    setCreatedName('')
    setExtendedWait(false)
    cancelledRef.current = false
  }

  // Reset form when sheet opens
  React.useEffect(() => {
    if (open) resetForm()
  }, [open])

  // Cleanup: mark cancelled on unmount
  React.useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  /**
   * Poll getEntityProvisioningStatus until terminal state (ready/failed) or timeout.
   */
  const pollProvisioning = React.useCallback(
    async (entityId: string): Promise<{ status: string; error?: string }> => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (cancelledRef.current) return { status: 'cancelled' }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        if (cancelledRef.current) return { status: 'cancelled' }
        try {
          const result = await getEntityProvisioningStatus(entityId)
          if (result.status === 'ready') return { status: 'ready' }
          if (result.status === 'failed') {
            return { status: 'failed', error: result.lastError || 'Provisioning failed.' }
          }
        } catch {
          // Network or RPC error — continue polling
        }
      }
      return { status: 'timeout' }
    },
    [],
  )

  /**
   * Confirm the tenant's PostgREST access path before presenting the
   * company as usable.
   */
  const confirmExposureAndSelect = React.useCallback(
    async (entityId: string, entitySlug: string | null): Promise<boolean> => {
      const schema = buildTenantSchemaName(workspace?.slug, entitySlug)
      const exposed = await waitForTenantExposure(schema)
      if (cancelledRef.current) return false
      selectEntity(entityId)
      refreshEntity()
      if (!exposed) setExtendedWait(true)
      return exposed
    },
    [workspace?.slug, selectEntity, refreshEntity],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!workspace?.id) {
      setError('No active workspace.')
      return
    }
    if (!displayName.trim()) {
      setError('Please enter a company name.')
      return
    }

    const name = displayName.trim()
    setCreatedName(name)
    setExtendedWait(false)
    setPhase('creating')

    try {
      const entity = await createEntity({
        workspaceId: workspace.id,
        displayName: name,
        slug: slugify(displayName),
      })

      if (cancelledRef.current) return

      setPhase('provisioning')

      const provisionResult = await provisionEntity(entity.id)

      if (cancelledRef.current) return

      if (provisionResult.status === 'failed') {
        setPhase('error')
        setError(
          'Provisioning failed during schema creation. The company was created but is not ready to use.',
        )
        return
      }

      if (provisionResult.status === 'ready') {
        if (await confirmExposureAndSelect(entity.id, entity.slug)) {
          if (cancelledRef.current) return
          setPhase('success')
          feedback.success('Company created', { description: `${name} is now active.` })
          setTimeout(() => onOpenChange(false), 1200)
        }
        return
      }

      const pollResult = await pollProvisioning(entity.id)

      if (cancelledRef.current) return

      if (pollResult.status === 'ready') {
        if (await confirmExposureAndSelect(entity.id, entity.slug)) {
          if (cancelledRef.current) return
          setPhase('success')
          feedback.success('Company created', { description: `${name} is now active.` })
          setTimeout(() => onOpenChange(false), 1200)
        }
      } else if (pollResult.status === 'failed') {
        setPhase('error')
        setError(pollResult.error || 'Provisioning failed. The company was created but is not ready to use.')
      } else if (pollResult.status === 'timeout') {
        selectEntity(entity.id)
        refreshEntity()
        setExtendedWait(true)
      }
    } catch (e) {
      if (cancelledRef.current) return
      setPhase('error')
      setError(toFriendlyError(e))
    }
  }

  const workspaceName = workspace?.name || 'your workspace'
  const isProcessing = phase === 'creating' || phase === 'provisioning'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] rounded-t-[var(--bd-overlay-radius)] border-0 p-0 bd-settings-surface"
        showCloseButton={false}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="su-grab" />
        </div>

        {/* Header */}
        <div className="su-sheet-head">
          <div>
            <SheetTitle className="su-sheet-title">
              {phase === 'success'
                ? 'Company Created'
                : phase === 'error'
                  ? 'Creation Failed'
                  : 'Create Company'}
            </SheetTitle>
            <SheetDescription className="su-sheet-desc">
              {phase === 'success'
                ? `${createdName} is now available in ${workspaceName}.`
                : phase === 'error'
                  ? 'Something went wrong during creation.'
                  : `Add a new company to ${workspaceName}.`}
            </SheetDescription>
          </div>
          {(!isProcessing || extendedWait) ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="su-dialog-close"
              aria-label="Close"
            >
              <span style={{ fontSize: 13, fontWeight: 800 }}>×</span>
            </button>
          ) : null}
        </div>

        {/* ── Success state ── */}
        {phase === 'success' && (
          <div className="su-sheet-body">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
              }}
            >
              <CheckCircle2
                style={{ width: 20, height: 20, flexShrink: 0, color: '#16a34a' }}
                aria-hidden="true"
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#14532d' }}>
                  {createdName}
                </div>
                <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>
                  Added to {workspaceName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Processing state ── */}
        {isProcessing && (
          <div className="su-sheet-body">
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--su-line)',
                background: 'var(--su-surface-raised)',
              }}
            >
              <Loader2
                style={{
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  color: 'var(--su-accent)',
                  animation: 'spin 1s linear infinite',
                }}
                aria-hidden="true"
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--su-ink)' }}>
                  {phase === 'creating'
                    ? 'Creating company…'
                    : extendedWait
                      ? 'Taking longer than expected…'
                      : 'Setting up schema…'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--su-ink-3)', marginTop: 2 }}>
                  {extendedWait
                    ? 'Still finalizing access. You can wait or close — the app continues automatically.'
                    : createdName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {phase === 'error' && (
          <div className="su-sheet-body">
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                marginBottom: 12,
              }}
            >
              <AlertCircle
                style={{ width: 20, height: 20, flexShrink: 0, color: '#dc2626', marginTop: 1 }}
                aria-hidden="true"
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                  Creation failed
                </div>
                <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>{error}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhase('form')}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid var(--su-line)',
                background: 'var(--su-surface)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--su-ink)',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Multi-section form ── */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} className="su-sheet-body">
            {/* Business Information */}
            <div className="su-form-section">
              <div className="su-form-section-title">Business Information</div>
              <div className="su-form-card">
                <div className="su-field" style={{ marginTop: 0 }}>
                  <label htmlFor="co-name">Company name *</label>
                  <input
                    id="co-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Sun & Shield Power Solutions"
                    autoFocus
                    required
                    disabled={isProcessing}
                    aria-describedby={error ? 'co-create-error' : undefined}
                  />
                </div>
                <div className="su-field">
                  <label htmlFor="co-type">Business type</label>
                  <input
                    id="co-type"
                    type="text"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="e.g. Limited Liability Company"
                    disabled={isProcessing}
                  />
                </div>
                <div className="su-field">
                  <label htmlFor="co-reg">Registration number</label>
                  <input
                    id="co-reg"
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. RC123456"
                    disabled={isProcessing}
                  />
                </div>
                <div className="su-field">
                  <label htmlFor="co-tax">Tax ID</label>
                  <input
                    id="co-tax"
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. 12345678-0001"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="su-form-section">
              <div className="su-form-section-title">Contact Details</div>
              <div className="su-form-card">
                <div className="su-field" style={{ marginTop: 0 }}>
                  <label htmlFor="co-phone">Phone number</label>
                  <input
                    id="co-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 ..."
                    disabled={isProcessing}
                  />
                </div>
                <div className="su-field">
                  <label htmlFor="co-email">Email address</label>
                  <input
                    id="co-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@company.com"
                    disabled={isProcessing}
                  />
                </div>
                <div className="su-field">
                  <label htmlFor="co-address">Address</label>
                  <input
                    id="co-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, city"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Branding — logo upload placeholder (logo storage is a separate task) */}
            <div className="su-form-section">
              <div className="su-form-section-title">Branding</div>
              <div className="su-form-card">
                <div className="su-field" style={{ marginTop: 0 }}>
                  <label>Company Logo</label>
                  <div
                    className="su-logo-upload"
                    role="img"
                    aria-label="Logo upload — available after company creation"
                  >
                    <div className="su-logo-placeholder">
                      <Building2 aria-hidden="true" />
                    </div>
                    <div>
                      <div className="su-logo-text">Upload logo</div>
                      <div className="su-logo-hint">
                        Available in Logo &amp; Branding after creation.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p
              className="su-ia-note"
              style={{ margin: '10px 2px' }}
            >
              <span>
                Company name is required. All other fields are optional and can be completed in
                Company Info after creation.
              </span>
            </p>

            {error ? (
              <div
                role="alert"
                id="co-create-error"
                style={{
                  borderRadius: 10,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  padding: '10px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#b91c1c',
                  marginBottom: 8,
                }}
              >
                {error}
              </div>
            ) : null}

            {/* Spacer for FAB */}
            <div style={{ height: 80 }} />

            {/* Floating save FAB — matches candidate */}
            <button
              type="submit"
              className="su-fab-float"
              disabled={!displayName.trim() || isProcessing}
              aria-label="Save Company"
              title="Save Company"
            >
              <Save aria-hidden="true" />
            </button>

            <p className="su-footer">BIGDROPS ERP</p>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
