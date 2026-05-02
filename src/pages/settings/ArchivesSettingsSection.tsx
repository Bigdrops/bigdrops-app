import { useCallback, useEffect, useState } from 'react'
import {
  ArchiveRestore,
  ClipboardList,
  FileText,
  FolderKanban,
  Loader2,
  Truck,
  FileCheck,
} from 'lucide-react'
import { ADVANCE_INVOICE_EXCLUSION_FILTER } from '@/domain/invoice/advanceList'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { supabase } from '@/supabase'
import type { SettingsToastFn } from './settings-types'

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

const tabs = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'quotations', label: 'Quotations', icon: ClipboardList },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'rfqs', label: 'RFQs', icon: FileText },
  { id: 'csrs', label: 'CSRs', icon: FileCheck },
  { id: 'waybills', label: 'Waybills', icon: Truck },
  { id: 'boqs', label: 'BOQs', icon: ClipboardList },
] as const

export function ArchivesSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
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
      onToast(`Restore failed: ${error.message}`)
      setRestoringId(null)
      return
    }

    await loadArchives()
    setRestoringId(null)
    onToast('Record restored')
  }

  const activeItems = data[tab]

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-rose-700/80">
          Archives
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">Archive Management</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Review and restore archived documents here.
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        <div className="border-b border-slate-200/80 bg-amber-50/40 px-4 py-3.5">
          <div className="text-sm font-bold text-slate-900">Recovery</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Archived records stay here until you restore them.
          </div>
        </div>

        <div className="border-b border-slate-200/80 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 min-w-[100px] rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  tab === id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon size={12} />
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        ) : activeItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No archived {tab}.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80">
            {activeItems.map((item: any) => {
              const restoring = restoringId === `${tab}:${item.id}`
              
              let title = ''
              let subline = 'No client'
              let detailLine = null

              if (tab === 'invoices') {
                title = item.invoice_number
                subline = item.client_name || 'No client'
                detailLine = (
                  <>
                    <span>Issue date: {formatDate(item.issue_date)}</span>
                    {item.status ? <span>Status: {String(item.status)}</span> : null}
                    <span>Total: {formatMoney(item.total)}</span>
                  </>
                )
              } else if (tab === 'quotations') {
                title = item.quotation_number
                subline = item.client_name || 'No client'
                detailLine = (
                  <>
                    <span>Issue date: {formatDate(item.issue_date)}</span>
                    {item.status ? <span>Status: {String(item.status)}</span> : null}
                    <span>Total: {formatMoney(item.total)}</span>
                  </>
                )
              } else if (tab === 'projects') {
                title = item.name
                subline = item.client_name || 'No client'
                detailLine = (
                  <>
                    <span>Start: {formatDate(item.start_date)}</span>
                    {item.status ? <span>Status: {String(item.status)}</span> : null}
                    {item.project_value ? <span>Value: {formatMoney(item.project_value)}</span> : null}
                  </>
                )
              } else if (tab === 'rfqs') {
                title = item.rfq_number || item.title || 'Untitled RFQ'
                subline = item.vendor_name || 'No vendor'
                detailLine = (
                  <>
                    <span>Expiry: {formatDate(item.expiry_date)}</span>
                    {item.title ? <span>Title: {item.title}</span> : null}
                  </>
                )
              } else if (tab === 'csrs') {
                title = item.csr_number || 'Untitled CSR'
                subline = item.client_name || 'No client'
                detailLine = (
                  <>
                    <span>Date: {formatDate(item.date)}</span>
                  </>
                )
              } else if (tab === 'waybills') {
                title = item.waybill_number || 'Untitled Waybill'
                subline = item.client_name || 'No client'
                detailLine = (
                  <>
                    <span>Date: {formatDate(item.date)}</span>
                  </>
                )
              } else if (tab === 'boqs') {
                title = item.boq_number || item.title || 'Untitled BOQ'
                subline = item.client_name || 'No client'
                detailLine = (
                  <>
                    <span>Issue date: {formatDate(item.issue_date)}</span>
                    {item.title ? <span>Title: {item.title}</span> : null}
                  </>
                )
              }

              return (
                <div key={item.id} className="px-4 py-4 transition-colors hover:bg-slate-50/70">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <ArchiveRestore size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-bold text-slate-900">{title}</div>
                      <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
                        {subline}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Archived: {formatDate(item.archived_at)}</span>
                        {detailLine}
                      </div>
                    </div>

                    <button
                      onClick={() => restoreRecord(tab, item.id)}
                      disabled={restoring}
                      className="shrink-0 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                    >
                      {restoring ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
