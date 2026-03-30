import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ClipboardList,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/supabase'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { toast } from '@/hooks/use-toast'
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
import ListActionSheet from '@/components/layout/ListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import MobileListPageShell from '@/components/layout/MobileListPageShell'
import EntityListCard from '@/components/list/EntityListCard'

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
    <MobileListPageShell
        eyebrow="Sales"
        title="Quotations"
        summary={`${quotations.length} quotations total`}
        tone="blue"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quotations..."
        onFilterClick={() => setShowFilters((prev) => !prev)}
        filterPanel={showFilters ? (
          <div className="grid gap-3 sm:grid-cols-2">
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
      >

      {filteredQuotations.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-muted-foreground">
          No quotations yet. Create the first one when you are ready to send a quote.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredQuotations.map((row) => {
            const quotation = mapDbQuotation(row)

            return (
              <EntityListCard
                key={quotation.id}
                leading={<div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-lg font-extrabold text-blue-600">Q</div>}
                kicker="Quotation"
                title={quotation.quotation_number}
                subtitle={quotation.client_name || 'No client selected'}
                metadata={[
                  `Issue date: ${quotation.issue_date || 'Not set'}`,
                  ...(String(quotation.po_number || '').trim() ? [`P.O: ${String(quotation.po_number || '').trim()}`] : []),
                ]}
                status={{ label: formatQuotationStatus(quotation.status), tone: quotationStatusTone(quotation.status) }}
                amount={formatMoney(quotation.total || 0)}
                onClick={() => navigate(`/quotations/${quotation.id}`)}
                onAction={() => setActiveQuotation(quotation)}
              />
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
    </MobileListPageShell>
  )
}
