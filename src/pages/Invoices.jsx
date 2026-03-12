import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import Layout from "../components/Layout"
import { useIsMobile } from "../hooks/useIsMobile"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")

  const navigate = useNavigate()
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })

    setInvoices(data || [])
    setLoading(false)
  }

  const filtered =
    filter === "All"
      ? invoices
      : invoices.filter(
          (i) => (i.status || "draft").toLowerCase() === filter.toLowerCase()
        )

  const statusVariant = (status) => {
    if (status === "paid") return "default"
    if (status === "sent") return "secondary"
    if (status === "overdue") return "destructive"
    return "outline"
  }

  const handleDelete = async (inv) => {
    if (!confirm("Delete " + inv.invoice_number + "?")) return

    await supabase.from("invoice_items").delete().eq("invoice_id", inv.id)
    await supabase.from("invoices").delete().eq("id", inv.id)

    setInvoices((prev) => prev.filter((i) => i.id !== inv.id))
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
      .map((i) => parseInt(i.invoice_number.replace("SASINV-B", "")))
      .filter((n) => !isNaN(n))

    const newNum = (nums.length ? Math.max(...nums) : 0) + 1
    const newNumber = "SASINV-B" + String(newNum).padStart(3, "0")

    const { id, created_at, ...fields } = inv

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

  return (
    <Layout title="Invoices">
      {/* Top bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {["All", "Draft", "Sent", "Paid", "Overdue"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>

        {!isMobile && (
          <Button onClick={() => navigate("/invoices/new")}>
            + New Invoice
          </Button>
        )}
      </div>

      {/* Mobile layout */}
      {isMobile ? (
        <div className="flex flex-col gap-3 pb-20">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No invoices yet</p>
          ) : (
            filtered.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-red-600">
                      {inv.invoice_number}
                    </span>
                    <span className="font-semibold">
                      NGN {Number(inv.total || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="font-medium">{inv.client_name}</div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {inv.issue_date || inv.date}
                    </span>

                    <Badge variant={statusVariant(inv.status)}>
                      {inv.status || "draft"}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/invoices/" + inv.id)}
                    >
                      View
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/invoices/" + inv.id + "/edit")}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(inv)}
                    >
                      Copy
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(inv)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Desktop table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="7">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7">
                      No invoices yet. Create your first one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell
                        className="font-bold text-red-600 cursor-pointer"
                        onClick={() => navigate("/invoices/" + inv.id)}
                      >
                        {inv.invoice_number}
                      </TableCell>

                      <TableCell>{inv.client_name}</TableCell>

                      <TableCell>{inv.issue_date}</TableCell>

                      <TableCell>{inv.due_date}</TableCell>

                      <TableCell className="text-right font-semibold">
                        NGN {Number(inv.total || 0).toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusVariant(inv.status)}>
                          {inv.status || "draft"}
                        </Badge>
                      </TableCell>

                      <TableCell className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/invoices/" + inv.id)}
                        >
                          View
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate("/invoices/" + inv.id + "/edit")
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(inv)}
                        >
                          Copy
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(inv)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Mobile floating button */}
      {isMobile && (
        <Button
          className="fixed bottom-20 right-5 rounded-full w-14 h-14 text-xl"
          onClick={() => navigate("/invoices/new")}
        >
          +
        </Button>
      )}
    </Layout>
  )
}