import { Loader2 } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-[22px] border border-border bg-card p-4', className)}>
      <Skeleton className="h-11 w-11 rounded-2xl" />
      <div className="space-y-2 pt-0.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="space-y-2 justify-self-end">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[24px] border border-border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function ButtonLoading({
  loading,
  loadingLabel,
  idleLabel,
}: {
  loading: boolean
  loadingLabel: string
  idleLabel: string
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      <span>{loading ? loadingLabel : idleLabel}</span>
    </span>
  )
}

export function CenteredSpinner() {
  return (
    <div className="flex min-h-[160px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
