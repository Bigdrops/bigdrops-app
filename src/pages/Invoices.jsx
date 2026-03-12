import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion" // For the "Live" feel
import { Eye, MoreHorizontal, Pencil, Plus, Copy, Trash2, DollarSign } from "lucide-react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"
import { useIsMobile } from "../hooks/useIsMobile"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const [activeInvoice, setActiveInvoice] = useState(null)
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  useEffect(() => { fetchInvoices() }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter(inv => (inv.status || "draft").toLowerCase() === filter.toLowerCase())
  }, [filter, invoices])

  // Animation Variants for the "Live" feel
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }
  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <Layout title="Invoices">
      <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4">
        
        {/* HEADER SECTION */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-md p-6 shadow-sm sticky top-4 z-30"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-zinc-950 uppercase italic">Billing</h1>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Records: <span className="text-zinc-900">{filteredInvoices.length}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {["All", "Draft", "Sent", "Paid", "Overdue"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                  filter === f ? "bg-zinc-950 text-white border-zinc-950 shadow-lg shadow-zinc-200 scale-105" : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* LIVE INVOICE LIST */}
        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="visible"
          className="grid gap-3"
        >
          {loading ? (
            <div className="h-64 flex items-center justify-center text-[10px] font-black uppercase tracking-[.3em] text-zinc-300">Syncing...</div>
          ) : (
            filteredInvoices.map((inv) => (
              <motion.div
                key={inv.id}
                variants={itemVars}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className="group relative"
              >
                {/* THE FIX: Wrap entire content in a button or click handler */}
                <div 
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl cursor-pointer hover:shadow-xl hover:border-zinc-400 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                      <Eye size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950 uppercase tracking-tight">{inv.invoice_number}</h3>
                      <p className="text-[11px] font-bold text-zinc-400 uppercase truncate max-w-[150px] md:max-w-none">{inv.client_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-zinc-950">₦{Number(inv.total).toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">{inv.issue_date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <Badge className="rounded-lg px-2 py-1 text-[9px] font-black uppercase bg-zinc-50 border-zinc-200 text-zinc-600 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                        {inv.status}
                      </Badge>
                      {/* Separate the "More" button so it doesn't trigger the row click */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveInvoice(inv); }}
                        className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
                      >
                        <MoreHorizontal size={18} className="text-zinc-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* FAB with Live Pulse */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-24 right-8 z-50 h-16 w-16 bg-zinc-950 text-white rounded-2xl shadow-2xl flex items-center justify-center border border-white/10"
      >
        <Plus size={28} />
      </motion.button>

      {/* SYNCED ACTIONS POPUP (As requested) */}
      <AnimatePresence>
        {activeInvoice && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-zinc-950/60 backdrop-blur-sm" 
              onClick={() => setActiveInvoice(null)} 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-black text-zinc-950 uppercase italic mb-8">{activeInvoice.invoice_number}</h2>
              <div className="grid grid-cols-2 gap-4">
                <ActionButton icon={<Eye size={20}/>} label="View" onClick={() => navigate(`/invoices/${activeInvoice.id}`)} color="text-blue-500" />
                <ActionButton icon={<Pencil size={20}/>} label="Edit" onClick={() => navigate(`/invoices/edit/${activeInvoice.id}`)} color="text-red-500" />
                <ActionButton icon={<Copy size={20}/>} label="Duplicate" onClick={() => {/* logic */}} color="text-orange-500" />
                <ActionButton icon={<DollarSign size={20}/>} label="Advance" onClick={() => {/* logic */}} color="text-emerald-500" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  )
}

function ActionButton({ icon, label, onClick, color }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-6 rounded-3xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:shadow-xl transition-all group">
      <div className={`${color} mb-3 group-hover:scale-125 transition-transform`}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-950">{label}</span>
    </button>
  )
}
