import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Eye, Pencil, Copy, DollarSign, Send, Archive, Trash2, FileOutput, Truck, Wrench } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "../supabase"
import { toast } from "@/hooks/use-toast"
import Layout from "../components/Layout"
import MobileFab from "../components/layout/MobileFab"
import MobileListPageShell from "../components/layout/MobileListPageShell"
import DenseListCard from "../components/list/DenseListCard"
import ListActionSheet from "../components/layout/ListActionSheet"
import ConfirmActionDialog from "../components/ConfirmActionDialog"

const PAGE_SIZE = 25

export default function Invoices() {
  const [invoices, setInvoices]           = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [search, setSearch]               = useState("")
  const [clientFilter, setClientFilter]   = useState("All")
  const [statusFilter, setStatusFilter]   = useState("All")
  const [dateFilter, setDateFilter]       = useState("All Time")
  const [sortBy, setSortBy]               = useState("Newest")
  const [showFilters, setShowFilters]     = useState(false)
  const [showArchiveWarn, setShowArchiveWarn] = useState(false)
  const [showDeleteWarn,  setShowDeleteWarn]  = useState(false)
  const [clientOptions, setClientOptions] = useState([])
  const [totalCount, setTotalCount]       = useState(0)
  const [page, setPage]                   = useState(0)
  const [hasMore, setHasMore]             = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)
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
    const { data, count } = await buildInvoiceQuery().range(from, to)
    const nextRows = data || []

    setInvoices((current) => (replace ? nextRows : [...current, ...nextRows]))
    setTotalCount(count || 0)
    setPage(pageIndex)
    setHasMore(count !== null ? to + 1 < count : nextRows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  const fetchClientOptions = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("client_name")
      .is("archived_at", null)

    const nextOptions = Array.from(
      new Set((data || []).map((row) => row.client_name).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b))

    setClientOptions(nextOptions)
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

  const closeSheet = () => {
    setActiveInvoice(null)
    setShowArchiveWarn(false)
    setShowDeleteWarn(false)
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Actions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const handleView  = () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) }
  const handleEdit  = () => { closeSheet(); navigate(`/invoices/edit/${activeInvoice.id}`) }
  const handleAdvance = () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) }

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

  const roleColor = (role) => {
    if (role === "advance")  return "bg-blue-100 text-blue-700"
    if (role === "final")    return "bg-emerald-100 text-emerald-700"
    if (role === "progress") return "bg-amber-100 text-amber-700"
    return ""
  }

  const formatInvoiceDate = (value) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getInvoiceStatusStyle = (status) => {
    const normalized = (status || "draft").toLowerCase()
    if (normalized === "sent") return { backgroundColor: "#E0F2FE", color: "#0369A1" }
    if (normalized === "paid") return { backgroundColor: "#DCFCE7", color: "#16A34A" }
    if (normalized === "overdue") return { backgroundColor: "#FEE2E2", color: "#DC2626" }
    if (normalized === "partial") return { backgroundColor: "#FEF3C7", color: "#92400E" }
    return { backgroundColor: "#F1F5F9", color: "#64748B" }
  }

  const formatStatusLabel = (status) => {
    const value = (status || "draft").toLowerCase()
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  const resetFilters = () => {
    setSearch("")
    setClientFilter("All")
    setStatusFilter("All")
    setDateFilter("All Time")
    setSortBy("Newest")
  }

  const filterSelectClass = "h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold text-zinc-700 outline-none"
  const denseRows = invoices.map((inv) => ({
    key: inv.id,
    title: inv.client_name || "No client",
    meta: `${inv.invoice_number}${formatInvoiceDate(inv.issue_date) ? ` • ${formatInvoiceDate(inv.issue_date)}` : ""}`,
    amount: `₦${Number(inv.total || 0).toLocaleString()}`,
    statusLabel: formatStatusLabel(inv.status),
    statusTone: inv.status === "paid" ? "paid" : inv.status === "sent" ? "sent" : inv.status === "overdue" ? "overdue" : inv.status === "partial" ? "partial" : "draft",
    roleBadge: inv.thread_role ? {
      label: inv.thread_role,
      className: `inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${roleColor(inv.thread_role)}`,
    } : null,
    onClick: () => navigate(`/invoices/${inv.id}`),
    onAction: () => setActiveInvoice(inv),
  }))

  return (
    <Layout title="Invoices" hidePageHeader>
      <MobileListPageShell
          eyebrow="Sales"
          title="Invoices"
          summary={`${totalCount} invoices total`}
          tone="blue"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search invoices..."
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
                    {["All", "Draft", "Sent", "Paid", "Overdue", "Partial"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
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
                    {["Newest", "Oldest", "Highest Value", "Lowest Value"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 rounded-xl border border-border px-4 text-xs font-black uppercase text-muted-foreground transition hover:bg-muted/50 sm:col-span-2"
              >
                Clear
              </button>
            </div>
          ) : null}
      >
        {invoices.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
            No invoices match the current filters
          </div>
        ) : (
          <DenseListCard rows={denseRows} />
        )}

        {hasMore ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => fetchInvoices(page + 1, false)}
              disabled={loadingMore}
              className="h-11 rounded-2xl border border-border bg-white px-5 text-sm font-bold text-zinc-700 disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </MobileListPageShell>

      <MobileFab onClick={() => navigate("/invoices/new")} ariaLabel="Create invoice">＋</MobileFab>
      <ListActionSheet
        open={Boolean(activeInvoice) && !showArchiveWarn && !showDeleteWarn}
        onOpenChange={(open) => {
          if (!open) setActiveInvoice(null)
        }}
        eyebrow={activeInvoice ? `Invoice ${activeInvoice.invoice_number}` : "Invoice"}
        title={activeInvoice?.client_name || "No client"}
        amount={activeInvoice ? `₦${Number(activeInvoice.total || 0).toLocaleString()}` : null}
        actions={activeInvoice ? [
          { key: "view", label: "View", icon: <Eye className="h-6 w-6" />, onClick: handleView },
          { key: "edit", label: "Edit", icon: <Pencil className="h-6 w-6" />, onClick: handleEdit },
          ...(activeInvoice.status !== "paid" ? [{ key: "payment", label: "Payment", icon: <DollarSign className="h-6 w-6" />, onClick: () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) } }] : []),
          { key: "clone", label: "Clone", icon: <Copy className="h-6 w-6" />, onClick: handleClone },
          ...(isStandalone ? [{ key: "advance", label: "Advance", icon: <DollarSign className="h-6 w-6" />, onClick: handleAdvance }] : []),
          { key: "quote", label: "To Quote", icon: <FileOutput className="h-6 w-6" />, onClick: () => { closeSheet(); toast({ title: "Coming soon", description: "Quotations module coming soon." }) } },
          { key: "csr", label: "Gen. CSR", icon: <Wrench className="h-6 w-6" />, onClick: () => { closeSheet(); toast({ title: "Coming soon", description: "Coming soon." }) } },
          { key: "waybill", label: "Waybill", icon: <Truck className="h-6 w-6" />, onClick: () => { closeSheet(); toast({ title: "Coming soon", description: "Coming soon." }) } },
          ...(activeInvoice.status === "draft" ? [{ key: "mark-sent", label: "Mark Sent", icon: <Send className="h-6 w-6" />, onClick: handleMarkSent }] : []),
          { key: "archive", label: "Archive", icon: <Archive className="h-6 w-6" />, onClick: () => setShowArchiveWarn(true), closeOnClick: false },
        ] : []}
        deleteAction={activeInvoice ? { label: "Delete Invoice", icon: <Trash2 className="h-6 w-6" />, onClick: () => setShowDeleteWarn(true), closeOnClick: false } : undefined}
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
    </Layout>
  )
}



