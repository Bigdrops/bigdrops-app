import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Archive, Copy, DollarSign, Eye, FileOutput, FolderOpen, FolderPlus, GitBranchPlus, Pencil, Receipt, Send, Trash2, Truck, Wrench, Workflow } from "lucide-react"
import { supabase } from "../supabase"
import { toast } from "@/hooks/use-toast"
import { canUseNativeSqlite } from "@/lib/native/capacitor"
import {
  cacheInvoiceList,
  getCachedInvoiceList,
} from "@/lib/native/invoiceCache"
import Layout from "../components/Layout"
import MobileFab from "../components/layout/MobileFab"
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
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatNaira } from "@/lib/formatters/money"
import { formatStatusLabel } from "@/lib/formatters/status"
import InvoiceListActionSheet from "@/components/invoice/InvoiceListActionSheet"
import InvoiceListPageSection from "@/components/invoice/InvoiceListPageSection"

const PAGE_SIZE = 25

function canUseInvoiceCacheFallback() {
  return (
    canUseNativeSqlite() &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  )
}

function shouldShowInvoiceInList(invoice) {
  return true
}

export default function Invoices() {
  const [invoices, setInvoices]           = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [search, setSearch]               = useState("")
  const [clientFilter, setClientFilter]   = useState("All")
  const [statusFilter, setStatusFilter]   = useState("All")
  const [dateFilter, setDateFilter]       = useState("All Time")
  const [sortBy, setSortBy]               = useState("Newest")
  const [showArchiveWarn, setShowArchiveWarn] = useState(false)
  const [showDeleteWarn,  setShowDeleteWarn]  = useState(false)
  const [attachKind, setAttachKind] = useState(null)
  const [showAttachSheet, setShowAttachSheet] = useState(false)
  const [clientOptions, setClientOptions] = useState([])
  const [totalCount, setTotalCount]       = useState(0)
  const [page, setPage]                   = useState(0)
  const [hasMore, setHasMore]             = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [activeInvoiceRelatedDocs, setActiveInvoiceRelatedDocs] = useState({ csrs: [], waybills: [] })
  const [activeInvoiceProject, setActiveInvoiceProject] = useState(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const navigate = useNavigate()

  const buildInvoiceQuery = () => {
    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .is("archived_at", null)

    const searchTerm = search.trim()
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/,/g, " ")
      query = query.or(`invoice_number.ilike.%${escapedTerm}%,client_name.ilike.%${escapedTerm}%`)
    }

    if (clientFilter !== "All") {
      query = query.eq("client_name", clientFilter)
    }

    if (statusFilter !== "All") {
      query = query.eq("status", statusFilter.toLowerCase())
    }

    if (dateFilter !== "All Time") {
      const now = new Date()
      if (dateFilter === "This Month") {
        const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        query = query.gte("issue_date", from)
      }
      if (dateFilter === "Last Month") {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
        const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
        query = query.gte("issue_date", from).lte("issue_date", to)
      }
      if (dateFilter === "This Year") {
        const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
        query = query.gte("issue_date", from)
      }
    }

    if (sortBy === "Oldest") {
      return query.order("created_at", { ascending: true, nullsFirst: false })
    }
    if (sortBy === "Highest Value") {
      return query
        .order("total", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
    }
    if (sortBy === "Lowest Value") {
      return query
        .order("total", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
    }
    return query.order("created_at", { ascending: false, nullsFirst: false })
  }

  const fetchInvoices = async (pageIndex = 0, replace = false) => {
    setLoadingMore(true)
    const from = pageIndex * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    try {
      const { data, count, error } = await buildInvoiceQuery().range(from, to)
      if (error) throw error

      const nextRows = (data || []).filter(shouldShowInvoiceInList)

      setInvoices((current) => (replace ? nextRows : [...current, ...nextRows]))
      setTotalCount(count || 0)
      setPage(pageIndex)
      setHasMore(count !== null ? to + 1 < count : nextRows.length === PAGE_SIZE)

      if (canUseNativeSqlite() && nextRows.length > 0) {
        void cacheInvoiceList(nextRows).catch((cacheError) => {
          console.warn("Invoice list cache write failed:", cacheError)
        })
      }
    } catch (error) {
      if (!canUseInvoiceCacheFallback()) {
        setInvoices((current) => (replace ? [] : current))
        setTotalCount((current) => (replace ? 0 : current))
        setHasMore(false)
        console.warn("Invoice list fetch failed:", error)
        return
      }

      try {
        const cachedRows = await getCachedInvoiceList()
        const searchTerm = search.trim().toLowerCase()

        const filteredRows = cachedRows
          .filter((row) => !row.archived_at)
          .filter(shouldShowInvoiceInList)
          .filter((row) => {
            if (!searchTerm) return true
            const invoiceNumber = String(row.invoice_number || "").toLowerCase()
            const clientName = String(row.client_name || "").toLowerCase()
            return invoiceNumber.includes(searchTerm) || clientName.includes(searchTerm)
          })
          .filter((row) => clientFilter === "All" || row.client_name === clientFilter)
          .filter((row) => statusFilter === "All" || String(row.status || "").toLowerCase() === statusFilter.toLowerCase())
          .filter((row) => {
            if (dateFilter === "All Time") return true
            if (!row.issue_date) return false

            const issueTime = new Date(row.issue_date).getTime()
            if (Number.isNaN(issueTime)) return false

            const now = new Date()
            if (dateFilter === "This Month") {
              const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
              return issueTime >= fromDate
            }
            if (dateFilter === "Last Month") {
              const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
              const toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
              return issueTime >= fromDate && issueTime <= toDate
            }
            if (dateFilter === "This Year") {
              const fromDate = new Date(now.getFullYear(), 0, 1).getTime()
              return issueTime >= fromDate
            }

            return true
          })
          .sort((left, right) => {
            if (sortBy === "Highest Value") {
              return Number(right.total || 0) - Number(left.total || 0)
            }
            if (sortBy === "Lowest Value") {
              return Number(left.total || 0) - Number(right.total || 0)
            }

            const leftTime = new Date(left.created_at || left.issue_date || 0).getTime() || 0
            const rightTime = new Date(right.created_at || right.issue_date || 0).getTime() || 0
            return sortBy === "Oldest" ? leftTime - rightTime : rightTime - leftTime
          })

        const nextRows = filteredRows.slice(from, to + 1)

        setInvoices((current) => (replace ? nextRows : [...current, ...nextRows]))
        setTotalCount(filteredRows.length)
        setPage(pageIndex)
        setHasMore(to + 1 < filteredRows.length)
      } catch (cacheError) {
        console.warn("Invoice list cache fallback failed:", cacheError)
        setInvoices((current) => (replace ? [] : current))
        setTotalCount((current) => (replace ? 0 : current))
        setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchClientOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("client_name")
        .is("archived_at", null)

      if (error) throw error

      const nextOptions = Array.from(
        new Set((data || []).filter(shouldShowInvoiceInList).map((row) => row.client_name).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b))

      setClientOptions(nextOptions)
    } catch (error) {
      if (!canUseInvoiceCacheFallback()) {
        console.warn("Invoice client options fetch failed:", error)
        setClientOptions([])
        return
      }

      try {
        const cachedRows = await getCachedInvoiceList()
        const nextOptions = Array.from(
          new Set((cachedRows || []).filter(shouldShowInvoiceInList).map((row) => row.client_name).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b))
        setClientOptions(nextOptions)
      } catch (cacheError) {
        console.warn("Invoice client options cache fallback failed:", cacheError)
        setClientOptions([])
      }
    }
  }

  useEffect(() => {
    fetchClientOptions()
  }, [])

  useEffect(() => {
    setInvoices([])
    setPage(0)
    setHasMore(false)
    fetchInvoices(0, true)
  }, [clientFilter, dateFilter, search, sortBy, statusFilter])

  useEffect(() => {
    let cancelled = false

    const loadActiveInvoiceRelationships = async () => {
      if (!activeInvoice?.id) {
        setActiveInvoiceRelatedDocs({ csrs: [], waybills: [] })
        setActiveInvoiceProject(null)
        return
      }

      const [relatedDocs, project] = await Promise.all([
        fetchInvoiceChildDocuments(activeInvoice.id),
        activeInvoice.project_id ? fetchProjectSummary(activeInvoice.project_id) : Promise.resolve(null),
      ])

      if (cancelled) return
      setActiveInvoiceRelatedDocs(relatedDocs)
      setActiveInvoiceProject(project)
    }

    void loadActiveInvoiceRelationships()

    return () => {
      cancelled = true
    }
  }, [activeInvoice?.id, activeInvoice?.project_id])

  const closeSheet = () => {
    setActiveInvoice(null)
    setShowArchiveWarn(false)
    setShowDeleteWarn(false)
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Actions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const handleView  = () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) }
  const handleEdit  = () => { closeSheet(); navigate(`/invoices/edit/${activeInvoice.id}`) }
  const handleAdvance = () => {
    const invoiceId = activeInvoice?.id
    closeSheet()
    if (!invoiceId) return
    navigate(`/invoices/${invoiceId}`, {
      state: { openAdvanceSheet: true },
    })
  }

  const handleClone = async () => {
    const inv = activeInvoice
    closeSheet()
    try {
      const { data: all } = await supabase
        .from("invoices").select("invoice_number").like("invoice_number", "SASINV-B%").order("created_at", { ascending: false })
      let nextNum = 1
      if (all && all.length > 0) {
        const nums = all.map(i => parseInt(i.invoice_number.replace("SASINV-B", ""))).filter(n => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }
      const newNumber = "SASINV-B" + String(nextNum).padStart(3, "0")
      const { data: srcItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("sort_order")
      navigate("/invoices/new", {
        state: {
          prefill: {
            ...inv,
            invoice_number: newNumber,
            client_id: null,
            client_name: "",
            project_id: null,
            status: "draft",
            issue_date: new Date().toISOString().split("T")[0],
            due_date: null,
            thread_id: null, thread_role: null, thread_position: 1,
            total_contract_value: 0, is_advance: false, amount_received: 0,
            advance_mode: null, advance_value: null, job_title: "",
            thread_created_from_invoice_id: null,
          },
          prefillItems: (srcItems || []).map(it => ({ ...it, id: null })),
        }
      })
    } catch (err) {
      toast({ title: "Clone failed", description: err.message, variant: "destructive" })
    }
  }

  const handleMarkSent = async () => {
    const inv = activeInvoice
    closeSheet()
    await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id)
    await fetchInvoices(0, true)
  }

  const handleArchive = async () => {
    const inv = activeInvoice
    setShowArchiveWarn(false)
    await supabase.from("invoices").update({ archived_at: new Date().toISOString() }).eq("id", inv.id)
    closeSheet()
    await fetchInvoices(0, true)
  }

  const handleDelete = async () => {
    const inv = activeInvoice
    setShowDeleteWarn(false)
    await supabase.from("invoice_items").delete().eq("invoice_id", inv.id)
    await supabase.from("invoices").delete().eq("id", inv.id)
    closeSheet()
    await fetchInvoices(0, true)
  }

  const isStandalone = activeInvoice && !activeInvoice.thread_id
  const activeInvoiceSource = activeInvoice ? getInvoiceSourceDocument(activeInvoice) : null
  const invoiceProjectState = getProjectActionState({ projectId: activeInvoice?.project_id, project: activeInvoiceProject })
  const invoiceDocumentState = getDocumentActionState({
    sourceDocument: activeInvoiceSource,
    relatedDocuments: [...(activeInvoiceRelatedDocs.csrs || []), ...(activeInvoiceRelatedDocs.waybills || [])],
  })
  const activeInvoiceHasLinkedDocuments = invoiceDocumentState.hasLinkedDocuments
  const activeInvoiceLinkedSections = activeInvoice ? [
    createLinkedDocumentsSection({
      key: "source",
      title: "Source",
      description: "Documents this invoice came from.",
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
      ] : [],
    }),
    createLinkedDocumentsSection({
      key: "generated",
      title: "Generated / Child Documents",
      description: "Documents created from this invoice.",
      items: [
        createLinkedDocumentItem({
          key: "attach-csr",
          label: "Attach Existing CSR",
          subtitle: "Search and link a CSR to this invoice",
          onClick: () => {
            setShowLinkedDocuments(false)
            setAttachKind("csr")
            setShowAttachSheet(true)
          },
        }),
        createLinkedDocumentItem({
          key: "attach-waybill",
          label: "Attach Existing Waybill",
          subtitle: "Search and link a waybill to this invoice",
          onClick: () => {
            setShowLinkedDocuments(false)
            setAttachKind("waybill")
            setShowAttachSheet(true)
          },
        }),
        ...(activeInvoiceRelatedDocs.csrs || []).map((csr) => createLinkedDocumentItem({
          key: `csr-${csr.id}`,
          label: `CSR ${csr.csr_number || csr.id}`,
          subtitle: "Open linked CSR",
          onClick: () => navigate(`/csr/${csr.id}`),
        })),
        ...(activeInvoiceRelatedDocs.waybills || []).map((waybill) => createLinkedDocumentItem({
          key: `waybill-${waybill.id}`,
          label: `Waybill ${waybill.waybill_number || waybill.id}`,
          subtitle: "Open linked waybill",
          onClick: () => navigate(`/waybills/${waybill.id}`),
        })),
      ],
    }),
    createLinkedProjectSection({
      project: activeInvoiceProject,
      description: "Project connected to this invoice.",
      onOpenProject: () => navigate(`/projects/${activeInvoiceProject.id}`),
    }),
  ] : []

  const handleAttachExisting = async (item) => {
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

  const formatInvoiceDate = (value) => formatDisplayDate(value, {
    fallback: "",
    invalidFallback: "",
    locale: "en-GB",
    dateOptions: {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  })

  const getInvoiceStatusClassName = (status) => {
    const normalized = (status || "draft").toLowerCase()
    if (normalized === "sent") return "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300"
    if (normalized === "paid") return "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
    if (normalized === "overdue") return "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
    if (normalized === "partial") return "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
    return "border border-border bg-muted text-muted-foreground"
  }

  const formatInvoiceStatusLabel = (status) => formatStatusLabel(status, { fallback: "draft", lowercase: true })

  const resetFilters = () => {
    setSearch("")
    setClientFilter("All")
    setStatusFilter("All")
    setDateFilter("All Time")
    setSortBy("Newest")
  }

  const filterOptions = useMemo(() => ([
    {
      label: "Client",
      value: clientFilter,
      options: ["All", ...clientOptions],
      onChange: setClientFilter,
    },
    {
      label: "Status",
      value: statusFilter,
      options: ["All", "Draft", "Sent", "Paid", "Overdue", "Partial"],
      onChange: setStatusFilter,
    },
    {
      label: "Date",
      value: dateFilter,
      options: ["All Time", "This Month", "Last Month", "This Year"],
      onChange: setDateFilter,
    },
    {
      label: "Sort",
      value: sortBy,
      options: ["Newest", "Oldest", "Highest Value", "Lowest Value"],
      onChange: setSortBy,
    },
  ]), [clientFilter, clientOptions, dateFilter, sortBy, statusFilter])

  const hasActiveFilters = (
    clientFilter !== "All" ||
    statusFilter !== "All" ||
    dateFilter !== "All Time" ||
    sortBy !== "Newest"
  )

  const renderInvoiceRowNumber = (invoice) => invoice.invoice_number || "Draft invoice"

  const renderInvoiceRowDate = (invoice) => formatInvoiceDate(invoice.issue_date) || "No date"

  return (
    <Layout title="Invoices" hidePageHeader>
      <InvoiceListPageSection
        eyebrow="Sales"
        title="Invoices"
        summary={`${totalCount} invoices total`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by invoice number or client..."
        filters={filterOptions}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        records={invoices}
        onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
        onRowActionClick={setActiveInvoice}
        renderAmount={formatNaira}
        renderStatusLabel={formatInvoiceStatusLabel}
        renderDocumentNumber={renderInvoiceRowNumber}
        renderDocumentDate={renderInvoiceRowDate}
        renderStatusClassName={getInvoiceStatusClassName}
        loadMoreLabel="Load more invoices"
        emptyState={(
          <div className="rounded-[20px] border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground shadow-sm">
            No invoices match the current filters
          </div>
        )}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={() => fetchInvoices(page + 1, false)}
      />

      <MobileFab onClick={() => navigate("/invoices/new")} ariaLabel="Create invoice">
        <Receipt className="h-6 w-6" />
      </MobileFab>
      <InvoiceListActionSheet
        open={Boolean(activeInvoice) && !showArchiveWarn && !showDeleteWarn}
        onOpenChange={(open) => {
          if (!open) setActiveInvoice(null)
        }}
        eyebrow="Invoice"
        title={activeInvoice ? `${activeInvoice.client_name || "No client"} · ${activeInvoice.invoice_number || "Draft"}` : "Invoice"}
        subtitle={activeInvoice ? `${formatNaira(activeInvoice.total)} · Fast access actions from list context` : null}
        actions={activeInvoice ? (() => {
          const actionDefs = getInvoiceListActionDefs({
            projectActionLabel: invoiceProjectState.label,
            hasProject: invoiceProjectState.hasProject,
            documentActionLabel: invoiceDocumentState.label,
            hasLinkedDocuments: invoiceDocumentState.hasLinkedDocuments,
            isPaid: activeInvoice.status === "paid",
            isStandalone,
            showMarkSent: activeInvoice.status === "draft",
          })

          const iconMap = {
            eye: <Eye className="h-6 w-6" />,
            pencil: <Pencil className="h-6 w-6" />,
            folderOpen: <FolderOpen className="h-6 w-6" />,
            folderPlus: <FolderPlus className="h-6 w-6" />,
            workflow: <Workflow className="h-6 w-6" />,
            gitBranchPlus: <GitBranchPlus className="h-6 w-6" />,
            dollarSign: <DollarSign className="h-6 w-6" />,
            copy: <Copy className="h-6 w-6" />,
            fileOutput: <FileOutput className="h-6 w-6" />,
            wrench: <Wrench className="h-6 w-6" />,
            truck: <Truck className="h-6 w-6" />,
            send: <Send className="h-6 w-6" />,
            archive: <Archive className="h-6 w-6" />,
            trash: <Trash2 className="h-6 w-6" />,
          }

          const handlers = {
            view: handleView,
            edit: handleEdit,
            project: () => {
              activeInvoice.project_id ? navigate(`/projects/${activeInvoice.project_id}`) : setShowProjectLinkDialog(true)
            },
            documents: () => setShowLinkedDocuments(true),
            payment: () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) },
            clone: handleClone,
            advance: handleAdvance,
            quote: () => { closeSheet(); toast({ title: "Unavailable", description: "Quotations are not available in this version." }) },
            csr: () => { closeSheet(); toast({ title: "Unavailable", description: "Service reports are not available in this version." }) },
            waybill: () => { closeSheet(); toast({ title: "Unavailable", description: "Waybills are not available in this version." }) },
            "mark-sent": handleMarkSent,
            archive: () => setShowArchiveWarn(true),
          }

          return actionDefs.map((action) => ({
            key: action.key,
            label: action.label,
            icon: iconMap[action.iconKey],
            onClick: handlers[action.key],
            closeOnClick: action.closeOnClick,
          }))
        })() : []}
        deleteAction={activeInvoice ? (() => {
          const deleteDef = getInvoiceListDeleteActionDef()
          return {
            key: deleteDef.key,
            label: deleteDef.label,
            icon: <Trash2 className="h-6 w-6" />,
            onClick: () => setShowDeleteWarn(true),
            closeOnClick: deleteDef.closeOnClick,
          }
        })() : undefined}
      />
      <ConfirmActionDialog
        open={showArchiveWarn}
        onOpenChange={setShowArchiveWarn}
        title="Archive invoice?"
        description="This invoice will be hidden from the active list until it is restored from archives."
        confirmLabel="Archive"
        onConfirm={() => { void handleArchive() }}
      />
      <ConfirmActionDialog
        open={showDeleteWarn}
        onOpenChange={setShowDeleteWarn}
        title="Delete invoice?"
        description="Deleting is permanent and cannot be undone."
        confirmLabel="Delete Forever"
        onConfirm={() => { void handleDelete() }}
      />
      <LinkedDocumentsSheet
        open={showLinkedDocuments}
        onOpenChange={setShowLinkedDocuments}
        title="Linked Documents"
        subtitle={activeInvoice?.invoice_number || "Invoice"}
        sections={activeInvoiceLinkedSections}
      />
      <AttachExistingDocumentSheet
        open={showAttachSheet}
        onOpenChange={setShowAttachSheet}
        title={attachKind === "csr" ? "Attach Existing CSR" : "Attach Existing Waybill"}
        description={activeInvoice?.invoice_number || "Invoice"}
        table={attachKind === "csr" ? "csrs" : "waybills"}
        numberField={attachKind === "csr" ? "csr_number" : "waybill_number"}
        clientField="client_name"
        poField="po_number"
        linkedInvoiceField={attachKind === "csr" ? "linked_invoice_id" : "invoice_id"}
        currentInvoiceId={activeInvoice?.id}
        currentClientName={activeInvoice?.client_name}
        searchPlaceholder={attachKind === "csr" ? "Search CSR number, client, or PO" : "Search waybill number, client, or PO"}
        onAttach={handleAttachExisting}
      />
      <ProjectLinkDialog
        open={showProjectLinkDialog}
        onOpenChange={setShowProjectLinkDialog}
        tableName="invoices"
        recordId={activeInvoice?.id || null}
        documentLabel="Invoice"
        onLinked={async () => {
          await Promise.all([fetchInvoices(0, true), fetchClientOptions()])
          setActiveInvoice(null)
        }}
      />
    </Layout>
  )
}

 

