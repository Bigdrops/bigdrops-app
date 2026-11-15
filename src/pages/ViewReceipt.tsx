import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useEntity } from "@/lib/tenant/contexts"
import type { ReceiptRow } from "@/domain/receipt/types"
import { buildReceiptPreviewData } from "@/domain/receipt/previewModel"
import type { PdfDesignPreset } from "@/lib/pdfDesignPreset"
import { getPdfDesignPreset } from "@/lib/pdfDesignPreset"
import {
  CompositePdfDelivery, WebPdfDelivery, NativePdfDelivery, DefaultFeedbackBus,
  type PdfAsset,
} from "@/lib/pdf"
import { formatDisplayDate } from "@/lib/formatters/date"
import { formatNaira } from "@/lib/formatters/money"
import { feedback } from "@/lib/feedback"
import { userDownloadLocationLabel } from "@/lib/native/fileDownload"
import { CenteredSpinner } from "@/components/loading/AppLoadingStates"
import DocumentPage from "@/components/document-view/shared/DocumentPage"
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav"
import FloatingDownloadButton from "@/components/document-view/shared/FloatingDownloadButton"
import "@/components/document-view/shared/documentViewTheme.css"
import DocumentShareSheet from "@/components/document-view/shared/DocumentShareSheet"
import { uiSound } from "@/lib/uiSoundEvent"
import { resolveCanonicalLogoUrl } from "@/domain/documentMedia"
import type { DocumentSharePayload } from "@/domain/documentShare/types"
import { useSettings } from "@/hooks/useSettings"

// Download and share render the identical Forme document from the same prepared model.
async function renderReceiptPdfBlob(receipt: ReceiptRow, designPreset: PdfDesignPreset): Promise<Blob> {
  const [{ ReceiptFormeDocument }, { renderPdfcnToBlob }, { ensureFormeFontFamily }] = await Promise.all([
    import("@/components/pdf/forme/ReceiptFormeDocument"),
    import("@/components/pdf/pdfcn/adapter"),
    import("@/components/pdf/forme/fonts"),
  ])
  await Promise.all([
    ensureFormeFontFamily(designPreset.headerFont),
    ensureFormeFontFamily(designPreset.bodyFont),
  ])
  const model = buildReceiptPreviewData(receipt)
  return renderPdfcnToBlob(<ReceiptFormeDocument model={model} designPreset={designPreset} />)
}

function formatPrimitiveText(val: unknown, fallback = "-"): string {
  if (val == null) return fallback
  if (typeof val === "string") return val.trim() || fallback
  if (typeof val === "number") return String(val)
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      const items = val.map((v) => formatPrimitiveText(v, "")).filter(Boolean)
      return items.join(", ") || fallback
    }
    const obj = val as Record<string, unknown>
    const parts = [obj.address, obj.street, obj.city, obj.state, obj.name, obj.label, obj.value].filter(Boolean)
    if (parts.length > 0) return parts.map((p) => formatPrimitiveText(p, "")).join(", ")
    try {
      return JSON.stringify(val)
    } catch {
      return fallback
    }
  }
  return String(val)
}

export default function ViewReceipt() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { settings } = useSettings()
  const [receipt, setReceipt] = useState<ReceiptRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const designPreset = getPdfDesignPreset("receipt")

  const previewData = useMemo(() => (receipt ? buildReceiptPreviewData(receipt) : null), [receipt])

  const receiptSharePayload: DocumentSharePayload = useMemo(() => ({
    documentType: "receipt",
    documentId: String(receipt?.id || id || ""),
    documentNumber: String(receipt?.receipt_number || "Receipt"),
    documentTitle: `Payment Receipt for ${receipt?.invoice_number || "Invoice"}`,
    recipientName: String(receipt?.client_name || ""),
    recipientEmail: receipt?.client_email || "",
    issuerName: String(settings?.company_name || ""),
    issuerLogoUrl: resolveCanonicalLogoUrl(settings) || "",
    totalFormatted: formatNaira(Number(receipt?.payment_amount ?? 0)),
    issueDate: receipt?.payment_date || "",
    notes: (receipt as any)?.notes || "",
    fileName: `receipt-${receipt?.receipt_number || "receipt"}.pdf`,
    tenantId: (receipt as any)?.tenant_id || undefined,
    issuerPhone: settings?.phone || undefined,
    issuerAddress: settings?.address || undefined,
    getPdfBlob: () => {
      if (!receipt) return Promise.reject(new Error("Receipt not loaded"))
      return renderReceiptPdfBlob(receipt, designPreset)
    },
  }), [receipt, id, settings, designPreset])

  useEffect(() => {
    if (!id || !tenantClient.isReady) return
    setLoading(true)
    ;(async () => {
      try {
        const { data, error } = await tenantClient
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
  }, [id, navigate, tenantClient.isReady, tenantClient.schemaName])

  const handleDownload = useCallback(async () => {
    if (!receipt) return
    try {
      const fileName = `receipt-${receipt.receipt_number}.pdf`
      const blob = await renderReceiptPdfBlob(receipt, designPreset)
      const asset: PdfAsset = {
        blob,
        filename: fileName,
        mimeType: "application/pdf",
        sizeBytes: blob.size,
        documentType: "receipt",
        metadata: {},
      }

      const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
      const result = await delivery.deliver({ asset, mode: 'download' })

      const feedbackBus = new DefaultFeedbackBus()
      if (!result.success) {
        feedbackBus.emit({ kind: 'failed', documentType: 'receipt', timestamp: Date.now(), fileName, error: result.error })
        throw new Error(result.error ?? 'PDF delivery failed')
      }
      feedbackBus.emit({ kind: 'downloaded', documentType: 'receipt', timestamp: Date.now(), fileName })
      uiSound('hero.complete')
      feedback.success("Download ready", { description: `Receipt PDF saved to ${userDownloadLocationLabel()}.` })
    } catch (error) {
      feedback.error("Download failed", {
        description: error instanceof Error ? error.message : "Could not generate the receipt PDF.",
      })
    }
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
          onShare={() => setShareOpen(true)}
        />
      }
      floating={
        <FloatingDownloadButton
          label="Download Receipt PDF"
          onClick={handleDownload}
        />
      }
      overlays={
        <DocumentShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={receiptSharePayload}
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
            {formatPrimitiveText(receipt.status)}
          </span>
        </div>

        {/* Payment summary */}
        <div className="rounded-2xl border border-bd-border bg-bd-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-bd-text-muted">Amount Received</p>
          <p className="mt-1 text-3xl font-black text-bd-text">{formatNaira(receipt.payment_amount)}</p>
          {previewData?.amountInWords ? (
            <p className="mt-1 text-sm text-bd-text-muted italic">{formatPrimitiveText(previewData.amountInWords)}</p>
          ) : null}
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
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{formatPrimitiveText(receipt.void_reason)}</p>
          </div>
        )}
      </div>
    </DocumentPage>
  )
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between">
      <dt className="text-bd-text-muted">{label}</dt>
      <dd className="font-medium text-bd-text text-right max-w-[60%] truncate">{formatPrimitiveText(value)}</dd>
    </div>
  )
}
