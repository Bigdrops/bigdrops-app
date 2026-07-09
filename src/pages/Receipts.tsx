import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Copy, Eye, Receipt } from "lucide-react"
import Layout from "../components/Layout"
import ModuleShell from "@/components/layout/ModuleShell"
import ModuleRowCard from "@/components/layout/ModuleRowCard"
import { DocumentQueryProvider, useDocumentQuery } from "@/context/DocumentQueryContext"
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatNaira } from "@/lib/formatters/money"
import { feedback } from "@/lib/feedback"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ReceiptRow } from "@/domain/receipt/types"

function ReceiptsContent() {
  const { state, patchUpdate, reset, results, loading } = useDocumentQuery("receipts")
  const navigate = useNavigate()
  const [activeReceipt, setActiveReceipt] = useState<ReceiptRow | null>(null)

  const receipts = results as ReceiptRow[]

  const hasActiveFilters = (
    state.statuses.length > 0 ||
    state.dateRange.from !== null ||
    state.dateRange.to !== null ||
    state.amountRange.min !== null ||
    state.amountRange.max !== null
  )

  const formatDate = (value: string | null | undefined) =>
    formatDisplayDate(value, {
      fallback: "", invalidFallback: "", locale: "en-GB",
      dateOptions: { day: "2-digit", month: "short", year: "numeric" },
    })

  const renderRow = (receipt: ReceiptRow) => (
    <ModuleRowCard
      key={receipt.id}
      title={receipt.client_name || "No client"}
      subtitle={receipt.receipt_number}
      tertiary={formatDate(receipt.payment_date)}
      amount={formatNaira(receipt.payment_amount)}
      statusLabel={receipt.status === "voided" ? "VOIDED" : "ACTIVE"}
      statusClassName={receipt.status === "voided" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"}
      onClick={() => navigate(`/receipts/${receipt.id}`)}
      onActionClick={() => setActiveReceipt(receipt)}
    />
  )

  return (
    <>
      <ModuleShell
        eyebrow="Financial"
        title="Receipts"
        summary={`${receipts.length} receipts`}
        tone="emerald"
        searchValue={state.search}
        onSearchChange={(value) => patchUpdate({ search: value } as any)}
        searchPlaceholder="Search receipt number, invoice, or client..."
        hasActiveFilters={hasActiveFilters}
        onResetFilters={reset}
        records={receipts}
        renderRow={renderRow}
        emptyState={(
          <div className="rounded-[24px] border border-dashed border-bd-border bg-bd-surface/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-bold text-bd-text">No Receipts Found</div>
            <div className="mt-1 text-xs text-bd-text-muted max-w-[280px] mx-auto">
              Receipts are created automatically when payments are recorded on an invoice.
            </div>
          </div>
        )}
      />

      <Sheet open={Boolean(activeReceipt)} onOpenChange={(open) => { if (!open) setActiveReceipt(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {activeReceipt
                ? `${activeReceipt.client_name || "No client"} · ${activeReceipt.receipt_number}`
                : "Receipt"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-bd-text transition-colors hover:bg-bd-surface-muted"
              onClick={() => { if (activeReceipt) { navigate(`/receipts/${activeReceipt.id}`); setActiveReceipt(null) } }}
            >
              <Eye className="h-5 w-5 text-bd-text-muted" /> View Receipt
            </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-bd-text transition-colors hover:bg-bd-surface-muted"
                onClick={async () => {
                  if (activeReceipt) {
                    await navigator.clipboard.writeText(activeReceipt.receipt_number)
                    feedback.success("Receipt number copied")
                    setActiveReceipt(null)
                  }
                }}
              >
              <Copy className="h-5 w-5 text-bd-text-muted" /> Copy Receipt Number
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default function Receipts() {
  return (
    <Layout title="Receipts" hidePageHeader>
      <DocumentQueryProvider module="receipts">
        <ReceiptsContent />
      </DocumentQueryProvider>
    </Layout>
  )
}
