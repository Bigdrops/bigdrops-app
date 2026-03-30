import { cn } from '@/lib/utils'

export type StatusChipTone =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'partial'
  | 'active'
  | 'completed'
  | 'dispatched'
  | 'delivered'
  | 'tag'
  | 'scope'

const toneClass: Record<StatusChipTone, string> = {
  draft: 'bg-[hsl(35,30%,93%)] text-[hsl(30,35%,32%)]',
  sent: 'bg-[hsl(206,70%,94%)] text-[hsl(211,72%,38%)]',
  paid: 'bg-[hsl(142,55%,93%)] text-[hsl(142,65%,30%)]',
  overdue: 'bg-[hsl(0,100%,95%)] text-[hsl(0,72%,51%)]',
  partial: 'bg-[hsl(45,60%,91%)] text-[hsl(35,76%,34%)]',
  active: 'bg-[rgba(34,197,94,.13)] text-[#16a34a]',
  completed: 'bg-[hsl(206,70%,94%)] text-[hsl(211,72%,38%)]',
  dispatched: 'bg-[hsl(206,70%,94%)] text-[hsl(211,72%,38%)]',
  delivered: 'bg-[hsl(142,55%,93%)] text-[hsl(142,65%,30%)]',
  tag: 'bg-slate-100 text-slate-600',
  scope: 'bg-violet-50 text-violet-700',
}

export default function StatusChip({ label, tone }: { label: string; tone: StatusChipTone }) {
  return (
    <span className={cn('inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold', toneClass[tone])}>
      {label}
    </span>
  )
}
