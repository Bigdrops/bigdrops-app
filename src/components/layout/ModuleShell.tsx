import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, X, Loader2, ChevronRight, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MobilePageHeader from './MobilePageHeader'
import { MobileChromeContext } from '@/components/Layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Combobox } from '@/components/ui/combobox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
          className="w-full md:w-auto"
          contentClassName={isMobile ? "max-h-[60vh]" : undefined}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full md:w-auto justify-between rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))]"
            >
              <span className="truncate">{f.value || `All ${f.label}s`}</span>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          }
        />
      )
    }

    if (type === 'segmented' && isMobile) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {f.options.map(opt => (
            <button
              key={opt}
              onClick={() => f.onChange(opt)}
              className={cn(
                "h-9 rounded-xl border px-4 text-[11px] font-bold transition-all",
                f.value === opt
                  ? "border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-bg))] text-[hsl(var(--bd-overlay-text))]"
                  : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))]"
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
        <SelectTrigger className="h-8 w-full md:w-auto rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))]">
          <SelectValue placeholder={f.label} />
        </SelectTrigger>
        <SelectContent className="z-[1500]">
          {f.options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
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
            <div className="relative flex items-center rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))]/80 bg-[hsl(var(--bd-surface-muted))] p-[var(--bd-space-xs)] shadow-sm">
              <Search className="ml-[var(--bd-space-sm)] h-4 w-4 text-[hsl(var(--bd-text-muted))]" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 border-0 bg-transparent px-[var(--bd-space-sm)] text-sm shadow-none focus-visible:ring-0 text-[hsl(var(--bd-text))]"
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

      {/* Desktop Header & Toolbar (Hidden on mobile) */}
      <div className="hidden md:flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className={cn("text-[10px] font-black uppercase tracking-wider", toneStyle.foreground)}>
              {eyebrow}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[hsl(var(--bd-text))] mt-0.5">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             {onPrimaryAction && (
                 <Button onClick={onPrimaryAction} className="h-10 px-6 rounded-[var(--bd-radius-md)] shadow-sm transition-all active:scale-[0.99] text-xs font-black uppercase tracking-wider">
                   {primaryActionLabel}
                </Button>
             )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--bd-text-muted))]" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 pr-3 rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] shadow-none focus:ring-1 focus:ring-primary/20 transition-all text-xs font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
             {(filters || onFilterClick || filterPanel) && (
                <Button
                  type="button"
                  variant={filtersOpen || hasActiveFilters ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={toggleFilters}
                  className={cn(
                    "h-8 gap-2 rounded-full border-[hsl(var(--bd-border))] text-[hsl(var(--bd-text-muted))] px-3 hover:text-[hsl(var(--bd-text))]",
                    hasActiveFilters && "bg-primary/5 border-primary/20 text-primary"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
                </Button>
             )}
             {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onResetFilters}
                  className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] hover:text-primary h-8"
                >
                  Reset
                </Button>
             )}
          </div>
        </div>

        {/* Desktop Filters Panel */}
        {filtersOpen && filters && filters.length > 0 && (
           <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {filters.map((f) => (
                <div key={f.label} className="flex items-center gap-1.5">
                   {renderFilterControl(f, false)}
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

      {/* Mobile Filter Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-[32px] px-4 pb-10 pt-2 h-[auto] max-h-[85vh]">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[hsl(var(--bd-border))] opacity-20" />
          <SheetHeader className="mb-6 px-1 text-left">
            <SheetTitle className="text-xl font-black tracking-tight text-[hsl(var(--bd-text))]">Filters</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-160px)] px-1 pb-4 bd-custom-scrollbar">
            {filterPanel ? (
              <div className="space-y-4">
                {filterPanel}
              </div>
            ) : filters ? (
              <div className="space-y-6">
                {filters.map(f => (
                  <div key={f.label} className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
                      {f.label}
                    </div>
                    {renderFilterControl(f, true)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-[hsl(var(--bd-border))]/30">
            <Button variant="outline" onClick={onResetFilters} className="h-12 rounded-2xl font-bold text-[hsl(var(--bd-text-muted))]">
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)} className="h-12 rounded-2xl font-bold">
              Show Results
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 mt-0.5 px-[var(--bd-space-md)] md:px-0 md:mt-0">
        {beforeListContent}
        
        <div className="space-y-[var(--bd-row-gap)] md:space-y-1">
          {records && renderRow ? (
            records.length > 0 ? (
              records.map(renderRow)
            ) : (
              emptyState || (
                <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]/50 py-10 text-center shadow-inner">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-[hsl(var(--bd-text))]">No {title.toLowerCase()} found</div>
                  <div className="mt-1 text-[11px] text-[hsl(var(--bd-text-muted))]">Try adjusting your search or create a new one to get started.</div>
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
