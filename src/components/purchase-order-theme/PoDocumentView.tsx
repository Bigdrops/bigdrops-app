/**
 * Purchase Order Document View — Design Lab wrapper.
 *
 * Thin fixture-driven wrapper around the production presentational
 * components (PurchaseOrderDocumentView / PurchaseOrderMoreSheet /
 * PurchaseOrderCustomizeSheet). The lab chrome (PoDocumentLab) owns the
 * viewport/theme chrome; this file owns only specimen state.
 */

import React from 'react'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import PurchaseOrderDocumentView from '@/components/document-view/purchase-order/PurchaseOrderDocumentView'
import PurchaseOrderMoreSheet from '@/components/document-view/purchase-order/PurchaseOrderMoreSheet'
import PurchaseOrderCustomizeSheet, {
  DEFAULT_PO_CUSTOMIZE,
  type PoCustomizeState,
} from '@/components/document-view/purchase-order/PurchaseOrderCustomizeSheet'

import {
  PREVIEW_COMPANY,
  PREVIEW_PO,
  PREVIEW_PO_ACTIVITY,
  PREVIEW_PO_ITEMS,
  PREVIEW_SUPPLIER,
  PREVIEW_PO_TOTALS,
} from './po-document-fixtures'
import type { PurchaseOrderStatus } from '@/domain/purchase-order/types'
import { PURCHASE_ORDER_STATUS_LABELS } from '@/domain/purchase-order/types'

type Confirm =
  | { to: 'issued' | 'closed' | 'cancelled'; title: string; description: string; confirmLabel: string }
  | null

export default function PoDocumentView() {
  const [status, setStatus] = React.useState<PurchaseOrderStatus>(PREVIEW_PO.status)
  const [archived, setArchived] = React.useState(false)
  const [confirm, setConfirm] = React.useState<Confirm>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [sheet, setSheet] = React.useState<'customize' | 'more' | null>(null)
  const [activitySignal, setActivitySignal] = React.useState(0)
  const [customize, setCustomize] = React.useState<PoCustomizeState>(DEFAULT_PO_CUSTOMIZE)

  const noticeTimer = React.useRef<number | null>(null)
  const notify = React.useCallback((message: string) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400)
  }, [])
  React.useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  const applyTransition = (to: PurchaseOrderStatus) => {
    setStatus(to)
    setConfirm(null)
    notify(`Purchase order ${PURCHASE_ORDER_STATUS_LABELS[to].toLowerCase()}`)
  }

  const requestPrimary = () => {
    if (status === 'draft') {
      setConfirm({
        to: 'issued',
        title: 'Issue this purchase order?',
        description:
          'Issuing freezes every line, cost, and term. The supplier snapshot and PO number become permanent history.',
        confirmLabel: 'Issue Purchase Order',
      })
      return
    }
    if (status === 'issued') {
      setConfirm({
        to: 'closed',
        title: 'Close this purchase order?',
        description: 'Closing is terminal. The order is kept as permanent history and can never be reopened.',
        confirmLabel: 'Close Purchase Order',
      })
    }
  }

  const requestCancel = () => {
    setConfirm({
      to: 'cancelled',
      title: 'Cancel this purchase order?',
      description: 'Cancellation is terminal. The order can never be reactivated or edited again.',
      confirmLabel: 'Cancel Purchase Order',
    })
  }

  return (
    <React.Fragment>
      <PurchaseOrderDocumentView
        vm={{
          poNumber: PREVIEW_PO.po_number,
          poDate: PREVIEW_PO.po_date,
          status,
          archived,
          currency: PREVIEW_PO.currency,
          notes: PREVIEW_PO.notes,
          terms: PREVIEW_PO.terms,
          supplierName: PREVIEW_SUPPLIER.name,
          issuer: {
            name: PREVIEW_COMPANY.name,
            tagline: PREVIEW_COMPANY.tagline,
            tin: PREVIEW_COMPANY.tin,
            addressLines: PREVIEW_COMPANY.addressLines,
            phone: PREVIEW_COMPANY.phone,
            email: PREVIEW_COMPANY.email,
            logoUrl: null,
          },
          items: PREVIEW_PO_ITEMS.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            line_total: item.line_total,
          })),
          totals: {
            subtotal: PREVIEW_PO_TOTALS.subtotal,
            discount: PREVIEW_PO_TOTALS.discount,
            extraCharges: [
              { label: 'Freight & Handling', value: 85000, withTax: false },
            ],
            vat: PREVIEW_PO_TOTALS.vat,
            vatPercent: 7.5,
            total: PREVIEW_PO_TOTALS.total,
          },
          activity: {
            entries: PREVIEW_PO_ACTIVITY.map((entry) => ({
              id: entry.id,
              action: 'purchase_order_transition',
              actionLabel: entry.label,
              actorLabel: '',
              timestamp: entry.timestamp,
              changes: [],
            })),
            loading: false,
            error: null,
          },
          activityOpenSignal: activitySignal,
          canEdit: true,
          showAmountInWords: customize.showAmountInWords,
          showSignatories: customize.showSignatories,
        }}
        handlers={{
          onBack: () => notify('Design Lab — navigation is inert'),
          onShare: () => notify('Design Lab — share is inert'),
          onCustomize: () => setSheet('customize'),
          onMore: () => setSheet('more'),
          onDownloadPdf: () => notify('Design Lab — PDF download is inert'),
          onIssue: requestPrimary,
          onClose: requestPrimary,
          onCancel: requestCancel,
          onArchive: () => setArchived((value) => !value),
          onRestore: () => {
            setArchived(false)
            notify('Purchase order restored')
          },
          onEdit: () => notify('Design Lab — edit is inert'),
        }}
      />

      <PurchaseOrderMoreSheet
        open={sheet === 'more'}
        onClose={() => setSheet(null)}
        poNumber={PREVIEW_PO.po_number}
        archived={archived}
        canEdit
        onPrint={() => window.print()}
        onCopyReference={() => void navigator.clipboard?.writeText(PREVIEW_PO.po_number)}
        onViewActivity={() => {
          setSheet(null)
          setActivitySignal((n) => n + 1)
        }}
        onArchiveToggle={() => {
          setArchived((value) => !value)
          setSheet(null)
          notify(archived ? 'Purchase order restored' : 'Purchase order archived')
        }}
        onCancel={() => {
          setSheet(null)
          requestCancel()
        }}
      />

      <PurchaseOrderCustomizeSheet
        open={sheet === 'customize'}
        onClose={() => setSheet(null)}
        value={customize}
        onChange={setCustomize}
        onReset={() => setCustomize(DEFAULT_PO_CUSTOMIZE)}
      />

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-bd-border bg-bd-card-bg px-4 py-2 text-xs font-medium text-bd-text shadow-lg"
        >
          {notice}
        </div>
      )}

      <ConfirmActionDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={confirm?.title ?? ''}
        description={confirm?.description ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        variant={confirm?.to === 'cancelled' ? 'destructive' : 'default'}
        onConfirm={() => confirm && applyTransition(confirm.to)}
        loading={false}
      />
    </React.Fragment>
  )
}
