import { useCallback, useEffect, useState } from 'react'
import {
  ArchiveRestore,
  ClipboardList,
  FileText,
  FolderKanban,
  Loader2,
  Truck,
  FileCheck,
  ChevronDown,
} from 'lucide-react'
import { ADVANCE_INVOICE_EXCLUSION_FILTER } from '@/domain/invoice/advanceList'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { supabase } from '@/supabase'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

type ArchiveTab = 'invoices' | 'quotations' | 'projects' | 'rfqs' | 'csrs' | 'waybills' | 'boqs'

type ArchiveInvoice = {
  id: string
  invoice_number?: string | null
  client_name?: string | null
  total?: number | string | null
  status?: string | null
  issue_date?: string | null
  archived_at?: string | null
}

type ArchiveQuotation = {
  id: string
  quotation_number?: string | null
  client_name?: string | null
  total?: number | string | null
  status?: string | null
  issue_date?: string | null
  archived_at?: string | null
}

type ArchiveProject = {
  id: string
  name?: string | null
  client_name?: string | null
  status?: string | null
  start_date?: string | null
  project_value?: number | string | null
  archived_at?: string | null
}

type ArchiveRFQ = {
  id: string
  rfq_number?: string | null
  vendor_name?: string | null
  title?: string | null
  expiry_date?: string | null
  archived_at?: string | null
}

type ArchiveCSR = {
  id: string
  csr_number?: string | null
  client_name?: string | null
  date?: string | null
  archived_at?: string | null
}

type ArchiveWaybill = {
  id: string
  waybill_number?: string | null
  client_name?: string | null
  date?: string | null
  archived_at?: string | null
}

type ArchiveBOQ = {
  id: string
  boq_number?: string | null
  client_name?: string | null
  title?: string | null
  issue_date?: string | null
  archived_at?: string | null
}

const documentTypes = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'quotations', label: 'Quotations', icon: ClipboardList },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'rfqs', label: 'RFQs', icon: FileText },
  { id: 'csrs', label: 'CSRs', icon: FileCheck },
  { id: 'waybills', label: 'Waybills', icon: Truck },
  { id: 'boqs', label: 'BOQs', icon: ClipboardList },
] as const

export function ArchivesSettingsSection() {
  const [tab, setTab] = useState<ArchiveTab>('invoices')
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [data, setData] = useState<{
    invoices: ArchiveInvoice[]
    quotations: ArchiveQuotation[]
    projects: ArchiveProject[]
    rfqs: ArchiveRFQ[]
    csrs: ArchiveCSR[]
    waybills: ArchiveWaybill[]
    boqs: ArchiveBOQ[]
  }>({
    invoices: [],
    quotations: [],
    projects: [],
    rfqs: [],
    csrs: [],
    waybills: [],
    boqs: [],
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
      supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total, status, issue_date, archived_at')
        .not('archived_at', 'is', null)
        .or(ADVANCE_INVOICE_EXCLUSION_FILTER)
        .order('archived_at', { ascending: false }),
      supabase
        .from('quotations')
        .select('id, quotation_number, client_name, total, status, issue_date, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name, client_name, status, start_date, project_value, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }),
      supabase
        .from('rfqs')
        .select('id, rfq_number, vendor_name, title, expiry_date, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }),
      supabase
        .from('csrs')
        .select('id, csr_number, client_name, date, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }),
      supabase
        .from('waybills')
        .select('id, waybill_number, client_name, date, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }),
      supabase
        .from('boqs')
        .select('id, boq_number, client_name, title, issue_date, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }),
    ])

    setData({
      invoices: (invoices as ArchiveInvoice[]) || [],
      quotations: (quotations as ArchiveQuotation[]) || [],
      projects: (projects as ArchiveProject[]) || [],
      rfqs: (rfqs as ArchiveRFQ[]) || [],
      csrs: (csrs as ArchiveCSR[]) || [],
      waybills: (waybills as ArchiveWaybill[]) || [],
      boqs: (boqs as ArchiveBOQ[]) || [],
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  const formatMoney = (value: number | string | null | undefined) =>
    formatNaira(value)

  const formatDate = (value: string | null | undefined) => {
    return formatDisplayDate(value, {
      fallback: 'Not set',
      invalidFallback: value || 'Not set',
      locale: 'en-GB',
      dateOptions: {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    })
  }

  const restoreRecord = async (entity: ArchiveTab, id: string) => {
    setRestoringId(`${entity}:${id}`)

    const { error } = await supabase.from(entity).update({ archived_at: null }).eq('id', id)

    if (error) {
      feedback.error(`Restore failed: ${error.message}`)
      setRestoringId(null)
      return
    }

    await loadArchives()
    setRestoringId(null)
    feedback.success('Record restored')
  }

  const activeItems = data[tab]
  const currentDocType = documentTypes.find(d => d.id === tab)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))] opacity-60">
          Data Lifecycle
        </p>
      </div>

      <SettingsSummaryCard 
        title="Archive Management"
        description="Review and restore documents that have been moved out of active workflows."
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] px-3 text-xs font-bold shadow-sm">
                {currentDocType?.label || 'Invoices'}
                <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] shadow-xl">
              {documentTypes.map((doc) => (
                <DropdownMenuItem 
                  key={doc.id} 
                  onClick={() => setTab(doc.id)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--bd-text))] transition-colors hover:bg-[hsl(var(--bd-surface-muted))]"
                >
                  <doc.icon size={14} className="text-[hsl(var(--bd-text-muted))]" />
                  {doc.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={24} className="animate-spin text-[hsl(var(--bd-button-primary-bg))]" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">Fetching Archives...</p>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="rounded-full bg-[hsl(var(--bd-surface-muted))] p-4 mb-4">
              <ArchiveRestore size={28} className="text-[hsl(var(--bd-text-muted))] opacity-30" />
            </div>
            <h4 className="text-sm font-bold text-[hsl(var(--bd-text))]">No archived {tab}</h4>
            <p className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">Records moved to archive will appear here for recovery.</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--bd-border)/0.3)]">
            {activeItems.map((item: any) => {
              const restoring = restoringId === `${tab}:${item.id}`
              
              let title = ''
              let subline = 'No client'
              let details = ''

              if (tab === 'invoices') {
                title = item.invoice_number
                subline = item.client_name || 'No client'
                details = `${formatDate(item.issue_date)} • ${formatMoney(item.total)}`
              } else if (tab === 'quotations') {
                title = item.quotation_number
                subline = item.client_name || 'No client'
                details = `${formatDate(item.issue_date)} • ${formatMoney(item.total)}`
              } else if (tab === 'projects') {
                title = item.name
                subline = item.client_name || 'No client'
                details = `${formatDate(item.start_date)} • ${formatMoney(item.project_value)}`
              } else if (tab === 'rfqs') {
                title = item.rfq_number || item.title || 'Untitled RFQ'
                subline = item.vendor_name || 'No vendor'
                details = `Expires: ${formatDate(item.expiry_date)}`
              } else if (tab === 'csrs') {
                title = item.csr_number || 'Untitled CSR'
                subline = item.client_name || 'No client'
                details = formatDate(item.date)
              } else if (tab === 'waybills') {
                title = item.waybill_number || 'Untitled Waybill'
                subline = item.client_name || 'No client'
                details = formatDate(item.date)
              } else if (tab === 'boqs') {
                title = item.boq_number || item.title || 'Untitled BOQ'
                subline = item.client_name || 'No client'
                details = formatDate(item.issue_date)
              }

              return (
                <div key={item.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[hsl(var(--bd-surface-muted)/0.3)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-[hsl(var(--bd-text))]">{title}</span>
                    </div>
                    <p className="truncate text-[12px] text-[hsl(var(--bd-text-muted))]">{subline}</p>
                    <p className="mt-1 text-[11px] font-medium text-[hsl(var(--bd-text-muted))] opacity-60">
                      {details} • Archived {formatDate(item.archived_at)}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restoreRecord(tab, item.id)}
                    disabled={restoring}
                    className="h-8 rounded-full border border-transparent px-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--bd-button-primary-bg))] transition-all hover:border-[hsl(var(--bd-border))] hover:bg-[hsl(var(--bd-card-bg))] disabled:opacity-50"
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

