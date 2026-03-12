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
  return `NGN ${Number(value || 0).toLocaleString()}`
}

function getStatusTone(status) {
  const normalized = (status || "draft").toLowerCase()

  if (normalized === "paid") {
    return "bg-zinc-900 text-white border-zinc-900"
  }

  if (normalized === "sent") {
    return "bg-zinc-200 text-zinc-800 border-zinc-200"
  }

  if (normalized === "overdue") {
    return "bg-zinc-800 text-zinc-100 border-zinc-800"
  }

  return "bg-transparent text-zinc-600 border-zinc-300"
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const [showSummary, setShowSummary] = useState(true)
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

    return invoices.filter(
      (invoice) =>
        (invoice.status || "draft").toLowerCase() === filter.toLowerCase()
    )
  }, [filter, invoices])

  const totals = useMemo(() => {
    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + (Number(inv.total) || 0),
      0
    )

    const totalDue = invoices
      .filter((inv) => (inv.status || "").toLowerCase() !== "paid")
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)

    const totalReceived = invoices
      .filter((inv) => (inv.status || "").toLowerCase() === "paid")
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)

    const totalVat = invoices.reduce(
      (sum, inv) => sum + (Number(inv.vat) || 0),
      0
    )

    return {
      totalInvoiced,
      totalDue,
      totalReceived,
      totalVat,
    }
  }, [invoices])

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete ${inv.invoice_number}? This cannot be undone.`)) {
      return
    }

    await supabase.from("invoice_items").delete().eq("invoice_id", inv.id)
    await supabase.from("invoices").delete().eq("id", inv.id)

    setInvoices((prev) => prev.filter((item) => item.id !== inv.id))
    setActiveInvoice(null)
  }

  const handleDuplicate = async (inv) => {
    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id)

    const { data: allInvs } = await supabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", "SASINV-B%")

    const nums = (allInvs || [])
      .map((item) => parseInt(item.invoice_number.replace("SASINV-B", "")))
      .filter((num) => !isNaN(num))

    const newNum = (nums.length ? Math.max(...nums) : 0) + 1
    const newNumber = "SASINV-B" + String(newNum).padStart(3, "0")

    const { id, created_at, ...fields } = inv

    setActiveInvoice(null)

    navigate("/invoices/new", {
      state: {
        prefill: {
          ...fields,
          invoice_number: newNumber,
          status: "draft",
          client_id: "",
          client_name: "",
        },
        prefillItems: itemsData || [],
      },
    })
  }

  const summaryItems = [
    {
      label: "Total Invoiced",
      value: totals.totalInvoiced,
      icon: FileText,
      tone:
        "bg-gradient-to-br from-zinc-900 to-zinc-700 text-white border-zinc-800",
      iconTone: "bg-white/10 text-white",
    },
    {
      label: "Amount Due",
      value: totals.totalDue,
      icon: Wallet,
      tone: "bg-zinc-100 text-zinc-900 border-zinc-200",
      iconTone: "bg-zinc-900 text-white",
    },
    {
      label: "Received",
      value: totals.totalReceived,
      icon: Receipt,
      tone: "bg-white text-zinc-900 border-zinc-200",
      iconTone: "bg-zinc-800 text-white",
    },
    {
      label: "VAT",
      value: totals.totalVat,
      icon: FileText,
      tone: "bg-zinc-200/70 text-zinc-900 border-zinc-300",
      iconTone: "bg-zinc-900 text-white",
    },
  ]

  const mobileActions = activeInvoice
    ? [
        {
          label: "Open",
          icon: Eye,
          onClick: () => {
            const id = activeInvoice.id
            setActiveInvoice(null)
            navigate("/invoices/" + id)
          },
        },
        {
          label: "Edit",
          icon: Pencil,
          onClick: () => {
            const id = activeInvoice.id
            setActiveInvoice(null)
            navigate("/invoices/" + id + "/edit")
          },
        },
        {
          label: "Duplicate",
          icon: Copy,
          onClick: () => handleDuplicate(activeInvoice),
        },
        {
          label: "Delete",
          icon: Trash2,
          danger: true,
          onClick: () => handleDelete(activeInvoice),
        },
      ]
    : []

  return (
    <Layout title="Invoices">
      <div className="space-y-5">
        <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Invoice Management
              </div>
              <div className="text-2xl font-semibold tracking-tight text-zinc-950">
                Keep billing organized and visible
              </div>
              <div className="text-sm text-zinc-600">
                Review invoice status, duplicate records, and manage follow-up in one place.
              </div>
            </div>

            {!isMobile && (
              <Button
                onClick={() => navigate("/invoices/new")}
                className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-black"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["All", "Draft", "Sent", "Paid", "Overdue"].map((item) => {
              const active = filter === item

              return (
                <Button
                  key={item}
                  variant="outline"
                  onClick={() => setFilter(item)}
                  className={
                    active
                      ? "rounded-full border-zinc-900 bg-zinc-900 text-white hover:bg-black hover:text-white"
                      : "rounded-full border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }
                >
                  {item}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Summary</div>
              <div className="text-xs text-zinc-500">
                Quick view of invoice performance
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowSummary((prev) => !prev)}
              className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {showSummary ? "Hide" : "Show"}
            </Button>
          </div>

          {showSummary && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {summaryItems.map((item) => {
                const Icon = item.icon

                return (
                  <Card
                    key={item.label}
                    className={`rounded-3xl border shadow-sm ${item.tone}`}
                  >
                    <CardContent className="p-4">
                      <div
                        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconTone}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="text-[11px] uppercase tracking-[0.16em] opacity-70">
                        {item.label}
                      </div>
                      <div className="mt-2 text-lg font-semibold tracking-tight">
                        {formatCurrency(item.value)}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {isMobile ? (
          <div className="space-y-3 pb-24">
            {loading ? (
              <Card className="rounded-3xl border-zinc-200 bg-zinc-50">
                <CardContent className="p-6 text-sm text-zinc-500">
                  Loading invoices...
                </CardContent>
              </Card>
            ) : filteredInvoices.length === 0 ? (
              <Card className="rounded-3xl border-zinc-200 bg-zinc-50">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-zinc-900">
                    No invoices yet
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Create your first invoice to start tracking billing.
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredInvoices.map((inv) => (
                <Card
                  key={inv.id}
                  className="overflow-hidden rounded-[26px] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => navigate("/invoices/" + inv.id)}
                      >
                        <div className="truncate text-[18px] font-semibold tracking-tight text-zinc-900 underline underline-offset-2">
                          {inv.invoice_number}
                        </div>
                        <div className="mt-2 truncate text-base text-zinc-700">
                          {inv.client_name || "No client name"}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Badge
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize ${getStatusTone(
                            inv.status
                          )}`}
                        >
                          {inv.status || "draft"}
                        </Badge>

                        <button
                          onClick={() => setActiveInvoice(inv)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="mt-4 grid grid-cols-2 gap-4 cursor-pointer"
                      onClick={() => navigate("/invoices/" + inv.id)}
                    >
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                          Amount
                        </div>
                        <div className="mt-1 text-[17px] font-semibold text-zinc-950">
                          {formatCurrency(inv.total)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                          Date
                        </div>
                        <div className="mt-1 text-[17px] font-medium text-zinc-800">
                          {inv.issue_date || inv.date || "-"}
                        </div>
                      </div>
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
                  Invoice List
                </div>
                <div className="text-xs text-zinc-500">
                  {filteredInvoices.length} record{filteredInvoices.length === 1 ? "" : "s"}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-white hover:bg-white">
                    <TableHead className="h-12 text-zinc-500">Invoice</TableHead>
                    <TableHead className="text-zinc-500">Client</TableHead>
                    <TableHead className="text-zinc-500">Issue Date</TableHead>
                    <TableHead className="text-zinc-500">Due Date</TableHead>
                    <TableHead className="text-right text-zinc-500">Amount</TableHead>
                    <TableHead className="text-zinc-500">Status</TableHead>
                    <TableHead className="w-[70px] text-right text-zinc-500">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="font-semibold text-zinc-900">
                            No invoices yet
                          </div>
                          <div className="text-sm text-zinc-500">
                            Create your first invoice to populate this table.
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className="border-zinc-200 hover:bg-zinc-50/80"
                      >
                        <TableCell
                          className="cursor-pointer font-semibold text-zinc-900"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          {inv.invoice_number}
                        </TableCell>

                        <TableCell
                          className="cursor-pointer text-zinc-700"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          {inv.client_name}
                        </TableCell>

                        <TableCell
                          className="cursor-pointer text-zinc-600"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          {inv.issue_date || "-"}
                        </TableCell>

                        <TableCell
                          className="cursor-pointer text-zinc-600"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          {inv.due_date || "-"}
                        </TableCell>

                        <TableCell
                          className="cursor-pointer text-right font-medium text-zinc-900"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          {formatCurrency(inv.total)}
                        </TableCell>

                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          <Badge
                            className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize ${getStatusTone(
                              inv.status
                            )}`}
                          >
                            {inv.status || "draft"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => navigate("/invoices/" + inv.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => navigate("/invoices/" + inv.id + "/edit")}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleDuplicate(inv)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleDelete(inv)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {isMobile && (
          <button
            onClick={() => navigate("/invoices/new")}
            className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)] transition hover:bg-black"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}

        {isMobile && activeInvoice && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/35"
              onClick={() => setActiveInvoice(null)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-zinc-200 bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-lg font-semibold text-zinc-950">Actions</div>
                  <div className="text-sm text-zinc-500">
                    {activeInvoice.invoice_number}
                  </div>
                </div>

                <button
                  onClick={() => setActiveInvoice(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-t border-zinc-200 px-4 py-3">
                <div className="space-y-1">
                  {mobileActions.map((action) => {
                    const Icon = action.icon

                    return (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          action.danger
                            ? "text-zinc-950 hover:bg-zinc-100"
                            : "text-zinc-800 hover:bg-zinc-100"
                        }`}
                      >
                        <Icon className="h-5 w-5 text-zinc-500" />
                        <span className="text-base">{action.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}