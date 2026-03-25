import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ClipboardList,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DbQuotation } from '@/domain/quotation'
import { mapDbQuotation } from '@/domain/quotation'
import { formatQuotationStatus, quotationStatusTone } from './quotationStatus'
import PageIntro from '@/components/layout/PageIntro'

function formatMoney(value: number | string | null | undefined) {
  const parsed = Number(value || 0)
  const safe = Number.isFinite(parsed) ? parsed : 0
  return `N${safe.toLocaleString('en-NG')}`
}

export default function QuotationList() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState<DbQuotation[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const loadQuotations = async () => {
    const { data } = await supabase
      .from('quotations')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    setQuotations((data || []) as DbQuotation[])
  }

  useEffect(() => {
    loadQuotations()
  }, [])

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this quotation? You can restore it later from Settings > Archives.')) return
    setBusyAction(`archive:${id}`)
    const { error } = await supabase.from('quotations').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setBusyAction(null)
    if (error) {
      alert(`Archive failed: ${error.message}`)
      return
    }
    await loadQuotations()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deleting this quotation is permanent and cannot be undone.')) return
    setBusyAction(`delete:${id}`)
    const { error: itemError } = await supabase.from('quotation_items').delete().eq('quotation_id', id)
    if (itemError) {
      setBusyAction(null)
      alert(`Delete failed: ${itemError.message}`)
      return
    }
    const { error } = await supabase.from('quotations').delete().eq('id', id)
    setBusyAction(null)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    await loadQuotations()
  }

  const filteredQuotations = useMemo(() => {
    const query = search.trim().toLowerCase()
    const next = quotations.filter((row) => {
      const quotation = mapDbQuotation(row)
      const number = String(quotation.quotation_number || '').toLowerCase()
      const clientName = String(quotation.client_name || '').toLowerCase()
      const poNumber = String(quotation.po_number || '').toLowerCase()
      const status = String(quotation.status || 'draft').toLowerCase()
      const matchesSearch =
        !query || number.includes(query) || clientName.includes(query) || poNumber.includes(query)
      const matchesStatus = statusFilter === 'All' || status === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })

    next.sort((a, b) => {
      if (sortBy === 'Oldest') {
        return new Date(a.created_at || a.issue_date || 0).getTime() - new Date(b.created_at || b.issue_date || 0).getTime()
      }
      if (sortBy === 'Highest Value') return Number(b.total || 0) - Number(a.total || 0)
      if (sortBy === 'Lowest Value') return Number(a.total || 0) - Number(b.total || 0)
      return new Date(b.created_at || b.issue_date || 0).getTime() - new Date(a.created_at || a.issue_date || 0).getTime()
    })

    return next
  }, [quotations, search, sortBy, statusFilter])

  return (
    <div className="mx-auto max-w-6xl px-3 pb-32 pt-6 sm:px-4">
      <PageIntro
        eyebrow="Documents"
        title="Quotations"
        description="Prepare quotes quickly, keep statuses readable, and keep the next action close on mobile."
        meta={`${filteredQuotations.length} of ${quotations.length} quotation${quotations.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowSearch((prev) => !prev)} aria-label="Toggle search">
              <Search className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowFilters((prev) => !prev)} aria-label="Toggle filters">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button type="button" className="hidden sm:inline-flex" onClick={() => navigate('/quotations/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Button>
          </>
        }
        toolbar={
          <div className="space-y-3">
            {showSearch ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search quotations, clients, or P.O. numbers..."
                  className="h-11 rounded-xl border-zinc-200 bg-white pl-9"
                />
              </div>
            ) : null}

            {showFilters ? (
              <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/90 p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Status</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {['All', 'Draft', 'Sent', 'Accepted', 'Rejected'].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Sort</div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort quotations" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Newest', 'Oldest', 'Highest Value', 'Lowest Value'].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>
        }
      />

      {filteredQuotations.length === 0 ? (
        <Card className="mt-5 border-dashed border-zinc-300">
          <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
            No quotations yet. Create the first one when you are ready to send a quote.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-5 grid gap-4">
          {filteredQuotations.map((row) => {
            const quotation = mapDbQuotation(row)
            const isArchiving = busyAction === `archive:${quotation.id}`
            const isDeleting = busyAction === `delete:${quotation.id}`

            return (
              <Card
                key={quotation.id}
                className="cursor-pointer border-zinc-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] shadow-sm transition-shadow hover:shadow-md"
                onClick={() => navigate(`/quotations/${quotation.id}`)}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      <ClipboardList size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Quotation</span>
                        <span className="break-all text-base font-extrabold tracking-[-0.02em] text-foreground sm:text-[17px]">
                          {quotation.quotation_number}
                        </span>
                        <Badge className={`h-auto px-2.5 py-1 text-[10px] font-bold uppercase ${quotationStatusTone(quotation.status)}`}>
                          {formatQuotationStatus(quotation.status)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-700">{quotation.client_name || 'No client selected'}</div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Issue date: {quotation.issue_date || 'Not set'}</span>
                        {String(quotation.po_number || '').trim() ? <span>P.O.: {String(quotation.po_number || '').trim()}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <div className="text-right">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Amount</div>
                      <div className="mt-1 text-lg font-extrabold text-foreground">{formatMoney(quotation.total || 0)}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/quotations/edit/${quotation.id}`)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="icon" onClick={(event) => event.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenuLabel>Quotation Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => navigate(`/quotations/${quotation.id}`)}>
                            Open quotation
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/quotations/edit/${quotation.id}`)}>
                            Edit quotation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isArchiving || isDeleting}
                            onSelect={() => handleArchive(quotation.id)}
                          >
                            {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isArchiving || isDeleting}
                            onSelect={() => handleDelete(quotation.id)}
                            className="text-red-700 focus:text-red-700"
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        onClick={() => navigate('/quotations/new')}
        className="fixed bottom-28 right-8 z-50 h-16 w-16 rounded-[24px] border border-white/20 bg-zinc-950 p-0 text-white shadow-2xl transition-transform hover:scale-105 sm:hidden"
        aria-label="Create quotation"
      >
        <Plus className="h-7 w-7" />
      </Button>
    </div>
  )
}
