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
    <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_2px_4px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.22)]">
      {rows.map((row, index) => (
        <div
          key={row.key}
          onClick={row.onClick}
          className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-[14px]"
          style={{ borderTop: index === 0 ? 'none' : '1px solid hsl(var(--bd-border) / 0.42)' }}
        >
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-[-0.04em] text-[hsl(var(--bd-ink))]">{row.title}</div>
            <div className="mt-1 text-[13px] leading-5 text-[hsl(var(--bd-ink-muted))]">{row.meta}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-base font-extrabold tracking-[-0.04em] text-[hsl(var(--bd-ink))]">{row.amount}</div>
            <StatusChip label={row.statusLabel} tone={row.statusTone} />
            {row.roleBadge ? <span className={row.roleBadge.className}>{row.roleBadge.label}</span> : null}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              row.onAction()
            }}
            className="grid h-10 w-10 place-items-center rounded-[14px] bg-card shadow-[0_2px_4px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.25)] text-[hsl(var(--bd-ink))] transition active:scale-95"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
