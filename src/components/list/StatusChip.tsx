import { cn } from '@/lib/utils'

export type StatusChipTone =
  | 'open'
  | 'unpaid'
  | 'paid'
  | 'partially_paid'
  | 'converted'
  | 'active'
  | 'completed'
  | 'dispatched'
  | 'delivered'
  | 'tag'
  | 'scope'

const toneClass: Record<StatusChipTone, string> = {
  open: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  unpaid: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400',
  paid: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  partially_paid: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  converted: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  active: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  completed: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  dispatched: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  delivered: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  tag: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  scope: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400',
}

export default function StatusChip({ label, tone }: { label: string; tone: StatusChipTone }) {
  return (
    <span className={cn('inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold', toneClass[tone])}>
      {label}
    </span>
  )
}
