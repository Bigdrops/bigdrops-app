import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, MoreHorizontal, FileText, Eye, Pencil, Copy, DollarSign, X,
         Send, Archive, Trash2, FileOutput, Truck, Wrench, Search, SlidersHorizontal } from "lucide-react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"

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
  const navigate = useNavigate()

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
    setInvoices(data || [])
  }

  useEffect(() => { fetchInvoices() }, [])

  const clientOptions = useMemo(() => {
    return Array.from(new Set(invoices.map(inv => inv.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const searchTerm = search.trim().toLowerCase()

    const matchesDateRange = (value) => {
      if (dateFilter === "All Time") return true
      const date = value ? new Date(value) : null
      if (!date || Number.isNaN(date.getTime())) return false
      if (dateFilter === "This Month") return date >= currentMonthStart
      if (dateFilter === "Last Month") return date >= lastMonthStart && date <= lastMonthEnd
      if (dateFilter === "This Year") return date >= currentYearStart
      return true
    }

    const sorted = invoices.filter((inv) => {
      const normalizedStatus = (inv.status || "draft").toLowerCase()
      const matchesSearch = !searchTerm
        || inv.invoice_number?.toLowerCase().includes(searchTerm)
        || inv.client_name?.toLowerCase().includes(searchTerm)
      const matchesClient = clientFilter === "All" || (inv.client_name || "") === clientFilter
      const matchesStatus = statusFilter === "All" || normalizedStatus === statusFilter.toLowerCase()
      const matchesDate = matchesDateRange(inv.issue_date || inv.created_at)
      return matchesSearch && matchesClient && matchesStatus && matchesDate
    })

    sorted.sort((a, b) => {
      if (sortBy === "Oldest") return new Date(a.created_at || a.issue_date || 0) - new Date(b.created_at || b.issue_date || 0)
      if (sortBy === "Highest Value") return Number(b.total || 0) - Number(a.total || 0)
      if (sortBy === "Lowest Value") return Number(a.total || 0) - Number(b.total || 0)
      return new Date(b.created_at || b.issue_date || 0) - new Date(a.created_at || a.issue_date || 0)
    })

    return sorted
  }, [clientFilter, dateFilter, invoices, search, sortBy, statusFilter])

  const closeSheet = () => {
    setActiveInvoice(null)
    setShowArchiveWarn(false)
    setShowDeleteWarn(false)
  }

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    await fetchInvoices()
  }

  const handleArchive = async () => {
    const inv = activeInvoice
    setShowArchiveWarn(false)
    await supabase.from("invoices").update({ archived_at: new Date().toISOString() }).eq("id", inv.id)
    closeSheet()
    await fetchInvoices()
  }

  const handleDelete = async () => {
    const inv = activeInvoice
    setShowDeleteWarn(false)
    await supabase.from("invoice_items").delete().eq("invoice_id", inv.id)
    await supabase.from("invoices").delete().eq("id", inv.id)
    closeSheet()
    await fetchInvoices()
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

  const filterSelectClass = "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none"
  const iconButtonClass = "h-10 w-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-500"

  return (
    <Layout title="Invoices">
      <div className="max-w-6xl mx-auto px-4 pb-32 pt-6" style={{ fontFamily: "'Inter', sans-serif" }}>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="m-0 text-[22px] font-extrabold text-slate-900">Invoices</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              className="w-full h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 outline-none"
            />
          </div>
        )}

        {showFilters && (
          <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-zinc-400">Client</span>
              <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={filterSelectClass}>
                <option>All</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-zinc-400">Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                {["All", "Draft", "Sent", "Paid", "Overdue", "Partial"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-zinc-400">Date</span>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={filterSelectClass}>
                {["All Time", "This Month", "Last Month", "This Year"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-zinc-400">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                {["Newest", "Oldest", "Highest Value", "Lowest Value"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <button
              onClick={resetFilters}
              className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-black uppercase text-zinc-500 transition hover:bg-zinc-50"
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
          {filteredInvoices.map((inv, idx) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr auto 38px",
                gap: 14,
                padding: "16px 18px",
                alignItems: "center",
                borderBottom: idx === filteredInvoices.length - 1 ? "none" : "1px solid #f1f5f9",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={18} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900, textTransform: "uppercase" }}>INV</span>
                  <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {inv.invoice_number}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, marginTop: 2 }}>
                  {inv.client_name || "No client"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginTop: 2 }}>
                  {formatInvoiceDate(inv.issue_date) || "No date"}
                </div>
              </div>

              <div style={{ justifySelf: "end", textAlign: "right" }}>
                <span
                  style={{
                    ...getInvoiceStatusStyle(inv.status),
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    display: "inline-block",
                  }}
                >
                  {formatStatusLabel(inv.status)}
                </span>
                <div style={{ marginTop: 6, fontSize: 15, fontWeight: 900, letterSpacing: "-0.03em", color: "#0f172a" }}>
                  ₦{Number(inv.total || 0).toLocaleString()}
                </div>
                {inv.thread_role && (
                  <div style={{ marginTop: 4 }}>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${roleColor(inv.thread_role)}`}>
                      {inv.thread_role}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setActiveInvoice(inv) }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          ))}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-20 text-zinc-400 font-bold text-sm uppercase tracking-widest">
              No invoices match the current filters
            </div>
          )}
        </div>
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
        <div className="fixed inset-x-0 bottom-0 z-[110] bg-white rounded-t-[40px] shadow-2xl">
          <div className="px-8 pt-6 pb-4">
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Invoice</p>
                <h2 className="text-xl font-black text-zinc-950">{activeInvoice.invoice_number}</h2>
                <p className="text-xs text-zinc-400 font-bold">{activeInvoice.client_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-black text-zinc-950">₦{Number(activeInvoice.total || 0).toLocaleString()}</p>
                <button onClick={closeSheet} className="p-2 rounded-xl bg-zinc-100 text-zinc-400 hover:bg-zinc-200">
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
        <div className="fixed inset-x-0 bottom-0 z-[130] bg-white rounded-t-[40px] p-8 shadow-2xl">
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Archive size={24} className="text-amber-600" />
          </div>
          <h3 className="text-xl font-black text-zinc-950 text-center mb-2">Archive Invoice?</h3>
          <p className="text-sm text-zinc-500 text-center font-medium leading-relaxed mb-8">
            This invoice will be hidden from your list and automatically deleted after 30 days if not restored. You can restore it from Settings anytime before then.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowArchiveWarn(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-zinc-200 text-sm font-black text-zinc-500 hover:bg-zinc-50">
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
        <div className="fixed inset-x-0 bottom-0 z-[130] bg-white rounded-t-[40px] p-8 shadow-2xl">
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-600" />
          </div>
          <h3 className="text-xl font-black text-zinc-950 text-center mb-2">Delete Invoice?</h3>
          <p className="text-sm text-zinc-500 text-center font-medium leading-relaxed mb-8">
            Deleting is permanent and cannot be undone. You may choose to archive it instead — archived invoices remain recoverable for 30 days.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteWarn(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-zinc-200 text-sm font-black text-zinc-500 hover:bg-zinc-50">
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
