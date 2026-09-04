import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import StatusChip, { type StatusChipTone } from './StatusChip'

type Chip = { label: string; tone: StatusChipTone }

type EntityListCardProps = {
  leading: ReactNode
  kicker?: string
  title: string
  subtitle: string
  metadata?: string[]
  chips?: Chip[]
  amount?: string
  status?: Chip
  footer?: ReactNode
  onClick: () => void
  onAction: () => void
}

export default function EntityListCard({
  leading,
  kicker,
  title,
  subtitle,
  metadata,
  chips,
  amount,
  status,
  footer,
  onClick,
  onAction,
}: EntityListCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[22px] bg-card p-4 shadow-[0_2px_4px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.22)]"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div>{leading}</div>
        <div className="min-w-0">
          {kicker ? <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--bd-ink-muted))]">{kicker}</div> : null}
          <div className="mt-1 text-lg font-bold tracking-[-0.04em] text-[hsl(var(--bd-ink))]">{title}</div>
          <div className="mt-1 text-sm text-[hsl(var(--bd-ink-muted))]">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAction()
          }}
          className="grid h-10 w-10 place-items-center rounded-[14px] bg-card shadow-[0_2px_4px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.25)] text-[hsl(var(--bd-ink))] transition active:scale-95"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {metadata?.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-5 text-[hsl(var(--bd-ink-muted))]">
          {metadata.map((item, index) => (
            <span key={`${item}-${index}`}>{index > 0 ? `• ${item}` : item}</span>
          ))}
        </div>
      ) : null}

      {chips?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <StatusChip key={`${chip.label}-${chip.tone}`} label={chip.label} tone={chip.tone} />
          ))}
        </div>
      ) : null}

      {status || amount ? <div className="my-3 h-px bg-[hsl(var(--bd-border) / 0.42)]" /> : null}
      {status || amount ? (
        <div className="flex items-center justify-between gap-3">
          {status ? <StatusChip label={status.label} tone={status.tone} /> : <span />}
          {amount ? <div className="text-base font-extrabold tracking-[-0.04em] text-[hsl(var(--bd-ink))]">{amount}</div> : null}
        </div>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  )
}
