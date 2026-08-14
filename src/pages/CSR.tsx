import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Archive, ClipboardList, Eye, FolderOpen, FolderPlus, GitBranchPlus, Loader2, Pencil, RefreshCw, Trash2, Workflow } from "lucide-react"

import Layout from '../components/Layout'
import { invalidateListCache } from '@/lib/cache/listCache'
import MobileFab from '../components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import { feedback } from '@/lib/feedback'
import LinkedDocumentsSheet from "@/components/document/LinkedDocumentsSheet"
import AttachExistingDocumentSheet from "@/components/document/AttachExistingDocumentSheet"
import ProjectLinkDialog from "@/components/document/ProjectLinkDialog"
import { Button } from "@/components/ui/button"
import InvoiceListActionSheet from "@/components/invoice/InvoiceListActionSheet"
import { getDocumentActionState, getProjectActionState } from "@/domain/document/documentActionState"
import { fetchInvoiceSummary, fetchProjectSummary } from "@/domain/documentRelationships"
import { canUseNativeSqlite } from "@/lib/native/capacitor"
import {
  listPendingOrFailedCsrCreateQueueItems,
  processCsrCreateQueueItem,
  type CsrCreateQueueItem,
} from "@/lib/native/csrSync"
import {
  createLinkedDocumentItem,
  createLinkedDocumentsSection,
  createLinkedProjectSection,
} from "@/components/document/linkedDocumentSections"
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatStatusLabel } from "@/lib/formatters/status"
import { getStatusTone, getStatusClasses } from "@/lib/statusTheme"
import { archiveCsr, deleteCsr, attachInvoiceToCsr } from "@/domain/csr/csrService"
import { DocumentQueryProvider, useDocumentQuery } from '@/context/DocumentQueryContext'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import { ContextualExportDropdown } from '@/components/export/ContextualExportDropdown'

export type CsrRow = {
  id: string
  csr_number: string | null
  client_name: string | null
  equipment_type: string | null
  make: string | null
  date: string | null
  created_at: string
  status: string | null
  linked_invoice_id: string | null
  project_id: string | null
}

function normalizeStatus(status: string | null | undefined): string {
  return (status || "").trim().toLowerCase()
}

function getCsrStatusKey(status: string | null | undefined): string {
  const normalized = normalizeStatus(status)
  if (!normalized) return "draft"
  if (normalized.includes("cancel")) return "cancelled"
  if (normalized.includes("complete")) return "completed"
  if (normalized.includes("pending")) return "pending"
  if (normalized.includes("draft")) return "draft"
  return normalized
}

function CsrContent() {
  const navigate = useNavigate()

  // ─── QUERY PLATFORM BINDING (single source of truth) ───
  const { state, patchUpdate, reset, results, loading } = useDocumentQuery("csr")

  // ─── NON-FILTER STATE (page-specific) ───
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeCsr, setActiveCsr] = useState<CsrRow | null>(null)
  const [showAttachInvoice, setShowAttachInvoice] = useState(false)
  const [pendingAttachInvoice, setPendingAttachInvoice] = useState<{ id: string } | null>(null)
  const [activeCsrInvoice, setActiveCsrInvoice] = useState<any>(null)
  const [activeCsrProject, setActiveCsrProject] = useState<any>(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)
  const [syncQueueItems, setSyncQueueItems] = useState<CsrCreateQueueItem[]>([])
  const [syncQueueLoading, setSyncQueueLoading] = useState(() => canUseNativeSqlite())
  const [retryingQueueItemId, setRetryingQueueItemId] = useState<string | null>(null)
  const showCsrSyncRecovery = useMemo(() => canUseNativeSqlite(), [])

  // ─── Typed results ───
  const csrs = results as CsrRow[]

  const loadCsrSyncQueue = async () => {
    if (!showCsrSyncRecovery) return
    setSyncQueueLoading(true)
    const items = await listPendingOrFailedCsrCreateQueueItems()
    setSyncQueueItems(items)
    setSyncQueueLoading(false)
  }

  useEffect(() => {
    void loadCsrSyncQueue()
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadRelationships = async () => {
      if (!activeCsr) {
        setActiveCsrInvoice(null)
        setActiveCsrProject(null)
        return
      }
      const [invoice, project] = await Promise.all([
        activeCsr.linked_invoice_id ? fetchInvoiceSummary(activeCsr.linked_invoice_id) : Promise.resolve(null),
        activeCsr.project_id ? fetchProjectSummary(activeCsr.project_id) : Promise.resolve(null),
      ])
      if (cancelled) return
      setActiveCsrInvoice(invoice)
      setActiveCsrProject(project)
    }
    void loadRelationships()
    return () => { cancelled = true }
  }, [activeCsr?.id, activeCsr?.linked_invoice_id, activeCsr?.project_id])

  const formatCsrStatusLabel = (status: string | null | undefined): string => formatStatusLabel(getCsrStatusKey(status), { fallback: "draft" })

  const formatCardDate = (value: string | null | undefined): string => formatDisplayDate(value, {
    fallback: "-", locale: "en-GB", dateOptions: { day: "2-digit", month: "short", year: "numeric" },
  })

  const csrProjectState = getProjectActionState({ projectId: activeCsr?.project_id, project: activeCsrProject })
  const csrDocumentState = getDocumentActionState({ sourceDocument: activeCsrInvoice, relatedDocuments: [] })
  const activeCsrHasLinkedDocuments = csrDocumentState.hasLinkedDocuments
  const activeCsrLinkedSections = activeCsr ? [
    createLinkedDocumentsSection({
      key: 'source', title: 'Source', description: 'Documents this CSR is linked to.',
      items: [
        createLinkedDocumentItem({ key: 'attach-invoice', label: 'Attach to Invoice', subtitle: 'Search and link an invoice', onClick: () => { setShowLinkedDocuments(false); setShowAttachInvoice(true) } }),
        activeCsrInvoice ? createLinkedDocumentItem({ key: `invoice-${activeCsrInvoice.id}`, label: `Invoice ${activeCsrInvoice.invoice_number || activeCsrInvoice.id}`, subtitle: 'Open linked invoice', onClick: () => navigate(`/invoices/${activeCsrInvoice.id}`) }) : null,
      ],
    }),
    createLinkedProjectSection({ project: activeCsrProject, description: 'Project connected to this CSR.', onOpenProject: () => navigate(`/projects/${activeCsrProject.id}`) }),
  ] : []

  const attachInvoice = async (invoice: { id: string } | null) => {
    if (!activeCsr?.id || !invoice?.id) return
    try {
      const data = await attachInvoiceToCsr(activeCsr.id, invoice.id)
      setActiveCsr(data)
      setActiveCsrInvoice(data.linked_invoice_id ? await fetchInvoiceSummary(data.linked_invoice_id) : null)
    } catch (error: any) {
      feedback.error('Attachment failed', { description: error.message })
    }
    setShowAttachInvoice(false)
  }

  const handleAttachInvoice = (invoice: { id: string } | null) => {
    if (!activeCsr?.id || !invoice?.id) return
    if (activeCsr.linked_invoice_id && activeCsr.linked_invoice_id !== invoice.id) {
      setPendingAttachInvoice(invoice)
      return
    }
    void attachInvoice(invoice)
  }

  const handleArchive = async () => {
    if (!archiveId) return
    setIsArchiving(true)
    try {
      await archiveCsr(archiveId)
      feedback.success('CSR archived')
      setArchiveId(null)
      setActiveCsr(null)
      invalidateListCache('bd:list:csr:v1:all')
      patchUpdate({ search: state.search } as any)
    } catch (error: any) {
      feedback.error('Archive failed', { description: error.message })
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteCsr(deleteId)
      feedback.success('CSR deleted')
      setDeleteId(null)
      setActiveCsr(null)
      invalidateListCache('bd:list:csr:v1:all')
      patchUpdate({ search: state.search } as any)
    } catch (error: any) {
      feedback.error('Delete failed', { description: error.message })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRetryQueueItem = async (queueItemId: string) => {
    setRetryingQueueItemId(queueItemId)
    const result = await processCsrCreateQueueItem(queueItemId)
    if (result.status === "synced") {
      feedback.success('CSR synced', { description: 'The offline CSR was uploaded successfully.' })
      invalidateListCache('bd:list:csr:v1:all')
      patchUpdate({ search: state.search } as any)
      await loadCsrSyncQueue()
    } else if (result.status === "failed") {
      feedback.error('Retry failed', { description: result.error || 'Unable to sync this CSR right now.' })
      await loadCsrSyncQueue()
    } else {
      feedback.warning('Retry skipped', { description: 'Connect to the internet before retrying this CSR sync.' })
    }
    setRetryingQueueItemId(null)
  }

  const hasActiveFilters = state.statuses.length > 0 || state.dateRange.from !== null || state.dateRange.to !== null

  return (
    <>
      <ModuleShell
        eyebrow="Service" title="Customer Service Reports" summary={`${csrs.length} reports total`} tone="blue"
        onPrimaryAction={() => navigate("/csr/new")}
        searchValue={state.search}
        onSearchChange={(value) => patchUpdate({ search: value } as any)}
        searchPlaceholder="Search reports..."
        records={loading ? [] : csrs}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={reset}
        onFilterClick={() => setShowFilterOverlay(prev => !prev)}
        headerActions={
          <ContextualExportDropdown
            domain="CSR"
            data={csrs as unknown as Record<string, unknown>[]}
            supportedFormats={['CSV_SUMMARY', 'JSON_RAW']}
            recordCount={csrs.length}
          />
        }
        filterOverlay={
          <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="csr" />
        }
        renderRow={(csr) => {
          const tone = getStatusTone(csr.status || 'draft')
          const statusClasses = getStatusClasses(tone)
          return (
            <ModuleRowCard
              key={csr.id}
              title={csr.csr_number || "-"}
              subtitle={csr.client_name || "No client name"}
              tertiary={formatCardDate(csr.date)}
              statusLabel={formatCsrStatusLabel(csr.status)}
              statusClassName={statusClasses}
              onClick={() => navigate("/csr/" + csr.id)}
              onActionClick={() => setActiveCsr(csr)}
            />
          )
        }}
        emptyState={
          <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-bd-border bg-bd-surface/50 p-5 text-center shadow-inner">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--bd-radius-lg)] bg-bd-surface-muted text-bd-text-muted">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="text-base font-semibold text-bd-text">
              {hasActiveFilters ? "No service reports found" : "No service reports yet"}
            </div>
            <div className="mt-1 text-sm text-bd-text-muted">
              {hasActiveFilters ? "Try a different search or filter." : "Create your first CSR to start tracking service activity."}
            </div>
          </div>
        }
      >
        {showCsrSyncRecovery && (syncQueueLoading || syncQueueItems.length > 0) ? (
          <div className="mb-4 rounded-[22px] border border-bd-border bg-bd-surface-muted/30 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-bd-text-muted">Offline sync recovery</div>
                <div className="mt-1 text-sm text-bd-text-muted">Retry pending or failed CSR uploads from this device.</div>
              </div>
              <Button type="button" variant="outline" size="icon-lg" onClick={loadCsrSyncQueue} disabled={syncQueueLoading || retryingQueueItemId != null} className="h-10 w-10 rounded-2xl border-bd-border bg-bd-surface text-bd-text hover:bg-bd-surface-muted" aria-label="Refresh CSR sync queue">
                {syncQueueLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
            {syncQueueItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {syncQueueItems.map((item) => {
                  const isRetrying = retryingQueueItemId === item.id
                  return (
                    <div key={item.id} className="rounded-2xl border border-bd-border bg-bd-surface p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-bold text-bd-text">{item.csrNumber || item.localCsrId || `Queue #${item.id}`}</div>
                            <span className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] ${item.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-accent/15 text-accent-foreground"}`}>{item.status}</span>
                          </div>
                          <div className="mt-1 truncate text-xs text-bd-text-muted">{item.clientName || "No client"} · Attempts {item.attempts}</div>
                          {item.error ? <div className="mt-2 text-xs leading-5 text-destructive">{item.error}</div> : null}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleRetryQueueItem(item.id)} disabled={retryingQueueItemId != null} className="h-9 rounded-xl border-bd-border bg-bd-surface px-3 text-xs font-bold text-bd-text hover:bg-bd-surface-muted">
                          {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Retry
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {loading && <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>}
      </ModuleShell>

      <MobileFab onClick={() => navigate("/csr/new")} ariaLabel="Create CSR" />
      <ConfirmActionDialog open={archiveId !== null} onOpenChange={(open) => !open && setArchiveId(null)} title="Archive this CSR?" description="This will move the CSR to the archive. You can restore it later from Settings." confirmLabel="Archive" loading={isArchiving} onConfirm={handleArchive} />
      <ConfirmActionDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete this CSR?" description="This action is permanent and cannot be undone." confirmLabel="Delete" variant="destructive" loading={isDeleting} onConfirm={handleDelete} />
      <InvoiceListActionSheet
        open={Boolean(activeCsr)} onOpenChange={(open) => { if (!open) setActiveCsr(null) }}
        eyebrow={activeCsr ? `CSR ${activeCsr.csr_number || ""}`.trim() : "CSR"}
        title={activeCsr?.csr_number || "CSR"}
        subtitle={activeCsr ? `${activeCsr.client_name || "No client"}${activeCsr.date ? ` · ${formatCardDate(activeCsr.date)}` : ""}` : undefined}
        actions={activeCsr ? [
          { key: "view", label: "View", icon: <Eye className="h-6 w-6" />, onClick: () => navigate(`/csr/${activeCsr.id}`) },
          { key: "edit", label: "Edit", icon: <Pencil className="h-6 w-6" />, onClick: () => navigate(`/csr/edit/${activeCsr.id}`) },
          { key: 'project', label: csrProjectState.label, icon: csrProjectState.hasProject ? <FolderOpen className="h-6 w-6" /> : <FolderPlus className="h-6 w-6" />, onClick: () => { if (activeCsr.project_id) { navigate(`/projects/${activeCsr.project_id}`); return } setShowProjectLinkDialog(true) }, closeOnClick: csrProjectState.hasProject },
          { key: 'documents', label: csrDocumentState.label, icon: activeCsrHasLinkedDocuments ? <Workflow className="h-6 w-6" /> : <GitBranchPlus className="h-6 w-6" />, onClick: () => setShowLinkedDocuments(true), closeOnClick: false },
          { key: 'archive', label: isArchiving ? 'Archiving...' : 'Archive', icon: isArchiving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Archive className="h-6 w-6" />, onClick: () => setArchiveId(activeCsr.id), closeOnClick: false },
        ] : []}
        deleteAction={activeCsr ? { key: "delete", label: isDeleting ? 'Deleting...' : 'Delete CSR', icon: isDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />, onClick: () => setDeleteId(activeCsr.id), closeOnClick: false } : undefined}
      />
      <LinkedDocumentsSheet open={showLinkedDocuments} onOpenChange={setShowLinkedDocuments} title="Linked Documents" subtitle={activeCsr?.csr_number || 'CSR'} sections={activeCsrLinkedSections} />
      <AttachExistingDocumentSheet open={showAttachInvoice} onOpenChange={setShowAttachInvoice} title="Attach to Invoice" description={activeCsr?.csr_number || 'CSR'} table="invoices" numberField="invoice_number" clientField="client_name" poField="po_number" currentClientName={activeCsr?.client_name || undefined} searchPlaceholder="Search invoice number, client, or PO" onAttach={handleAttachInvoice} />
      <ConfirmActionDialog open={Boolean(pendingAttachInvoice)} onOpenChange={(nextOpen) => { if (!nextOpen) setPendingAttachInvoice(null) }} title="Reassign linked CSR?" description="This CSR is already linked to a different invoice. Reassigning will detach it from the previous invoice." confirmLabel="Reassign" onConfirm={() => { const invoice = pendingAttachInvoice; setPendingAttachInvoice(null); void attachInvoice(invoice) }} />
      <ProjectLinkDialog open={showProjectLinkDialog} onOpenChange={setShowProjectLinkDialog} tableName="csrs" recordId={activeCsr?.id || null} documentLabel="CSR" onLinked={async () => { patchUpdate({ search: state.search } as any); setActiveCsr(null) }} />

    </>
  )
}

// ─── EXPORTED PAGE (wrapped with DocumentQueryProvider) ───
export default function CSR() {
  return (
    <Layout title="Customer Service Reports" session={null} hidePageHeader>
      <DocumentQueryProvider module="csr">
        <CsrContent />
      </DocumentQueryProvider>
    </Layout>
  )
}
