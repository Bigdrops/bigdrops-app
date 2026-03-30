import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Copy, Eye, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2, Wrench } from "lucide-react"

import ConfirmActionDialog from "@/components/ConfirmActionDialog"
import { supabase } from "../supabase"
import { toast } from "@/hooks/use-toast"
import Layout from "../components/Layout"
import PageIntro from "../components/layout/PageIntro"
import ListActionSheet from "../components/layout/ListActionSheet"
import { PageShell } from "../components/layout/PageShell"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"

function normalizeStatus(status) {
  return (status || "").trim().toLowerCase()
}

export default function CSR() {
  const navigate = useNavigate()

  const [csrs, setCsrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("All Time")
  const [sortBy, setSortBy] = useState("Newest")
  const [showFilters, setShowFilters] = useState(false)
  const [csrToDelete, setCsrToDelete] = useState(null)
  const [activeCsr, setActiveCsr] = useState(null)

  const fetchCsrs = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("csrs")
      .select("*")
      .order("created_at", { ascending: false })

    setCsrs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCsrs()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const getCsrStatusKey = (status) => {
    const normalized = normalizeStatus(status)
    if (!normalized) return "draft"
    if (normalized.includes("cancel")) return "cancelled"
    if (normalized.includes("complete")) return "completed"
    if (normalized.includes("pending")) return "pending"
    if (normalized.includes("draft")) return "draft"
    return normalized
  }

  const formatStatusLabel = (status) => {
    const key = getCsrStatusKey(status)
    return key.charAt(0).toUpperCase() + key.slice(1)
  }

  const formatCardDate = (value) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
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
    const { error } = await supabase.from("csrs").delete().eq("id", csr.id)
    if (error) {
      toast({ title: "Delete failed", description: "Unable to delete CSR right now. Please try again.", variant: "destructive" })
      return
    }
    setCsrToDelete(null)
    await fetchCsrs()
  }

  const handleClone = async (csr) => {
    const clonePayload = {
      ...csr,
      csr_number: `${csr.csr_number || "CSR"}-COPY`,
    }
    delete clonePayload.id
    delete clonePayload.created_at
    delete clonePayload.updated_at

    const { error } = await supabase.from("csrs").insert([clonePayload])
    if (error) {
      toast({ title: "Clone failed", description: "Unable to clone CSR right now.", variant: "destructive" })
      return
    }
    toast({ title: "CSR cloned", description: "A duplicate report was created." })
    setActiveCsr(null)
    await fetchCsrs()
  }

  const filterSelectClass = "h-10 rounded-[14px] border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none"
  const hasActiveFilters =
    !!search || clientFilter !== "All" || statusFilter !== "All" || dateFilter !== "All Time"

  return (
    <Layout title="Customer Service Reports" hidePageHeader>
      <PageShell className="pb-32">
        <PageIntro
          eyebrow="Service"
          title="Customer Service Reports"
          meta={`${csrs.length} reports total`}
          tone="amber"
          actions={
            <Button type="button" className="h-11 rounded-[14px] bg-slate-950 px-4 text-sm font-semibold" onClick={() => navigate("/csr/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          }
          toolbar={
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-11 flex-1 items-center gap-2 rounded-[14px] border border-border bg-white px-3 text-sm text-muted-foreground shadow-sm">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="button" variant="outline" size="icon-lg" className="rounded-[14px] bg-white" onClick={() => setShowFilters((prev) => !prev)} aria-label="Toggle filters">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {showFilters ? (
                <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Client</span>
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        {clientOptions.map((client) => (
                          <SelectItem key={client} value={client}>{client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Status</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["All", "Draft", "Completed", "Pending", "Cancelled"].map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Date</span>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["All Time", "This Month", "Last Month", "This Year"].map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Sort</span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className={filterSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Newest", "Oldest"].map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="h-10 rounded-[14px] border border-border px-4 text-xs font-bold uppercase text-muted-foreground transition hover:bg-muted/50"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : null}
            </div>
          }
        />

        {loading ? (
          <Card className="mt-4 rounded-[22px] border border-border bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]">
            <CardContent className="p-5 text-sm text-muted-foreground">
              Loading service reports...
            </CardContent>
          </Card>
        ) : filteredCsrs.length === 0 ? (
          <Card className="mt-4 rounded-[22px] border border-border bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]">
            <CardContent className="p-5 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-900 text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="text-base font-semibold text-foreground">
                {hasActiveFilters ? "No service reports found" : "No service reports yet"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? "Try a different search or filter." : "Create your first CSR to start tracking service activity."}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {filteredCsrs.map((csr) => (
              <Card
                key={csr.id}
                className="cursor-pointer rounded-[22px] border border-border bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-32px_rgba(15,23,42,0.42)]"
                onClick={() => navigate("/csr/" + csr.id)}
              >
                <CardContent className="p-4">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-amber-100 bg-amber-50 text-amber-700">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">CSR</div>
                      <div className="mt-1 text-[18px] font-extrabold tracking-[-0.03em] text-foreground">
                        {csr.csr_number || "-"}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{csr.client_name || "No client name"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveCsr(csr)
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-border bg-white text-muted-foreground shadow-sm"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {formatCardDate(csr.date)}
                    </span>
                    <span
                      className={
                        getCsrStatusKey(csr.status) === "completed"
                          ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      }
                    >
                      {formatStatusLabel(csr.status)}
                    </span>
                    {(csr.make || csr.equipment_type) ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {csr.make || csr.equipment_type}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate("/csr/new")}
          className="fixed bottom-28 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/20 bg-slate-950 text-white shadow-[0_22px_40px_-18px_rgba(15,23,42,0.65)] transition-transform hover:scale-110 sm:hidden"
        >
          <Plus size={32} />
        </button>
      </PageShell>
      <ConfirmActionDialog
        open={Boolean(csrToDelete)}
        onOpenChange={(open) => {
          if (!open) setCsrToDelete(null)
        }}
        title="Delete this CSR?"
        description="Delete this CSR permanently? This cannot be undone."
        confirmLabel="Delete CSR"
        onConfirm={() => {
          if (csrToDelete) void handleDelete(csrToDelete)
        }}
      />
      <ListActionSheet
        open={Boolean(activeCsr)}
        onOpenChange={(open) => {
          if (!open) setActiveCsr(null)
        }}
        eyebrow={activeCsr ? `CSR ${activeCsr.csr_number || ""}`.trim() : "CSR"}
        title={activeCsr?.client_name || "No client"}
        actions={activeCsr ? [
          {
            key: "view",
            label: "View",
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/csr/${activeCsr.id}`),
          },
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/csr/edit/${activeCsr.id}`),
          },
        ] : []}
        deleteAction={activeCsr ? {
          label: "Delete CSR",
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setCsrToDelete(activeCsr),
        } : undefined}
      />
    </Layout>
  )
}
