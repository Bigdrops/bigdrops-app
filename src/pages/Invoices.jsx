import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, MoreHorizontal, FileText, Eye, Pencil, Copy, DollarSign, X,
         Send, Archive, Trash2, FileOutput, Truck, Wrench } from "lucide-react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"

export default function Invoices() {
  const [invoices, setInvoices]         = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [filter, setFilter]             = useState("All")
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

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter(inv => (inv.status || "draft").toLowerCase() === filter.toLowerCase())
  }, [filter, invoices])

  const closeSheet = () => setActiveInvoice(null)

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleView  = () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) }
  const handleEdit  = () => { closeSheet(); navigate(`/invoices/edit/${activeInvoice.id}`) }
  const handleAdvance = () => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) } // conversion happens in ViewInvoice

  const handleClone = async () => {
    closeSheet()
    const inv = activeInvoice
    try {
      const { data: all } = await supabase
        .from("invoices").select("invoice_number").like("invoice_number", "SASINV-B%").order("created_at", { ascending: false })
      let nextNum = 1
      if (all && all.length > 0) {
        const nums = all.map(i => parseInt(i.invoice_number.replace("SASINV-B", ""))).filter(n => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }
      const newNumber = "SASINV-B" + String(nextNum).padStart(3, "0")

      // Fetch items for this invoice
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
            // Strip thread/advance — clone is standalone
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
    closeSheet()
    await supabase.from("invoices").update({ status: "sent" }).eq("id", activeInvoice.id)
    await fetchInvoices()
  }

  const handleArchive = async () => {
    setShowArchiveWarn(false)
    await supabase.from("invoices").update({ archived_at: new Date().toISOString() }).eq("id", activeInvoice.id)
    closeSheet()
    await fetchInvoices()
  }

  const handleDelete = async () => {
    setShowDeleteWarn(false)
    await supabase.from("invoice_items").delete().eq("invoice_id", activeInvoice.id)
    await supabase.from("invoices").delete().eq("id", activeInvoice.id)
    closeSheet()
    await fetchInvoices()
  }

  const isStandalone = activeInvoice && !activeInvoice.thread_id

  return (
    <Layout title="Invoices">
      {/* Moving background */}
      <div className="fixed inset-0 -z-10 bg-slate-50 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-400/10 rounded-full blur-[120px]"
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-32 pt-6">
        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex gap-2 overflow-x-auto no-scrollbar"
        >
          {["All", "Draft", "Sent", "Paid"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                filter === f ? "bg-zinc-950 text-white shadow-xl" : "bg-transparent text-zinc-400"
              }`}>
              {f}
            </button>
          ))}
        </motion.div>

        {/* Invoice list */}
        <motion.div layout className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((inv) => (
              <motion.div
                layout
                key={inv.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="group flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-[24px] cursor-pointer hover:border-zinc-950 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-zinc-50 group-hover:bg-zinc-950 group-hover:text-white transition-colors shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-zinc-950 uppercase tracking-tighter">{inv.invoice_number}</h3>
                      {inv.thread_role && (
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                          inv.thread_role === 'advance'  ? 'bg-blue-100 text-blue-700' :
                          inv.thread_role === 'final'    ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{inv.thread_role}</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-zinc-400 uppercase truncate">{inv.client_name || "No client"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-black text-zinc-950 italic">₦{Number(inv.total || 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">{inv.issue_date}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveInvoice(inv) }}
                    className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-950 text-zinc-400 hover:text-white transition-all"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-20 text-zinc-400 font-bold text-sm uppercase tracking-widest">
              No {filter !== "All" ? filter.toLowerCase() : ""} invoices
            </div>
          )}
        </motion.div>
      </div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-28 right-8 z-50 h-16 w-16 bg-zinc-950 text-white rounded-[24px] shadow-2xl flex items-center justify-center border border-white/20"
      >
        <Plus size={32} />
      </motion.button>

      {/* Action sheet */}
      <AnimatePresence>
        {activeInvoice && !showArchiveWarn && !showDeleteWarn && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md"
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[110] bg-white rounded-t-[40px] shadow-2xl"
            >
              {/* Handle + header */}
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

              {/* Actions grid */}
              <div className="px-8 pb-10 grid grid-cols-3 gap-3">
                <MenuBtn icon={<Eye size={20}/>}        label="View"       onClick={handleView} />
                <MenuBtn icon={<Pencil size={20}/>}     label="Edit"       onClick={handleEdit} />
                {activeInvoice.status !== 'paid' && (
                  <MenuBtn icon={<DollarSign size={20}/>} label="Payment"  onClick={() => { closeSheet(); navigate(`/invoices/${activeInvoice.id}`) }} />
                )}
                <MenuBtn icon={<Copy size={20}/>}       label="Clone"      onClick={handleClone} />
                {isStandalone && (
                  <MenuBtn icon={<DollarSign size={20}/>} label="Advance"  onClick={handleAdvance} />
                )}
                <MenuBtn icon={<FileOutput size={20}/>} label="To Quote"   onClick={() => { closeSheet(); alert("Quotations module coming soon") }} />
                <MenuBtn icon={<Wrench size={20}/>}     label="Gen. CSR"   onClick={() => { closeSheet(); alert("Coming soon") }} />
                <MenuBtn icon={<Truck size={20}/>}      label="Waybill"    onClick={() => { closeSheet(); alert("Coming soon") }} />
                {activeInvoice.status === 'draft' && (
                  <MenuBtn icon={<Send size={20}/>}     label="Mark Sent"  onClick={handleMarkSent} />
                )}
                <MenuBtn icon={<Archive size={20}/>}    label="Archive"    onClick={() => setShowArchiveWarn(true)}  amber />
                <MenuBtn icon={<Trash2 size={20}/>}     label="Delete"     onClick={() => setShowDeleteWarn(true)}   danger />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Archive warning */}
      <AnimatePresence>
        {showArchiveWarn && activeInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-zinc-950/50 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[130] bg-white rounded-t-[40px] p-8 shadow-2xl"
            >
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete warning */}
      <AnimatePresence>
        {showDeleteWarn && activeInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-zinc-950/50 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[130] bg-white rounded-t-[40px] p-8 shadow-2xl"
            >
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
