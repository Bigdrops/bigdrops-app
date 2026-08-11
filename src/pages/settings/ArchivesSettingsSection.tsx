import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArchiveRestore,
  ClipboardList,
  FileCheck,
  FileText,
  FolderKanban,
  Loader2,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { supabase } from '@/supabase'
import { useEntity } from '@/lib/tenant/contexts'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ArchiveDocType = 'invoices' | 'quotations' | 'projects' | 'rfqs' | 'csrs' | 'waybills' | 'boqs'

type ArchiveItem = {
  id: string
  type: ArchiveDocType
  docNumber: string
  entityName: string
  archivedAt: string
  status?: string | null
  date?: string | null
}

type RawInvoice = { id: string; invoice_number?: string | null; client_name?: string | null; total?: number | string | null; status?: string | null; issue_date?: string | null; archived_at?: string | null }
type RawQuotation = { id: string; quotation_number?: string | null; client_name?: string | null; total?: number | string | null; status?: string | null; issue_date?: string | null; archived_at?: string | null }
type RawProject = { id: string; name?: string | null; client_name?: string | null; status?: string | null; start_date?: string | null; project_value?: number | string | null; archived_at?: string | null }
type RawRFQ = { id: string; rfq_number?: string | null; vendor_name?: string | null; title?: string | null; expiry_date?: string | null; archived_at?: string | null }
type RawCSR = { id: string; csr_number?: string | null; client_name?: string | null; date?: string | null; archived_at?: string | null }
type RawWaybill = { id: string; waybill_number?: string | null; client_name?: string | null; date?: string | null; archived_at?: string | null }
type RawBOQ = { id: string; boq_number?: string | null; client_name?: string | null; title?: string | null; issue_date?: string | null; archived_at?: string | null }

const docTypeConfig: Record<ArchiveDocType, { label: string; icon: typeof FileText; color: string }> = {
  invoices: { label: 'Invoice', icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
  quotations: { label: 'Quotation', icon: ClipboardList, color: 'text-emerald-600 dark:text-emerald-400' },
  projects: { label: 'Project', icon: FolderKanban, color: 'text-violet-600 dark:text-violet-400' },
  rfqs: { label: 'RFQ', icon: FileText, color: 'text-amber-600 dark:text-amber-400' },
  csrs: { label: 'CSR', icon: FileCheck, color: 'text-rose-600 dark:text-rose-400' },
  waybills: { label: 'Waybill', icon: Truck, color: 'text-cyan-600 dark:text-cyan-400' },
  boqs: { label: 'BOQ', icon: ClipboardList, color: 'text-orange-600 dark:text-orange-400' },
}

const allTypes = Object.keys(docTypeConfig) as ArchiveDocType[]

export function ArchivesSettingsSection() {
  const { tenantClient } = useEntity()
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<ArchiveDocType>>(new Set())
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [rawData, setRawData] = useState<{
    invoices: RawInvoice[]
    quotations: RawQuotation[]
    projects: RawProject[]
    rfqs: RawRFQ[]
    csrs: RawCSR[]
    waybills: RawWaybill[]
    boqs: RawBOQ[]
  }>({
    invoices: [], quotations: [], projects: [],
    rfqs: [], csrs: [], waybills: [], boqs: [],
  })

  const loadArchives = useCallback(async () => {
    setLoading(true)

    const [
      { data: invoices },
      { data: quotations },
      { data: projects },
      { data: rfqs },
      { data: csrs },
      { data: waybills },
      { data: boqs },
    ] = await Promise.all([
      // Phase 3: invoices are part of the invoice aggregate → tenant.
      tenantClient.from('invoices').select('id, invoice_number, client_name, total, status, issue_date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      tenantClient.from('quotations').select('id, quotation_number, client_name, total, status, issue_date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      tenantClient.from('projects').select('id, name, client_name, status, start_date, project_value, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('rfqs').select('id, rfq_number, vendor_name, title, expiry_date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('csrs').select('id, csr_number, client_name, date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('waybills').select('id, waybill_number, client_name, date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('boqs').select('id, boq_number, client_name, title, issue_date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
    ])

    setRawData({
      invoices: (invoices as RawInvoice[]) || [],
      quotations: (quotations as RawQuotation[]) || [],
      projects: (projects as RawProject[]) || [],
      rfqs: (rfqs as RawRFQ[]) || [],
      csrs: (csrs as RawCSR[]) || [],
      waybills: (waybills as RawWaybill[]) || [],
      boqs: (boqs as RawBOQ[]) || [],
    })

    setLoading(false)
  }, [tenantClient])

  useEffect(() => { loadArchives() }, [loadArchives])

  const allItems = useMemo((): ArchiveItem[] => {
    const items: ArchiveItem[] = []

    for (const r of rawData.invoices) items.push({ id: r.id, type: 'invoices', docNumber: r.invoice_number || '—', entityName: r.client_name || 'No client', archivedAt: r.archived_at || '', status: r.status, date: r.issue_date })
    for (const r of rawData.quotations) items.push({ id: r.id, type: 'quotations', docNumber: r.quotation_number || '—', entityName: r.client_name || 'No client', archivedAt: r.archived_at || '', status: r.status, date: r.issue_date })
    for (const r of rawData.projects) items.push({ id: r.id, type: 'projects', docNumber: r.name || '—', entityName: r.client_name || 'No client', archivedAt: r.archived_at || '', status: r.status, date: r.start_date })
    for (const r of rawData.rfqs) items.push({ id: r.id, type: 'rfqs', docNumber: r.rfq_number || r.title || '—', entityName: r.vendor_name || 'No vendor', archivedAt: r.archived_at || '' })
    for (const r of rawData.csrs) items.push({ id: r.id, type: 'csrs', docNumber: r.csr_number || '—', entityName: r.client_name || 'No client', archivedAt: r.archived_at || '', date: r.date })
    for (const r of rawData.waybills) items.push({ id: r.id, type: 'waybills', docNumber: r.waybill_number || '—', entityName: r.client_name || 'No client', archivedAt: r.archived_at || '', date: r.date })
    for (const r of rawData.boqs) items.push({ id: r.id, type: 'boqs', docNumber: r.boq_number || r.title || '—', entityName: r.client_name || 'No client', archivedAt: r.archived_at || '', date: r.issue_date })

    return items.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))
  }, [rawData])

  const filteredItems = useMemo(() => {
    let items = allItems

    if (selectedTypes.size > 0) {
      items = items.filter(i => selectedTypes.has(i.type))
    }

    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.docNumber.toLowerCase().includes(q) ||
        i.entityName.toLowerCase().includes(q),
      )
    }

    if (dateFrom) {
      items = items.filter(i => i.archivedAt >= dateFrom)
    }

    if (dateTo) {
      items = items.filter(i => i.archivedAt <= dateTo + 'T23:59:59')
    }

    return items
  }, [allItems, selectedTypes, search, dateFrom, dateTo])

  const toggleType = (type: ArchiveDocType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const formatDate = (value: string | null | undefined) =>
    formatDisplayDate(value, {
      fallback: 'Not set',
      invalidFallback: value || 'Not set',
      locale: 'en-GB',
      dateOptions: { day: 'numeric', month: 'short', year: 'numeric' },
    })

  const formatMoney = (value: number | string | null | undefined) => formatNaira(value)

  const restoreRecord = async (type: ArchiveDocType, id: string) => {
    setRestoringId(`${type}:${id}`)

    // Phase 3: invoice restores target the tenant schema.
    const client = type === 'invoices' || type === 'quotations' ? tenantClient : supabase
    const { error } = await client.from(type).update({ archived_at: null }).eq('id', id)

    if (error) {
      feedback.error(`Restore failed: ${error.message}`)
      setRestoringId(null)
      return
    }

    await loadArchives()
    setRestoringId(null)
    feedback.success('Record restored')
  }

  const hasActiveFilters = selectedTypes.size > 0 || search || dateFrom || dateTo
  const totalArchived = allItems.length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
          Data Lifecycle
        </p>
      </div>

      <SettingsSummaryCard
        title="Archive Management"
        description="Review and restore documents that have been moved out of active workflows."
      >
        {/* Filter bar */}
        <div className="space-y-3 border-b border-[hsl(var(--bd-border)/0.3)] px-5 pb-4 pt-4">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bd-text-muted" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by document number or client..."
              className="h-9 rounded-xl border-bd-border bg-bd-card-bg pl-9 pr-8 text-xs font-medium shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-bd-text-muted hover:text-bd-text">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {allTypes.map(type => {
              const active = selectedTypes.has(type)
              const config = docTypeConfig[type]
              const Icon = config.icon
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
                    active
                      ? 'border-bd-border bg-bd-surface-muted text-bd-text'
                      : 'border-transparent text-bd-text-muted hover:border-bd-border hover:bg-bd-card-bg',
                  )}
                >
                  <Icon size={12} className={active ? config.color : 'opacity-50'} />
                  {config.label}
                </button>
              )
            })}
            {hasActiveFilters && (
              <button
                onClick={() => { setSelectedTypes(new Set()); setSearch(''); setDateFrom(''); setDateTo('') }}
                className="ml-1 text-[10px] font-bold uppercase tracking-wider text-bd-button-primary-bg hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-7 rounded-lg border border-bd-border bg-bd-card-bg px-2 text-[11px] font-medium text-bd-text shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-7 rounded-lg border border-bd-border bg-bd-card-bg px-2 text-[11px] font-medium text-bd-text shadow-sm"
              />
            </div>
            {totalArchived > 0 && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-bd-text-muted opacity-50">
                {filteredItems.length} of {totalArchived}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={24} className="animate-spin text-bd-button-primary-bg" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted">Fetching Archives...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="rounded-full bg-bd-surface-muted p-4 mb-4">
              <ArchiveRestore size={28} className="text-bd-text-muted opacity-30" />
            </div>
            <h4 className="text-sm font-bold text-bd-text">
              {hasActiveFilters ? 'No matching archives' : 'No archived documents'}
            </h4>
            <p className="mt-1 text-xs text-bd-text-muted">
              {hasActiveFilters
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Records moved to archive will appear here for recovery.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--bd-border)/0.3)]">
            {filteredItems.map(item => {
              const restoring = restoringId === `${item.type}:${item.id}`
              const config = docTypeConfig[item.type]
              const Icon = config.icon

              return (
                <div key={`${item.type}:${item.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[hsl(var(--bd-surface-muted)/0.3)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bd-surface-muted">
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-bd-surface-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bd-text-muted">
                        {config.label}
                      </span>
                      <span className="truncate text-sm font-bold text-bd-text">{item.docNumber}</span>
                    </div>
                    <p className="truncate text-[12px] text-bd-text-muted">{item.entityName}</p>
                    <p className="mt-1 text-[11px] font-medium text-bd-text-muted opacity-60">
                      Archived {formatDate(item.archivedAt)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restoreRecord(item.type, item.id)}
                    disabled={restoring}
                    className="h-8 rounded-full border border-transparent px-3 text-[11px] font-bold uppercase tracking-wider text-bd-button-primary-bg transition-all hover:border-bd-border hover:bg-bd-card-bg disabled:opacity-50"
                  >
                    {restoring ? (
                      <Loader2 size={12} className="mr-1.5 animate-spin" />
                    ) : (
                      <ArchiveRestore size={12} className="mr-1.5" />
                    )}
                    Restore
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </SettingsSummaryCard>
    </div>
  )
}
