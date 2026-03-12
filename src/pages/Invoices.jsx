import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X
} from "lucide-react"

import { supabase } from "../supabase"
import Layout from "../components/Layout"
import { useIsMobile } from "../hooks/useIsMobile"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function getStatusTone(status) {
  const normalized = (status || "draft").toLowerCase()
  if (normalized === "paid") return "bg-zinc-950 text-white border-zinc-950"
  if (normalized === "sent") return "bg-zinc-100 text-zinc-900 border-zinc-300"
  if (normalized === "overdue") return "bg-red-50 text-red-700 border-red-200"
  return "bg-white text-zinc-500 border-zinc-200"
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const [activeInvoice, setActiveInvoice] = useState(null)

  const navigate = useNavigate()
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices
    return invoices.filter(inv => (inv.status || "draft").toLowerCase() === filter.toLowerCase())
  }, [filter, invoices])

  return (
    <Layout title="Invoices">
      <div className="space-y-4 max-w-5xl mx-auto">
        
        {/* 1. CLEAN HEADER (Removed Top Button) */}
        <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black tracking-tighter text-zinc-950 uppercase">Billing</h1>
              {/* SIMPLE COUNTER - Replaced Cramped Stats */}
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Records:</span>
                <span className="text-[10px] font-black text-zinc-950">{filteredInvoices.length}</span>
              </div>
            </div>
          </div>

          {/* COMPACT FILTER CHIPS */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {["All", "Draft", "Sent", "Paid", "Overdue"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                  filter === item 
                  ? "bg-zinc-950 border-zinc-950 text-white shadow-md" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* 2. CONDENSED LIST / TABLE */}
        {isMobile ? (
          <div className="space-y-2 pb-28 px-0.5">
            {loading ? (
              <div className="p-10 text-center text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Syncing Records...</div>
            ) : filteredInvoices.length === 0 ? (
                <div className="p-10 text-center text-[10px] text-zinc-400 font-black uppercase tracking-widest">No Invoices Found</div>
            ) : filteredInvoices.map((inv) => (
              <Card
                key={inv.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm active:scale-[0.98] transition-transform"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1" onClick={() => navigate("/invoices/" + inv.id)}>
                      <div className="text-[14px] font-black tracking-tight text-zinc-950 uppercase">
                        {inv.invoice_number}
                      </div>
                      <div className="truncate text-[11px] text-zinc-500 font-bold uppercase mt-0.5">
                        {inv.client_name || "Untitled Client"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-md border px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter ${getStatusTone(inv.status)}`}>
                        {inv.status || "draft"}
                      </Badge>
                      <button onClick={() => setActiveInvoice(inv)} className="p-1 text-zinc-300 hover:text-zinc-950">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-zinc-50 pt-2">
                    <div className="text-[12px] font-black text-zinc-950 tracking-tighter">
                      {formatCurrency(inv.total)}
                    </div>
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                      {inv.issue_date || "-"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Desktop Table */
          <Card className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
             <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-zinc-200">
                    <TableHead className="h-10 text-[10px] font-black uppercase text-zinc-400">Ref</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-400">Entity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-400 text-right">Value</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-400">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="border-zinc-100 hover:bg-zinc-50/50 group">
                      <TableCell className="py-2.5 font-black text-zinc-950 text-sm uppercase">{inv.invoice_number}</TableCell>
                      <TableCell className="py-2.5 text-zinc-600 text-sm font-bold uppercase">{inv.client_name}</TableCell>
                      <TableCell className="py-2.5 text-right font-black text-zinc-950 text-sm">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="py-2.5">
                         <Badge className={`rounded-md border px-2 py-0 text-[9px] font-black uppercase ${getStatusTone(inv.status)}`}>
                            {inv.status}
                         </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                         <button onClick={() => navigate("/invoices/" + inv.id)} className="p-1 text-zinc-300 hover:text-zinc-950 transition-colors">
                            <Eye className="h-4 w-4" />
                         </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
          </Card>
        )}
      </div>

      {/* PRIMARY ACTION: FLOATING BUTTON ONLY */}
      <button
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-[0_12px_40px_rgba(0,0,0,0.3)] active:scale-90 transition-all border border-white/10"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* MOBILE ACTION DRAWER */}
      {isMobile && activeInvoice && (
        <>
          <div className="fixed inset-0 z-50 bg-zinc-950/20 backdrop-blur-[1px]" onClick={() => setActiveInvoice(null)} />
          <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-[24px] border-t border-zinc-200 bg-white p-2 animate-in slide-in-from-bottom duration-200">
             <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto my-2" />
             <div className="px-4 py-2 border-b border-zinc-50">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Options</div>
                <div className="text-sm font-black text-zinc-950 uppercase">{activeInvoice.invoice_number}</div>
             </div>
             <div className="grid grid-cols-2 gap-2 p-2">
                <Button variant="outline" className="h-12 justify-start font-black text-[10px] uppercase border-zinc-200" onClick={() => navigate("/invoices/" + activeInvoice.id)}>
                   <Eye className="mr-2 h-4 w-4 text-zinc-400" /> View
                </Button>
                <Button variant="outline" className="h-12 justify-start font-black text-[10px] uppercase border-zinc-200" onClick={() => navigate("/invoices/" + activeInvoice.id + "/edit")}>
                   <Pencil className="mr-2 h-4 w-4 text-zinc-400" /> Edit
                </Button>
             </div>
             <div className="p-2 pt-0">
                <Button variant="outline" className="w-full h-12 justify-center font-black text-[10px] uppercase text-red-600 border-red-50 bg-red-50/30" onClick={() => setActiveInvoice(null)}>
                   <X className="mr-2 h-4 w-4" /> Close Actions
                </Button>
             </div>
          </div>
        </>
      )}
    </Layout>
  )
}
