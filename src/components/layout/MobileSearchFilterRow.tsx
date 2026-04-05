import type { ReactNode } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

type MobileSearchFilterRowProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onFilterClick?: () => void
  filterLabel?: string
  trailing?: ReactNode
}

export default function MobileSearchFilterRow({
  value,
  onChange,
  placeholder,
  onFilterClick,
  filterLabel,
  trailing,
}: MobileSearchFilterRowProps) {
  return (
    <div className="flex gap-2.5">
      <div className="flex h-11 flex-1 items-center gap-2.5 rounded-[14px] border border-border bg-background px-3.5 text-sm text-muted-foreground shadow-sm">
        <Search className="h-4 w-4" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {onFilterClick ? (
        <button
          type="button"
          onClick={onFilterClick}
          className="inline-flex h-11 min-w-11 items-center gap-2 rounded-[14px] border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {filterLabel ? <span>{filterLabel}</span> : null}
        </button>
      ) : null}
      {trailing}
    </div>
  )
}
