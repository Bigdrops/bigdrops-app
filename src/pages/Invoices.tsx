import { useMemo, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Archive, Copy, DollarSign, Eye, FileOutput, FolderOpen, FolderPlus, GitBranchPlus, Pencil, Trash2, Truck, Wrench, Workflow } from "lucide-react"
import { supabase } from "../supabase"
import { feedback } from "@/lib/feedback"
import { getUserFacingMutationMessage } from "@/lib/userFacingMutationErrors"
import { invalidateListCache } from '@/lib/cache/listCache'
import Layout from "../components/Layout"
import MobileFab from "../components/layout/MobileFab"
import ModuleShell from "@/components/layout/ModuleShell"
import ModuleRowCard from "@/components/layout/ModuleRowCard"
import ConfirmActionDialog from "../components/ConfirmActionDialog"
import LinkedDocumentsSheet from "@/components/document/LinkedDocumentsSheet"
import AttachExistingDocumentSheet from "@/components/document/AttachExistingDocumentSheet"
import ProjectLinkDialog from "@/components/document/ProjectLinkDialog"
import {
  createLinkedDocumentItem,
  createLinkedDocumentsSection,
  createLinkedProjectSection,
} from "@/components/document/linkedDocumentSections"
import { getDocumentActionState, getProjectActionState } from "@/domain/document/documentActionState"
import { getInvoiceListActionDefs, getInvoiceListDeleteActionDef } from "@/domain/invoice/actions"
import { fetchInvoiceChildDocuments, fetchProjectSummary, getInvoiceSourceDocument } from "@/domain/documentRelationships"
import { loadInvoiceById, loadInvoiceItems, loadInvoiceCustomFields } from "@/modules/invoices/services/invoiceService"
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatNaira } from "@/lib/formatters/money"
import InvoiceListActionSheet from "@/components/invoice/InvoiceListActionSheet"
import { Receipt } from "lucide-react"
import { INVOICE_CACHE_KEY, type InvoiceRow } from "@/hooks/useInvoiceList"
import { calculateInvoiceFinancialState } from "@/domain/invoice/financialState"
import { resolveInvoiceStatus } from "@/domain/invoice/resolveInvoiceStatus"
import { DocumentQueryProvider, useDocumentQuery } from "@/context/DocumentQueryContext"
import QueryFilterOverlay from "@/components/query/QueryFilterOverlay"
import { useMultiSelect } from "@/hooks/useMultiSelect"
import SelectableRowCard from "@/components/batch/SelectableRowCard"
import BatchActionFooter, { createInvoiceBatchActions } from "@/components/batch/BatchActionFooter"

function InvoicesContent() {
  // ─── QUERY PLATFORM BINDING (single source of truth) ───
  const { state, patchUpdate, reset, results, loading } = useDocumentQuery("invoices")

  // ─── NON-FILTER STATE (page-specific, not query-related) ───
  const [activeInvoice, setActiveInvoice] = useState<InvoiceRow | null>(null)
  const [showArchiveWarn, setShowArchiveWarn] = useState(false)
  const [showDeleteWarn,  setShowDeleteWarn]  = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [attachKind, setAttachKind]       = useState<"csr" | "waybill" | null>(null)
  const [showAttachSheet, setShowAttachSheet] = useState(false)
  const [activeInvoiceRelatedDocs, setActiveInvoiceRelatedDocs] = useState<{ csrs: any[], waybills: any[] }>({ csrs: [], waybills: [] })
  const [activeInvoiceProject, setActiveInvoiceProject] = useState<any>(null)
  const [activeInvoiceCustomFields, setActiveInvoiceCustomFields] = useState<any>(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)
  const navigate = useNavigate()

  // ─── MULTI-SELECT BATCH STATE ───
  const multiSelect = useMultiSelect()

  // ─── Typed results ───
  const invoices = results as InvoiceRow[]

  // ─── Batch actions for invoices ───
  const batchActions = useMemo(() => createInvoiceBatchActions(() => {
    patchUpdate({ search: state.search } as any)
  }), [patchUpdate, state.search])

  const closeSheet = () => {
    setActiveInvoice(null)
    setShowArchiveWarn(false)
    setShowDeleteWarn(false)
    setActiveInvoiceCustomFields(null)
  }

  const handleView  = () => { if (activeInvoice?.id) { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) } }
  const handleEdit  = () => { if (activeInvoice?.id) { closeSheet(); navigate(`/invoices/edit/${activeInvoice.id}`) } }
  const handleAdvance = () => {
    const invoiceId = activeInvoice?.id
    closeSheet()
    if (!invoiceId) return
    navigate(`/invoices/${invoiceId}`, { state: { openAdvanceSheet: true } })
  }

  const handleRevertToQuote = () => {
    const invoiceId = activeInvoice?.id
    closeSheet()
    if (!invoiceId) return
    navigate(`/invoices/${invoiceId}`, { state: { openRevertModal: true } })
  }

  const handleClone = async () => {
    const inv = activeInvoice
    closeSheet()
    if (!inv) return;
    try {
      const invoiceDetail = await loadInvoiceById(inv.id)
      if (!invoiceDetail) throw new Error("Invoice not found")
      const { data: all } = await supabase
        .from("invoices").select("invoice_number").like("invoice_number", "SASINV-B%").order("created_at", { ascending: false })
      let nextNum = 1
      if (all && all.length > 0) {
        const nums = all.map(i => parseInt(i.invoice_number.replace("SASINV-B", ""))).filter(n => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }
      const newNumber = "SASINV-B" + String(nextNum).padStart(3, "0")
      const srcItems = await loadInvoiceItems(inv.id)
      invalidateListCache(INVOICE_CACHE_KEY)
      navigate("/invoices/new", {
        state: {
          prefill: {
            ...invoiceDetail,
            invoice_number: newNumber,
            client_id: null,
            client_name: "",
            project_id: null,
            status: "unpaid",
            issue_date: new Date().toISOString().split("T")[0],
            due_date: null,
            custom_fields: {},
          },
          prefillItems: (srcItems || []).map(it => ({ ...it, id: null })),
        }
      })
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'create' }))
    }
  }

  const handleArchive = async () => {
    const inv = activeInvoice
    if (!inv) return;
    try {
      setIsArchiving(true)
      const { error } = await supabase.from("invoices").update({ archived_at: new Date().toISOString() }).eq("id", inv.id)
      if (error) throw error
      invalidateListCache(INVOICE_CACHE_KEY)
      feedback.success('Invoice archived')
      closeSheet()
      // Trigger re-fetch by resetting search (forces adapter re-run)
      patchUpdate({ search: state.search })
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsArchiving(false)
      setShowArchiveWarn(false)
    }
  }

  const handleDelete = async () => {
    const inv = activeInvoice
    if (!inv) return;
    try {
      setIsDeleting(true)
      await supabase.from("invoice_items").delete().eq("invoice_id", inv.id)
      const { error } = await supabase.from("invoices").delete().eq("id", inv.id)
      if (error) throw error
      invalidateListCache(INVOICE_CACHE_KEY)
      feedback.success('Invoice deleted permanentely')
      closeSheet()
      patchUpdate({ search: state.search })
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsDeleting(false)
      setShowDeleteWarn(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadActiveInvoiceRelationships = async () => {
      if (!activeInvoice?.id) {
        setActiveInvoiceRelatedDocs({ csrs: [], waybills: [] })
        setActiveInvoiceProject(null)
        setActiveInvoiceCustomFields(null)
        return
      }
      const [relatedDocs, project, customFields] = await Promise.all([
        fetchInvoiceChildDocuments(activeInvoice.id),
        activeInvoice.project_id ? fetchProjectSummary(activeInvoice.project_id) : Promise.resolve(null),
        loadInvoiceCustomFields(activeInvoice.id),
      ])
      if (cancelled) return
      setActiveInvoiceRelatedDocs(relatedDocs)
      setActiveInvoiceProject(project)
      setActiveInvoiceCustomFields(customFields)
    }
    void loadActiveInvoiceRelationships()
    return () => { cancelled = true }
  }, [activeInvoice?.id, activeInvoice?.project_id])

  const activeInvoiceSource = activeInvoice ? getInvoiceSourceDocument({ custom_fields: activeInvoiceCustomFields }) : null
  const isStandalone = Boolean(activeInvoice) && !activeInvoiceSource
  const invoiceProjectState = getProjectActionState({ projectId: activeInvoice?.project_id, project: activeInvoiceProject })
  const invoiceDocumentState = getDocumentActionState({
    sourceDocument: activeInvoiceSource,
    relatedDocuments: [...(activeInvoiceRelatedDocs.csrs || []), ...(activeInvoiceRelatedDocs.waybills || [])],
  })

  const activeInvoiceLinkedSections = activeInvoice ? [
    createLinkedDocumentsSection({
      key: "source", title: "Source", description: "Documents this invoice came from.",
      items: activeInvoiceSource ? [
        createLinkedDocumentItem({
          key: `source-${activeInvoiceSource.id || activeInvoiceSource.number || "invoice-source"}`,
          label: `${activeInvoiceSource.type === "quotation" ? "Quotation" : "Document"} ${activeInvoiceSource.number || activeInvoiceSource.id || "Linked source"}`,
          subtitle: activeInvoiceSource.po_number ? `PO ${activeInvoiceSource.po_number}` : "Open the source document",
          onClick: () => {
            if (activeInvoiceSource.id) navigate(`/${activeInvoiceSource.type === "quotation" ? "quotations" : "invoices"}/${activeInvoiceSource.id}`)
          },
          disabled: !activeInvoiceSource.id,
        }),
      ].filter(Boolean) : [],
    }),
    createLinkedDocumentsSection({
      key: "generated", title: "Generated / Child Documents", description: "Documents created from this invoice.",
      items: [
        createLinkedDocumentItem({ key: "attach-csr", label: "Attach Existing CSR", subtitle: "Search and link a CSR to this invoice", onClick: () => { setShowLinkedDocuments(false); setAttachKind("csr"); setShowAttachSheet(true) } }),
        createLinkedDocumentItem({ key: "attach-waybill", label: "Attach Existing Waybill", subtitle: "Search and link a waybill to this invoice", onClick: () => { setShowLinkedDocuments(false); setAttachKind("waybill"); setShowAttachSheet(true) } }),
        ...(activeInvoiceRelatedDocs.csrs || []).map((csr: any) => createLinkedDocumentItem({ key: `csr-${csr.id}`, label: `CSR ${csr.csr_number || csr.id}`, subtitle: "Open linked CSR", onClick: () => navigate(`/csr/${csr.id}`) })),
        ...(activeInvoiceRelatedDocs.waybills || []).map((waybill: any) => createLinkedDocumentItem({ key: `waybill-${waybill.id}`, label: `Waybill ${waybill.waybill_number || waybill.id}`, subtitle: "Open linked waybill", onClick: () => navigate(`/waybills/${waybill.id}`) })),
      ].filter(Boolean),
    }),
    createLinkedProjectSection({ project: activeInvoiceProject, description: "Project connected to this invoice.", onOpenProject: () => navigate(`/projects/${activeInvoiceProject.id}`) }),
  ] : []

  const handleAttachExisting = async (item: any) => {
    if (!item?.id || !activeInvoice || !attachKind) return
    if (attachKind === "csr") {
      await supabase.from("csrs").update({ linked_invoice_id: activeInvoice.id }).eq("id", item.id)
    }
    if (attachKind === "waybill") {
      await supabase.from("waybills").update({ invoice_id: activeInvoice.id }).eq("id", item.id)
    }
    const relatedDocs = await fetchInvoiceChildDocuments(activeInvoice.id)
    setActiveInvoiceRelatedDocs(relatedDocs)
    setShowAttachSheet(false)
    setAttachKind(null)
  }

  const formatInvoiceDate = (value: string | null | undefined) => formatDisplayDate(value, {
    fallback: "", invalidFallback: "", locale: "en-GB",
    dateOptions: { day: "2-digit", month: "short", year: "numeric" },
  })

  const renderInvoiceRow = (invoice: InvoiceRow) => {
    const resolved = resolveInvoiceStatus(invoice as any)

    return (
      <SelectableRowCard
        key={invoice.id}
        id={invoice.id!}
        isSelectionMode={multiSelect.isSelectionModeActive}
        isSelected={multiSelect.isSelected(invoice.id!)}
        onSelect={multiSelect.toggle}
        onNavigate={() => navigate(`/invoices/${invoice.id}`)}
      >
        <ModuleRowCard
          title={invoice.client_name || "No client"}
          subtitle={invoice.invoice_number || "Invoice"}
          tertiary={formatInvoiceDate(invoice.issue_date) || "No date"}
          amount={formatNaira(invoice.total)}
          statusLabel={resolved.display_labels}
          statusClassName={resolved.display_classes}
          onClick={undefined}
          onActionClick={multiSelect.isSelectionModeActive ? undefined : () => setActiveInvoice(invoice)}
        />
      </SelectableRowCard>
    )
  }

  // ─── PLATFORM-BOUND FILTER OPTIONS (derived from state) ───
  const hasActiveFilters = (
    state.statuses.length > 0 ||
    state.dateRange.from !== null ||
    state.dateRange.to !== null ||
    state.amountRange.min !== null ||
    state.amountRange.max !== null
  )

  return (
    <>
      <ModuleShell
        eyebrow="Sales" title="Invoices" summary={`${invoices.length} invoices`} tone="blue"
        searchValue={state.search}
        onSearchChange={(value) => patchUpdate({ search: value } as any)}
        searchPlaceholder="Search by invoice number or client..."
        hasActiveFilters={hasActiveFilters}
        onResetFilters={reset}
        onFilterClick={() => setShowFilterOverlay(true)}
        records={invoices} renderRow={renderInvoiceRow} loadMoreLabel="Load more invoices"
        filterOverlay={
          <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="invoices" />
        }
        beforeListContent={
          /* Selection mode toolbar */
          multiSelect.isSelectionModeActive ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-2 mb-3">
              <span className="text-[11px] font-bold text-[hsl(var(--bd-text))]">
                {multiSelect.selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => multiSelect.selectAll(invoices.filter((i) => i.id).map((i) => i.id!))}
                  className="h-9 px-3 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))] transition-colors duration-200 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => multiSelect.selectAll([])}
                  className="h-9 px-3 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))] transition-colors duration-200 cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={multiSelect.clear}
                  className="h-9 px-3 rounded-md bg-destructive/10 text-[10px] font-bold text-destructive hover:bg-destructive/20 transition-colors duration-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Select mode trigger button */
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => multiSelect.selectAll([])}
                className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))] transition-colors duration-200 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
                Select
              </button>
            </div>
          )
        }
        emptyState={(
          <div className="rounded-[24px] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]"><Receipt className="h-6 w-6" /></div>
            <div className="mt-4 text-sm font-bold text-[hsl(var(--bd-text))]">No Invoices Found</div>
            <div className="mt-1 text-xs text-[hsl(var(--bd-text-muted))] max-w-[280px] mx-auto">Create your first invoice to start tracking sales, or adjust your filters to find existing records.</div>
          </div>
        )}
        onPrimaryAction={() => navigate("/invoices/new")} primaryActionLabel="New Invoice"
      />

      <MobileFab onClick={() => navigate("/invoices/new")} ariaLabel="Create invoice" />

      {/* Batch action footer — slides up when items are selected */}
      <BatchActionFooter
        selectedIds={multiSelect.selectedIds}
        onClear={multiSelect.clear}
        onSuccess={() => {
          multiSelect.clear()
          invalidateListCache(INVOICE_CACHE_KEY)
          patchUpdate({ search: state.search } as any)
        }}
        actions={batchActions}
      />

      <InvoiceListActionSheet
        open={Boolean(activeInvoice) && !showArchiveWarn && !showDeleteWarn}
        onOpenChange={(open) => { if (!open) setActiveInvoice(null) }}
        eyebrow="Invoice"
        title={activeInvoice ? `${activeInvoice.client_name || "No client"} · ${activeInvoice.invoice_number || "Invoice"}` : "Invoice"}
        subtitle={activeInvoice ? (() => {
          const { displayStatus } = calculateInvoiceFinancialState({ invoiceTotal: Number(activeInvoice.total || 0), status: activeInvoice.status, payments: activeInvoice.payments })
          return `${formatNaira(activeInvoice.total)} · ${displayStatus} · Fast access actions from list context`
        })() : undefined}
        actions={activeInvoice ? (() => {
          const { paymentState } = calculateInvoiceFinancialState({ invoiceTotal: Number(activeInvoice.total || 0), status: activeInvoice.status, payments: activeInvoice.payments })
          const actionDefs = getInvoiceListActionDefs({
            projectActionLabel: invoiceProjectState.label, hasProject: invoiceProjectState.hasProject,
            documentActionLabel: invoiceDocumentState.label, hasLinkedDocuments: invoiceDocumentState.hasLinkedDocuments,
            isPaid: paymentState === "paid", isStandalone,
          })
          const iconMap: Record<string, React.ReactNode> = {
            eye: <Eye className="h-6 w-6" />, pencil: <Pencil className="h-6 w-6" />, folderOpen: <FolderOpen className="h-6 w-6" />,
            folderPlus: <FolderPlus className="h-6 w-6" />, workflow: <Workflow className="h-6 w-6" />, gitBranchPlus: <GitBranchPlus className="h-6 w-6" />,
            dollarSign: <DollarSign className="h-6 w-6" />, copy: <Copy className="h-6 w-6" />, fileOutput: <FileOutput className="h-6 w-6" />,
            wrench: <Wrench className="h-6 w-6" />, truck: <Truck className="h-6 w-6" />, archive: <Archive className="h-6 w-6" />, trash: <Trash2 className="h-6 w-6" />,
          }
          const handlers: Record<string, () => void> = {
            view: handleView, edit: handleEdit,
            project: () => { activeInvoice.project_id ? navigate(`/projects/${activeInvoice.project_id}`) : setShowProjectLinkDialog(true) },
            documents: () => setShowLinkedDocuments(true),
            payment: () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) },
            clone: handleClone, advance: handleAdvance, quote: handleRevertToQuote,
            csr: () => { closeSheet(); feedback.info("Service reports are not available in this version.") },
            waybill: () => { closeSheet(); feedback.info("Waybills are not available in this version.") },
            archive: () => setShowArchiveWarn(true),
          }
          return actionDefs.map((action) => ({ key: action.key, label: action.label, icon: iconMap[action.iconKey], onClick: handlers[action.key], closeOnClick: action.closeOnClick }))
        })() : []}
        deleteAction={activeInvoice ? (() => {
          const deleteDef = getInvoiceListDeleteActionDef()
          return { key: deleteDef.key, label: deleteDef.label, icon: <Trash2 className="h-6 w-6" />, onClick: () => setShowDeleteWarn(true), closeOnClick: deleteDef.closeOnClick }
        })() : undefined}
      />
      <ConfirmActionDialog open={showArchiveWarn} onOpenChange={setShowArchiveWarn} title="Archive invoice?" description="This invoice will be hidden from the active list until it is restored from archives." confirmLabel="Archive" onConfirm={() => { void handleArchive() }} loading={isArchiving} />
      <ConfirmActionDialog open={showDeleteWarn} onOpenChange={setShowDeleteWarn} title="Delete invoice?" description="Deleting is permanent and cannot be undone." confirmLabel="Delete Forever" onConfirm={() => { void handleDelete() }} loading={isDeleting} />
      <LinkedDocumentsSheet open={showLinkedDocuments} onOpenChange={setShowLinkedDocuments} title="Linked Documents" subtitle={activeInvoice?.invoice_number || "Invoice"} sections={activeInvoiceLinkedSections} />
      <AttachExistingDocumentSheet open={showAttachSheet} onOpenChange={setShowAttachSheet} title={attachKind === "csr" ? "Attach Existing CSR" : "Attach Existing Waybill"} description={activeInvoice?.invoice_number || "Invoice"} table={attachKind === "csr" ? "csrs" : "waybills"} numberField={attachKind === "csr" ? "csr_number" : "waybill_number"} clientField="client_name" poField="po_number" linkedInvoiceField={attachKind === "csr" ? "linked_invoice_id" : "invoice_id"} currentInvoiceId={activeInvoice?.id} currentClientName={activeInvoice?.client_name || undefined} searchPlaceholder={attachKind === "csr" ? "Search CSR number, client, or PO" : "Search waybill number, client, or PO"} onAttach={handleAttachExisting} />
      <ProjectLinkDialog open={showProjectLinkDialog} onOpenChange={setShowProjectLinkDialog} tableName="invoices" recordId={activeInvoice?.id || null} documentLabel="Invoice" onLinked={async () => { patchUpdate({ search: state.search } as any); setActiveInvoice(null) }} />
    </>
  )
}

// ─── EXPORTED PAGE (wrapped with DocumentQueryProvider) ───
export default function Invoices() {
  return (
    <Layout title="Invoices" hidePageHeader>
      <DocumentQueryProvider module="invoices">
        <InvoicesContent />
      </DocumentQueryProvider>
    </Layout>
  )
}
