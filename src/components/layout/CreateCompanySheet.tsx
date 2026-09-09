import * as React from 'react'
import { Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [displayName, setDisplayName] = React.useState('')
  const [error, setError] = React.useState('')
  const [phase, setPhase] = React.useState<CreationPhase>('form')
  const [createdName, setCreatedName] = React.useState('')
  // True once provisioning finished but exposure could not be confirmed
  // within the wait: still finalizing, not failed. Gate holds meanwhile.
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

  // Reset form when sheet opens
  React.useEffect(() => {
    if (open) {
      setDisplayName('')
      setError('')
      setPhase('form')
      setCreatedName('')
      setExtendedWait(false)
      cancelledRef.current = false
    }
  }, [open])

  // Cleanup: mark cancelled on unmount
  React.useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  /**
   * Poll getEntityProvisioningStatus until terminal state (ready/failed) or timeout.
   * Returns the terminal status string.
   */
  const pollProvisioning = React.useCallback(
    async (entityId: string): Promise<{ status: string; error?: string }> => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (cancelledRef.current) return { status: 'cancelled' }

        // Wait before checking (skip first check — provisionEntity just ran)
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        if (cancelledRef.current) return { status: 'cancelled' }

        try {
          const result = await getEntityProvisioningStatus(entityId)

          if (result.status === 'ready') return { status: 'ready' }
          if (result.status === 'failed') {
            return { status: 'failed', error: result.lastError || 'Provisioning failed.' }
          }
          // 'creating', 'pending' — continue polling
        } catch {
          // Network or RPC error — continue polling
        }
      }

      // Timeout — provisioning took too long
      return { status: 'timeout' }
    },
    [],
  )

  /**
   * Confirm the tenant's PostgREST access path before presenting the
   * company as usable. provisioning 'ready' only means the schema exists;
   * exposure completes asynchronously. Returns true only when exposure is
   * confirmed — callers must not show success otherwise. Always selects
   * the entity so the TenantGate keeps holding on its provisioning screen
   * while exposure completes in the background.
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

      // Kick off provisioning
      const provisionResult = await provisionEntity(entity.id)

      if (cancelledRef.current) return

      if (provisionResult.status === 'failed') {
        setPhase('error')
        setError('Provisioning failed during schema creation. The company was created but is not ready to use.')
        return
      }

      if (provisionResult.status === 'ready') {
        // Provisioning completed synchronously — still confirm exposure
        // before claiming the company is active.
        if (await confirmExposureAndSelect(entity.id, entity.slug)) {
          if (cancelledRef.current) return
          setPhase('success')
          feedback.success('Company created', { description: `${name} is now active.` })
          setTimeout(() => onOpenChange(false), 1200)
        }
        return
      }

      // Provisioning is asynchronous (creating/pending) — poll until terminal
      const pollResult = await pollProvisioning(entity.id)

      if (cancelledRef.current) return

      if (pollResult.status === 'ready') {
        // Provisioning complete — confirm exposure before claiming active.
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
        // Provisioning is still running — select entity and let the tenant gate hold it
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
        className="max-h-[78vh] rounded-t-[var(--bd-overlay-radius)] border-0 p-0"
        showCloseButton={false}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-[3px] w-[34px] rounded-full bg-[hsl(var(--surface-strong))]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <SheetTitle className="text-[17px] font-[800] tracking-[-0.05em] text-[hsl(var(--ink))]">
              {phase === 'success'
                ? 'Company Created'
                : phase === 'error'
                  ? 'Creation Failed'
                  : 'Create Company'}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[9px] font-[700] text-[hsl(var(--ink-3))]">
              {phase === 'success'
                ? `${createdName} is now available in ${workspaceName}.`
                : phase === 'error'
                  ? 'Something went wrong during creation.'
                  : `Add a new company to ${workspaceName}.`}
            </SheetDescription>
          </div>
          {!isProcessing || extendedWait ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid h-7 w-7 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-[hsl(var(--surface-muted))] text-[hsl(var(--ink-3))]"
              aria-label="Close"
            >
              <span className="text-[11px] font-[800]">×</span>
            </button>
          ) : null}
        </div>

        {/* Success state */}
        {phase === 'success' && (
          <div className="px-5 pb-6 pt-2">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div>
                <div className="text-[12px] font-[700] text-emerald-800">
                  {createdName}
                </div>
                <div className="text-[10px] text-emerald-600">
                  Added to {workspaceName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="px-5 pb-6 pt-2">
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-4 py-3"
            >
              <Loader2
                className="h-5 w-5 shrink-0 animate-spin text-[hsl(var(--primary))]"
                aria-hidden="true"
              />
              <div>
                <div className="text-[12px] font-[700] text-[hsl(var(--ink))]">
                  {phase === 'creating'
                    ? 'Creating company…'
                    : extendedWait
                      ? 'Taking longer than expected…'
                      : 'Setting up schema…'}
                </div>
                <div className="text-[10px] text-[hsl(var(--ink-3))]">
                  {extendedWait
                    ? 'Still finalizing access. You can wait or close — the app continues automatically.'
                    : createdName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div className="px-5 pb-6 pt-2 space-y-3">
            <div
              role="alert"
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertCircle
                className="h-5 w-5 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <div>
                <div className="text-[12px] font-[700] text-red-800">
                  Creation failed
                </div>
                <div className="text-[10px] text-red-600">{error}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhase('form')}
              className="h-10 w-full rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] text-[12px] font-[700] text-[hsl(var(--ink))] transition active:scale-[0.985]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Form */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} className="px-5 pb-6 pt-1 space-y-4">
            <div>
              <label
                htmlFor="create-company-name"
                className="block text-[11px] font-[800] uppercase tracking-[0.075em] text-[hsl(var(--ink-3))] mb-1.5"
              >
                Company Name
              </label>
              <input
                id="create-company-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Tunde and Sons Limited"
                autoFocus
                aria-describedby={error ? 'create-company-error' : undefined}
                className="h-11 w-full rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3.5 text-[13px] font-[600] text-[hsl(var(--ink))] placeholder:text-[hsl(var(--ink-3))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:border-[hsl(var(--primary))]"
              />
              <p className="mt-1.5 text-[10px] text-[hsl(var(--ink-3))]">
                You can update company details later in Company Settings.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                id="create-company-error"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-[600] text-red-700"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!displayName.trim()}
              className="h-12 w-full rounded-xl bg-[hsl(var(--primary))] text-[13px] font-[800] text-white transition active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                <Building2 className="h-4 w-4" />
                Create Company
              </span>
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
