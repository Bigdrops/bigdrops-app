import { MoreHorizontal } from 'lucide-react'
import StatusChip from './StatusChip'

type ProjectListCardProps = {
  title: string
  subtitle: string
  metadata: string[]
  footerLabel: string
  footerValue: string
  statusLabel: string
  onClick: () => void
  onAction: () => void
}

export default function ProjectListCard({
  title,
  subtitle,
  metadata,
  footerLabel,
  footerValue,
  statusLabel,
  onClick,
  onAction,
}: ProjectListCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
    >
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-[22px] bg-emerald-500" />
      <div className="flex items-center justify-between gap-3">
        <StatusChip label={statusLabel} tone="active" />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAction()
          }}
          className="grid h-10 w-10 place-items-center rounded-[14px] border border-slate-200 bg-white text-slate-900"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 text-lg font-bold leading-[1.18] tracking-[-0.03em] text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-5 text-slate-500">
        {metadata.map((item, index) => (
          <span key={`${item}-${index}`}>{index > 0 ? `• ${item}` : item}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <StatusChip label={footerLabel} tone="tag" />
        <div className="text-base font-extrabold tracking-[-0.03em] text-slate-950">{footerValue}</div>
      </div>
    </div>
  )
}
