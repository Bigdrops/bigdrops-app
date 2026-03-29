import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, MoreHorizontal, Eye, Pencil, Copy, DollarSign, X,
         Send, Archive, Trash2, FileOutput, Truck, Wrench, Search, SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "../supabase"
import { toast } from "@/hooks/use-toast"
import Layout from "../components/Layout"
import PageIntro from "../components/layout/PageIntro"
import { PageShell } from "../components/layout/PageShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const PAGE_SIZE = 25

export default function Invoices() {
  const [invoices, setInvoices]           = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [search, setSearch]               = useState("")
  const [clientFilter, setClientFilter]   = useState("All")
  const [statusFilter, setStatusFilter]   = useState("All")
  const [dateFilter, setDateFilter]       = useState("All Time")
  const [sortBy, setSortBy]               = useState("Newest")
  const [showSearch, setShowSearch]       = useState(false)
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

  return (
    <Layout title="Invoices" hidePageHeader>
      <PageShell width="wide" className="pb-32">
        <PageIntro
          eyebrow="Sales"
          title="Invoices"
          description="Keep outstanding invoices readable on mobile with stronger amount hierarchy, cleaner filters, and the same existing invoice actions."
          meta={`${totalCount} invoice${totalCount !== 1 ? "s" : ""} total`}
          tone="blue"
          actions={
            <>
              <Button type="button" variant="outline" size="icon-lg" className="rounded-2xl bg-white/90" onClick={() => setShowSearch((prev) => !prev)} aria-label="Toggle search">
                <Search size={16} />
              </Button>
              <Button type="button" variant="outline" size="icon-lg" className="rounded-2xl bg-white/90" onClick={() => setShowFilters((prev) => !prev)} aria-label="Toggle filters">
                <SlidersHorizontal size={16} />
              </Button>
              <Button type="button" className="hidden h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold sm:inline-flex" onClick={() => navigate("/invoices/new")}>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </>
          }
          toolbar={
            <div className="space-y-3">
              {showSearch && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoices or clients..."
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground outline-none"
                />
              )}

              {showFilters && (
                <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-muted-foreground">Client</span>
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        {clientOptions.map((client) => (
                          <SelectItem key={client} value={client}>{client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-muted-foreground">Status</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["All", "Draft", "Sent", "Paid", "Overdue", "Partial"].map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-muted-foreground">Date</span>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["All Time", "This Month", "Last Month", "This Year"].map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-muted-foreground">Sort</span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Newest", "Oldest", "Highest Value", "Lowest Value"].map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="h-10 rounded-xl border border-border px-4 text-xs font-black uppercase text-muted-foreground transition hover:bg-muted/50"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          }
        />

        {/* Invoice list */}
        <Card className="mt-5 overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
          <CardContent className="p-0">
          {invoices.map((inv, idx) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="relative px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
              style={{
                borderBottom: idx === invoices.length - 1 ? "none" : "1px solid #f1f5f9",
                cursor: "pointer",
              }}
            >

              <div className="pr-12">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Invoice</div>
                    <div className="mt-1 truncate text-base font-extrabold tracking-[-0.03em] text-foreground">
                      {inv.invoice_number || "Invoice"}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium text-muted-foreground">
                      {inv.client_name || "No client"}
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Amount</div>
                    <div className="mt-1 text-base font-extrabold text-foreground sm:text-lg">
                      NGN {Number(inv.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatInvoiceDate(inv.issue_date) || "No issue date"}
                  </div>
                  <span
                    style={{
                      ...getInvoiceStatusStyle(inv.status),
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "inline-block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatStatusLabel(inv.status)}
                  </span>
                  {inv.thread_role && (
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${roleColor(inv.thread_role)}`}>
                      {inv.thread_role}
                    </span>
                  )}
                </div>

                <div className="mt-3 min-w-0 whitespace-nowrap text-xs font-bold text-muted-foreground">
                  {formatInvoiceDate(inv.issue_date) ? `${inv.invoice_number} • ${formatInvoiceDate(inv.issue_date)}` : inv.invoice_number}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setActiveInvoice(inv) }}
                className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-white text-muted-foreground shadow-sm"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          ))}

          {invoices.length === 0 && (
            <div className="px-6 py-20 text-center text-sm font-medium text-muted-foreground">
              No invoices match the current filters
            </div>
          )}
          </CardContent>
        </Card>

        {hasMore ? (
          <div className="mt-4 flex justify-center">
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
      </PageShell>

      {/* FAB */}
      <button
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-28 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/20 bg-slate-950 text-white shadow-[0_22px_40px_-18px_rgba(15,23,42,0.65)] transition-transform hover:scale-110 sm:hidden"
      >
        <Plus size={32} />
      </button>

      {/* Overlay */}
      {activeInvoice && (
        <div
          className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-sm"
          onClick={closeSheet}
        />
      )}

      {/* Action sheet */}
      {activeInvoice && !showArchiveWarn && !showDeleteWarn && (
        <div className="fixed inset-x-0 bottom-0 z-[110] bg-background rounded-t-[40px] shadow-2xl">
          <div className="px-8 pt-6 pb-4">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Invoice</p>
                <h2 className="text-xl font-black text-zinc-950">{activeInvoice.invoice_number}</h2>
                <p className="text-xs text-zinc-400 font-bold">{activeInvoice.client_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-black text-zinc-950">₦{Number(activeInvoice.total || 0).toLocaleString()}</p>
                <button onClick={closeSheet} className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
          <div className="px-8 pb-10 grid grid-cols-3 gap-3">
            <MenuBtn icon={<Eye size={20}/>}          label="View"       onClick={handleView} />
            <MenuBtn icon={<Pencil size={20}/>}       label="Edit"       onClick={handleEdit} />
            {activeInvoice.status !== "paid" && (
              <MenuBtn icon={<DollarSign size={20}/>} label="Payment"    onClick={() => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) }} />
            )}
            <MenuBtn icon={<Copy size={20}/>}         label="Clone"      onClick={handleClone} />
            {isStandalone && (
              <MenuBtn icon={<DollarSign size={20}/>} label="Advance"    onClick={handleAdvance} />
            )}
            <MenuBtn icon={<FileOutput size={20}/>}   label="To Quote"   onClick={() => { closeSheet(); toast({ title: "Coming soon", description: "Quotations module coming soon." }) }} />
            <MenuBtn icon={<Wrench size={20}/>}       label="Gen. CSR"   onClick={() => { closeSheet(); toast({ title: "Coming soon", description: "Coming soon." }) }} />
            <MenuBtn icon={<Truck size={20}/>}        label="Waybill"    onClick={() => { closeSheet(); toast({ title: "Coming soon", description: "Coming soon." }) }} />
            {activeInvoice.status === "draft" && (
              <MenuBtn icon={<Send size={20}/>}       label="Mark Sent"  onClick={handleMarkSent} />
            )}
            <MenuBtn icon={<Archive size={20}/>}      label="Archive"    onClick={() => setShowArchiveWarn(true)} amber />
            <MenuBtn icon={<Trash2 size={20}/>}       label="Delete"     onClick={() => setShowDeleteWarn(true)}  danger />
          </div>
        </div>
      )}

      {/* Archive warning sheet */}
      {showArchiveWarn && activeInvoice && (
        <div className="fixed inset-x-0 bottom-0 z-[130] bg-background rounded-t-[40px] p-8 shadow-2xl">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Archive size={24} className="text-amber-600" />
          </div>
          <h3 className="text-xl font-black text-zinc-950 text-center mb-2">Archive Invoice?</h3>
          <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed mb-8">
            This invoice will be hidden from your active list until you restore it from Settings &gt; Archives.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowArchiveWarn(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-border text-sm font-black text-muted-foreground hover:bg-muted/50">
              Cancel
            </button>
            <button onClick={handleArchive}
              className="flex-1 py-4 rounded-2xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600">
              Archive
            </button>
          </div>
        </div>
      )}

      {/* Delete warning sheet */}
      {showDeleteWarn && activeInvoice && (
        <div className="fixed inset-x-0 bottom-0 z-[130] bg-background rounded-t-[40px] p-8 shadow-2xl">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-600" />
          </div>
          <h3 className="text-xl font-black text-zinc-950 text-center mb-2">Delete Invoice?</h3>
          <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed mb-8">
            Deleting is permanent and cannot be undone. You may choose to archive it instead â€” archived invoices remain recoverable for 30 days.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteWarn(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-border text-sm font-black text-muted-foreground hover:bg-muted/50">
              Cancel
            </button>
            <button onClick={handleDelete}
              className="flex-1 py-4 rounded-2xl bg-red-600 text-white text-sm font-black hover:bg-red-700">
              Delete Forever
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

function MenuBtn({ icon, label, onClick, danger, amber }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center justify-center p-5 rounded-[28px] transition-all group ${
        danger ? "bg-red-50 hover:bg-red-600 text-red-600 hover:text-white" :
        amber  ? "bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white" :
        "bg-zinc-50 hover:bg-zinc-950 text-zinc-600 hover:text-white"
      }`}>
      <div className="mb-1.5 transition-transform group-hover:scale-110">{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  )
}



