import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Eye, FolderOpen, FolderPlus, GitBranchPlus, Loader2, Pencil, Plus, RefreshCw, Trash2, Workflow } from "lucide-react"

import ConfirmActionDialog from "@/components/ConfirmActionDialog"
import { supabase } from "../supabase"
import { toast } from "@/hooks/use-toast"
import Layout from "../components/Layout"
import ListActionSheet from "../components/layout/ListActionSheet"
import MobileFab from "../components/layout/MobileFab"
import LinkedDocumentsSheet from "@/components/document/LinkedDocumentsSheet"
import AttachExistingDocumentSheet from "@/components/document/AttachExistingDocumentSheet"
import ProjectLinkDialog from "@/components/document/ProjectLinkDialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import MobileListPageShell from "../components/layout/MobileListPageShell"
import { getDocumentActionState, getProjectActionState } from "@/domain/document/documentActionState"
import { fetchInvoiceSummary, fetchProjectSummary } from "@/domain/documentRelationships"
import { canUseNativeSqlite } from "@/lib/native/capacitor"
import {
  listPendingOrFailedCsrCreateQueueItems,
  processCsrCreateQueueItem,
} from "@/lib/native/csrSync"
import {
  createLinkedDocumentItem,
  createLinkedDocumentsSection,
  createLinkedProjectSection,
} from "@/components/document/linkedDocumentSections"
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatStatusLabel } from "@/lib/formatters/status"

function normalizeStatus(status) {
  return (status || "").trim().toLowerCase()
}

export default function CSR() {
  const navigate = useNavigate()

  const [csrs, setCsrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("All Time")
  const [sortBy, setSortBy] = useState("Newest")
  const [showFilters, setShowFilters] = useState(false)
  const [csrToDelete, setCsrToDelete] = useState(null)
  const [activeCsr, setActiveCsr] = useState(null)
  const [showAttachInvoice, setShowAttachInvoice] = useState(false)
  const [pendingAttachInvoice, setPendingAttachInvoice] = useState(null)
  const [activeCsrInvoice, setActiveCsrInvoice] = useState(null)
  const [activeCsrProject, setActiveCsrProject] = useState(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [syncQueueItems, setSyncQueueItems] = useState([])
  const [syncQueueLoading, setSyncQueueLoading] = useState(() => canUseNativeSqlite())
  const [retryingQueueItemId, setRetryingQueueItemId] = useState(null)
  const showCsrSyncRecovery = useMemo(() => canUseNativeSqlite(), [])

  const fetchCsrs = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("csrs")
      .select("*")
      .order("created_at", { ascending: false })

    setCsrs(data || [])
    setLoading(false)
  }

  const loadCsrSyncQueue = async () => {
    if (!showCsrSyncRecovery) return

    setSyncQueueLoading(true)
    const items = await listPendingOrFailedCsrCreateQueueItems()
    setSyncQueueItems(items)
    setSyncQueueLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCsrs()
      void loadCsrSyncQueue()
    }, 0)

    return () => clearTimeout(timer)
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

    return () => {
      cancelled = true
    }
  }, [activeCsr?.id, activeCsr?.linked_invoice_id, activeCsr?.project_id])

  const getCsrStatusKey = (status) => {
    const normalized = normalizeStatus(status)
    if (!normalized) return "draft"
    if (normalized.includes("cancel")) return "cancelled"
    if (normalized.includes("complete")) return "completed"
    if (normalized.includes("pending")) return "pending"
    if (normalized.includes("draft")) return "draft"
    return normalized
  }

  const formatCsrStatusLabel = (status) => formatStatusLabel(getCsrStatusKey(status), { fallback: "draft" })

  const formatCardDate = (value) => formatDisplayDate(value, {
    fallback: "-",
    locale: "en-GB",
    dateOptions: {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  })

  const clientOptions = useMemo(() => {
    return Array.from(new Set(csrs.map((csr) => csr.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [csrs])

  const csrProjectState = getProjectActionState({ projectId: activeCsr?.project_id, project: activeCsrProject })
  const csrDocumentState = getDocumentActionState({
    sourceDocument: activeCsrInvoice,
    relatedDocuments: [],
  })
  const activeCsrHasLinkedDocuments = csrDocumentState.hasLinkedDocuments
  const activeCsrLinkedSections = activeCsr ? [
    createLinkedDocumentsSection({
      key: 'source',
      title: 'Source',
      description: 'Documents this CSR is linked to.',
      items: [
        createLinkedDocumentItem({
          key: 'attach-invoice',
          label: 'Attach to Invoice',
          subtitle: 'Search and link an invoice',
          onClick: () => {
            setShowLinkedDocuments(false)
            setShowAttachInvoice(true)
          },
        }),
        activeCsrInvoice
          ? createLinkedDocumentItem({
              key: `invoice-${activeCsrInvoice.id}`,
              label: `Invoice ${activeCsrInvoice.invoice_number || activeCsrInvoice.id}`,
              subtitle: 'Open linked invoice',
              onClick: () => navigate(`/invoices/${activeCsrInvoice.id}`),
            })
          : null,
      ],
    }),
    createLinkedProjectSection({
      project: activeCsrProject,
      description: 'Project connected to this CSR.',
      onOpenProject: () => navigate(`/projects/${activeCsrProject.id}`),
    }),
  ] : []

  const attachInvoice = async (invoice) => {
    if (!activeCsr?.id || !invoice?.id) return
    await supabase.from("csrs").update({ linked_invoice_id: invoice.id }).eq("id", activeCsr.id)
    const { data } = await supabase.from("csrs").select("*").eq("id", activeCsr.id).single()
    if (data) {
      setActiveCsr(data)
      setActiveCsrInvoice(data.linked_invoice_id ? await fetchInvoiceSummary(data.linked_invoice_id) : null)
    }
    setShowAttachInvoice(false)
  }

  const handleAttachInvoice = (invoice) => {
    if (!activeCsr?.id || !invoice?.id) return
    if (activeCsr.linked_invoice_id && activeCsr.linked_invoice_id !== invoice.id) {
      setPendingAttachInvoice(invoice)
      return
    }
    void attachInvoice(invoice)
  }

  const filteredCsrs = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const searchTerm = search.trim().toLowerCase()

    const matchesDateRange = (value, fallback) => {
      if (dateFilter === "All Time") return true
      const date = new Date(value || fallback || 0)
      if (Number.isNaN(date.getTime())) return false
      if (dateFilter === "This Month") return date >= currentMonthStart
      if (dateFilter === "Last Month") return date >= lastMonthStart && date <= lastMonthEnd
      if (dateFilter === "This Year") return date >= currentYearStart
      return true
    }

    const sorted = csrs.filter((csr) => {
      const matchesSearch = !searchTerm
        || csr.csr_number?.toLowerCase().includes(searchTerm)
        || csr.client_name?.toLowerCase().includes(searchTerm)
        || csr.equipment_type?.toLowerCase().includes(searchTerm)
        || csr.make?.toLowerCase().includes(searchTerm)
      const matchesClient = clientFilter === "All" || (csr.client_name || "") === clientFilter
      const matchesStatus = statusFilter === "All" || getCsrStatusKey(csr.status) === statusFilter.toLowerCase()
      const matchesDate = matchesDateRange(csr.date, csr.created_at)
      return matchesSearch && matchesClient && matchesStatus && matchesDate
    })

    sorted.sort((a, b) => {
      const aDate = new Date(a.date || a.created_at || 0)
      const bDate = new Date(b.date || b.created_at || 0)
      if (sortBy === "Oldest") return aDate - bDate
      return bDate - aDate
    })

    return sorted
  }, [clientFilter, csrs, dateFilter, search, sortBy, statusFilter])

  const resetFilters = () => {
    setSearch("")
    setClientFilter("All")
    setStatusFilter("All")
    setDateFilter("All Time")
    setSortBy("Newest")
  }

  const handleDelete = async (csr) => {
    const { error } = await supabase.from("csrs").delete().eq("id", csr.id)
    if (error) {
      toast({ title: "Delete failed", description: "Unable to delete CSR right now. Please try again.", variant: "destructive" })
      return
    }
    setCsrToDelete(null)
    await fetchCsrs()
  }

  const handleRetryQueueItem = async (queueItemId) => {
    setRetryingQueueItemId(queueItemId)

    const result = await processCsrCreateQueueItem(queueItemId)

    if (result.status === "synced") {
      toast({
        title: "CSR synced",
        description: "The offline CSR was uploaded successfully.",
      })
      await Promise.all([fetchCsrs(), loadCsrSyncQueue()])
    } else if (result.status === "failed") {
      toast({
        title: "Retry failed",
        description: result.error || "Unable to sync this CSR right now.",
        variant: "destructive",
      })
      await loadCsrSyncQueue()
    } else {
      toast({
        title: "Retry skipped",
        description: "Connect to the internet before retrying this CSR sync.",
      })
    }

    setRetryingQueueItemId(null)
  }

  const filterSelectClass = "h-10 rounded-[14px] border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none"
  const hasActiveFilters =
    !!search || clientFilter !== "All" || statusFilter !== "All" || dateFilter !== "All Time"

  return (
    <Layout title="Customer Service Reports" hidePageHeader>
      <MobileListPageShell
          eyebrow="Service"
          title="Customer Service Reports"
          summary={`${csrs.length} reports total`}
          tone="amber"
          onPrimaryAction={() => navigate("/csr/new")}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reports..."
          onFilterClick={() => setShowFilters((prev) => !prev)}
          filterPanel={showFilters ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Client</div>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className={filterSelectClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {clientOptions.map((client) => <SelectItem key={client} value={client}>{client}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Status</div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={filterSelectClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["All", "Draft", "Completed", "Pending", "Cancelled"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Date</div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className={filterSelectClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["All Time", "This Month", "Last Month", "This Year"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Sort</div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className={filterSelectClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Newest", "Oldest"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 rounded-[14px] border border-border px-4 text-xs font-bold uppercase text-muted-foreground transition hover:bg-muted/50 sm:col-span-2"
              >
                Clear
              </button>
            </div>
          ) : null}
      >
        {showCsrSyncRecovery && (syncQueueLoading || syncQueueItems.length > 0) ? (
          <div className="mb-4 rounded-[22px] border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  Offline sync recovery
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  Retry pending or failed CSR uploads from this device.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                onClick={loadCsrSyncQueue}
                disabled={syncQueueLoading || retryingQueueItemId != null}
                className="h-10 w-10 rounded-2xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                aria-label="Refresh CSR sync queue"
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
                              {item.csrNumber || item.localCsrId || `Queue #${item.id}`}
                            </div>
                            <span
                              className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] ${
                                item.status === "failed"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {item.clientName || "No client"} · Attempts {item.attempts}
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


        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-16 text-center text-sm text-muted-foreground">
            Loading service reports...
          </div>
        ) : filteredCsrs.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-900 text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="text-base font-semibold text-foreground">
              {hasActiveFilters ? "No service reports found" : "No service reports yet"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters ? "Try a different search or filter." : "Create your first CSR to start tracking service activity."}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCsrs.map((csr) => {
              const statusKey = getCsrStatusKey(csr.status)
              const statusClasses = statusKey === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : statusKey === "cancelled"
                  ? "bg-rose-100 text-rose-700"
                  : statusKey === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
              const secondaryLabel = csr.make || csr.equipment_type

              return (
              <div
                key={csr.id}
                onClick={() => navigate("/csr/" + csr.id)}
                className="cursor-pointer rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-100 bg-amber-50 text-lg font-extrabold text-amber-700">S</div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">CSR</div>
                    <div className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-950">{csr.csr_number || "-"}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {[csr.client_name || "No client name", formatCardDate(csr.date)].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveCsr(csr)
                    }}
                    className="grid h-10 w-10 place-items-center rounded-[14px] border border-slate-200 bg-white text-[20px] leading-none text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                    aria-label={`Open actions for ${csr.csr_number || "CSR"}`}
                  >
                    ⋯
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${statusClasses}`}>
                    {formatCsrStatusLabel(csr.status)}
                  </span>
                  {secondaryLabel ? (
                    <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 text-xs font-semibold text-slate-500">
                      {secondaryLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            )})}
          </div>
        )}

        <MobileFab onClick={() => navigate("/csr/new")} ariaLabel="Create CSR">
          <Plus size={32} />
        </MobileFab>
      </MobileListPageShell>
      <ConfirmActionDialog
        open={Boolean(csrToDelete)}
        onOpenChange={(open) => {
          if (!open) setCsrToDelete(null)
        }}
        title="Delete this CSR?"
        description="Delete this CSR permanently? This cannot be undone."
        confirmLabel="Delete CSR"
        onConfirm={() => {
          if (csrToDelete) void handleDelete(csrToDelete)
        }}
      />
      <ListActionSheet
        open={Boolean(activeCsr)}
        onOpenChange={(open) => {
          if (!open) setActiveCsr(null)
        }}
        eyebrow={activeCsr ? `CSR ${activeCsr.csr_number || ""}`.trim() : "CSR"}
        title={activeCsr?.client_name || "No client"}
        actions={activeCsr ? [
          {
            key: "view",
            label: "View",
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/csr/${activeCsr.id}`),
          },
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/csr/edit/${activeCsr.id}`),
          },
          {
            key: 'project',
            label: csrProjectState.label,
            icon: csrProjectState.hasProject ? <FolderOpen className="h-6 w-6" /> : <FolderPlus className="h-6 w-6" />,
            onClick: () => {
              if (activeCsr.project_id) {
                navigate(`/projects/${activeCsr.project_id}`)
                return
              }
              setShowProjectLinkDialog(true)
            },
            closeOnClick: csrProjectState.hasProject,
          },
          {
            key: 'documents',
            label: csrDocumentState.label,
            icon: activeCsrHasLinkedDocuments ? <Workflow className="h-6 w-6" /> : <GitBranchPlus className="h-6 w-6" />,
            onClick: () => setShowLinkedDocuments(true),
            closeOnClick: false,
          },
        ] : []}
        deleteAction={activeCsr ? {
          label: "Delete CSR",
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setCsrToDelete(activeCsr),
        } : undefined}
      />
      <LinkedDocumentsSheet
        open={showLinkedDocuments}
        onOpenChange={setShowLinkedDocuments}
        title="Linked Documents"
        subtitle={activeCsr?.csr_number || 'CSR'}
        sections={activeCsrLinkedSections}
      />
      <AttachExistingDocumentSheet
        open={showAttachInvoice}
        onOpenChange={setShowAttachInvoice}
        title="Attach to Invoice"
        description={activeCsr?.csr_number || 'CSR'}
        table="invoices"
        numberField="invoice_number"
        clientField="client_name"
        poField="po_number"
        currentClientName={activeCsr?.client_name}
        searchPlaceholder="Search invoice number, client, or PO"
        onAttach={handleAttachInvoice}
      />
      <ConfirmActionDialog
        open={Boolean(pendingAttachInvoice)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingAttachInvoice(null)
        }}
        title="Reassign linked CSR?"
        description="This CSR is already linked to a different invoice. Reassigning will detach it from the previous invoice."
        confirmLabel="Reassign"
        onConfirm={() => {
          const invoice = pendingAttachInvoice
          setPendingAttachInvoice(null)
          void attachInvoice(invoice)
        }}
      />
      <ProjectLinkDialog
        open={showProjectLinkDialog}
        onOpenChange={setShowProjectLinkDialog}
        tableName="csrs"
        recordId={activeCsr?.id || null}
        documentLabel="CSR"
        onLinked={async () => {
          await fetchCsrs()
          setActiveCsr(null)
        }}
      />
    </Layout>
  )
}
