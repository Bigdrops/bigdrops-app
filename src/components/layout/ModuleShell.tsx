import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, X, Loader2, ChevronRight, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MobilePageHeader from './MobilePageHeader'
import { MobileChromeContext } from '@/components/Layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'

const toneStyles = {
  blue: {
    accent: 'tone-info-accent',
    foreground: 'text-tone-info',
    glow: 'shell-surface-info',
    statusBorder: 'border-l-bd-status-info-text',
  },
  emerald: {
    accent: 'tone-success-accent',
    foreground: 'text-tone-success',
    glow: 'shell-surface-success',
    statusBorder: 'border-l-bd-status-success-text',
  },
  amber: {
    accent: 'tone-warning-accent',
    foreground: 'text-tone-warning',
    glow: 'shell-surface-warning',
    statusBorder: 'border-l-bd-status-warning-text',
  },
  cyan: {
    accent: 'tone-data-accent',
    foreground: 'text-tone-data',
    glow: 'shell-surface-data',
    statusBorder: 'border-l-bd-status-info-text',
  },
  violet: {
    accent: 'tone-accent-accent',
    foreground: 'text-tone-accent',
    glow: 'shell-surface-accent',
    statusBorder: 'border-l-bd-status-danger-text',
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
  type?: 'select' | 'combobox' | 'segmented'
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
  filterOverlay?: ReactNode // Inline filter dropdown rendered under header (search-dropdown parity)
  
  // Actions
  onPrimaryAction?: () => void
  primaryActionLabel?: string
  headerActions?: ReactNode
  
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
  filterOverlay,
  onPrimaryAction,
  primaryActionLabel = 'New',
  headerActions,
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

  const renderFilterControl = (f: FilterOption, isMobile: boolean) => {
    const isClient = f.label.toLowerCase().includes('client')
    const type = f.type || (isClient ? 'combobox' : f.options.length <= 4 ? 'segmented' : 'select')

    if (type === 'combobox') {
      const comboboxOptions = f.options.map(opt => ({ label: opt, value: opt }))
      return (
        <Combobox
          title={f.label}
          options={comboboxOptions}
          value={f.value}
          onChange={f.onChange}
          placeholder={`Select ${f.label}`}
          searchPlaceholder={`Search ${f.label.toLowerCase()}...`}
          className="w-full"
          trigger={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-between rounded-[var(--bd-radius-md)] border-bd-border bg-bd-surface-muted px-3 text-[11px] font-bold text-bd-text hover:bg-bd-surface transition-colors",
                isMobile ? "h-10" : "h-8"
              )}
            >
              <span className="truncate">{f.value || `All ${f.label}s`}</span>
              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-40" />
            </Button>
          }
        />
      )
    }

    if (type === 'segmented') {
      return (
        <div className="flex flex-wrap gap-1">
          {f.options.map(opt => (
            <button
              key={opt}
              onClick={() => f.onChange(opt)}
              className={cn(
                "rounded-[var(--bd-radius-md)] border px-3 text-[10px] font-bold transition-all",
                isMobile ? "h-10 px-4 text-[11px]" : "h-8 px-3",
                f.value === opt
                  ? "border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text"
                  : "border-bd-border bg-bd-surface-muted text-bd-text-muted hover:bg-bd-surface"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    return (
      <Select value={f.value} onValueChange={f.onChange}>
        <SelectTrigger className={cn(
          "w-full rounded-[var(--bd-radius-md)] border-bd-border bg-bd-surface-muted px-3 text-[11px] font-bold text-bd-text hover:bg-bd-surface transition-colors",
          isMobile ? "h-10" : "h-8"
        )}>
          <SelectValue placeholder={f.label} />
        </SelectTrigger>
        <SelectContent className="z-[1600]">
          {f.options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const FilterTray = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out border-b border-bd-border/40 bg-bd-card-bg",
      filtersOpen ? "max-h-[800px] opacity-100 py-4" : "max-h-0 opacity-0 py-0 border-b-0"
    )}>
      <div className={cn("grid gap-4", isMobile ? "px-4 grid-cols-1" : "px-0 grid-cols-2 lg:grid-cols-3")}>
        {filters?.map(f => (
          <div key={f.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted opacity-60">
                {f.label}
              </span>
              {f.value && f.value !== 'All' && (
                <button 
                  onClick={() => f.onChange('All')}
                  className="text-[9px] font-bold text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {renderFilterControl(f, isMobile)}
          </div>
        ))}
        {filterPanel && (
          <div className="col-span-full pt-2 border-t border-bd-border/20">
            {filterPanel}
          </div>
        )}
      </div>
      {hasActiveFilters && (
        <div className={cn("mt-4 flex justify-end", isMobile ? "px-4" : "px-0")}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onResetFilters}
            className="h-8 rounded-md text-[10px] font-black uppercase tracking-widest text-bd-status-danger-text hover:bg-bd-status-danger-bg"
          >
            Reset All Filters
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className={cn('flex flex-col min-h-full w-full', toneStyle.glow, className)}>
      {/* Mobile Header (Integrated) */}
      <div className="md:hidden relative">
        <MobilePageHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={summary}
          accentClassName={toneStyle.accent}
          eyebrowClassName={toneStyle.foreground}
          onMenuClick={mobileChrome.openSidebar}
          isOpen={mobileChrome.sidebarOpen}
          hideGlobalSearch
          className="rounded-none border-x-0 border-t-0 shadow-none"
          actions={
            <div className="flex items-center gap-[var(--bd-space-xs)]">
              <Button
                type="button"
                variant={searchOpen || searchValue ? 'outline' : 'ghost'}
                size="icon"
                onClick={toggleSearch}
                className={cn(
                  "h-9 w-9 rounded-xl transition-all",
                  (searchOpen || searchValue) ? "border-bd-border bg-bd-surface-muted" : "border-transparent"
                )}
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
                    "h-9 w-9 rounded-xl transition-all",
                    (filtersOpen || hasActiveFilters) ? "border-bd-border bg-bd-surface-muted" : "border-transparent",
                    hasActiveFilters && "text-primary"
                  )}
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              )}
              {headerActions}
            </div>
          }
        />

        {/* Mobile Search Input (Revealed) */}
        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out border-b border-bd-border/30 bg-bd-surface",
          searchOpen ? "max-h-16 py-3" : "max-h-0 py-0 border-b-0"
        )}>
          <div className="px-4">
            <div className="relative flex items-center rounded-xl border border-bd-border bg-bd-surface-muted h-10 px-3">
              <Search className="h-4 w-4 text-bd-text-muted" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-full border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0 text-bd-text"
              />
              {searchValue && (
                 <button onClick={() => onSearchChange('')} className="p-1">
                   <X className="h-4 w-4 text-bd-text-muted" />
                 </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Filter Tray (Revealed) */}
        <FilterTray isMobile />

        {/* Inline Filter Overlay (search-dropdown parity) */}
        {filterOverlay}
      </div>

      <div className="hidden md:flex flex-col mb-4 relative">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex flex-col">
            <div className={cn("text-[10px] font-black uppercase tracking-wider", toneStyle.foreground)}>
              {eyebrow}
            </div>
            <h1 className="text-xl font-black tracking-tight text-bd-text">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-bd-text-muted" />
                <Input
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-9 pr-3 rounded-xl border-bd-border bg-bd-surface-muted shadow-none text-[11px] font-bold text-bd-text"
                />
             </div>
             {(filters || onFilterClick || filterPanel) && (
                <Button
                  type="button"
                  variant={filtersOpen || hasActiveFilters ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={toggleFilters}
                  className={cn(
                    "h-9 gap-2 rounded-xl border-bd-border text-bd-text-muted px-4 hover:text-bd-text",
                    (filtersOpen || hasActiveFilters) && "bg-bd-surface-muted"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
                </Button>
             )}
             {headerActions}
             {onPrimaryAction && (
                 <Button onClick={onPrimaryAction} className="h-9 px-6 rounded-xl shadow-none font-black uppercase tracking-wider text-[10px]">
                   {primaryActionLabel}
                </Button>
             )}
          </div>
        </div>

        {/* Desktop Filter Tray (Revealed) */}
        <FilterTray />

        {/* Inline Filter Overlay (search-dropdown parity) */}
        {filterOverlay}
      </div>


      {/* Segmented Control / Tabs */}
      {segmentedControl && (
        <div className="mb-4">
          {segmentedControl}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        {beforeListContent}
        
        <div className="space-y-[var(--bd-row-gap)] md:space-y-1">
          {records && renderRow ? (
            records.length > 0 ? (
              records.map(renderRow)
            ) : (
              emptyState || (
                <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-bd-border bg-bd-surface/50 py-10 text-center shadow-inner">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-[var(--bd-radius-lg)] bg-bd-surface-muted text-bd-text-muted">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-bd-text">No {title.toLowerCase()} found</div>
                  <div className="mt-1 text-[11px] text-bd-text-muted">Try adjusting your search or create a new one to get started.</div>
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
                className="h-11 rounded-[var(--bd-radius-lg)] px-8 font-bold border-bd-border text-bd-text-muted hover:bg-bd-surface-muted"
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
