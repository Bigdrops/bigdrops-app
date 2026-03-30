import type { ReactNode } from 'react'
import MobileSearchFilterRow from './MobileSearchFilterRow'

const toneStyles = {
  blue: {
    accent: 'bg-blue-500',
    glow: 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_30%),hsl(220,20%,98%)]',
  },
  emerald: {
    accent: 'bg-emerald-500',
    glow: 'bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_30%),hsl(220,20%,98%)]',
  },
  amber: {
    accent: 'bg-amber-500',
    glow: 'bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.08),transparent_30%),hsl(220,20%,98%)]',
  },
  cyan: {
    accent: 'bg-cyan-500',
    glow: 'bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.08),transparent_30%),hsl(220,20%,98%)]',
  },
  violet: {
    accent: 'bg-violet-500',
    glow: 'bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.08),transparent_30%),hsl(220,20%,98%)]',
  },
} as const

type MobileListPageShellProps = {
  eyebrow: string
  title: string
  summary: string
  tone: keyof typeof toneStyles
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  onFilterClick?: () => void
  filterLabel?: string
  filterPanel?: ReactNode
  segmentedControl?: ReactNode
  children: ReactNode
}

export default function MobileListPageShell({
  eyebrow,
  title,
  summary,
  tone,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onFilterClick,
  filterLabel,
  filterPanel,
  segmentedControl,
  children,
}: MobileListPageShellProps) {
  const toneStyle = toneStyles[tone]

  return (
    <div className={`min-h-screen px-[14px] pb-32 pt-[14px] font-['DM_Sans',sans-serif] ${toneStyle.glow}`}>
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_rgba(15,23,42,0.08)]">
        <div className={`h-1 w-full ${toneStyle.accent}`} />
        <div className="bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))] p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
          <h2 className="mt-2 text-[28px] font-black leading-[1.05] tracking-[-0.045em] text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{summary}</p>

          <div className="mt-4">
            <MobileSearchFilterRow
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              onFilterClick={onFilterClick}
              filterLabel={filterLabel}
            />
          </div>

          {segmentedControl ? segmentedControl : null}
        </div>
      </div>

      {filterPanel ? (
        <div className="mt-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          {filterPanel}
        </div>
      ) : null}

      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}
