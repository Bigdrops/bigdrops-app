import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion" // The engine
import { Plus, MoreHorizontal, FileText, Eye, Pencil, Copy, DollarSign, X } from "lucide-react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [filter, setFilter] = useState("All")
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from("invoices").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setInvoices(data || []))
  }, [])

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter(inv => (inv.status || "draft").toLowerCase() === filter.toLowerCase())
  }, [filter, invoices])

  return (
    <Layout title="Invoices">
      {/* 1. THE LIVE BACKGROUND: Moving gradients */}
      <div className="fixed inset-0 -z-10 bg-slate-50 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, -30, 0] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-400/10 rounded-full blur-[120px]" 
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-32 pt-6">
        {/* 2. FILTER BAR: Entrance Animation */}
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

        {/* 3. THE LIST: Fixed Desktop View + Staggered Animation */}
        <motion.div layout className="grid gap-3">
          <AnimatePresence mode='popLayout'>
            {filteredInvoices.map((inv) => (
              <motion.div
                layout // Smoothly re-orders when filtering
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
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-zinc-50 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-zinc-950 uppercase tracking-tighter">{inv.invoice_number}</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase truncate">{inv.client_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-black text-zinc-950 italic">₦{Number(inv.total).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">{inv.issue_date}</p>
                  </div>
                  {/* Entire row is clickable, but this button opens the EXTRA options */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveInvoice(inv); }}
                    className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-950 text-zinc-400 hover:text-white transition-all"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 4. FLOATING ACTION BUTTON */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-28 right-8 z-50 h-16 w-16 bg-zinc-950 text-white rounded-[24px] shadow-2xl flex items-center justify-center border border-white/20"
      >
        <Plus size={32} />
      </motion.button>

      {/* 5. ACTION DRAWER: Live Slide-up */}
      <AnimatePresence>
        {activeInvoice && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md" 
              onClick={() => setActiveInvoice(null)} 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[110] bg-white rounded-t-[40px] p-8 shadow-2xl"
            >
               <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8" />
               <div className="grid grid-cols-2 gap-4">
                  <MenuBtn icon={<Eye/>} label="View" onClick={() => navigate(`/invoices/${activeInvoice.id}`)} />
                  <MenuBtn icon={<Pencil/>} label="Edit" onClick={() => navigate(`/invoices/edit/${activeInvoice.id}`)} />
                  <MenuBtn icon={<Copy/>} label="Clone" onClick={() => {}} />
                  <MenuBtn icon={<DollarSign/>} label="Advance" onClick={() => {}} />
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  )
}

function MenuBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-6 rounded-[32px] bg-zinc-50 hover:bg-zinc-950 hover:text-white transition-all group">
      <div className="mb-2 transition-transform group-hover:scale-110">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  )
}