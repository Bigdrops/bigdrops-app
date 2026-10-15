import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntity, useAuthorization } from '../lib/tenant/contexts'
import Layout from '../components/Layout'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import { feedback } from '../lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import {
  invalidateListCache,
  isListCacheFresh,
  purchaseOrderListCacheKey,
  readListCache,
  writeListCache,
} from '@/lib/cache/listCache'

import MobileFab from '../components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'

import { Archive, Eye, Pencil, RotateCcw, ShoppingCart } from 'lucide-react'
import {
  archivePurchaseOrder,
  listPurchaseOrders,
  restorePurchaseOrder,
} from '@/modules/purchase-order/purchaseOrderService'
import { matchesPurchaseOrderQuery } from '@/domain/purchase-order/formAdapter'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/domain/purchase-order/types'
import { formatCurrency } from '@/components/invoice/mobile/mobileFormPrimitives'

const PURCHASE_ORDERS_LIST_CACHE_TTL_MS = 10 * 60 * 1000

type StatusFilter = 'Active' | 'Draft' | 'Issued' | 'Cancelled' | 'Closed' | 'Archived' | 'All'

function isArchivedPurchaseOrder(purchaseOrder: PurchaseOrder): boolean {
  return purchaseOrder.archived_at !== null && purchaseOrder.archived_at !== undefined
}

function getPurchaseOrderStatusLabel(purchaseOrder: PurchaseOrder): string {
  if (isArchivedPurchaseOrder(purchaseOrder)) return 'Archived'
  return PURCHASE_ORDER_STATUS_LABELS[purchaseOrder.status] ?? purchaseOrder.status
}

function statusBadgeClassName(purchaseOrder: PurchaseOrder): string {
  if (isArchivedPurchaseOrder(purchaseOrder)) return 'bg-slate-100 text-slate-600'
  switch (purchaseOrder.status as PurchaseOrderStatus) {
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

export default function PurchaseOrders() {
  const { tenantClient } = useEntity()
  const { hasAuthorization } = useAuthorization()
  const canView = hasAuthorization('purchase_order', 'view')
  const canCreate = hasAuthorization('purchase_order', 'create')
  const canEdit = hasAuthorization('purchase_order', 'edit')

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [query, setQuery] = useState<string>('')
  const [status, setStatus] = useState<StatusFilter>('Active')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [purchaseOrderToArchive, setPurchaseOrderToArchive] = useState<PurchaseOrder | null>(null)
  const [purchaseOrderToRestore, setPurchaseOrderToRestore] = useState<PurchaseOrder | null>(null)
  const [activePurchaseOrder, setActivePurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const schemaName = tenantClient.schemaName
    if (!schemaName || !canView) {
      setLoading(false)
      return
    }

    const cacheKey = purchaseOrderListCacheKey(schemaName)

    const fetchPurchaseOrders = async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true)
      }

      const { data, error } = await listPurchaseOrders(tenantClient, { includeArchived: true })

      if (!mounted) return
      if (error) {
        setStatusError(error)
        setLoading(false)
        return
      }

      const nextRows = data ?? []
      setStatusError(null)
      setPurchaseOrders(nextRows)
      if (nextRows.length > 0) {
        writeListCache(cacheKey, nextRows)
      }
      setLoading(false)
    }

    const cachedEntry = readListCache<PurchaseOrder>(cacheKey)

    if (cachedEntry) {
      setPurchaseOrders(cachedEntry.rows)
      setLoading(false)

      if (tenantClient.isReady && (!isListCacheFresh(cachedEntry, PURCHASE_ORDERS_LIST_CACHE_TTL_MS) || cachedEntry.rows.length === 0)) {
        void fetchPurchaseOrders({ background: true })
      }
    } else if (tenantClient.isReady) {
      void fetchPurchaseOrders()
    }

    return () => {
      mounted = false
    }
  }, [tenantClient.isReady, tenantClient.schemaName, canView])

  const filtered = useMemo(() => {
    return purchaseOrders.filter((purchaseOrder) => {
      const archived = isArchivedPurchaseOrder(purchaseOrder)
      const matchesStatus =
        status === 'All'
          ? true
          : status === 'Active'
            ? !archived && (purchaseOrder.status === 'draft' || purchaseOrder.status === 'issued')
            : status === 'Archived'
              ? archived
              : !archived && purchaseOrder.status === status.toLowerCase()
      return matchesStatus && matchesPurchaseOrderQuery(purchaseOrder, query)
    })
  }, [purchaseOrders, query, status])

  const refreshCache = useCallback(
    (rows: PurchaseOrder[]) => {
      setPurchaseOrders(rows)
      if (tenantClient.schemaName) {
        writeListCache(purchaseOrderListCacheKey(tenantClient.schemaName), rows)
      }
    },
    [tenantClient.schemaName],
  )

  const handleArchive = async (purchaseOrder: PurchaseOrder): Promise<void> => {
    try {
      setIsMutating(true)
      const { data, error } = await archivePurchaseOrder(tenantClient, String(purchaseOrder.id))
      if (error || !data) throw new Error(error || 'Archive failed')
      refreshCache(purchaseOrders.map((row) => (row.id === data.id ? { ...row, archived_at: data.archived_at } : row)))
      feedback.success('Purchase order archived')
      setPurchaseOrderToArchive(null)
      setActivePurchaseOrder(null)
    } catch (err) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsMutating(false)
    }
  }

  const handleRestore = async (purchaseOrder: PurchaseOrder): Promise<void> => {
    try {
      setIsMutating(true)
      const { data, error } = await restorePurchaseOrder(tenantClient, String(purchaseOrder.id))
      if (error || !data) throw new Error(error || 'Restore failed')
      refreshCache(purchaseOrders.map((row) => (row.id === data.id ? { ...row, archived_at: data.archived_at } : row)))
      feedback.success('Purchase order restored')
      setPurchaseOrderToRestore(null)
      setActivePurchaseOrder(null)
    } catch (err) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsMutating(false)
    }
  }

  const statusOptions: StatusFilter[] = ['Active', 'Draft', 'Issued', 'Cancelled', 'Closed', 'Archived', 'All']

  const filterOptions = [
    {
      label: 'Status',
      value: status,
      options: statusOptions,
      onChange: (value: string) => setStatus(value as StatusFilter),
    },
  ]

  const activeCount = purchaseOrders.filter((purchaseOrder) => !isArchivedPurchaseOrder(purchaseOrder)).length

  if (!canView) {
    return (
      <Layout title="Purchase Orders" session={null} hidePageHeader>
        <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
          <div className="text-sm font-bold text-foreground">No access to purchase orders</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Your role cannot view purchase orders for this business.
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Purchase Orders" session={null} hidePageHeader>
      <ModuleShell
        eyebrow="Procurement"
        title="Purchase Orders"
        summary={loading ? 'Loading purchase orders...' : `${filtered.length} shown · ${activeCount} active`}
        tone="cyan"
        onPrimaryAction={canCreate ? () => navigate('/purchase-orders/new') : undefined}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by PO number or supplier..."
        filters={filterOptions}
        hasActiveFilters={status !== 'Active'}
        onResetFilters={() => setStatus('Active')}
        records={loading ? [] : filtered}
        renderRow={(purchaseOrder) => (
          <ModuleRowCard
            key={purchaseOrder.id}
            title={purchaseOrder.po_number}
            subtitle={purchaseOrder.supplier_name || 'No supplier'}
            tertiary={`${purchaseOrder.po_date || ''} · ${formatCurrency(purchaseOrder.total)}`}
            statusLabel={getPurchaseOrderStatusLabel(purchaseOrder)}
            statusClassName={statusBadgeClassName(purchaseOrder)}
            onClick={() => navigate(`/purchase-orders/${purchaseOrder.id}`)}
            onActionClick={() => setActivePurchaseOrder(purchaseOrder)}
          />
        )}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--bd-overlay-radius)] border border-dashed border-border bg-card/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--bd-radius-lg)] bg-muted text-muted-foreground">
              <ShoppingCart className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {statusError ? 'Purchase orders could not load' : 'No purchase orders found'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {statusError
                  ? statusError
                  : query
                    ? 'Try a different search term'
                    : status === 'Archived'
                      ? 'No purchase orders are archived'
                      : 'Create your first purchase order to get started'}
              </div>
            </div>
          </div>
        }
      >
        {loading && (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}
      </ModuleShell>

      {canCreate && <MobileFab onClick={() => navigate('/purchase-orders/new')} ariaLabel="Create purchase order" />}

      <ConfirmActionDialog
        open={purchaseOrderToArchive !== null}
        onOpenChange={(open) => {
          if (!open) setPurchaseOrderToArchive(null)
        }}
        title="Archive this purchase order?"
        description="The purchase order is hidden from active lists. Its items, totals, and supplier snapshot are kept exactly as issued. You can restore it later."
        confirmLabel="Archive Purchase Order"
        onConfirm={() => {
          if (purchaseOrderToArchive) void handleArchive(purchaseOrderToArchive)
        }}
        loading={isMutating}
      />

      <ConfirmActionDialog
        open={purchaseOrderToRestore !== null}
        onOpenChange={(open) => {
          if (!open) setPurchaseOrderToRestore(null)
        }}
        title="Restore this purchase order?"
        description="The purchase order returns to active lists with its original lifecycle status."
        confirmLabel="Restore Purchase Order"
        onConfirm={() => {
          if (purchaseOrderToRestore) void handleRestore(purchaseOrderToRestore)
        }}
        loading={isMutating}
      />

      <InvoiceListActionSheet
        open={Boolean(activePurchaseOrder)}
        onOpenChange={(open) => {
          if (!open) setActivePurchaseOrder(null)
        }}
        eyebrow="Purchase Order"
        title={activePurchaseOrder?.po_number || 'Unknown purchase order'}
        subtitle={
          activePurchaseOrder
            ? `${activePurchaseOrder.supplier_name || ''} · ${formatCurrency(activePurchaseOrder.total)}`
            : undefined
        }
        actions={activePurchaseOrder ? [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/purchase-orders/${activePurchaseOrder.id}`),
          },
          ...(canEdit && !isArchivedPurchaseOrder(activePurchaseOrder) && activePurchaseOrder.status === 'draft'
            ? [
                {
                  key: 'edit',
                  label: 'Edit',
                  icon: <Pencil className="h-6 w-6" />,
                  onClick: () => navigate(`/purchase-orders/edit/${activePurchaseOrder.id}`),
                },
              ]
            : []),
          ...(canEdit
            ? [
                isArchivedPurchaseOrder(activePurchaseOrder)
                  ? {
                      key: 'restore',
                      label: 'Restore',
                      icon: <RotateCcw className="h-6 w-6" />,
                      onClick: () => setPurchaseOrderToRestore(activePurchaseOrder),
                    }
                  : {
                      key: 'archive',
                      label: 'Archive',
                      icon: <Archive className="h-6 w-6" />,
                      onClick: () => setPurchaseOrderToArchive(activePurchaseOrder),
                    },
              ]
            : []),
        ] : []}
      />
    </Layout>
  )
}
