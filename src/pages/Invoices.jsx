import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
  ChevronDown,
  ChevronUp
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
  // UI FIX: Hidden by default
  const [showSummary, setShowSummary] = useState(false) 
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

  const totals = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
    const totalDue = invoices.filter(inv => (inv.status || "").toLowerCase() !== "paid")
                              .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
    const totalReceived = invoices.filter(inv => (inv.status || "").toLowerCase() === "paid")
                                  .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
    return { totalInvoiced, totalDue, totalReceived }
  }, [invoices])

  const summaryItems = [
    { label: "Invoiced", value: totals.totalInvoiced, icon: FileText, tone: "bg-zinc-950 text-white", iconTone: "bg-white/10" },
    { label: "Due", value: totals.totalDue, icon: Wallet, tone: "bg-white text-zinc-900 border-zinc-300", iconTone: "bg-zinc-100" },
    { label: "Received", value: totals.totalReceived, icon: Receipt, tone: "bg-white text-zinc-900 border-zinc-300", iconTone: "bg-zinc-100" },
  ]

  return (
    <Layout title="Invoices">
      <div className="space-y-4 max-w-6xl mx-auto">
        
        {/* 1. COMPACT HEADER */}
        <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black tracking-tight text-zinc-900 uppercase">Billing</h1>
              <p className="text-[11px] text-zinc-500 font-medium">System Records & Threads</p>
            </div>
            <Button
              onClick={() => navigate("/invoices/new")}
              className="h-9 rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-black transition-all active:scale-95"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              NEW
            </Button>
          </div>

          {/* COMPACT FILTER CHIPS */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {["All", "Draft", "Sent", "Paid", "Overdue"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  filter === item 
                  ? "bg-zinc-950 border-zinc-950 text-white" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* 2. SUMMARY TOGGLE (NEUTRAL & CLEAN) */}
        <div className="px-1">
          <button 
            onClick={() => setShowSummary(!showSummary)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {showSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showSummary ? "Hide Statistics" : "Show Statistics"}
          </button>
          
          {showSummary && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {summaryItems.map((item) => (
                <Card key={item.label} className={`rounded-xl border shadow-none ${item.tone}`}>
                  <CardContent className="p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.label}</div>
                    <div className="mt-1 text-sm font-bold tracking-tight">{formatCurrency(item.value)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 3. CONDENSED LIST / TABLE */}
        {isMobile ? (
          <div className="space-y-2 pb-24 px-0.5">
            {loading ? (
              <div className="p-10 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest">Loading Records...</div>
            ) : filteredInvoices.map((inv) => (
              <Card
                key={inv.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm active:scale-[0.98] transition-transform"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1" onClick={() => navigate("/invoices/" + inv.id)}>
                      <div className="text-[13px] font-black tracking-tighter text-zinc-950 uppercase">
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

                  <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2">
                    <div className="text-[12px] font-black text-zinc-900 tracking-tight">
                      {formatCurrency(inv.total)}
                    </div>
                    <div className="text-[9px] font-bold text-zinc-400 uppercase">
                      {inv.issue_date || "-"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Desktop Table - Tightened Height */
          <Card className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
             <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-zinc-200">
                    <TableHead className="h-10 text-[10px] font-black uppercase text-zinc-400">Invoice</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-400">Client</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-400 text-right">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-400">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="border-zinc-100 hover:bg-zinc-50/50 group">
                      <TableCell className="py-2 font-bold text-zinc-900 text-sm">{inv.invoice_number}</TableCell>
                      <TableCell className="py-2 text-zinc-600 text-sm font-medium">{inv.client_name}</TableCell>
                      <TableCell className="py-2 text-right font-black text-zinc-900 text-sm">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="py-2">
                         <Badge className={`rounded-md border px-2 py-0 text-[9px] font-black uppercase ${getStatusTone(inv.status)}`}>
                            {inv.status}
                         </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                         <button onClick={() => navigate("/invoices/" + inv.id)} className="p-1 text-zinc-300 hover:text-zinc-900">
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

      {/* MOBILE FLOATING ACTION BUTTON */}
      {isMobile && (
          <button
            onClick={() => navigate("/invoices/new")}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-2xl active:scale-90 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
      )}

      {/* MOBILE ACTION DRAWER (Kept same logic, but styled) */}
      {isMobile && activeInvoice && (
        <>
          <div className="fixed inset-0 z-50 bg-zinc-950/20 backdrop-blur-[2px]" onClick={() => setActiveInvoice(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] border-t border-zinc-200 bg-white p-2 animate-in slide-in-from-bottom">
             <div className="w-12 h-1 bg-zinc-200 rounded-full mx-auto my-2" />
             <div className="px-4 py-2 border-b border-zinc-100">
                <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">Options</div>
                <div className="text-sm font-bold text-zinc-900">{activeInvoice.invoice_number}</div>
             </div>
             <div className="grid grid-cols-2 gap-2 p-2">
                <Button variant="outline" className="justify-start font-bold text-xs uppercase" onClick={() => navigate("/invoices/" + activeInvoice.id)}>
                   <Eye className="mr-2 h-4 w-4 text-zinc-400" /> View
                </Button>
                <Button variant="outline" className="justify-start font-bold text-xs uppercase" onClick={() => navigate("/invoices/" + activeInvoice.id + "/edit")}>
                   <Pencil className="mr-2 h-4 w-4 text-zinc-400" /> Edit
                </Button>
                <Button variant="outline" className="justify-start font-bold text-xs uppercase border-red-100 text-red-600 hover:bg-red-50" onClick={() => setActiveInvoice(null)}>
                   <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
             </div>
          </div>
        </>
      )}
    </Layout>
  )
}
