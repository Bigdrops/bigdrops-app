
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Plus, Wrench, ChevronDown, ChevronUp } from "lucide-react"

import { supabase } from "../supabase"
import Layout from "../components/Layout"
import { useIsMobile } from "../hooks/useIsMobile"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
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

function getStatusTone(status) {
  const normalized = normalizeStatus(status)

  if (normalized === "complete") {
    return "bg-zinc-900 text-white border-zinc-900"
  }

  if (normalized === "incomplete") {
    return "bg-zinc-200 text-zinc-800 border-zinc-200"
  }

  if (normalized === "pending for spares") {
    return "bg-zinc-100 text-zinc-700 border-zinc-200"
  }

  if (normalized === "under observation") {
    return "bg-zinc-800 text-zinc-100 border-zinc-800"
  }

  if (normalized === "field entry pending") {
    return "bg-white text-zinc-700 border-zinc-300"
  }

  return "bg-transparent text-zinc-600 border-zinc-300"
}

function getStatusCount(csrs, targetStatus) {
  return csrs.filter(
    (item) => normalizeStatus(item.status) === normalizeStatus(targetStatus)
  ).length
}

export default function CSR() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [csrs, setCsrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    fetchCsrs()
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

  const summary = useMemo(() => {
    return {
      total: csrs.length,
      complete: getStatusCount(csrs, "Complete"),
      pending: getStatusCount(csrs, "Pending for spares"),
      observation: getStatusCount(csrs, "Under observation"),
    }
  }, [csrs])

  const summaryCards = [
    {
      label: "Total",
      value: summary.total,
      tone:
        "bg-gradient-to-br from-zinc-900 to-zinc-700 text-white border-zinc-800",
    },
    {
      label: "Complete",
      value: summary.complete,
      tone: "bg-zinc-100 text-zinc-900 border-zinc-200",
    },
    {
      label: "Pending",
      value: summary.pending,
      tone: "bg-white text-zinc-900 border-zinc-200",
    },
    {
      label: "Observe",
      value: summary.observation,
      tone: "bg-zinc-200/70 text-zinc-900 border-zinc-300",
    },
  ]

  return (
    <Layout title="Customer Service Reports">
      <div className="space-y-5">
        <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Service Operations
              </div>
              <div className="text-2xl font-semibold tracking-tight text-zinc-950">
                Track customer service activity clearly
              </div>
              <div className="text-sm text-zinc-600">
                Review service status, monitor pending work, and create reports quickly.
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => navigate("/csr/new")}
                className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-black"
              >
                <Plus className="mr-2 h-4 w-4" />
                New CSR
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/csr/new?type=field")}
                className="h-11 rounded-xl border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
              >
                <Wrench className="mr-2 h-4 w-4" />
                Field CSR
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Summary</div>
              <div className="text-xs text-zinc-500">
                Quick view of service activity
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowSummary((prev) => !prev)}
              className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {showSummary ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show
                </>
              )}
            </Button>
          </div>

          {showSummary && (
            <div className="grid grid-cols-4 gap-2 lg:gap-3">
              {summaryCards.map((item) => (
                <Card
                  key={item.label}
                  className={`rounded-2xl border shadow-sm ${item.tone}`}
                >
                  <CardContent className="p-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] opacity-70">
                      {item.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-tight lg:text-2xl">
                      {item.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {isMobile ? (
          <div className="space-y-3 pb-24">
            {loading ? (
              <Card className="rounded-3xl border-zinc-200 bg-zinc-50">
                <CardContent className="p-5 text-sm text-zinc-500">
                  Loading service reports...
                </CardContent>
              </Card>
            ) : csrs.length === 0 ? (
              <Card className="rounded-3xl border-zinc-200 bg-zinc-50">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-zinc-900">
                    No service reports yet
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Create your first CSR to start tracking service activity.
                  </div>
                </CardContent>
              </Card>
            ) : (
              csrs.map((csr) => (
                <Card
                  key={csr.id}
                  className="overflow-hidden rounded-[24px] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 shadow-sm"
                >
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

                        <Badge
                          className={`rounded-full border px-3 py-1 text-[10px] font-medium whitespace-nowrap ${getStatusTone(
                            csr.status
                          )}`}
                        >
                          {csr.status || "Unknown"}
                        </Badge>
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
                  {csrs.length} record{csrs.length === 1 ? "" : "s"}
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-zinc-500">
                  Loading service reports...
                </div>
              ) : csrs.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-zinc-900">
                    No service reports yet
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Create your first CSR to populate this list.
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
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {csrs.map((csr) => (
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
                          <Badge
                            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${getStatusTone(
                              csr.status
                            )}`}
                          >
                            {csr.status || "Unknown"}
                          </Badge>
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