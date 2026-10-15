import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  Ban,
  CheckCheck,
  ChevronDown,
  History,
  Pencil,
  RotateCcw,
} from 'lucide-react'

import Layout from '../components/Layout'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency } from '@/components/invoice/mobile/mobileFormPrimitives'

function isArchived(purchaseOrder: PurchaseOrder): boolean {
  return purchaseOrder.archived_at !== null && purchaseOrder.archived_at !== undefined
}

function statusBadgeClassName(purchaseOrder: PurchaseOrder): string {
  if (isArchived(purchaseOrder)) return 'bg-slate-100 text-slate-600'
  switch (purchaseOrder.status) {
    case 'draft':
      return 'bg-amber-100 text-amber-700'
    case 'issued':
      return 'bg-cyan-100 text-cyan-700'
    case 'cancelled':
      return 'bg-rose-100 text-rose-700'
    case 'closed':
      return 'bg-emerald-100 text-emerald-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
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
  const entityId = entity?.id ?? null

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [confirmTransition, setConfirmTransition] = useState<LifecycleConfirm>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { entries: historyEntries, loading: historyLoading, error: historyError } = useAuditTrail({
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
    setConfirmRestore(false)
    await refreshAfterMutation(data)
    feedback.success('Purchase order restored with its original status')
  }

  if (loading) {
    return (
      <Layout title="Purchase Order" session={null} hidePageHeader>
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </Layout>
    )
  }

  if (loadError || !purchaseOrder) {
    return (
      <Layout title="Purchase Order" session={null} hidePageHeader>
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
      </Layout>
    )
  }

  const archived = isArchived(purchaseOrder)
  const items = purchaseOrder.items ?? []
  const extraCharges = purchaseOrder.extra_charges ?? []

  return (
    <Layout title={`Purchase Order ${purchaseOrder.po_number}`} session={null} hidePageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 pb-24">
        {/* Identity hero */}
        <Card className="border-bd-border bg-bd-card-bg">
          <CardContent className="p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-bd-text-muted">
              Purchase Order
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black tracking-tight text-bd-text">
                {purchaseOrder.po_number}
              </h1>
              <Badge className={statusBadgeClassName(purchaseOrder)}>
                {archived ? 'Archived' : PURCHASE_ORDER_STATUS_LABELS[purchaseOrder.status]}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <div className="font-semibold uppercase tracking-wider text-bd-text-muted">Supplier</div>
                <div className="mt-0.5 truncate font-bold text-bd-text">{purchaseOrder.supplier_name || '—'}</div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider text-bd-text-muted">PO Date</div>
                <div className="mt-0.5 font-bold text-bd-text">{purchaseOrder.po_date || '—'}</div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider text-bd-text-muted">Currency</div>
                <div className="mt-0.5 font-bold text-bd-text">{purchaseOrder.currency}</div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider text-bd-text-muted">Total</div>
                <div className="mt-0.5 font-mono font-bold text-bd-text">{formatCurrency(purchaseOrder.total)}</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-bd-text-muted">
              Supplier snapshot frozen at creation. It never changes when the supplier directory changes.
            </div>
          </CardContent>
        </Card>

        {/* Lifecycle actions */}
        {canEdit && !archived && purchaseOrder.status === 'draft' && (
          <Card className="border-bd-border bg-bd-card-bg">
            <CardContent className="flex flex-wrap gap-2 p-4">
              <Button type="button" variant="outline" onClick={() => navigate(`/purchase-orders/edit/${purchaseOrder.id}`)}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit Draft
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setConfirmTransition({
                    toStatus: 'issued',
                    title: 'Issue this purchase order?',
                    description:
                      'Issuing freezes every line, cost, and term. The supplier snapshot and PO number become permanent history. You can still cancel or close it later.',
                    confirmLabel: 'Issue Purchase Order',
                  })
                }
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" /> Issue
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setConfirmTransition({
                    toStatus: 'cancelled',
                    title: 'Cancel this purchase order?',
                    description:
                      'Cancellation is terminal. A cancelled purchase order can never be reactivated or edited again.',
                    confirmLabel: 'Cancel Purchase Order',
                  })
                }
              >
                <Ban className="h-4 w-4" aria-hidden="true" /> Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmArchive(true)}>
                <Archive className="h-4 w-4" aria-hidden="true" /> Archive
              </Button>
            </CardContent>
          </Card>
        )}

        {canEdit && !archived && purchaseOrder.status === 'issued' && (
          <Card className="border-bd-border bg-bd-card-bg">
            <CardContent className="flex flex-wrap gap-2 p-4">
              <Button
                type="button"
                onClick={() =>
                  setConfirmTransition({
                    toStatus: 'closed',
                    title: 'Close this purchase order?',
                    description:
                      'Closing is terminal. A closed purchase order is kept as permanent history and can never be reopened.',
                    confirmLabel: 'Close Purchase Order',
                  })
                }
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Close
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setConfirmTransition({
                    toStatus: 'cancelled',
                    title: 'Cancel this purchase order?',
                    description:
                      'Cancellation is terminal. A cancelled purchase order can never be reactivated or edited again.',
                    confirmLabel: 'Cancel Purchase Order',
                  })
                }
              >
                <Ban className="h-4 w-4" aria-hidden="true" /> Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmArchive(true)}>
                <Archive className="h-4 w-4" aria-hidden="true" /> Archive
              </Button>
            </CardContent>
          </Card>
        )}

        {canEdit && !archived && (purchaseOrder.status === 'cancelled' || purchaseOrder.status === 'closed') && (
          <Card className="border-bd-border bg-bd-card-bg">
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <span className="text-xs text-bd-text-muted">
                This purchase order is {purchaseOrder.status} and terminal. It is kept as permanent history.
              </span>
              <Button type="button" variant="outline" onClick={() => setConfirmArchive(true)}>
                <Archive className="h-4 w-4" aria-hidden="true" /> Archive
              </Button>
            </CardContent>
          </Card>
        )}

        {canEdit && archived && (
          <Card className="border-bd-border bg-bd-card-bg">
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <span className="text-xs text-bd-text-muted">
                Archived purchase orders are read-only until restored. Restore keeps the original status
                ({PURCHASE_ORDER_STATUS_LABELS[purchaseOrder.status].toLowerCase()}).
              </span>
              <Button type="button" variant="outline" onClick={() => setConfirmRestore(true)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card className="border-bd-border bg-bd-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Line items · {items.length} {items.length === 1 ? 'item' : 'items'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {items.length === 0 ? (
              <div className="text-xs text-bd-text-muted">No items on this purchase order.</div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id || `po-item-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-bd-border bg-bd-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-bd-text">
                      {index + 1}. {item.description || 'Untitled item'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-bd-text-muted">
                      {item.quantity} {item.unit || 'units'} × {formatCurrency(item.unit_cost)}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-[13px] font-bold text-bd-text">
                    {formatCurrency(item.line_total)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Financial summary */}
        <Card className="border-bd-border bg-bd-card-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Financial summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-4 pt-0 text-xs">
            <div className="flex justify-between">
              <span className="text-bd-text-muted">Subtotal</span>
              <b className="font-mono text-bd-text">{formatCurrency(purchaseOrder.subtotal)}</b>
            </div>
            {purchaseOrder.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-bd-text-muted">Discount</span>
                <b className="font-mono text-bd-status-danger-text">-{formatCurrency(purchaseOrder.discount)}</b>
              </div>
            )}
            {extraCharges.map((charge, index) => (
              <div key={`po-charge-${index}`} className="flex justify-between">
                <span className="text-bd-text-muted">
                  {charge.label}
                  {charge.withTax ? ' · VAT applies' : ''}
                </span>
                <b className="font-mono text-bd-text">{formatCurrency(charge.value)}</b>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-bd-text-muted">VAT</span>
              <b className="font-mono text-bd-text">{formatCurrency(purchaseOrder.vat)}</b>
            </div>
            <div className="flex justify-between border-t border-bd-border pt-2 text-sm">
              <span className="font-bold text-bd-text">Total</span>
              <b className="font-mono text-bd-text">{formatCurrency(purchaseOrder.total)}</b>
            </div>
          </CardContent>
        </Card>

        {/* Notes and terms */}
        {(purchaseOrder.notes || purchaseOrder.terms) && (
          <Card className="border-bd-border bg-bd-card-bg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes and terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-xs">
              {purchaseOrder.notes && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-bd-text-muted">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-bd-text">{purchaseOrder.notes}</div>
                </div>
              )}
              {purchaseOrder.terms && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-bd-text-muted">Terms</div>
                  <div className="mt-1 whitespace-pre-wrap text-bd-text">{purchaseOrder.terms}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity history */}
        <Card className="border-bd-border bg-bd-card-bg">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-bd-text">
              <History className="h-4 w-4" aria-hidden="true" /> Activity and history
            </span>
            <ChevronDown className={`h-4 w-4 text-bd-text-muted transition-transform ${historyOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {historyOpen && (
            <CardContent className="space-y-2 p-4 pt-0">
              {historyLoading && <div className="text-xs text-bd-text-muted">Loading history…</div>}
              {!historyLoading && historyError && (
                <div className="text-xs text-bd-status-danger-text">{historyError}</div>
              )}
              {!historyLoading && !historyError && historyEntries.length === 0 && (
                <div className="text-xs text-bd-text-muted">No history recorded yet.</div>
              )}
              {!historyLoading &&
                !historyError &&
                historyEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-bd-text">
                      {entry.actorLabel} {entry.actionLabel}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-bd-text-muted">{entry.timestamp}</span>
                  </div>
                ))}
            </CardContent>
          )}
        </Card>
      </div>

      <ConfirmActionDialog
        open={confirmTransition !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTransition(null)
        }}
        title={confirmTransition?.title ?? ''}
        description={confirmTransition?.description ?? ''}
        confirmLabel={confirmTransition?.confirmLabel ?? 'Confirm'}
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

      <ConfirmActionDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Restore this purchase order?"
        description="The purchase order returns to active lists with its original lifecycle status."
        confirmLabel="Restore Purchase Order"
        onConfirm={() => void handleRestore()}
        loading={mutating}
      />
    </Layout>
  )
}
