import { useCallback, useEffect, useState } from 'react'
import {
  ArchiveRestore,
  ClipboardList,
  FileText,
  FolderKanban,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/supabase'
import type { SettingsToastFn } from './settings-types'

type ArchiveTab = 'invoices' | 'quotations' | 'projects'

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

const tabs = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'quotations', label: 'Quotations', icon: ClipboardList },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
] as const

export function ArchivesSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const [tab, setTab] = useState<ArchiveTab>('invoices')
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [data, setData] = useState<{
    invoices: ArchiveInvoice[]
    quotations: ArchiveQuotation[]
    projects: ArchiveProject[]
  }>({
    invoices: [],
    quotations: [],
    projects: [],
  })

  const loadArchives = useCallback(async () => {
    setLoading(true)

    const [{ data: invoices }, { data: quotations }, { data: projects }] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total, status, issue_date, archived_at')
        .not('archived_at', 'is', null)
        .or('thread_role.is.null,thread_role.neq.advance')
        .or('is_advance.is.null,is_advance.eq.false')
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
    ])

    setData({
      invoices: (invoices as ArchiveInvoice[]) || [],
      quotations: (quotations as ArchiveQuotation[]) || [],
      projects: (projects as ArchiveProject[]) || [],
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  const formatMoney = (value: number | string | null | undefined) =>
    `₦${Number(value || 0).toLocaleString()}`

  const formatDate = (value: string | null | undefined) => {
    if (!value) return 'Not set'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  const activeItems =
    tab === 'invoices' ? data.invoices : tab === 'quotations' ? data.quotations : data.projects

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
            Review and restore archived invoices, quotations, and projects here.
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
          <div className="flex gap-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
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
            {activeItems.map((item) => {
              const restoring = restoringId === `${tab}:${item.id}`
              const title =
                tab === 'invoices'
                  ? (item as ArchiveInvoice).invoice_number
                  : tab === 'quotations'
                    ? (item as ArchiveQuotation).quotation_number
                    : (item as ArchiveProject).name

              const subline = (item as ArchiveProject).client_name || 'No client'

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

                        {tab === 'projects' ? (
                          <span>Start: {formatDate((item as ArchiveProject).start_date)}</span>
                        ) : (
                          <span>
                            Issue date:{' '}
                            {formatDate((item as ArchiveInvoice | ArchiveQuotation).issue_date)}
                          </span>
                        )}

                        {item.status ? <span>Status: {String(item.status)}</span> : null}

                        {tab !== 'projects' ? (
                          <span>
                            Total: {formatMoney((item as ArchiveInvoice | ArchiveQuotation).total)}
                          </span>
                        ) : null}

                        {tab === 'projects' && (item as ArchiveProject).project_value ? (
                          <span>Value: {formatMoney((item as ArchiveProject).project_value)}</span>
                        ) : null}
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