import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ClipboardList,
  Copy,
  FolderOpen,
  FolderPlus,
  GitBranchPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Workflow,
} from 'lucide-react'
import { supabase } from '@/supabase'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
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
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchProjectSummary, getQuotationDocumentRelations } from '@/domain/documentRelationships'
import { formatQuotationStatus, quotationStatusTone } from './quotationStatus'
import ListActionSheet from '@/components/layout/ListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import MobileListPageShell from '@/components/layout/MobileListPageShell'
import { Button } from '@/components/ui/button'
import { canUseNativeSqlite } from '@/lib/native/capacitor'
import {
  listPendingOrFailedQuotationCreateQueueItems,
  processQuotationCreateQueueItem,
  type QuotationCreateQueueItem,
} from '@/lib/native/quotationSync'
import { formatNaira } from '@/lib/formatters/money'

const formatMoney = (value: number | string | null | undefined) => formatNaira(value)

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
  const [activeQuotationProject, setActiveQuotationProject] = useState<{ id: string; name?: string | null } | null>(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [syncQueueItems, setSyncQueueItems] = useState<QuotationCreateQueueItem[]>([])
  const [syncQueueLoading, setSyncQueueLoading] = useState(() => canUseNativeSqlite())
  const [retryingQueueItemId, setRetryingQueueItemId] = useState<string | null>(null)
  const showQuotationSyncRecovery = useMemo(() => canUseNativeSqlite(), [])

  const loadQuotations = async () => {
    const { data } = await supabase
      .from('quotations')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    setQuotations((data || []) as DbQuotation[])
  }

  const loadQuotationSyncQueue = async () => {
    if (!showQuotationSyncRecovery) return

    setSyncQueueLoading(true)
    const items = await listPendingOrFailedQuotationCreateQueueItems()
    setSyncQueueItems(items)
    setSyncQueueLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadQuotations()
      void loadQuotationSyncQueue()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadProject = async () => {
      if (!activeQuotation?.project_id) {
        setActiveQuotationProject(null)
        return
      }

      const project = await fetchProjectSummary(activeQuotation.project_id)
      if (!cancelled) setActiveQuotationProject(project)
    }

    void loadProject()

    return () => {
      cancelled = true
    }
  }, [activeQuotation?.project_id])

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
    
    let safeProjectId = quotationRow.project_id || null
    if (safeProjectId) {
      const { validateProjectAssignment } = await import('@/domain/projects')
      const { project, error: projectError } = await validateProjectAssignment(supabase as any, {
        projectId: safeProjectId,
        documentClientId: quotationRow.client_id,
        documentClientName: quotationRow.client_name,
      })
      if (projectError || !project) safeProjectId = null
    }

    const payload = {
      ...quotationRow,
      project_id: safeProjectId,
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

  const handleRetryQueueItem = async (queueItemId: string) => {
    setRetryingQueueItemId(queueItemId)

    const result = await processQuotationCreateQueueItem(queueItemId)

    if (result.status === 'synced') {
      toast({
        title: 'Quotation synced',
        description: 'The offline quotation was uploaded successfully.',
      })
      await Promise.all([loadQuotations(), loadQuotationSyncQueue()])
    } else if (result.status === 'failed') {
      toast({
        title: 'Retry failed',
        description: result.error || 'Unable to sync this quotation right now.',
        variant: 'destructive',
      })
      await loadQuotationSyncQueue()
    } else {
      toast({
        title: 'Retry skipped',
        description: 'Connect to the internet before retrying this quotation sync.',
      })
    }

    setRetryingQueueItemId(null)
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
  const activeQuotationRelations = activeQuotation ? getQuotationDocumentRelations(activeQuotation) : { source: null, derived: [] }
  const quotationProjectState = getProjectActionState({ projectId: activeQuotation?.project_id, project: activeQuotationProject })
  const quotationDocumentState = getDocumentActionState({
    sourceDocument: activeQuotationRelations.source,
    relatedDocuments: activeQuotationRelations.derived || [],
  })
  const activeQuotationHasLinkedDocuments = quotationDocumentState.hasLinkedDocuments
  const activeQuotationLinkedSections = activeQuotation ? [
    {
      key: 'source',
      title: 'Source',
      description: 'Documents this quotation came from.',
      items: activeQuotationRelations.source
        ? [{
            key: `source-${activeQuotationRelations.source.id || activeQuotationRelations.source.number || 'quotation-source'}`,
            label: `${activeQuotationRelations.source.type === 'invoice' ? 'Invoice' : 'Quotation'} ${activeQuotationRelations.source.number || activeQuotationRelations.source.id || 'Linked source'}`,
            subtitle: 'Open the source document',
            onClick: () => {
              if (activeQuotationRelations.source?.id) {
                navigate(`/${activeQuotationRelations.source.type === 'invoice' ? 'invoices' : 'quotations'}/${activeQuotationRelations.source.id}`)
              }
            },
            disabled: !activeQuotationRelations.source?.id,
          }]
        : [],
    },
    {
      key: 'generated',
      title: 'Generated / Child Documents',
      description: 'Documents created from this quotation.',
      items: (activeQuotationRelations.derived || [])
        .filter((entry) => entry.type === 'invoice' && entry.id)
        .map((entry) => ({
          key: `invoice-${entry.id}`,
          label: `Invoice ${entry.number || entry.id}`,
          subtitle: 'Open generated invoice',
          onClick: () => navigate(`/invoices/${entry.id}`),
        })),
    },
    {
      key: 'project',
      title: 'Project',
      description: 'Project connected to this quotation.',
      items: activeQuotationProject
        ? [{
            key: `project-${activeQuotationProject.id}`,
            label: activeQuotationProject.name || activeQuotationProject.id,
            subtitle: 'Open linked project',
            onClick: () => navigate(`/projects/${activeQuotationProject.id}`),
          }]
        : [],
    },
  ] : []

  return (
    <MobileListPageShell
        eyebrow="Sales"
        title="Quotations"
        summary={`${quotations.length} quotations total`}
        tone="blue"
        onPrimaryAction={() => navigate('/quotations/new')}
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
      {showQuotationSyncRecovery && (syncQueueLoading || syncQueueItems.length > 0) ? (
        <div className="mb-4 rounded-[22px] border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                Offline sync recovery
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Retry pending or failed quotation uploads from this device.
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={loadQuotationSyncQueue}
              disabled={syncQueueLoading || retryingQueueItemId != null}
              className="h-10 w-10 rounded-2xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
              aria-label="Refresh quotation sync queue"
            >
              {syncQueueLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {syncQueueItems.length > 0 ? (
            <div className="mt-4 space-y-2">
              {syncQueueItems.map((item) => {
                const isRetrying = retryingQueueItemId === item.id

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {item.quotationNumber || item.localQuotationId || `Queue #${item.id}`}
                          </div>
                          <span
                            className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] ${
                              item.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {item.clientName || 'No client'} · Attempts {item.attempts}
                        </div>

                        {item.error ? (
                          <div className="mt-2 text-xs leading-5 text-red-600">
                            {item.error}
                          </div>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryQueueItem(item.id)}
                        disabled={retryingQueueItemId != null}
                        className="h-9 rounded-xl border-amber-200 bg-white px-3 text-xs font-bold text-amber-700 hover:bg-amber-50"
                      >
                        {isRetrying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Retry
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {filteredQuotations.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-muted-foreground">
          No quotations yet. Create the first one when you are ready to send a quote.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredQuotations.map((row) => {
            const quotation = mapDbQuotation(row)
            const issueDateLabel = quotation.issue_date || 'Not set'
            const statusTone = quotationStatusTone(quotation.status)
            const statusClasses = {
              draft: 'bg-amber-50 text-amber-800',
              sent: 'bg-sky-100 text-sky-700',
              accepted: 'bg-emerald-100 text-emerald-700',
              rejected: 'bg-rose-100 text-rose-700',
              paid: 'bg-emerald-100 text-emerald-700',
            }[statusTone] || 'bg-slate-100 text-slate-600'

            return (
              <div
                key={quotation.id}
                onClick={() => navigate(`/quotations/${quotation.id}`)}
                className="cursor-pointer rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-lg font-extrabold text-blue-600">Q</div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Quotation</div>
                    <div className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-950">{quotation.quotation_number}</div>
                    <div className="mt-1 text-sm text-slate-500">{quotation.client_name || 'No client selected'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveQuotation(quotation)
                    }}
                    className="grid h-10 w-10 place-items-center rounded-[14px] border border-slate-200 bg-white text-[20px] leading-none text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                    aria-label={`Open actions for ${quotation.quotation_number}`}
                  >
                    ⋯
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-[1.45] text-slate-500">
                  <span>Issue date: {issueDateLabel}</span>
                  {String(quotation.po_number || '').trim() ? (
                    <>
                      <span>•</span>
                      <span>P.O: {String(quotation.po_number || '').trim()}</span>
                    </>
                  ) : null}
                </div>

                <div className="my-[14px] h-px bg-slate-200" />

                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${statusClasses}`}>
                    {formatQuotationStatus(quotation.status)}
                  </span>
                  <div className="text-base font-extrabold tracking-[-0.03em] text-slate-950">{formatMoney(quotation.total || 0)}</div>
                </div>
              </div>
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
            key: 'project',
            label: quotationProjectState.label,
            icon: quotationProjectState.hasProject ? <FolderOpen className="h-6 w-6" /> : <FolderPlus className="h-6 w-6" />,
            onClick: () => {
              if (activeQuotation.project_id) {
                navigate(`/projects/${activeQuotation.project_id}`)
                return
              }
              setShowProjectLinkDialog(true)
            },
            closeOnClick: quotationProjectState.hasProject,
          },
          {
            key: 'documents',
            label: quotationDocumentState.label,
            icon: activeQuotationHasLinkedDocuments ? <Workflow className="h-6 w-6" /> : <GitBranchPlus className="h-6 w-6" />,
            onClick: () => setShowLinkedDocuments(true),
            closeOnClick: false,
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
      <LinkedDocumentsSheet
        open={showLinkedDocuments}
        onOpenChange={setShowLinkedDocuments}
        title="Linked Documents"
        subtitle={activeQuotation?.quotation_number || 'Quotation'}
        sections={activeQuotationLinkedSections}
      />
      <ProjectLinkDialog
        open={showProjectLinkDialog}
        onOpenChange={setShowProjectLinkDialog}
        tableName="quotations"
        recordId={activeQuotation?.id || null}
        documentLabel="Quotation"
        onLinked={async () => {
          await loadQuotations()
          setActiveQuotation(null)
        }}
      />
    </MobileListPageShell>
  )
}
