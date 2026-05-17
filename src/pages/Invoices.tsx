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
import { getStatusClasses } from "@/lib/statusTheme"
import { useInvoiceList, INVOICE_CACHE_KEY, type InvoiceRow } from "@/hooks/useInvoiceList"
import { calculateInvoiceFinancialState } from "@/domain/invoice/financialState"

export default function Invoices() {
  const {
    invoices,
    totalCount,
    hasMore,
    loadingMore,
    page,
    clientOptions,
    search, setSearch,
    clientFilter, setClientFilter,
    statusFilter, setStatusFilter,
    dateFilter, setDateFilter,
    sortBy, setSortBy,
    fetchInvoices,
    fetchClientOptions,
    resetFilters,
  } = useInvoiceList()

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
  const navigate = useNavigate()

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
      await fetchInvoices(0, true)
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
      await fetchInvoices(0, true)
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
    const { displayStatus, statusTone } = calculateInvoiceFinancialState({
      invoiceTotal: Number(invoice.total || 0),
      status: invoice.status,
      payments: invoice.payments,
    })
    const statusClasses = getStatusClasses(statusTone)
    return (
      <ModuleRowCard
        key={invoice.id}
        title={invoice.client_name || "No client"}
        subtitle={invoice.invoice_number || "Invoice"}
        tertiary={formatInvoiceDate(invoice.issue_date) || "No date"}
        amount={formatNaira(invoice.total)}
        statusLabel={displayStatus}
        statusClassName={statusClasses}
        onClick={() => navigate(`/invoices/${invoice.id}`)}
        onActionClick={() => setActiveInvoice(invoice)}
      />
    )
  }

  const filterOptions = useMemo(() => ([
    { label: "Client", value: clientFilter, options: ["All", ...clientOptions], onChange: setClientFilter },
    { label: "Status", value: statusFilter, options: ["All", "Unpaid", "Partially Paid", "Paid"], onChange: setStatusFilter },
    { label: "Date", value: dateFilter, options: ["All Time", "This Month", "Last Month", "This Year"], onChange: setDateFilter },
    { label: "Sort", value: sortBy, options: ["Newest", "Oldest", "Highest Value", "Lowest Value"], onChange: setSortBy },
  ]), [clientFilter, clientOptions, dateFilter, sortBy, statusFilter])

  const hasActiveFilters = (
    clientFilter !== "All" || statusFilter !== "All" || dateFilter !== "All Time" || sortBy !== "Newest"
  )

  return (
    <Layout title="Invoices" hidePageHeader>
      <ModuleShell
        eyebrow="Sales" title="Invoices" summary={`${totalCount} invoices total`} tone="blue"
        searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by invoice number or client..."
        filters={filterOptions} hasActiveFilters={hasActiveFilters} onResetFilters={resetFilters}
        records={invoices} renderRow={renderInvoiceRow} loadMoreLabel="Load more invoices"
        emptyState={(
          <div className="rounded-[24px] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]"><Receipt className="h-6 w-6" /></div>
            <div className="mt-4 text-sm font-bold text-[hsl(var(--bd-text))]">No Invoices Found</div>
            <div className="mt-1 text-xs text-[hsl(var(--bd-text-muted))] max-w-[280px] mx-auto">Create your first invoice to start tracking sales, or adjust your filters to find existing records.</div>
          </div>
        )}
        onPrimaryAction={() => navigate("/invoices/new")} primaryActionLabel="New Invoice"
        hasMore={hasMore} loadingMore={loadingMore} onLoadMore={() => fetchInvoices(page + 1, false)}
      />
      <MobileFab onClick={() => navigate("/invoices/new")} ariaLabel="Create invoice" />
      <InvoiceListActionSheet
        open={Boolean(activeInvoice) && !showArchiveWarn && !showDeleteWarn}
        onOpenChange={(open) => { if (!open) setActiveInvoice(null) }}
        eyebrow="Invoice"
        title={activeInvoice ? `${activeInvoice.client_name || "No client"} · ${activeInvoice.invoice_number || "Invoice"}` : "Invoice"}
        subtitle={activeInvoice ? (() => {
          const { displayStatus } = (() => {
            const { calculateInvoiceFinancialState } = require("@/domain/invoice/financialState") as any
            return calculateInvoiceFinancialState({ invoiceTotal: Number(activeInvoice.total || 0), status: activeInvoice.status, payments: activeInvoice.payments }) || {}
          })()
          return `${formatNaira(activeInvoice.total)} · ${displayStatus} · Fast access actions from list context`
        })() : undefined}
        actions={activeInvoice ? (() => {
          const { paymentState } = (() => {
            const { calculateInvoiceFinancialState } = require("@/domain/invoice/financialState") as any
            return calculateInvoiceFinancialState({ invoiceTotal: Number(activeInvoice.total || 0), status: activeInvoice.status, payments: activeInvoice.payments }) || {}
          })()
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
      <ProjectLinkDialog open={showProjectLinkDialog} onOpenChange={setShowProjectLinkDialog} tableName="invoices" recordId={activeInvoice?.id || null} documentLabel="Invoice" onLinked={async () => { await Promise.all([fetchInvoices(0, true), fetchClientOptions()]); setActiveInvoice(null) }} />
    </Layout>
  )
}
