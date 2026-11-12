/**
 * Production Purchase Order view.
 *
 * Layout promoted from the approved Design Lab concept (two-region workspace,
 * persistent sidebar, proportioned items table, mobile item cards). Every
 * read comes from the tenant service; every action goes through the existing
 * lifecycle/archive services and the shared ConfirmActionDialog. No fixture
 * data, no local-state simulation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ConfirmActionDialog from '../components/ConfirmActionDialog'
import DocumentShareSheet from '@/components/document-view/shared/DocumentShareSheet'
import type { DocumentSharePayload } from '@/domain/documentShare/types'
import PurchaseOrderDocumentView from '@/components/document-view/purchase-order/PurchaseOrderDocumentView'
import PurchaseOrderMoreSheet from '@/components/document-view/purchase-order/PurchaseOrderMoreSheet'
import PurchaseOrderCustomizeSheet, {
  DEFAULT_PO_CUSTOMIZE,
  type PoCustomizeState,
} from '@/components/document-view/purchase-order/PurchaseOrderCustomizeSheet'
import { SkeletonCard } from '@/components/loading/AppLoadingStates'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'
import { invalidateListCache, purchaseOrderListCacheKey } from '@/lib/cache/listCache'
import useAuditTrail from '@/hooks/useAuditTrail'
import {
  archivePurchaseOrder,
  getPurchaseOrder,
  restorePurchaseOrder,
} from '@/modules/purchase-order/purchaseOrderService'
import { transitionPurchaseOrderStatus } from '@/modules/purchase-order/purchaseOrderTransitions'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/domain/purchase-order/types'
import { useSettings } from '@/hooks/useSettings'
import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import { preparePurchaseOrderDocument } from '@/domain/pdf/resolver/commercial/preparePurchaseOrderDocument'
import { generatePurchaseOrderPdf, generatePurchaseOrderPdfBlob } from '@/components/pdf'
import { formatNaira } from '@/lib/formatters/money'

function isArchived(purchaseOrder: PurchaseOrder): boolean {
  return purchaseOrder.archived_at !== null && purchaseOrder.archived_at !== undefined
}

const sanitizeStr = (value: unknown) => String(value ?? '').trim()
const nullableStr = (value: unknown) => {
  const s = sanitizeStr(value)
  return s.length > 0 ? s : null
}

type LifecycleConfirm = {
  toStatus: PurchaseOrderStatus
  title: string
  description: string
  confirmLabel: string
} | null

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { entity, tenantClient } = useEntity()
  const { hasAuthorization } = useAuthorization()
  const canEdit = hasAuthorization('purchase_order', 'edit')
  const canArchive = hasAuthorization('purchase_order', 'edit')
  const entityId = entity?.id ?? null

  const { settings } = useSettings()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [confirmTransition, setConfirmTransition] = useState<LifecycleConfirm>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [activitySignal, setActivitySignal] = useState(0)
  const [customize, setCustomize] = useState<PoCustomizeState>(DEFAULT_PO_CUSTOMIZE)

  const { entries, loading: historyLoading, error: historyError } = useAuditTrail({
    entityType: 'purchase_order',
    entityId: id ?? '',
    enabled: historyOpen && Boolean(id),
  })

  const load = useCallback(async () => {
    if (!id || !tenantClient.isReady) return
    setLoading(true)
    const result = await getPurchaseOrder(tenantClient, id)
    if (result.error || !result.data) {
      setLoadError(result.error || 'Purchase order not found')
      setLoading(false)
      return
    }
    setPurchaseOrder(result.data)
    setLoadError(null)
    setLoading(false)
  }, [id, tenantClient.isReady, tenantClient])

  useEffect(() => {
    void load()
  }, [load])

  const invalidatePurchaseOrdersCache = () => {
    if (tenantClient.schemaName) invalidateListCache(purchaseOrderListCacheKey(tenantClient.schemaName))
  }

  const refreshAfterMutation = useCallback(
    async (updated: PurchaseOrder) => {
      setPurchaseOrder(updated)
      invalidatePurchaseOrdersCache()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantClient.schemaName],
  )

  const handleTransition = async (toStatus: PurchaseOrderStatus) => {
    if (!id) return
    setMutating(true)
    const { data, error } = await transitionPurchaseOrderStatus(tenantClient, entityId, {
      purchaseOrderId: id,
      toStatus,
    })
    setMutating(false)
    if (error || !data) {
      feedback.error(getUserFacingMutationMessage(error || 'Status change failed', { action: 'save' }))
      void load()
      return
    }
    setConfirmTransition(null)
    feedback.success(`Purchase order ${PURCHASE_ORDER_STATUS_LABELS[toStatus].toLowerCase()}`)
    void load()
  }

  const handleArchive = async () => {
    if (!id) return
    setMutating(true)
    const { data, error } = await archivePurchaseOrder(tenantClient, id)
    setMutating(false)
    if (error || !data) {
      feedback.error(getUserFacingMutationMessage(error || 'Archive failed', { action: 'save' }))
      return
    }
    setConfirmArchive(false)
    await refreshAfterMutation(data)
    feedback.success('Purchase order archived')
  }

  const handleRestore = async () => {
    if (!id) return
    setMutating(true)
    const { data, error } = await restorePurchaseOrder(tenantClient, id)
    setMutating(false)
    if (error || !data) {
      feedback.error(getUserFacingMutationMessage(error || 'Restore failed', { action: 'save' }))
      return
    }
    await refreshAfterMutation(data)
    feedback.success('Purchase order restored with its original status')
  }

  const rawSettings = (settings || {}) as Record<string, unknown>
  const prepared = useMemo(() => {
    if (!purchaseOrder) return null
    return preparePurchaseOrderDocument(purchaseOrder, { settings: rawSettings })
  }, [purchaseOrder, rawSettings])

  const requestDownload = async () => {
    if (!prepared) return
    try {
      setDownloadingPdf(true)
      await generatePurchaseOrderPdf({
        model: prepared,
        templateId: customize.templateId,
        compact: customize.compact,
      })
      feedback.success('Purchase order PDF downloaded')
    } catch (err: any) {
      feedback.error('Failed to generate PDF: ' + (err?.message || String(err)))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const poSharePayload: DocumentSharePayload | undefined = useMemo(() => {
    if (!purchaseOrder || !prepared) return undefined
    const total = Number(purchaseOrder.total || 0)
    return {
      documentType: 'purchase_order',
      documentId: String(purchaseOrder.id || ''),
      documentNumber: purchaseOrder.po_number || 'Purchase Order',
      documentTitle: 'Purchase Order',
      recipientName: String(purchaseOrder.supplier_name || ''),
      recipientEmail: '',
      issuerName: String(rawSettings.company_name || ''),
      issuerLogoUrl: resolveCanonicalLogoUrl(rawSettings) || '',
      totalFormatted: formatNaira(total),
      issueDate: purchaseOrder.po_date || '',
      notes: purchaseOrder.notes || '',
      fileName: `${purchaseOrder.po_number || 'purchase-order'}.pdf`,
      tenantId: undefined,
      issuerPhone: nullableStr(rawSettings.company_phone) || undefined,
      issuerAddress: nullableStr(rawSettings.company_address) || undefined,
      paymentStatus: purchaseOrder.status || undefined,
      getPdfBlob: async () => {
        const blobResult = await generatePurchaseOrderPdfBlob({
          model: prepared,
          templateId: customize.templateId,
          compact: customize.compact,
        })
        return blobResult.blob
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrder, prepared, customize.templateId, customize.compact, entity?.id])

  const handlePrint = () => window.print()

  const handleCopyReference = useCallback(async () => {
    if (!purchaseOrder) return
    try {
      await navigator.clipboard.writeText(purchaseOrder.po_number)
      feedback.success('PO reference copied')
    } catch {
      feedback.info('Clipboard unavailable')
    }
  }, [purchaseOrder])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (loadError || !purchaseOrder) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <div className="text-sm font-bold text-foreground">Purchase order could not load</div>
        <div className="mt-1 text-xs text-muted-foreground">{loadError}</div>
        <button
          type="button"
          onClick={() => navigate('/purchase-orders')}
          className="mt-4 h-10 rounded-xl border border-bd-border bg-bd-surface px-4 text-xs font-bold text-bd-text"
        >
          Back to Purchase Orders
        </button>
      </div>
    )
  }

  const archived = isArchived(purchaseOrder)
  const items = purchaseOrder.items ?? []
  const extraCharges = purchaseOrder.extra_charges ?? []
  const vatPercent = Number(purchaseOrder.calculation_inputs?.vatPercent ?? 0)

  const addressLines = [
    nullableStr(rawSettings.company_address),
    [nullableStr(rawSettings.company_city), nullableStr(rawSettings.company_state)].filter(Boolean).join(', '),
  ].filter(Boolean) as string[]

  return (
    <>
      <PurchaseOrderDocumentView
        vm={{
          poNumber: purchaseOrder.po_number,
          poDate: purchaseOrder.po_date,
          status: purchaseOrder.status,
          archived,
          currency: purchaseOrder.currency,
          notes: purchaseOrder.notes,
          terms: purchaseOrder.terms,
          supplierName: purchaseOrder.supplier_name,
          issuer: {
            name: sanitizeStr(rawSettings.company_name) || 'Your Company',
            tagline: nullableStr(rawSettings.company_tagline),
            tin: nullableStr(rawSettings.company_tax_id || rawSettings.company_tin),
            addressLines,
            phone: nullableStr(rawSettings.company_phone),
            email: nullableStr(rawSettings.company_email),
            logoUrl: resolveCanonicalLogoUrl(rawSettings),
          },
          items: items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: Number(item.unit_cost || 0),
            line_total: Number(item.line_total || 0),
          })),
          totals: {
            subtotal: Number(purchaseOrder.subtotal || 0),
            discount: Number(purchaseOrder.discount || 0),
            extraCharges: extraCharges.map((charge) => ({
              label: charge.label,
              value: Number(charge.value || 0),
              withTax: charge.withTax === true,
            })),
            vat: Number(purchaseOrder.vat || 0),
            vatPercent,
            total: Number(purchaseOrder.total || 0),
          },
          activity: { entries, loading: historyLoading, error: historyError },
          activityOpenSignal: activitySignal,
          canEdit,
          showAmountInWords: customize.showAmountInWords,
          showSignatories: customize.showSignatories,
        }}
        handlers={{
          onBack: () => navigate('/purchase-orders'),
          onShare: () => setShareOpen(true),
          onCustomize: () => setCustomizeOpen(true),
          onMore: () => setMoreOpen(true),
          onDownloadPdf: () => void requestDownload(),
          onIssue: () =>
            setConfirmTransition({
              toStatus: 'issued',
              title: 'Issue this purchase order?',
              description:
                'Issuing freezes every line, cost, and term. The supplier snapshot and PO number become permanent history. You can still cancel or close it later.',
              confirmLabel: 'Issue Purchase Order',
            }),
          onClose: () =>
            setConfirmTransition({
              toStatus: 'closed',
              title: 'Close this purchase order?',
              description:
                'Closing is terminal. A closed purchase order is kept as permanent history and can never be reopened.',
              confirmLabel: 'Close Purchase Order',
            }),
          onCancel: () =>
            setConfirmTransition({
              toStatus: 'cancelled',
              title: 'Cancel this purchase order?',
              description: 'Cancellation is terminal. A cancelled purchase order can never be reactivated or edited again.',
              confirmLabel: 'Cancel Purchase Order',
            }),
          onArchive: () => setConfirmArchive(true),
          onRestore: () => void handleRestore(),
          onEdit: () => navigate(`/purchase-orders/edit/${purchaseOrder.id}`),
        }}
      />

      <PurchaseOrderMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        poNumber={purchaseOrder.po_number}
        archived={archived}
        canEdit={canArchive}
        onPrint={handlePrint}
        onCopyReference={() => void handleCopyReference()}
        onViewActivity={() => {
          setHistoryOpen(true)
          setActivitySignal((n) => n + 1)
        }}
        onArchiveToggle={() => {
          setMoreOpen(false)
          if (archived) {
            void handleRestore()
            return
          }
          setConfirmArchive(true)
        }}
        onCancel={() =>
          setConfirmTransition({
            toStatus: 'cancelled',
            title: 'Cancel this purchase order?',
            description: 'Cancellation is terminal. A cancelled purchase order can never be reactivated or edited again.',
            confirmLabel: 'Cancel Purchase Order',
          })
        }
      />

      <PurchaseOrderCustomizeSheet
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        value={customize}
        onChange={setCustomize}
        onReset={() => setCustomize(DEFAULT_PO_CUSTOMIZE)}
      />

      {poSharePayload && (
        <DocumentShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={poSharePayload}
        />
      )}

      <ConfirmActionDialog
        open={confirmTransition !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTransition(null)
        }}
        title={confirmTransition?.title ?? ''}
        description={confirmTransition?.description ?? ''}
        confirmLabel={confirmTransition?.confirmLabel ?? 'Confirm'}
        variant={confirmTransition?.toStatus === 'cancelled' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmTransition) void handleTransition(confirmTransition.toStatus)
        }}
        loading={mutating}
      />

      <ConfirmActionDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this purchase order?"
        description="The purchase order is hidden from active lists. Its items, totals, and supplier snapshot are kept exactly as they are. You can restore it later."
        confirmLabel="Archive Purchase Order"
        onConfirm={() => void handleArchive()}
        loading={mutating}
      />
    </>
  )
}
