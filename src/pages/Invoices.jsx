import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, MoreHorizontal, Eye, Pencil, Copy, DollarSign, X,
         Send, Archive, Trash2, FileOutput, Truck, Wrench, Search, SlidersHorizontal } from "lucide-react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"

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
      alert("Clone failed: " + err.message)
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
  const iconButtonClass = "h-10 w-10 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground"

  return (
    <Layout title="Invoices" hidePageHeader>
      <div className="w-full py-6 pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="m-0 text-xl font-semibold text-foreground">Invoices</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalCount} invoice{totalCount !== 1 ? "s" : ""} total
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={() => setShowSearch((prev) => !prev)} className={iconButtonClass} aria-label="Toggle search">
              <Search size={16} />
            </button>
            <button onClick={() => setShowFilters((prev) => !prev)} className={iconButtonClass} aria-label="Toggle filters">
              <SlidersHorizontal size={16} />
            </button>
            <button
              onClick={() => navigate("/invoices/new")}
              className="h-10 rounded-xl bg-slate-900 px-4 text-[13px] font-bold text-white"
            >
              + New Invoice
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices or clients..."
              className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground outline-none"
            />
          </div>
        )}

        {showFilters && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-muted-foreground">Client</span>
              <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={filterSelectClass}>
                <option>All</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-muted-foreground">Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                {["All", "Draft", "Sent", "Paid", "Overdue", "Partial"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-muted-foreground">Date</span>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={filterSelectClass}>
                {["All Time", "This Month", "Last Month", "This Year"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-muted-foreground">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                {["Newest", "Oldest", "Highest Value", "Lowest Value"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <button
              onClick={resetFilters}
              className="h-10 rounded-xl border border-border px-4 text-xs font-black uppercase text-muted-foreground transition hover:bg-muted/50"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Invoice list */}
        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
          }}
        >
          {invoices.map((inv, idx) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="relative px-4 py-3 transition-colors hover:bg-muted/50"
              style={{
                borderBottom: idx === invoices.length - 1 ? "none" : "1px solid #f1f5f9",
                cursor: "pointer",
              }}
            >

              <div className="pr-12">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate whitespace-nowrap text-sm font-bold text-foreground">
                    {inv.client_name || "No client"}
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-foreground">
                    NGN {Number(inv.total || 0).toLocaleString()}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="min-w-0 whitespace-nowrap text-xs font-bold text-muted-foreground">
                    {inv.invoice_number}{formatInvoiceDate(inv.issue_date) ? ` • ${formatInvoiceDate(inv.issue_date)}` : ""}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      style={{
                        ...getInvoiceStatusStyle(inv.status),
                        borderRadius: 999,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontWeight: 900,
                        display: "inline-block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatStatusLabel(inv.status)}
                    </span>
                  </div>
                </div>

                {inv.thread_role && (
                  <div className="mt-1 text-right">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${roleColor(inv.thread_role)}`}>
                      {inv.thread_role}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setActiveInvoice(inv) }}
                className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground"
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
        </div>

        {hasMore ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => fetchInvoices(page + 1, false)}
              disabled={loadingMore}
              className="h-11 rounded-2xl border border-border bg-background px-5 text-sm font-bold text-zinc-700 disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-28 right-8 z-50 h-16 w-16 bg-zinc-950 text-white rounded-[24px] shadow-2xl flex items-center justify-center border border-white/20 hover:scale-110 transition-transform"
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
                <p className="text-xl font-black text-zinc-950">â‚¦{Number(activeInvoice.total || 0).toLocaleString()}</p>
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
            <MenuBtn icon={<FileOutput size={20}/>}   label="To Quote"   onClick={() => { closeSheet(); alert("Quotations module coming soon") }} />
            <MenuBtn icon={<Wrench size={20}/>}       label="Gen. CSR"   onClick={() => { closeSheet(); alert("Coming soon") }} />
            <MenuBtn icon={<Truck size={20}/>}        label="Waybill"    onClick={() => { closeSheet(); alert("Coming soon") }} />
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



