import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ClipboardList,
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/supabase'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DbQuotation } from '@/domain/quotation'
import { getNextQuotationNumber, mapDbQuotation } from '@/domain/quotation'
import { formatQuotationStatus, quotationStatusTone } from './quotationStatus'
import PageIntro from '@/components/layout/PageIntro'
import { PageShell } from '@/components/layout/PageShell'
import ListActionSheet from '@/components/layout/ListActionSheet'
import MobileFab from '@/components/layout/MobileFab'

function formatMoney(value: number | string | null | undefined) {
  const parsed = Number(value || 0)
  const safe = Number.isFinite(parsed) ? parsed : 0
  return `₦${safe.toLocaleString('en-NG')}`
}

export default function QuotationList() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState<DbQuotation[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')
  const [showFilters, setShowFilters] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [activeQuotation, setActiveQuotation] = useState<ReturnType<typeof mapDbQuotation> | null>(null)

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
    setArchiveId(null)
    setBusyAction(`archive:${id}`)
    const { error } = await supabase.from('quotations').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setBusyAction(null)
    if (error) {
      toast({ title: 'Archive failed', description: error.message, variant: 'destructive' })
      return
    }
    await loadQuotations()
  }

  const handleDelete = async (id: string) => {
    setDeleteId(null)
    setBusyAction(`delete:${id}`)
    const { error: itemError } = await supabase.from('quotation_items').delete().eq('quotation_id', id)
    if (itemError) {
      setBusyAction(null)
      toast({ title: 'Delete failed', description: itemError.message, variant: 'destructive' })
      return
    }
    const { error } = await supabase.from('quotations').delete().eq('id', id)
    setBusyAction(null)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }
    await loadQuotations()
  }

  const handleClone = async (id: string) => {
    setBusyAction(`clone:${id}`)
    const { data: quotationRow, error: quotationError } = await supabase.from('quotations').select('*').eq('id', id).single()
    if (quotationError || !quotationRow) {
      setBusyAction(null)
      toast({ title: 'Clone failed', description: quotationError?.message || 'Quotation not found', variant: 'destructive' })
      return
    }

    const { data: quotationRows } = await supabase.from('quotations').select('quotation_number')
    const payload = {
      ...quotationRow,
      quotation_number: getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>),
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      archived_at: null,
    } as Record<string, unknown>
    delete payload.id
    delete payload.created_at
    delete payload.updated_at

    const { data: createdQuotation, error: createError } = await supabase.from('quotations').insert([payload]).select().single()
    if (createError || !createdQuotation) {
      setBusyAction(null)
      toast({ title: 'Clone failed', description: createError?.message || 'Unable to create clone', variant: 'destructive' })
      return
    }

    const { data: itemRows } = await supabase.from('quotation_items').select('*').eq('quotation_id', id)
    if (itemRows?.length) {
      const nextItems = itemRows.map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...item }) => ({
        ...item,
        quotation_id: createdQuotation.id,
      }))
      const { error: itemError } = await supabase.from('quotation_items').insert(nextItems)
      if (itemError) {
        await supabase.from('quotations').delete().eq('id', createdQuotation.id)
        setBusyAction(null)
        toast({ title: 'Clone failed', description: itemError.message, variant: 'destructive' })
        return
      }
    }

    setBusyAction(null)
    setActiveQuotation(null)
    await loadQuotations()
    navigate(`/quotations/${createdQuotation.id}`)
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

  const activeQuotationIsArchiving = activeQuotation ? busyAction === `archive:${activeQuotation.id}` : false
  const activeQuotationIsDeleting = activeQuotation ? busyAction === `delete:${activeQuotation.id}` : false

  return (
    <PageShell width="wide" className="pb-32">
      <PageIntro
        eyebrow="Sales"
        title="Quotations"
        meta={`${quotations.length} quotations total`}
        tone="blue"
        actions={
          <Button type="button" className="h-11 rounded-[14px] bg-slate-950 px-4 text-sm font-semibold" onClick={() => navigate('/quotations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        }
        toolbar={
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search quotations..."
                  className="h-11 rounded-[14px] border-zinc-200 bg-white pl-9 text-sm"
                />
              </div>
              <Button type="button" variant="outline" size="icon-lg" className="rounded-[14px] bg-white" onClick={() => setShowFilters((prev) => !prev)} aria-label="Toggle filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {showFilters ? (
              <div className="grid gap-3 rounded-[18px] border border-zinc-200 bg-white p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Status</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 rounded-[14px] bg-white">
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
                    <SelectTrigger className="h-11 rounded-[14px] bg-white">
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
        <Card className="mt-4 rounded-[22px] border-dashed border-zinc-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,248,252,0.98))] shadow-[0_18px_36px_-30px_rgba(15,23,42,0.45)]">
          <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
            No quotations yet. Create the first one when you are ready to send a quote.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3">
          {filteredQuotations.map((row) => {
            const quotation = mapDbQuotation(row)
            const isArchiving = busyAction === `archive:${quotation.id}`
            const isDeleting = busyAction === `delete:${quotation.id}`

            return (
              <Card
                key={quotation.id}
                className="cursor-pointer rounded-[22px] border-zinc-200/90 bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.48)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-32px_rgba(15,23,42,0.45)]"
                onClick={() => navigate(`/quotations/${quotation.id}`)}
              >
                <CardContent className="p-4">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-violet-100 bg-violet-50 text-violet-600">
                      <ClipboardList size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Quotation</div>
                      <div className="mt-1 break-all text-[18px] font-extrabold tracking-[-0.03em] text-foreground">
                        {quotation.quotation_number}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{quotation.client_name || 'No client selected'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`h-auto px-2.5 py-1 text-[10px] font-bold uppercase ${quotationStatusTone(quotation.status)}`}>
                        {formatQuotationStatus(quotation.status)}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="rounded-[14px] bg-white"
                        onClick={(event) => {
                          event.stopPropagation()
                          setActiveQuotation(quotation)
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Issue date: {quotation.issue_date || 'Not set'}</span>
                    {String(quotation.po_number || '').trim() ? <span>P.O.: {String(quotation.po_number || '').trim()}</span> : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-[14px] bg-white px-4 text-sm font-semibold"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/quotations/edit/${quotation.id}`)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <div className="text-right">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Amount</div>
                      <div className="mt-1 text-lg font-extrabold text-foreground">{formatMoney(quotation.total || 0)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <MobileFab onClick={() => navigate('/quotations/new')} ariaLabel="Create quotation">
        <Plus className="h-7 w-7" />
      </MobileFab>
      <ConfirmActionDialog
        open={archiveId !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveId(null)
        }}
        title="Archive this quotation?"
        description="You can restore it later from Settings > Archives."
        confirmLabel="Archive Quotation"
        variant="default"
        onConfirm={() => {
          if (archiveId) void handleArchive(archiveId)
        }}
      />
      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete this quotation?"
        description="Deleting this quotation is permanent and cannot be undone."
        confirmLabel="Delete Quotation"
        onConfirm={() => {
          if (deleteId) void handleDelete(deleteId)
        }}
      />
      <ListActionSheet
        open={Boolean(activeQuotation)}
        onOpenChange={(open) => {
          if (!open) setActiveQuotation(null)
        }}
        eyebrow={activeQuotation ? `Quotation ${activeQuotation.quotation_number}` : "Quotation"}
        title={activeQuotation?.client_name || "No client selected"}
        amount={activeQuotation ? formatMoney(activeQuotation.total || 0) : null}
        actions={activeQuotation ? [
          {
            key: "view",
            label: "View",
            icon: <ClipboardList className="h-6 w-6" />,
            onClick: () => navigate(`/quotations/${activeQuotation.id}`),
          },
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/quotations/edit/${activeQuotation.id}`),
          },
          {
            key: "clone",
            label: busyAction === `clone:${activeQuotation.id}` ? "Working..." : "Clone",
            icon: busyAction === `clone:${activeQuotation.id}` ? <Loader2 className="h-6 w-6 animate-spin" /> : <Copy className="h-6 w-6" />,
            onClick: () => void handleClone(activeQuotation.id),
          },
        ] : []}
        deleteAction={activeQuotation ? {
          label: activeQuotationIsDeleting ? "Deleting..." : "Delete Quotation",
          icon: activeQuotationIsDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />,
          onClick: () => setDeleteId(activeQuotation.id),
        } : undefined}
      />
    </PageShell>
  )
}
