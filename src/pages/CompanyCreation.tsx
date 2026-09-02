import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react'
import { Building, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import {
  createEntity,
  provisionEntity,
  getEntityProvisioningStatus,
  slugify,
} from '@/domain/tenant/tenantCreation'

type Phase = 'form' | 'creating' | 'provisioning' | 'success' | 'error'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 15

export default function CompanyCreation() {
  const workspaceCtx = useWorkspace()
  const entityCtx = useEntity()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const cancelledRef = useRef(false)

  const workspaceId = workspaceCtx.workspace?.id
  const workspaceName = workspaceCtx.workspace?.name || 'your workspace'

  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const pollProvisioning = async (
    entityId: string,
  ): Promise<{ status: string; error?: string }> => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (cancelledRef.current) return { status: 'cancelled' }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      if (cancelledRef.current) return { status: 'cancelled' }

      try {
        const result = await getEntityProvisioningStatus(entityId)

        if (result.status === 'ready') return { status: 'ready' }
        if (result.status === 'failed') {
          return {
            status: 'failed',
            error: result.lastError || 'Provisioning failed.',
          }
        }
      } catch {
        // Network or RPC error — continue polling
      }
    }

    return { status: 'timeout' }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!workspaceId) {
      setError('No active workspace. Please try again.')
      return
    }
    if (!displayName.trim()) {
      setError('Please enter a company name.')
      return
    }

    setPhase('creating')

    try {
      const entity = await createEntity({
        workspaceId,
        displayName: displayName.trim(),
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
        entityCtx.selectEntity(entity.id)
        entityCtx.refresh()
        setPhase('success')
        return
      }

      // Asynchronous provisioning — poll until terminal
      const pollResult = await pollProvisioning(entity.id)

      if (cancelledRef.current) return

      if (pollResult.status === 'ready') {
        entityCtx.selectEntity(entity.id)
        entityCtx.refresh()
        setPhase('success')
      } else if (pollResult.status === 'failed') {
        setPhase('error')
        setError(
          pollResult.error ||
            'Provisioning failed. The company was created but is not ready to use.',
        )
      } else if (pollResult.status === 'timeout') {
        // Provisioning still running — select entity, tenant gate handles it
        entityCtx.selectEntity(entity.id)
        entityCtx.refresh()
        setPhase('success')
      }
    } catch (e) {
      if (cancelledRef.current) return
      setPhase('error')
      setError(String((e as Error)?.message ?? e))
    }
  }

  const updateName = (event: ChangeEvent<HTMLInputElement>) =>
    setDisplayName(event.target.value)

  const isProcessing = phase === 'creating' || phase === 'provisioning'

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
        <CardContent className="p-8">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 shadow-sm">
            {phase === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : phase === 'error' ? (
              <AlertCircle className="h-8 w-8 text-red-600" />
            ) : (
              <Building className="h-8 w-8 text-sky-600" />
            )}
          </div>

          {/* Header */}
          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              BigDrops ERP
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {phase === 'success'
                ? 'Company created'
                : phase === 'error'
                  ? 'Something went wrong'
                  : 'Create your company'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {phase === 'success'
                ? `${displayName.trim()} is now active in ${workspaceName}.`
                : phase === 'error'
                  ? error
                  : `Your company lives inside ${workspaceName}. Provisioning starts automatically once the company is created.`}
            </p>
          </div>

          {/* Form */}
          {phase === 'form' && (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-slate-700">
                  Company name
                </Label>
                <Input
                  id="company-name"
                  type="text"
                  value={displayName}
                  onChange={updateName}
                  placeholder="e.g. Tunde and Sons Limited"
                  className="h-12 rounded-xl border-black/10 bg-background pl-4 text-base shadow-none"
                />
                <p className="text-xs text-muted-foreground">
                  You can update company details later in Company Settings.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!displayName.trim()}
                className="h-12 w-full rounded-xl bg-[#111111] text-white hover:bg-black"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phase === 'creating' ? 'Creating…' : 'Setting up…'}
                  </span>
                ) : (
                  'Create Company'
                )}
              </Button>
            </form>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {phase === 'creating'
                    ? 'Creating company…'
                    : 'Setting up schema…'}
                </div>
                <div className="text-xs text-slate-500">
                  {displayName.trim()}
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {phase === 'success' && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">
                  {displayName.trim()}
                </div>
                <div className="text-xs text-emerald-600">
                  Added to {workspaceName}
                </div>
              </div>
            </div>
          )}

          {/* Error retry */}
          {phase === 'error' && (
            <Button
              type="button"
              onClick={() => {
                setPhase('form')
                setError('')
              }}
              className="mt-4 h-12 w-full rounded-xl border border-black/10 bg-background text-foreground hover:bg-muted"
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
