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
  RefreshCw,
  Trash2,
  Workflow,
} from 'lucide-react'
import { supabase } from '@/supabase'
import { readListCache, writeListCache, isListCacheFresh, invalidateListCache } from '@/lib/cache/listCache'
import { loadQuotations as fetchQuotationsFromService, loadQuotationById, loadQuotationNumbers, loadQuotationItems, archiveQuotation, deleteQuotation, cloneQuotation } from '@/modules/quotations/services/quotationService'

const QUOTATION_CACHE_KEY = 'bd:list:quotations:v1:all'
const QUOTATION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { feedback } from '@/lib/feedback'
import type { DbQuotation } from '@/domain/quotation'
import { getNextQuotationNumber, mapDbQuotation } from '@/domain/quotation'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchProjectSummary, getQuotationDocumentRelations } from '@/domain/documentRelationships'
import { formatQuotationStatus, quotationStatusTone } from './quotationStatus'
import { getStatusTone, getStatusClasses } from "@/lib/statusTheme"
import MobileFab from '@/components/layout/MobileFab'
import { Button } from '@/components/ui/button'
import { canUseNativeSqlite } from '@/lib/native/capacitor'
import {
  listPendingOrFailedQuotationCreateQueueItems,
  processQuotationCreateQueueItem,
  type QuotationCreateQueueItem,
} from '@/lib/native/quotationSync'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import ModuleShell from '@/components/layout/ModuleShell'
import { useDocumentQuery } from '@/context/DocumentQueryContext'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import ModuleRowCard from '@/components/layout/ModuleRowCard'

const formatMoney = (value: number | string | null | undefined) => formatNaira(value)

export default function QuotationList() {
  const navigate = useNavigate()
  const { state, patchUpdate, reset, results: quotations, loading } = useDocumentQuery()
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)
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

  const loadQuotationSyncQueue = async () => {
    if (!showQuotationSyncRecovery) return

    setSyncQueueLoading(true)
    const items = await listPendingOrFailedQuotationCreateQueueItems()
    setSyncQueueItems(items)
    setSyncQueueLoading(false)
  }

  useEffect(() => {
    void loadQuotationSyncQueue()
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
    try {
      await archiveQuotation(id)
    } catch (error: any) {
      setBusyAction(null)
      feedback.error('Archive failed', { description: error.message })
      return
    }
    setBusyAction(null)
    invalidateListCache(QUOTATION_CACHE_KEY)
    patchUpdate({ search: state.search } as any)
  }

  const handleDelete = async (id: string) => {
    setDeleteId(null)
    setBusyAction(`delete:${id}`)
    try {
      await deleteQuotation(id)
    } catch (error: any) {
      setBusyAction(null)
      feedback.error('Delete failed', { description: error.message })
    }
    setBusyAction(null)
    invalidateListCache(QUOTATION_CACHE_KEY)
    patchUpdate({ search: state.search } as any)
  }

  const handleClone = async (id: string) => {
    setBusyAction(`clone:${id}`)
    try {
      const createdQuotation = await cloneQuotation(id)
      setBusyAction(null)
      setActiveQuotation(null)
      invalidateListCache(QUOTATION_CACHE_KEY)
      patchUpdate({ search: state.search } as any)
      navigate(`/quotations/${createdQuotation.id}`)
    } catch (error: any) {
      setBusyAction(null)
      feedback.error('Clone failed', {
        description: error.message || 'Unable to clone quotation',
      })
    }
  }

  const handleRetryQueueItem = async (queueItemId: string) => {
    setRetryingQueueItemId(queueItemId)

    const result = await processQuotationCreateQueueItem(queueItemId)

    if (result.status === 'synced') {
      feedback.success('Quotation synced', {
        description: 'The offline quotation was uploaded successfully.',
      })
      invalidateListCache(QUOTATION_CACHE_KEY)
      patchUpdate({ search: state.search } as any)
      await loadQuotationSyncQueue()
    } else if (result.status === 'failed') {
      feedback.error('Retry failed', {
        description: result.error || 'Unable to sync this quotation right now.',
      })
      await loadQuotationSyncQueue()
    } else {
      feedback.warning('Retry skipped', {
        description: 'Connect to the internet before retrying this quotation sync.',
      })
    }

    setRetryingQueueItemId(null)
  }

  const mappedQuotations = useMemo(
    () =>
      (quotations || [])
        .map((row) => mapDbQuotation(row))
        .filter((quotation) => Boolean(quotation.id))
        .map((quotation) => ({
          ...quotation,
          id: quotation.id,
        })),
    [quotations],
  )

  const activeQuotationIsArchiving = activeQuotation ? busyAction === `archive:${activeQuotation.id}` : false
  const activeQuotationIsDeleting = activeQuotation ? busyAction === `delete:${activeQuotation.id}` : false
  const hasActiveFilters = Boolean(
    state.statuses.length > 0 ||
    state.dateRange.from ||
    state.dateRange.to
  )
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

  const renderQuotationRowMeta = (quotation: ReturnType<typeof mapDbQuotation>) => {
    return quotation.quotation_number || 'Quotation'
  }

  const renderQuotationRowDate = (quotation: ReturnType<typeof mapDbQuotation>) =>
    formatDisplayDate(quotation.issue_date, {
      fallback: 'No date',
      invalidFallback: 'No date',
      locale: 'en-GB',
      dateOptions: {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    })

  const renderQuotationRow = (quotation: any) => {
    const tone = getStatusTone(quotation.status)
    const statusClasses = getStatusClasses(tone)

    // Composite status pills: base status + OVERDUE if applicable
    const baseLabel = formatQuotationStatus(quotation.status)
    const labels: string[] = [baseLabel]
    const classes: string[] = [statusClasses]

    const isOverdue =
      quotation.valid_until &&
      new Date() > new Date(quotation.valid_until) &&
      String(quotation.status || '').toLowerCase() !== 'converted'

    if (isOverdue) {
      labels.push("OVERDUE")
      classes.push("bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]")
    }

    return (
      <ModuleRowCard
        key={quotation.id}
        title={quotation.client_name || 'No client'}
        subtitle={quotation.quotation_number || 'Quotation'}
        tertiary={formatDisplayDate(quotation.issue_date, {
          fallback: 'No date',
          dateOptions: { day: '2-digit', month: 'short', year: 'numeric' },
        })}
        amount={formatNaira(quotation.total)}
        statusLabel={labels}
        statusClassName={classes}
        onClick={() => navigate(`/quotations/${quotation.id}`)}
        onActionClick={() => setActiveQuotation(quotation)}
      />
    )
  }

  const syncRecoveryBanner = showQuotationSyncRecovery && (syncQueueLoading || syncQueueItems.length > 0) ? (
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
  ) : null

  return (
    <>
      <ModuleShell
        eyebrow="Sales"
        title="Quotations"
        summary={`${quotations.length} quotations total`}
        tone="blue"
        searchValue={state.search}
        onSearchChange={(value) => patchUpdate({ search: value } as any)}
        searchPlaceholder="Search quotations..."
        hasActiveFilters={hasActiveFilters}
        onResetFilters={reset}
        onFilterClick={() => setShowFilterOverlay(true)}
        onPrimaryAction={() => navigate('/quotations/new')}
        primaryActionLabel="New Quotation"
        filterOverlay={
          <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="quotations" />
        }
        records={mappedQuotations}
        renderRow={renderQuotationRow}
        beforeListContent={syncRecoveryBanner}
        emptyState={(
          <div className="rounded-[24px] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]">
               <ClipboardList className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-bold text-[hsl(var(--bd-text))]">No quotations yet</div>
            <div className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">Create the first one when you are ready to send a quote.</div>
          </div>
        )}
        hasMore={false}
        loadingMore={false}
        onLoadMore={() => {}}
      />
      <MobileFab onClick={() => navigate('/quotations/new')} ariaLabel="Create quotation" />
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
      <InvoiceListActionSheet
        open={Boolean(activeQuotation) && !archiveId && !deleteId}
        onOpenChange={(open) => {
          if (!open) setActiveQuotation(null)
        }}
        eyebrow="Quotation"
        title={activeQuotation ? `${activeQuotation.client_name || 'No client selected'} · ${activeQuotation.quotation_number || 'Quotation'}` : 'Quotation'}
        subtitle={activeQuotation ? `${formatMoney(activeQuotation.total || 0)} · Fast access actions from list context` : null}
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
          {
            key: 'archive',
            label: activeQuotationIsArchiving ? 'Archiving...' : 'Archive',
            icon: activeQuotationIsArchiving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Archive className="h-6 w-6" />,
            onClick: () => setArchiveId(activeQuotation.id),
            closeOnClick: false,
          },
        ] : []}
        deleteAction={activeQuotation ? {
          key: 'delete',
          label: activeQuotationIsDeleting ? "Deleting..." : "Delete Quotation",
          icon: activeQuotationIsDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />,
          onClick: () => setDeleteId(activeQuotation.id),
          closeOnClick: false,
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
          patchUpdate({ search: state.search } as any)
          setActiveQuotation(null)
        }}
      />
    </>
  )
}
