
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Plus } from "lucide-react"

import { supabase } from "../supabase"
import Layout from "../components/Layout"
import { useIsMobile } from "../hooks/useIsMobile"

import { Card, CardContent } from "../components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"

function normalizeStatus(status) {
  return (status || "").trim().toLowerCase()
}

export default function CSR() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [csrs, setCsrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("All Time")
  const [sortBy, setSortBy] = useState("Newest")
  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => {
    fetchCsrs()
  }, [])

  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null)
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const fetchCsrs = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("csrs")
      .select("*")
      .order("created_at", { ascending: false })

    setCsrs(data || [])
    setLoading(false)
  }

  const getCsrStatusKey = (status) => {
    const normalized = normalizeStatus(status)
    if (!normalized) return "draft"
    if (normalized.includes("cancel")) return "cancelled"
    if (normalized.includes("complete")) return "completed"
    if (normalized.includes("pending")) return "pending"
    if (normalized.includes("draft")) return "draft"
    return normalized
  }

  const getCsrStatusBadgeStyle = (status) => {
    const key = getCsrStatusKey(status)
    if (key === "completed") return { backgroundColor: "#DCFCE7", color: "#16A34A" }
    if (key === "pending") return { backgroundColor: "#FEF3C7", color: "#92400E" }
    if (key === "cancelled") return { backgroundColor: "#FEE2E2", color: "#DC2626" }
    return { backgroundColor: "#F1F5F9", color: "#64748B" }
  }

  const formatStatusLabel = (status) => {
    const key = getCsrStatusKey(status)
    return key.charAt(0).toUpperCase() + key.slice(1)
  }

  const clientOptions = useMemo(() => {
    return Array.from(new Set(csrs.map((csr) => csr.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [csrs])

  const filteredCsrs = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const searchTerm = search.trim().toLowerCase()

    const matchesDateRange = (value, fallback) => {
      if (dateFilter === "All Time") return true
      const date = new Date(value || fallback || 0)
      if (Number.isNaN(date.getTime())) return false
      if (dateFilter === "This Month") return date >= currentMonthStart
      if (dateFilter === "Last Month") return date >= lastMonthStart && date <= lastMonthEnd
      if (dateFilter === "This Year") return date >= currentYearStart
      return true
    }

    const sorted = csrs.filter((csr) => {
      const matchesSearch = !searchTerm
        || csr.csr_number?.toLowerCase().includes(searchTerm)
        || csr.client_name?.toLowerCase().includes(searchTerm)
        || csr.equipment_type?.toLowerCase().includes(searchTerm)
        || csr.make?.toLowerCase().includes(searchTerm)
      const matchesClient = clientFilter === "All" || (csr.client_name || "") === clientFilter
      const matchesStatus = statusFilter === "All" || getCsrStatusKey(csr.status) === statusFilter.toLowerCase()
      const matchesDate = matchesDateRange(csr.date, csr.created_at)
      return matchesSearch && matchesClient && matchesStatus && matchesDate
    })

    sorted.sort((a, b) => {
      const aDate = new Date(a.date || a.created_at || 0)
      const bDate = new Date(b.date || b.created_at || 0)
      if (sortBy === "Oldest") return aDate - bDate
      return bDate - aDate
    })

    return sorted
  }, [clientFilter, csrs, dateFilter, search, sortBy, statusFilter])

  const resetFilters = () => {
    setSearch("")
    setClientFilter("All")
    setStatusFilter("All")
    setDateFilter("All Time")
    setSortBy("Newest")
  }

  const handleDelete = async (csr) => {
    const confirmed = window.confirm("Delete this CSR permanently? This cannot be undone.")
    if (!confirmed) return
    await supabase.from("csrs").delete().eq("id", csr.id)
    setOpenMenuId(null)
    await fetchCsrs()
  }

  const filterSelectClass = "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none"
  const hasActiveFilters =
    !!search || clientFilter !== "All" || statusFilter !== "All" || dateFilter !== "All Time"

  return (
    <Layout title="Customer Service Reports">
      <div className="space-y-5">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Customer Service Reports</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94A3B8" }}>
              {csrs.length} report{csrs.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            onClick={() => navigate("/csr/new")}
            style={{
              backgroundColor: "#0F172A",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + New CSR
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CSRs, clients, or equipment..."
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 outline-none"
          />
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Client</span>
              <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={filterSelectClass}>
                <option>All</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                {["All", "Draft", "Completed", "Pending", "Cancelled"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Date</span>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={filterSelectClass}>
                {["All Time", "This Month", "Last Month", "This Year"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                {["Newest", "Oldest"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <button
              onClick={resetFilters}
              className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-bold uppercase text-zinc-500 transition hover:bg-zinc-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-3 pb-24">
            {loading ? (
              <Card className="rounded-3xl border-zinc-200 bg-zinc-50">
                <CardContent className="p-5 text-sm text-zinc-500">
                  Loading service reports...
                </CardContent>
              </Card>
            ) : filteredCsrs.length === 0 ? (
              <Card className="rounded-3xl border-zinc-200 bg-zinc-50">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-zinc-900">
                    {hasActiveFilters ? "No service reports found" : "No service reports yet"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {hasActiveFilters ? "Try a different search or filter." : "Create your first CSR to start tracking service activity."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredCsrs.map((csr) => (
                <div key={csr.id} className="flex items-start gap-2">
                  <Card className="flex-1 overflow-hidden rounded-[24px] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 shadow-sm">
                    <CardContent className="p-4">
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate("/csr/" + csr.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[17px] font-semibold tracking-tight text-zinc-900">
                              {csr.csr_number}
                            </div>
                            <div className="mt-1 truncate text-sm text-zinc-700">
                              {csr.client_name || "No client name"}
                            </div>
                          </div>

                          <span
                            className="rounded-full px-3 py-1 text-[10px] font-semibold whitespace-nowrap"
                            style={getCsrStatusBadgeStyle(csr.status)}
                          >
                            {formatStatusLabel(csr.status)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                              Equipment
                            </div>
                            <div className="mt-1 truncate font-medium text-zinc-800">
                              {csr.equipment_type || "-"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                              Date
                            </div>
                            <div className="mt-1 font-medium text-zinc-800">
                              {csr.date || "-"}
                            </div>
                          </div>
                        </div>

                        {csr.make && (
                          <div className="mt-3 truncate text-sm text-zinc-500">
                            {csr.make}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === csr.id ? null : csr.id)
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-sm"
                    >
                      •••
                    </button>
                    {openMenuId === csr.id && (
                      <div className="absolute right-0 top-12 z-20 w-36 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                        <button onClick={() => { setOpenMenuId(null); navigate("/csr/" + csr.id) }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">View</button>
                        <button onClick={() => { setOpenMenuId(null); navigate("/csr/edit/" + csr.id) }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">Edit</button>
                        <button onClick={() => handleDelete(csr)} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <Card className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                <div className="text-sm font-semibold text-zinc-900">
                  CSR List
                </div>
                <div className="text-xs text-zinc-500">
                  {filteredCsrs.length} record{filteredCsrs.length === 1 ? "" : "s"}
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-zinc-500">
                  Loading service reports...
                </div>
              ) : filteredCsrs.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-zinc-900">
                    No service reports found
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Try a different search or filter.
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-white hover:bg-white">
                      <TableHead className="h-12 text-zinc-500">CSR No.</TableHead>
                      <TableHead className="text-zinc-500">Date</TableHead>
                      <TableHead className="text-zinc-500">Client</TableHead>
                      <TableHead className="text-zinc-500">Equipment</TableHead>
                      <TableHead className="text-zinc-500">Status</TableHead>
                      <TableHead className="text-right text-zinc-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                  {filteredCsrs.map((csr) => (
                      <TableRow
                        key={csr.id}
                        onClick={() => navigate("/csr/" + csr.id)}
                        className="cursor-pointer border-zinc-200 hover:bg-zinc-50/80"
                      >
                        <TableCell className="font-semibold text-zinc-900">
                          {csr.csr_number}
                        </TableCell>

                        <TableCell className="text-zinc-600">
                          {csr.date || "-"}
                        </TableCell>

                        <TableCell className="font-medium text-zinc-800">
                          {csr.client_name || "-"}
                        </TableCell>

                        <TableCell className="text-zinc-600">
                          {csr.equipment_type || "-"}
                          {csr.make ? ` — ${csr.make}` : ""}
                        </TableCell>

                        <TableCell>
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium"
                            style={getCsrStatusBadgeStyle(csr.status)}
                          >
                            {formatStatusLabel(csr.status)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(openMenuId === csr.id ? null : csr.id)
                              }}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-50"
                            >
                              •••
                            </button>
                            {openMenuId === csr.id && (
                              <div className="absolute right-0 top-10 z-20 w-36 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                <button onClick={() => { setOpenMenuId(null); navigate("/csr/" + csr.id) }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">View</button>
                                <button onClick={() => { setOpenMenuId(null); navigate("/csr/edit/" + csr.id) }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">Edit</button>
                                <button onClick={() => handleDelete(csr)} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {isMobile && (
          <button
            onClick={() => navigate("/csr/new")}
            className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)] transition hover:bg-black"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
    </Layout>
  )
}
