import { useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

import MobilePageHeader from '@/components/layout/MobilePageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MobileChromeContext } from '@/components/Layout'

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
  primaryActionLabel?: string
  onPrimaryAction?: () => void
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
  primaryActionLabel = 'New',
  onPrimaryAction,
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
  const mobileChrome = useContext(MobileChromeContext)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (searchValue) {
      setSearchOpen(true)
    }
  }, [searchValue])

  const toggleSearch = () => {
    setSearchOpen((open) => !open)
  }

  return (
    <div className={`min-h-screen px-[14px] pb-32 pt-[14px] font-['DM_Sans',sans-serif] ${toneStyle.glow}`}>
      <MobilePageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={summary}
        accentClassName={toneStyle.accent}
        onMenuClick={mobileChrome.openSidebar}
        actions={
          <>
            <Button
              type="button"
              variant={searchOpen || searchValue ? 'outline' : 'ghost'}
              size="icon"
              onClick={toggleSearch}
              className="h-9 w-9 rounded-xl border-border text-foreground"
              aria-label={searchOpen ? 'Hide search' : 'Show search'}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            {onFilterClick ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onFilterClick}
                className="h-9 w-9 rounded-xl text-foreground"
                aria-label={filterLabel || 'Open filters'}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            ) : null}
          </>
        }
      />

      {searchOpen ? (
        <div className="mt-3 rounded-[18px] border border-border/80 bg-background/95 p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="ml-1 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearchOpen(false)}
              className="rounded-lg text-muted-foreground"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {segmentedControl ? <div className="mt-3">{segmentedControl}</div> : null}

      {filterPanel ? (
        <div className="mt-3 rounded-[18px] border border-border/80 bg-background/95 p-3 shadow-sm">
          {filterPanel}
        </div>
      ) : null}

      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}
