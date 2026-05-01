import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MobilePageHeader from './MobilePageHeader'
import { MobileChromeContext } from '@/components/Layout'

const toneStyles = {
  blue: {
    accent: 'tone-info-accent',
    foreground: 'text-tone-info',
    glow: 'shell-surface-info',
    statusBorder: 'border-l-[hsl(var(--bd-status-info-text))]',
  },
  emerald: {
    accent: 'tone-success-accent',
    foreground: 'text-tone-success',
    glow: 'shell-surface-success',
    statusBorder: 'border-l-[hsl(var(--bd-status-success-text))]',
  },
  amber: {
    accent: 'tone-warning-accent',
    foreground: 'text-tone-warning',
    glow: 'shell-surface-warning',
    statusBorder: 'border-l-[hsl(var(--bd-status-warning-text))]',
  },
  cyan: {
    accent: 'tone-data-accent',
    foreground: 'text-tone-data',
    glow: 'shell-surface-data',
    statusBorder: 'border-l-[hsl(var(--bd-status-info-text))]',
  },
  violet: {
    accent: 'tone-accent-accent',
    foreground: 'text-tone-accent',
    glow: 'shell-surface-accent',
    statusBorder: 'border-l-[hsl(var(--bd-status-danger-text))]',
  },
  neutral: {
    accent: '',
    foreground: 'text-muted-foreground',
    glow: '',
    statusBorder: 'border-l-border',
  }
} as const

export type FilterOption = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

interface ModuleShellProps<T = any> {
  // Identity
  eyebrow: string
  title: string
  summary?: string
  tone?: keyof typeof toneStyles
  
  // Search
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  
  // Filters
  filters?: FilterOption[]
  hasActiveFilters?: boolean
  onResetFilters?: () => void
  onFilterClick?: () => void // Custom filter trigger (e.g. opens a sheet)
  filterPanel?: ReactNode // Custom inline filter panel
  
  // Actions
  onPrimaryAction?: () => void
  primaryActionLabel?: string
  
  // Navigation
  segmentedControl?: ReactNode
  
  // Content Slots
  beforeListContent?: ReactNode
  afterListContent?: ReactNode
  emptyState?: ReactNode
  
  // List Logic
  records?: T[]
  renderRow?: (record: T) => ReactNode
  
  // Pagination
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  loadMoreLabel?: string
  
  // General
  children?: ReactNode
  className?: string
}

export default function ModuleShell<T>({
  eyebrow,
  title,
  summary,
  tone = 'blue',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  hasActiveFilters,
  onResetFilters,
  onFilterClick,
  filterPanel,
  onPrimaryAction,
  primaryActionLabel = 'New',
  segmentedControl,
  beforeListContent,
  afterListContent,
  emptyState,
  records,
  renderRow,
  hasMore,
  loadingMore,
  onLoadMore,
  loadMoreLabel = 'Load more',
  children,
  className,
}: ModuleShellProps<T>) {
  const toneStyle = toneStyles[tone]
  const mobileChrome = useContext(MobileChromeContext)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (searchValue) {
      setSearchOpen(true)
    }
  }, [searchValue])

  const toggleSearch = () => setSearchOpen((prev) => !prev)
  const toggleFilters = () => {
    if (onFilterClick) {
      onFilterClick()
    } else {
      setFiltersOpen((prev) => !prev)
    }
  }

  return (
    <div className={cn('flex flex-col min-h-full w-full', toneStyle.glow, className)}>
      {/* Mobile Header (Integrated) */}
      <div className="md:hidden">
        <MobilePageHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={summary}
          accentClassName={toneStyle.accent}
          eyebrowClassName={toneStyle.foreground}
          onMenuClick={mobileChrome.openSidebar}
          hideGlobalSearch
          actions={
            <div className="flex items-center gap-[var(--bd-space-xs)]">
              <Button
                type="button"
                variant={searchOpen || searchValue ? 'outline' : 'ghost'}
                size="icon"
                onClick={toggleSearch}
                className="h-9 w-9 rounded-[var(--bd-radius-md)] border-border text-foreground"
                aria-label={searchOpen ? 'Hide search' : 'Show search'}
              >
                {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
              {(filters || onFilterClick || filterPanel) && (
                <Button
                  type="button"
                  variant={filtersOpen || hasActiveFilters ? 'outline' : 'ghost'}
                  size="icon"
                  onClick={toggleFilters}
                  className={cn(
                    "h-9 w-9 rounded-[var(--bd-radius-md)] border-border text-foreground",
                    hasActiveFilters && "bg-primary/5 border-primary/20"
                  )}
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          }
        />

        {/* Mobile Search Input */}
        {searchOpen && (
          <div className="mt-[var(--bd-space-sm)] px-[var(--bd-space-md)]">
            <div className="relative flex items-center rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))]/80 bg-[hsl(var(--bd-surface))]/95 p-[var(--bd-space-xs)] shadow-sm">
              <Search className="ml-[var(--bd-space-sm)] h-4 w-4 text-[hsl(var(--bd-text-muted))]" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 border-0 bg-transparent px-[var(--bd-space-sm)] text-sm shadow-none focus-visible:ring-0"
              />
              {searchValue && (
                 <button 
                   onClick={() => onSearchChange('')}
                   className="p-1.5 text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))]"
                 >
                   <X className="h-4 w-4" />
                 </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Toolbar (Hidden on mobile) */}
      <div className="hidden md:flex flex-col gap-[var(--bd-space-md)] mb-[var(--bd-space-md)]">
        <div className="flex items-center justify-between gap-[var(--bd-row-gap)]">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[hsl(var(--bd-text-muted))]" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 pl-11 pr-4 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] shadow-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-[var(--bd-space-sm)]">
             {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onResetFilters}
                  className="text-xs font-bold text-[hsl(var(--bd-text-muted))] hover:text-primary"
                >
                  Reset Filters
                </Button>
             )}
             {onPrimaryAction && (
                <Button onClick={onPrimaryAction} className="h-11 px-6 rounded-[var(--bd-radius-lg)] shadow-md">
                   {primaryActionLabel}
                </Button>
             )}
          </div>
        </div>

        {/* Desktop Filters */}
        {filters && filters.length > 0 && (
           <div className="flex flex-wrap items-center gap-[var(--bd-space-sm)]">
              {filters.map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-[var(--bd-radius-md)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-[var(--bd-space-sm)] py-[var(--bd-space-xs)] shadow-sm">
                   <span className="text-[11px] font-extrabold uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-text-muted))]">{f.label}</span>
                   <select
                     value={f.value}
                     onChange={(e) => f.onChange(e.target.value)}
                     className="bg-transparent text-sm font-semibold text-[hsl(var(--bd-text))] outline-none focus:ring-0 cursor-pointer"
                   >
                     {f.options.map(opt => (
                       <option key={opt} value={opt}>{opt}</option>
                     ))}
                   </select>
                </div>
              ))}
           </div>
        )}
      </div>

      {/* Segmented Control / Tabs */}
      {segmentedControl && (
        <div className="mt-[var(--bd-space-sm)] md:mt-0 mb-[var(--bd-space-md)] px-[var(--bd-space-md)] md:px-0">
          {segmentedControl}
        </div>
      )}

      {/* Mobile Custom Filters Panel */}
      {filtersOpen && (
         <div className="md:hidden mt-[var(--bd-space-sm)] px-[var(--bd-space-md)]">
            {filterPanel ? (
               <div className="rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))]/80 bg-[hsl(var(--bd-surface))]/95 p-[var(--bd-card-padding)] shadow-sm">
                  {filterPanel}
               </div>
            ) : filters ? (
               <div className="rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))]/80 bg-[hsl(var(--bd-surface))]/95 p-[var(--bd-card-padding)] shadow-sm space-y-[var(--bd-space-md)]">
                  {filters.map(f => (
                    <div key={f.label}>
                       <div className="mb-[var(--bd-space-xs)] text-[10px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-text-muted))]">{f.label}</div>
                       <div className="flex flex-wrap gap-[var(--bd-space-sm)]">
                          {f.options.map(opt => (
                            <button
                              key={opt}
                              onClick={() => f.onChange(opt)}
                              className={cn(
                                "rounded-xl border px-[var(--bd-space-sm)] py-[var(--bd-space-sm)] text-xs font-bold transition-all",
                                f.value === opt 
                                  ? "border-primary bg-primary/10 text-primary" 
                                  : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))]"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                       </div>
                    </div>
                  ))}
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={onResetFilters} className="w-full rounded-xl">
                      Reset Filters
                    </Button>
                  )}
               </div>
            ) : null}
         </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 mt-[var(--bd-space-sm)] px-[var(--bd-space-md)] md:px-0">
        {beforeListContent}
        
        <div className="space-y-[var(--bd-row-gap)]">
          {records && renderRow ? (
            records.length > 0 ? (
              records.map(renderRow)
            ) : (
              emptyState || (
                <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]/50 py-[var(--bd-space-xl)] text-center shadow-inner">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]">
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="mt-[var(--bd-space-md)] text-sm font-bold text-[hsl(var(--bd-text))]">No records found</div>
                  <div className="mt-[var(--bd-space-xs)] text-xs text-[hsl(var(--bd-text-muted))]">Try adjusting your search or filters</div>
                </div>
              )
            )
          ) : children}
        </div>

        {hasMore && (
           <div className="mt-[var(--bd-space-lg)] flex justify-center pb-[var(--bd-space-xl)]">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={onLoadMore}
                className="h-11 rounded-[var(--bd-radius-lg)] px-8 font-bold border-[hsl(var(--bd-border))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : loadMoreLabel}
              </Button>
           </div>
        )}

        {afterListContent}
      </div>
    </div>
  )
}
