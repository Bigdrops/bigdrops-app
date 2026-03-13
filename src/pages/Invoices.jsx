import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus, MoreHorizontal, FileText, Eye, Pencil, Copy,
  DollarSign, CreditCard, FileCheck, Wrench, Truck,
  CheckCircle, Trash2, Archive, X
} from "lucide-react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"

// ── Reusable modal backdrop ───────────────────────────────────────────────────
function Backdrop({ onClick }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-sm"
      onClick={onClick}
    />
  )
}

// ── Warning confirmation modal ────────────────────────────────────────────────
function WarningModal({ title, message, subMessage, confirmLabel, confirmClass, onConfirm, onCancel }) {
  return (
    <>
      <Backdrop onClick={onCancel} />
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
        <div className="bg-white rounded-[24px] p-7 w-full max-w-sm shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">{title}</h3>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-zinc-600 mb-2 leading-relaxed">{message}</p>
          {subMessage && (
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{subMessage}</p>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-sm font-bold text-zinc-500 hover:bg-zinc-50 transition-all">
              Cancel
            </button>
            <button onClick={onConfirm} className={`flex-1 py-3 rounded-2xl text-sm font-black text-white transition-all active:scale-95 ${confirmClass}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Advance Invoice Modal ─────────────────────────────────────────────────────
function AdvanceModal({ invoice, onConfirm, onClose }) {
  const [mode, setMode] = useState("percent")
  const [value, setValue] = useState("50")
  const total = Number(invoice.total || 0)

  const advanceAmount = useMemo(() => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) return 0
    return mode === "percent"
      ? Math.round((total * v / 100) * 100) / 100
      : Math.min(Math.round(v * 100) / 100, total)
  }, [mode, value, total])

  const pct = useMemo(() => {
    if (!advanceAmount || !total) return 0
    return mode === "percent" ? parseFloat(value) : Math.round((advanceAmount / total) * 10000) / 100
  }, [advanceAmount, total, mode, value])

  const handleConfirm = () => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) { alert("Enter a valid amount"); return }
    if (mode === "percent" && v > 100) { alert("Percentage cannot exceed 100%"); return }
    if (mode === "fixed" && v > total) { alert("Amount cannot exceed invoice total"); return }
    const balance = Math.round((total - advanceAmount) * 100) / 100
    onConfirm({ pct, advanceAmount, balance, contractTotal: total, sourceInvoiceNumber: invoice.invoice_number, sourceInvoiceTitle: invoice.invoice_title || "" })
  }

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
        <div className="bg-white rounded-[24px] p-7 w-full max-w-md shadow-2xl">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">Create Advance Invoice</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><X size={18} /></button>
          </div>
          <p className="text-xs text-zinc-400 mb-5">
            From <strong className="text-zinc-700">{invoice.invoice_number}</strong> — Total: <strong className="text-zinc-700">₦{total.toLocaleString()}</strong>
          </p>

          <div className="flex rounded-xl overflow-hidden border border-zinc-200 mb-5">
            {[{ key: "percent", label: "% of Invoice" }, { key: "fixed", label: "₦ Fixed Amount" }].map(m => (
              <button key={m.key} onClick={() => { setMode(m.key); setValue(m.key === "percent" ? "50" : "") }}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${mode === m.key ? "bg-zinc-950 text-white" : "bg-white text-zinc-400"}`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden mb-3">
            <span className="px-4 text-zinc-400 border-r border-zinc-200 text-lg">{mode === "percent" ? "%" : "₦"}</span>
            <input
              type="number" min="0" max={mode === "percent" ? 100 : undefined}
              value={value} onChange={e => setValue(e.target.value)}
              autoFocus
              className="flex-1 px-4 py-3 text-xl font-black text-zinc-950 outline-none"
            />
          </div>

          {advanceAmount > 0 && (
            <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-5 text-sm">
              {mode === "percent"
                ? <span>Advance: <strong className="text-emerald-700">₦{advanceAmount.toLocaleString()}</strong></span>
                : <span>That's <strong className="text-emerald-700">{pct.toFixed(1)}%</strong> of the invoice total</span>
              }
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-sm font-bold text-zinc-500">Cancel</button>
            <button onClick={handleConfirm} className="flex-[2] py-3 rounded-2xl bg-zinc-950 text-white text-sm font-black active:scale-95 transition-transform">
              Create Advance Invoice →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Record Payment Modal ──────────────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: "full", amount: "", mode: "Transfer", reference: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  })
  const [saving, setSaving] = useState(false)
  const inp = "w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none bg-white"
  const lbl = "block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wide"

  const handleSave = async () => {
    setSaving(true)
    const amountPaid = form.type === "full" ? Number(invoice.total) : Number(form.amount)
    const notes = `Payment recorded: ₦${amountPaid.toLocaleString()} via ${form.mode} on ${form.date} at ${form.time}${form.reference ? ` | Ref: ${form.reference}` : ""}`
    const newStatus = amountPaid >= Number(invoice.total) ? "paid" : "sent"
    await supabase.from("invoices").update({ status: newStatus, notes: invoice.notes ? invoice.notes + "\n" + notes : notes }).eq("id", invoice.id)
    setSaving(false)
    onSaved()
  }

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
        <div className="bg-white rounded-[24px] p-7 w-full max-w-md shadow-2xl">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">Record Payment</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={18} /></button>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-5 flex justify-between items-center">
            <span className="text-xs text-zinc-500">Invoice Total</span>
            <span className="font-black text-emerald-700">₦{Number(invoice.total || 0).toLocaleString()}</span>
          </div>

          <div className="mb-4">
            <label className={lbl}>Payment Type</label>
            <div className="flex rounded-xl overflow-hidden border border-zinc-200">
              {["full", "partial"].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${form.type === t ? "bg-emerald-600 text-white" : "bg-white text-zinc-400"}`}>
                  {t === "full" ? "Full Payment" : "Partial Payment"}
                </button>
              ))}
            </div>
          </div>

          {form.type === "partial" && (
            <div className="mb-4">
              <label className={lbl}>Amount Paid (₦)</label>
              <input className={inp} type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className={lbl}>Date</label><input className={inp} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className={lbl}>Time</label><input className={inp} type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
          </div>

          <div className="mb-4">
            <label className={lbl}>Payment Mode</label>
            <select className={inp} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
              <option>Transfer</option><option>Cash</option><option>Cheque</option><option>POS</option><option>Online</option>
            </select>
          </div>

          <div className="mb-6">
            <label className={lbl}>Bank Reference (optional)</label>
            <input className={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. 230615123456" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-sm font-bold text-zinc-500">Cancel</button>
            <button onClick={handleSave} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black active:scale-95 transition-transform">
              {saving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Action Sheet ──────────────────────────────────────────────────────────────
function ActionSheet({ invoice, onClose, onAction }) {
  const actions = [
    { key: "view",    icon: <Eye size={22} />,        label: "View",        color: "text-zinc-700" },
    { key: "edit",    icon: <Pencil size={22} />,      label: "Edit",        color: "text-zinc-700" },
    { key: "payment", icon: <CreditCard size={22} />,  label: "Payment",     color: "text-emerald-600", hide: invoice.status === "paid" },
    { key: "clone",   icon: <Copy size={22} />,        label: "Clone",       color: "text-zinc-700" },
    { key: "advance", icon: <DollarSign size={22} />,  label: "Advance",     color: "text-blue-600" },
    { key: "quote",   icon: <FileCheck size={22} />,   label: "To Quote",    color: "text-zinc-700" },
    { key: "csr",     icon: <Wrench size={22} />,      label: "Gen. CSR",    color: "text-zinc-700" },
    { key: "waybill", icon: <Truck size={22} />,       label: "Waybill",     color: "text-zinc-700" },
    { key: "sent",    icon: <CheckCircle size={22} />, label: "Mark Sent",   color: "text-blue-600",   hide: invoice.status !== "draft" },
    { key: "archive", icon: <Archive size={22} />,     label: "Archive",     color: "text-amber-500" },
    { key: "delete",  icon: <Trash2 size={22} />,      label: "Delete",      color: "text-red-500" },
  ].filter(a => !a.hide)

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
        <div className="bg-white rounded-t-[40px] md:rounded-[28px] p-7 w-full md:max-w-md shadow-2xl">

          <div className="w-10 h-1.5 bg-zinc-200 rounded-full mx-auto mb-5 md:hidden" />
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Invoice</p>
              <h2 className="text-lg font-black text-zinc-950 uppercase tracking-tight">{invoice.invoice_number}</h2>
              <p className="text-xs text-zinc-400 font-bold truncate max-w-[220px]">{invoice.client_name}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {actions.map(a => (
              <button
                key={a.key}
                onClick={() => onAction(a.key)}
                className={`flex flex-col items-center justify-center gap-2 py-5 rounded-[20px] bg-zinc-50 hover:bg-zinc-950 hover:text-white transition-all active:scale-95 group ${a.color}`}
              >
                <span className="transition-colors group-hover:text-white">{a.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest transition-colors group-hover:text-white">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Invoices() {
  const [invoices, setInvoices]         = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [filter, setFilter]             = useState("All")
  const navigate                        = useNavigate()

  const [showPayment,  setShowPayment]  = useState(false)
  const [showAdvance,  setShowAdvance]  = useState(false)
  const [showDelete,   setShowDelete]   = useState(false)
  const [showArchive,  setShowArchive]  = useState(false)
  const [working,      setWorking]      = useState(false)

  const fetchInvoices = () => {
    supabase
      .from("invoices")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setInvoices(data || []))
  }

  useEffect(() => { fetchInvoices() }, [])

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter(inv => (inv.status || "draft").toLowerCase() === filter.toLowerCase())
  }, [filter, invoices])

  const closeAll = () => {
    setActiveInvoice(null)
    setShowPayment(false)
    setShowAdvance(false)
    setShowDelete(false)
    setShowArchive(false)
  }

  const handleAction = (key) => {
    const inv = activeInvoice
    if (!inv) return
    switch (key) {
      case "view":    closeAll(); navigate(`/invoices/${inv.id}`); break
      case "edit":    closeAll(); navigate(`/invoices/edit/${inv.id}`); break
      case "payment": setShowPayment(true); break
      case "clone":   closeAll(); handleClone(inv); break
      case "advance": setShowAdvance(true); break
      case "quote":   closeAll(); alert("Quotations module coming soon."); break
      case "csr":     closeAll(); alert("Generate CSR — coming soon."); break
      case "waybill": closeAll(); alert("Generate Waybill — coming soon."); break
      case "sent":    closeAll(); handleMarkSent(inv); break
      case "archive": setShowArchive(true); break
      case "delete":  setShowDelete(true); break
      default: break
    }
  }

  const handleClone = async (inv) => {
    try {
      const { data: all } = await supabase
        .from("invoices").select("invoice_number").like("invoice_number", "SASINV-B%").order("created_at", { ascending: false })
      let nextNum = 1
      if (all && all.length > 0) {
        const nums = all.map(i => parseInt(i.invoice_number.replace("SASINV-B", ""))).filter(n => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }
      const newNumber = "SASINV-B" + String(nextNum).padStart(3, "0")
      const { id: _id, created_at: _ca, archived_at: _aa, ...fields } = inv
      const { data: newInv, error } = await supabase.from("invoices").insert([{
        ...fields,
        invoice_number: newNumber,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: null,
        thread_id: null, total_contract_value: 0, thread_position: 1, is_advance: false, amount_received: 0,
      }]).select().single()
      if (error) { alert("Clone failed: " + error.message); return }
      const { data: srcItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id)
      if (srcItems && srcItems.length > 0) {
        const newItems = srcItems.map(({ id: _iid, ...item }) => ({ ...item, invoice_id: newInv.id }))
        await supabase.from("invoice_items").insert(newItems)
      }
      navigate("/invoices/" + newInv.id)
    } catch (err) {
      alert("Clone failed: " + err.message)
    }
  }

  const handleMarkSent = async (inv) => {
    await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id)
    fetchInvoices()
  }

  const handleConfirmAdvance = ({ pct, advanceAmount, balance, contractTotal, sourceInvoiceNumber, sourceInvoiceTitle }) => {
    const inv = activeInvoice
    closeAll()
    supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).then(({ data: srcItems }) => {
      navigate("/invoices/new", {
        state: {
          prefill: {
            ...inv,
            invoice_number: "",
            issue_date: new Date().toISOString().split("T")[0],
            due_date: "",
            status: "draft",
            notes: inv.notes || "",
            thread_id: null, total_contract_value: 0, thread_position: 1, is_advance: true, amount_received: 0,
          },
          prefillItems: (srcItems || []).map(it => ({ ...it, id: null })),
          advanceMeta: { pct, advanceAmount, balance, contractTotal, sourceInvoiceNumber, sourceInvoiceTitle },
        }
      })
    })
  }

  const handleConfirmArchive = async () => {
    if (!activeInvoice) return
    setWorking(true)
    await supabase.from("invoices").update({ archived_at: new Date().toISOString() }).eq("id", activeInvoice.id)
    setWorking(false)
    closeAll()
    fetchInvoices()
  }

  const handleConfirmDelete = async () => {
    if (!activeInvoice) return
    setWorking(true)
    await supabase.from("invoice_items").delete().eq("invoice_id", activeInvoice.id)
    await supabase.from("invoices").delete().eq("id", activeInvoice.id)
    setWorking(false)
    closeAll()
    fetchInvoices()
  }

  const statusColor = (status) => {
    switch ((status || "draft").toLowerCase()) {
      case "paid":    return "bg-emerald-100 text-emerald-700"
      case "sent":    return "bg-blue-100 text-blue-700"
      case "overdue": return "bg-red-100 text-red-600"
      default:        return "bg-zinc-100 text-zinc-500"
    }
  }

  return (
    <Layout title="Billing">

      {/* Live background */}
      <div className="fixed inset-0 -z-10 bg-slate-50 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-400/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-32 pt-6">

        {/* Filter bar */}
        <div className="mb-8 p-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex gap-2 overflow-x-auto no-scrollbar">
          {["All", "Draft", "Sent", "Paid"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                filter === f ? "bg-zinc-950 text-white shadow-xl" : "bg-transparent text-zinc-400"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="grid gap-3">
          {filteredInvoices.length === 0 && (
            <div className="text-center py-20 text-zinc-400 text-sm font-bold uppercase tracking-widest">
              No invoices found
            </div>
          )}
          {filteredInvoices.map(inv => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="group flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-[24px] cursor-pointer hover:border-zinc-950 hover:shadow-lg active:scale-95 transition-all duration-300"
            >
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="h-14 w-14 flex-shrink-0 flex items-center justify-center rounded-2xl bg-zinc-50 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-zinc-950 uppercase tracking-tighter">{inv.invoice_number}</h3>
                  <p className="text-xs font-bold text-zinc-400 uppercase truncate">{inv.client_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-black text-zinc-950 italic">₦{Number(inv.total || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">{inv.issue_date}</p>
                </div>
                <span className={`hidden sm:inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColor(inv.status)}`}>
                  {inv.status || "draft"}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setActiveInvoice(inv) }}
                  className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-950 text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-28 right-8 z-50 h-16 w-16 bg-zinc-950 text-white rounded-[24px] shadow-2xl flex items-center justify-center border border-white/20 active:scale-95 hover:shadow-lg transition-transform"
      >
        <Plus size={32} />
      </button>

      {/* Action Sheet — hidden once a sub-modal is open */}
      {activeInvoice && !showPayment && !showAdvance && !showDelete && !showArchive && (
        <ActionSheet invoice={activeInvoice} onClose={closeAll} onAction={handleAction} />
      )}

      {/* Record Payment */}
      {showPayment && activeInvoice && (
        <PaymentModal invoice={activeInvoice} onClose={closeAll} onSaved={() => { closeAll(); fetchInvoices() }} />
      )}

      {/* Advance Invoice */}
      {showAdvance && activeInvoice && (
        <AdvanceModal invoice={activeInvoice} onClose={() => setShowAdvance(false)} onConfirm={handleConfirmAdvance} />
      )}

      {/* Archive Warning */}
      {showArchive && activeInvoice && (
        <WarningModal
          title="Archive Invoice?"
          message={`"${activeInvoice.invoice_number}" will be hidden from your invoice list and automatically deleted after 30 days if not restored.`}
          subMessage="You can restore it anytime from Settings → Archive before the 30-day window closes."
          confirmLabel={working ? "Archiving..." : "Archive"}
          confirmClass="bg-amber-500 hover:bg-amber-600"
          onConfirm={handleConfirmArchive}
          onCancel={() => setShowArchive(false)}
        />
      )}

      {/* Delete Warning */}
      {showDelete && activeInvoice && (
        <WarningModal
          title="Delete Forever?"
          message={`"${activeInvoice.invoice_number}" will be permanently deleted and cannot be recovered.`}
          subMessage="Consider archiving instead — archived invoices are recoverable for 30 days."
          confirmLabel={working ? "Deleting..." : "Delete Forever"}
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

    </Layout>
  )
}
