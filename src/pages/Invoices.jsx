import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  MoreHorizontal,
  FileText,
  Eye,
  Pencil,
  Copy,
  DollarSign,
  CreditCard,
  FileCheck,
  Wrench,
  Truck,
  CheckCircle,
  Trash2,
  Archive,
  X,
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
function WarningModal({
  title,
  message,
  subMessage,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}) {
  return (
    <>
      <Backdrop onClick={onCancel} />
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-7 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-base font-black uppercase tracking-tight text-zinc-950">
              {title}
            </h3>
            <button
              onClick={onCancel}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-2 text-sm leading-relaxed text-zinc-600">{message}</p>

          {subMessage && (
            <p className="mb-5 text-xs leading-relaxed text-zinc-400">
              {subMessage}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm font-bold text-zinc-500 transition-all hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-2xl py-3 text-sm font-black text-white transition-all active:scale-95 ${confirmClass}`}
            >
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
      ? Math.round((total * v) / 100 * 100) / 100
      : Math.min(Math.round(v * 100) / 100, total)
  }, [mode, value, total])

  const pct = useMemo(() => {
    if (!advanceAmount || !total) return 0
    return mode === "percent"
      ? parseFloat(value)
      : Math.round((advanceAmount / total) * 10000) / 100
  }, [advanceAmount, total, mode, value])

  const handleConfirm = () => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) {
      alert("Enter a valid amount")
      return
    }
    if (mode === "percent" && v > 100) {
      alert("Percentage cannot exceed 100%")
      return
    }
    if (mode === "fixed" && v > total) {
      alert("Amount cannot exceed invoice total")
      return
    }

    onConfirm({
      mode,
      value: v,
      pct,
      advanceAmount,
      contractTotal: total,
    })
  }

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-black uppercase tracking-tight text-zinc-950">
              Convert to Advance
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-5 text-xs text-zinc-400">
            Convert{" "}
            <strong className="text-zinc-700">{invoice.invoice_number}</strong>{" "}
            into the first invoice in a job thread.
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Total Contract Value (₦)
            </label>
            <input
              type="number"
              min="0"
              value={Number(invoice.total || 0)}
              readOnly
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-bold text-zinc-700 outline-none"
            />
          </div>

          <div className="mb-5 flex overflow-hidden rounded-xl border border-zinc-200">
            {[
              { key: "percent", label: "% of Invoice" },
              { key: "fixed", label: "₦ Fixed Amount" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setMode(m.key)
                  setValue(m.key === "percent" ? "50" : "")
                }}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  mode === m.key
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-400"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center overflow-hidden rounded-xl border border-zinc-200">
            <span className="border-r border-zinc-200 px-4 text-lg text-zinc-400">
              {mode === "percent" ? "%" : "₦"}
            </span>
            <input
              type="number"
              min="0"
              max={mode === "percent" ? 100 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="flex-1 px-4 py-3 text-xl font-black text-zinc-950 outline-none"
            />
          </div>

          {advanceAmount > 0 && (
            <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm">
              {mode === "percent" ? (
                <span>
                  Advance due:{" "}
                  <strong className="text-emerald-700">
                    ₦{advanceAmount.toLocaleString()}
                  </strong>
                </span>
              ) : (
                <span>
                  That's{" "}
                  <strong className="text-emerald-700">
                    {pct.toFixed(1)}%
                  </strong>{" "}
                  of the contract value
                </span>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm font-bold text-zinc-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-[2] rounded-2xl bg-zinc-950 py-3 text-sm font-black text-white transition-transform active:scale-95"
            >
              Convert Invoice →
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
    type: "full",
    amount: "",
    mode: "Transfer",
    reference: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  })
  const [saving, setSaving] = useState(false)

  const inp =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
  const lbl =
    "mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500"

  const handleSave = async () => {
    setSaving(true)

    const amountPaid =
      form.type === "full" ? Number(invoice.total) : Number(form.amount)

    const notes = `Payment recorded: ₦${amountPaid.toLocaleString()} via ${form.mode} on ${form.date} at ${form.time}${form.reference ? ` | Ref: ${form.reference}` : ""}`
    const newStatus = amountPaid >= Number(invoice.total) ? "paid" : "sent"

    await supabase
      .from("invoices")
      .update({
        status: newStatus,
        amount_received: amountPaid,
        notes: invoice.notes ? invoice.notes + "\n" + notes : notes,
      })
      .eq("id", invoice.id)

    setSaving(false)
    onSaved()
  }

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-black uppercase tracking-tight text-zinc-950">
              Record Payment
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
            <span className="text-xs text-zinc-500">Invoice Total</span>
            <span className="font-black text-emerald-700">
              ₦{Number(invoice.total || 0).toLocaleString()}
            </span>
          </div>

          <div className="mb-4">
            <label className={lbl}>Payment Type</label>
            <div className="flex overflow-hidden rounded-xl border border-zinc-200">
              {["full", "partial"].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                    form.type === t
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-zinc-400"
                  }`}
                >
                  {t === "full" ? "Full Payment" : "Partial Payment"}
                </button>
              ))}
            </div>
          </div>

          {form.type === "partial" && (
            <div className="mb-4">
              <label className={lbl}>Amount Paid (₦)</label>
              <input
                className={inp}
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="Enter amount"
              />
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Date</label>
              <input
                className={inp}
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={lbl}>Time</label>
              <input
                className={inp}
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, time: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={lbl}>Payment Mode</label>
            <select
              className={inp}
              value={form.mode}
              onChange={(e) =>
                setForm((f) => ({ ...f, mode: e.target.value }))
              }
            >
              <option>Transfer</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>POS</option>
              <option>Online</option>
            </select>
          </div>

          <div className="mb-6">
            <label className={lbl}>Bank Reference (optional)</label>
            <input
              className={inp}
              value={form.reference}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference: e.target.value }))
              }
              placeholder="e.g. 230615123456"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm font-bold text-zinc-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white transition-transform active:scale-95"
            >
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
    { key: "view", icon: <Eye size={22} />, label: "View", color: "text-zinc-700" },
    { key: "edit", icon: <Pencil size={22} />, label: "Edit", color: "text-zinc-700" },
    {
      key: "payment",
      icon: <CreditCard size={22} />,
      label: "Payment",
      color: "text-emerald-600",
      hide: invoice.status === "paid",
    },
    { key: "clone", icon: <Copy size={22} />, label: "Clone", color: "text-zinc-700" },
    {
      key: "advance",
      icon: <DollarSign size={22} />,
      label: "Advance",
      color: "text-blue-600",
      hide: !!invoice.thread_id,
    },
    { key: "quote", icon: <FileCheck size={22} />, label: "To Quote", color: "text-zinc-700" },
    { key: "csr", icon: <Wrench size={22} />, label: "Gen. CSR", color: "text-zinc-700" },
    { key: "waybill", icon: <Truck size={22} />, label: "Waybill", color: "text-zinc-700" },
    {
      key: "sent",
      icon: <CheckCircle size={22} />,
      label: "Mark Sent",
      color: "text-blue-600",
      hide: invoice.status !== "draft",
    },
    { key: "archive", icon: <Archive size={22} />, label: "Archive", color: "text-amber-500" },
    { key: "delete", icon: <Trash2 size={22} />, label: "Delete", color: "text-red-500" },
  ].filter((a) => !a.hide)

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-[110] flex items-end justify-center md:items-center">
        <div className="w-full rounded-t-[40px] bg-white p-7 shadow-2xl md:max-w-md md:rounded-[28px]">
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-zinc-200 md:hidden" />

          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Invoice
              </p>
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-950">
                {invoice.invoice_number}
              </h2>
              <p className="max-w-[220px] truncate text-xs font-bold text-zinc-400">
                {invoice.client_name}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-zinc-100 p-2 text-zinc-500 transition-colors hover:bg-zinc-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {actions.map((a) => (
              <button
                key={a.key}
                onClick={() => onAction(a.key)}
                className={`group flex flex-col items-center justify-center gap-2 rounded-[20px] bg-zinc-50 py-5 transition-all active:scale-95 hover:bg-zinc-950 hover:text-white ${a.color}`}
              >
                <span className="transition-colors group-hover:text-white">
                  {a.icon}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest transition-colors group-hover:text-white">
                  {a.label}
                </span>
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
  const [invoices, setInvoices] = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [filter, setFilter] = useState("All")
  const navigate = useNavigate()

  const [showPayment, setShowPayment] = useState(false)
  const [showAdvance, setShowAdvance] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [working, setWorking] = useState(false)

  const fetchInvoices = () => {
    supabase
      .from("invoices")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setInvoices(data || []))
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter(
      (inv) => (inv.status || "draft").toLowerCase() === filter.toLowerCase()
    )
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
      case "view":
        closeAll()
        navigate(`/invoices/${inv.id}`)
        break
      case "edit":
        closeAll()
        navigate(`/invoices/edit/${inv.id}`)
        break
      case "payment":
        setShowPayment(true)
        break
      case "clone":
        closeAll()
        handleClone(inv)
        break
      case "advance":
        setShowAdvance(true)
        break
      case "quote":
        closeAll()
        alert("Quotations module coming soon.")
        break
      case "csr":
        closeAll()
        alert("Generate CSR — coming soon.")
        break
      case "waybill":
        closeAll()
        alert("Generate Waybill — coming soon.")
        break
      case "sent":
        closeAll()
        handleMarkSent(inv)
        break
      case "archive":
        setShowArchive(true)
        break
      case "delete":
        setShowDelete(true)
        break
      default:
        break
    }
  }

  const handleClone = async (inv) => {
    try {
      const { data: all } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", "SASINV-B%")
        .order("created_at", { ascending: false })

      let nextNum = 1

      if (all && all.length > 0) {
        const nums = all
          .map((i) => parseInt(i.invoice_number.replace("SASINV-B", "")))
          .filter((n) => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }

      const newNumber = "SASINV-B" + String(nextNum).padStart(3, "0")

      const {
        id: _id,
        created_at: _ca,
        archived_at: _aa,
        thread_id: _tid,
        total_contract_value: _tcv,
        thread_position: _tp,
        is_advance: _ia,
        amount_received: _ar,
        advance_mode: _am,
        advance_value: _av,
        thread_role: _tr,
        job_title: _jt,
        thread_created_from_invoice_id: _tcf,
        ...fields
      } = inv

      const { data: newInv, error } = await supabase
        .from("invoices")
        .insert([
          {
            ...fields,
            invoice_number: newNumber,
            status: "draft",
            issue_date: new Date().toISOString().split("T")[0],
            due_date: null,
            thread_id: null,
            total_contract_value: 0,
            thread_position: 1,
            is_advance: false,
            amount_received: 0,
            advance_mode: null,
            advance_value: null,
            thread_role: null,
            job_title: null,
            thread_created_from_invoice_id: null,
          },
        ])
        .select()
        .single()

      if (error) {
        alert("Clone failed: " + error.message)
        return
      }

      const { data: srcItems } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)

      if (srcItems && srcItems.length > 0) {
        const newItems = srcItems.map(({ id: _iid, ...item }) => ({
          ...item,
          invoice_id: newInv.id,
        }))
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

  const handleConfirmAdvance = async ({ mode, value }) => {
    const inv = activeInvoice
    if (!inv) return

    setWorking(true)

    const threadId = crypto.randomUUID()

    const { error } = await supabase
      .from("invoices")
      .update({
        thread_id: threadId,
        thread_role: "advance",
        thread_position: 1,
        total_contract_value: Number(inv.total || 0),
        advance_mode: mode,
        advance_value: value,
        is_advance: true,
        job_title: inv.invoice_title || null,
        thread_created_from_invoice_id: inv.id,
      })
      .eq("id", inv.id)

    setWorking(false)

    if (error) {
      alert("Advance conversion failed: " + error.message)
      return
    }

    closeAll()
    fetchInvoices()
    navigate(`/invoices/${inv.id}`)
  }

  const handleConfirmArchive = async () => {
    if (!activeInvoice) return

    setWorking(true)
    await supabase
      .from("invoices")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", activeInvoice.id)

    setWorking(false)
    closeAll()
    fetchInvoices()
  }

  const handleConfirmDelete = async () => {
    if (!activeInvoice) return

    setWorking(true)
    await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", activeInvoice.id)

    await supabase.from("invoices").delete().eq("id", activeInvoice.id)

    setWorking(false)
    closeAll()
    fetchInvoices()
  }

  const statusColor = (status) => {
    switch ((status || "draft").toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-700"
      case "sent":
        return "bg-blue-100 text-blue-700"
      case "overdue":
        return "bg-red-100 text-red-600"
      default:
        return "bg-zinc-100 text-zinc-500"
    }
  }

  const roleBadge = (inv) => {
    if (inv.thread_role === "advance") {
      return (
        <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-600">
          Advance
        </span>
      )
    }

    if (inv.thread_role === "final") {
      return (
        <span className="inline-flex rounded-full bg-purple-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-purple-600">
          Final
        </span>
      )
    }

    if (inv.thread_role === "progress") {
      return (
        <span className="inline-flex rounded-full bg-zinc-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-600">
          Progress
        </span>
      )
    }

    return null
  }

  return (
    <Layout title="Billing">
      {/* Live background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
        <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-red-400/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-32 pt-6">
        {/* Filter bar */}
        <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto rounded-2xl border border-white/50 bg-white/40 p-2 backdrop-blur-md">
          {["All", "Draft", "Sent", "Paid"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-6 py-2 text-[10px] font-black uppercase transition-all ${
                filter === f
                  ? "bg-zinc-950 text-white shadow-xl"
                  : "bg-transparent text-zinc-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="grid gap-3">
          {filteredInvoices.length === 0 && (
            <div className="py-20 text-center text-sm font-bold uppercase tracking-widest text-zinc-400">
              No invoices found
            </div>
          )}

          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="group flex cursor-pointer items-center justify-between rounded-[24px] border border-zinc-200 bg-white p-5 transition-all duration-300 hover:border-zinc-950 hover:shadow-lg active:scale-95"
            >
              <div className="flex min-w-0 flex-1 items-center gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-50 transition-colors group-hover:bg-zinc-950 group-hover:text-white">
                  <FileText size={24} />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black uppercase tracking-tighter text-zinc-950">
                      {inv.invoice_number}
                    </h3>
                    {roleBadge(inv)}
                  </div>
                  <p className="truncate text-xs font-bold uppercase text-zinc-400">
                    {inv.client_name}
                  </p>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-4">
                <div className="hidden text-right sm:block">
                  <p className="text-lg font-black italic text-zinc-950">
                    ₦{Number(inv.total || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    {inv.issue_date}
                  </p>
                </div>

                <span
                  className={`hidden rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider sm:inline-flex ${statusColor(inv.status)}`}
                >
                  {inv.status || "draft"}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveInvoice(inv)
                  }}
                  className="rounded-xl bg-zinc-50 p-3 text-zinc-400 transition-all hover:bg-zinc-950 hover:text-white active:scale-95"
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
        className="fixed bottom-28 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/20 bg-zinc-950 text-white shadow-2xl transition-transform hover:shadow-lg active:scale-95"
      >
        <Plus size={32} />
      </button>

      {/* Action Sheet */}
      {activeInvoice && !showPayment && !showAdvance && !showDelete && !showArchive && (
        <ActionSheet invoice={activeInvoice} onClose={closeAll} onAction={handleAction} />
      )}

      {/* Record Payment */}
      {showPayment && activeInvoice && (
        <PaymentModal
          invoice={activeInvoice}
          onClose={closeAll}
          onSaved={() => {
            closeAll()
            fetchInvoices()
          }}
        />
      )}

      {/* Advance Invoice */}
      {showAdvance && activeInvoice && (
        <AdvanceModal
          invoice={activeInvoice}
          onClose={() => setShowAdvance(false)}
          onConfirm={handleConfirmAdvance}
        />
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