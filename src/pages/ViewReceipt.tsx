import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/supabase"
import type { ReceiptRow } from "@/domain/receipt/types"
import { buildReceiptPreviewData } from "@/domain/receipt/previewModel"
import ReceiptPdf from "@/components/pdf-new/ReceiptPdf"
import { registerPdfFonts } from "@/lib/pdfFontRegistry"
import { getPdfDesignPreset } from "@/lib/pdfDesignPreset"
import {
  DefaultPdfGenerator, CompositePdfDelivery, WebPdfDelivery, NativePdfDelivery, DefaultFeedbackBus,
} from "@/lib/pdf"
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatNaira } from "@/lib/formatters/money"
import { CenteredSpinner } from "@/components/loading/AppLoadingStates"
import DocumentPage from "@/components/document-view/shared/DocumentPage"
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav"
import FloatingDownloadButton from "@/components/document-view/shared/FloatingDownloadButton"
import "@/components/document-view/shared/documentViewTheme.css"

export default function ViewReceipt() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState<ReceiptRow | null>(null)
  const [loading, setLoading] = useState(true)
  const designPreset = getPdfDesignPreset("receipt")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from("receipts")
          .select("*")
          .eq("id", id)
          .maybeSingle()
        if (error) throw error
        setReceipt(data as ReceiptRow | null)
      } catch {
        navigate("/receipts")
      } finally {
        setLoading(false)
      }
    })()
  }, [id, navigate])

  const handleDownload = useCallback(async () => {
    if (!receipt) return
    registerPdfFonts()
    const model = buildReceiptPreviewData(receipt)
    const fileName = `receipt-${receipt.receipt_number}.pdf`

    const generator = new DefaultPdfGenerator(
      () => <ReceiptPdf model={model} designPreset={designPreset} />,
    )

    const asset = await generator.generate({
      template: 'receipt', model, filename: fileName, documentType: 'receipt',
    })

    const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
    const result = await delivery.deliver({ asset, mode: 'download' })

    const feedbackBus = new DefaultFeedbackBus()
    if (!result.success) {
      feedbackBus.emit({ kind: 'failed', documentType: 'receipt', timestamp: Date.now(), fileName, error: result.error })
      throw new Error(result.error ?? 'PDF delivery failed')
    }
    feedbackBus.emit({ kind: 'downloaded', documentType: 'receipt', timestamp: Date.now(), fileName })
  }, [receipt, designPreset])

  if (loading) return <CenteredSpinner />

  if (!receipt) {
    return (
      <DocumentPage>
        <div className="flex flex-col items-center justify-center py-20 text-bd-text-muted">
          <p className="text-sm font-medium">Receipt not found</p>
        </div>
      </DocumentPage>
    )
  }

  const previewData = buildReceiptPreviewData(receipt)
  const formatDate = (value: string | null | undefined) =>
    formatDisplayDate(value, {
      fallback: "-", invalidFallback: "-", locale: "en-GB",
      dateOptions: { day: "2-digit", month: "short", year: "numeric" },
    })

  return (
    <DocumentPage
      topNav={
        <DocumentTopNav
          title="Payment Receipt"
          subtitle={receipt.receipt_number}
          onBack={() => navigate("/receipts")}
        />
      }
      floating={
        <FloatingDownloadButton
          label="Download Receipt PDF"
          onClick={handleDownload}
        />
      }
    >
      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24 pt-4">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              receipt.status === "voided"
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            }`}
          >
            {receipt.status}
          </span>
        </div>

        {/* Payment summary */}
        <div className="rounded-2xl border border-bd-border bg-bd-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-bd-text-muted">Amount Received</p>
          <p className="mt-1 text-3xl font-black text-bd-text">{formatNaira(receipt.payment_amount)}</p>
          <p className="mt-1 text-sm text-bd-text-muted italic">{previewData.amountInWords}</p>
        </div>

        {/* Receipt details */}
        <div className="rounded-2xl border border-bd-border bg-bd-surface p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-bd-text-muted">Receipt Details</h3>
          <dl className="space-y-2 text-sm">
            <DetailRow label="Receipt No." value={receipt.receipt_number} />
            <DetailRow label="Payment Date" value={formatDate(receipt.payment_date)} />
            <DetailRow label="Payment Method" value={receipt.payment_method || "-"} />
            <DetailRow label="Payment Reference" value={receipt.payment_reference || "-"} />
            <DetailRow label="Invoice" value={receipt.invoice_number} />
            <DetailRow label="Currency" value={receipt.currency_code || "NGN"} />
          </dl>
        </div>

        {/* Client details */}
        <div className="rounded-2xl border border-bd-border bg-bd-surface p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-bd-text-muted">Client</h3>
          <dl className="space-y-2 text-sm">
            <DetailRow label="Name" value={receipt.client_name} />
            <DetailRow label="Address" value={receipt.client_address || "-"} />
            <DetailRow label="Phone" value={receipt.client_phone || "-"} />
            <DetailRow label="Email" value={receipt.client_email || "-"} />
          </dl>
        </div>

        {/* Void info */}
        {receipt.status === "voided" && receipt.void_reason && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Voided</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{receipt.void_reason}</p>
          </div>
        )}
      </div>
    </DocumentPage>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-bd-text-muted">{label}</dt>
      <dd className="font-medium text-bd-text text-right max-w-[60%] truncate">{value}</dd>
    </div>
  )
}
