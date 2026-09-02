import * as React from 'react'
import { Building2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import { createEntity, provisionEntity, slugify } from '@/domain/tenant/tenantCreation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { feedback } from '@/lib/feedback'

interface CreateCompanySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCompanySheet({ open, onOpenChange }: CreateCompanySheetProps) {
  const { workspace } = useWorkspace()
  const { refresh: refreshEntity, selectEntity } = useEntity()
  const [displayName, setDisplayName] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Reset form when sheet opens
  React.useEffect(() => {
    if (open) {
      setDisplayName('')
      setError('')
    }
  }, [open])

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

    setLoading(true)
    try {
      const entity = await createEntity({
        workspaceId: workspace.id,
        displayName: displayName.trim(),
        slug: slugify(displayName),
      })
      await provisionEntity(entity.id)
      // Make the newly created company the active entity
      selectEntity(entity.id)
      refreshEntity()
      feedback.success('Company created', { description: `${displayName.trim()} is now available.` })
      onOpenChange(false)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[78vh] rounded-t-[24px] border-0 p-0"
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
              Create Company
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[9px] font-[700] text-[hsl(var(--ink-3))]">
              Add a new company to {workspace?.name || 'your workspace'}.
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--surface-muted))] text-[hsl(var(--ink-3))]"
          >
            <span className="text-[11px] font-[800]">×</span>
          </button>
        </div>

        {/* Form */}
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
              className="h-11 w-full rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3.5 text-[13px] font-[600] text-[hsl(var(--ink))] placeholder:text-[hsl(var(--ink-3))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:border-[hsl(var(--primary))]"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-[600] text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="h-12 w-full rounded-xl bg-[hsl(var(--primary))] text-[13px] font-[800] text-white transition active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Building2 className="h-4 w-4" />
                Create Company
              </span>
            )}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
