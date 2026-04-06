import { MoreHorizontal } from 'lucide-react'
import StatusChip, { type StatusChipTone } from './StatusChip'

type Row = {
  key: string
  title: string
  meta: string
  amount: string
  statusLabel: string
  statusTone: StatusChipTone
  roleBadge?: { label: string; className: string } | null
  onClick: () => void
  onAction: () => void
}

export default function DenseListCard({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      {rows.map((row, index) => (
        <div
          key={row.key}
          onClick={row.onClick}
          className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-[14px]"
          style={{ borderTop: index === 0 ? 'none' : '1px solid hsl(214,32%,91%)' }}
        >
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-[-0.03em] text-slate-950">{row.title}</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">{row.meta}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-base font-extrabold tracking-[-0.03em] text-slate-950">{row.amount}</div>
            <StatusChip label={row.statusLabel} tone={row.statusTone} />
            {row.roleBadge ? <span className={row.roleBadge.className}>{row.roleBadge.label}</span> : null}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              row.onAction()
            }}
            className="grid h-10 w-10 place-items-center rounded-[14px] border border-slate-200 bg-card text-slate-900"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
