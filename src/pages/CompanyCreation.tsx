import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ButtonLoading } from '@/components/loading/AppLoadingStates'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import { createEntity, provisionEntity, slugify } from '@/domain/tenant/tenantCreation'

export default function CompanyCreation() {
  const workspaceCtx = useWorkspace()
  const entityCtx = useEntity()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const workspaceId = workspaceCtx.workspace?.id

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

    setLoading(true)
    try {
      const entity = await createEntity({
        workspaceId,
        displayName: displayName.trim(),
        slug: slugify(displayName),
      })
      await provisionEntity(entity.id)
      entityCtx.refresh()
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const updateName = (event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
        <CardContent className="p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 shadow-sm">
            <Building className="h-8 w-8 text-sky-600" />
          </div>

          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              BigDrops ERP
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Create your company
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your company lives inside your approved workspace. Provisioning starts automatically
              once the company is created.
            </p>
          </div>

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
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#111111] text-white hover:bg-black"
            >
              <ButtonLoading
                loading={loading}
                loadingLabel="Creating company"
                idleLabel="Create Company"
              />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
