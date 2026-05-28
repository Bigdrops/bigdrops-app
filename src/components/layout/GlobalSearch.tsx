import * as React from 'react'
import { Search, Loader2, X, ChevronRight, LayoutDashboard, FolderKanban, Users, Receipt, FileSignature, ClipboardCheck, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { formatNaira } from '@/lib/formatters/money'

const searchTypeIcons = {
  client: Users,
  project: FolderKanban,
  invoice: Receipt,
  quotation: FileSignature,
  csr: ClipboardCheck,
  waybill: Truck,
}

const searchTypeLabels = {
  client: 'Client',
  project: 'Project',
  invoice: 'Invoice',
  quotation: 'Quotation',
  csr: 'CSR',
  waybill: 'Waybill',
}

const searchTypeColors = {
  client: 'bg-secondary text-secondary-foreground border-border',
  project: 'bg-accent/15 text-accent-foreground border-accent/30',
  invoice: 'bg-primary/10 text-primary border-primary/20',
  quotation: 'bg-muted text-muted-foreground border-border',
  csr: 'bg-accent/15 text-accent-foreground border-accent/30',
  waybill: 'bg-muted text-muted-foreground border-border',
}

const quickModules = [
  { id: 'projects', label: 'Projects', path: '/projects', icon: FolderKanban },
  { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
  { id: 'invoices', label: 'Invoices', path: '/invoices', icon: Receipt },
  { id: 'quotations', label: 'Quotations', path: '/quotations', icon: FileSignature },
  { id: 'csr', label: 'CSR', path: '/csr', icon: ClipboardCheck },
  { id: 'waybills', label: 'Waybills', path: '/waybills', icon: Truck },
]

export function GlobalSearch() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const { results, loading } = useGlobalSearch(query)
  const navigate = useNavigate()
  const searchRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const toggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
    setQuery('')
  }

  const handleResultClick = (result: SearchResult) => {
    const pathByType = {
      client: `/clients/${result.id}`,
      project: `/projects/${result.id}`,
      invoice: `/invoices/${result.id}`,
      quotation: `/quotations/${result.id}`,
      csr: `/csr/${result.id}`,
      waybill: `/waybills/${result.id}`,
    }
    handleNavigate(pathByType[result.type])
  }

  // Handle outside clicks
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={searchRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className={cn(
          "h-9 w-9 shrink-0 border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors outline-none active:outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
          isOpen ? "scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Global Search Backdrop for mobile focus */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/70 transition-opacity duration-200 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed right-4 top-4 z-[70] w-[calc(100vw-32px)] overflow-hidden rounded-[26px] border border-border/80 bg-card shadow-2xl transition-all duration-300 ease-out sm:absolute sm:right-0 sm:top-0 sm:w-[420px]",
          isOpen
            ? "translate-y-0 opacity-100 scale-100 visible"
            : "-translate-y-4 opacity-0 scale-95 invisible"
        )}
      >
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything..."
              className="h-14 rounded-full border-none bg-muted/40 pl-12 pr-12 text-base focus-visible:ring-1 focus-visible:ring-primary/20"
            />
            {loading ? (
              <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-muted/80 p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain px-2 pb-3">
          {!query && (
            <div className="space-y-4 py-2">
              <div className="px-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Jump to Module</div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {quickModules.map(module => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => handleNavigate(module.path)}
                      className="flex flex-col items-center gap-2 rounded-2xl bg-muted/30 p-3 transition active:scale-95 hover:bg-muted/50"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-card shadow-sm">
                        <module.icon className="h-5 w-5 text-foreground/70" />
                      </div>
                      <span className="text-[11px] font-semibold text-foreground/80">{module.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Recent History</div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground">
                    <LayoutDashboard className="h-4 w-4 opacity-40" />
                    <span>Search results will appear here as you type.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {query && results.length > 0 && (
            <div className="space-y-1 py-1">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Found {results.length} matches</div>
              {results.map((result) => {
                const Icon = searchTypeIcons[result.type]
                const colorClass = searchTypeColors[result.type]
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition active:scale-[0.98] hover:bg-muted/50"
                  >
                    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-black text-foreground">{result.title}</span>
                        <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] uppercase tracking-wider", colorClass)}>
                          {searchTypeLabels[result.type]}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {result.subtitle} 
                        {result.amount ? ` • ${formatNaira(result.amount)}` : ''}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-40" />
                  </button>
                )
              })}
            </div>
          )}

          {query && results.length === 0 && !loading && (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                <Search className="h-6 w-6 text-muted-foreground opacity-40" />
              </div>
              <div className="mt-4 text-sm font-semibold text-foreground">No matches found</div>
              <p className="mt-1 text-xs text-muted-foreground px-8">No results for "{query}". Try checking the spelling or use a more specific term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
