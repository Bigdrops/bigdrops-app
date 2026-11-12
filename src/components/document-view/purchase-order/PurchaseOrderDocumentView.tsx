/**
 * Purchase Order document view — production composition.
 *
 * Promoted from the approved Design Lab concept. Renders:
 *  - DocumentPage chrome (DocumentTopNav) with back / share / customize / more.
 *  - Mobile-only thumb action row (invoice convention); desktop moves actions
 *    into the persistent sidebar.
 *  - Two-region workspace (paper + sticky sidebar) on desktop; stacked on mobile.
 *
 * Presentational only. All state and service calls live in the caller.
 */

import React from 'react'
import { ArrowRight, Ban, CheckCheck, Download, Pencil } from 'lucide-react'

import DocumentPage from '../shared/DocumentPage'
import DocumentTopNav from '../shared/DocumentTopNav'
import FloatingDownloadButton from '../shared/FloatingDownloadButton'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import styles from '../invoice/InvoiceWorkspace.module.css'
import localStyles from './PurchaseOrderView.module.css'

import PurchaseOrderDocumentCard from './PurchaseOrderDocumentCard'
import PoSidebar from './PoSidebar'

import type { PurchaseOrderStatus } from '@/domain/purchase-order/types'
import { PURCHASE_ORDER_STATUS_LABELS } from '@/domain/purchase-order/types'

export interface PurchaseOrderDocumentViewProps {
  vm: {
    poNumber: string
    poDate: string
    status: PurchaseOrderStatus
    archived: boolean
    currency: string
    notes: string
    terms: string
    supplierName: string
    issuer: {
      name: string
      tagline?: string | null
      tin?: string | null
      addressLines: string[]
      phone?: string | null
      email?: string | null
      logoUrl?: string | null
    }
    items: Array<{
      id?: string
      description: string
      quantity: number
      unit: string
      unit_cost: number
      line_total: number
    }>
    totals: {
      subtotal: number
      discount: number
      extraCharges: Array<{ label: string; value: number; withTax: boolean }>
      vat: number
      vatPercent: number
      total: number
    }
    activity: { entries: import('@/domain/audit/auditTypes').AuditTrailEntry[]; loading: boolean; error: string | null }
    activityOpenSignal: number
    canEdit: boolean
    showAmountInWords: boolean
    showSignatories: boolean
  }
  handlers: {
    onBack: () => void
    onShare: () => void
    onCustomize: () => void
    onMore: () => void
    onDownloadPdf: () => void
    onIssue: () => void
    onClose: () => void
    onCancel: () => void
    onArchive: () => void
    onRestore: () => void
    onEdit: () => void
  }
}

export default function PurchaseOrderDocumentView({ vm, handlers }: PurchaseOrderDocumentViewProps) {
  const { isDesktop } = useLayoutMode()

  const primaryAction =
    vm.status === 'draft' ? (
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlers.onIssue} disabled={!vm.canEdit || vm.archived}>
        <ArrowRight size={15} aria-hidden="true" />
        <span>Issue PO</span>
      </button>
    ) : vm.status === 'issued' ? (
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlers.onClose} disabled={!vm.canEdit || vm.archived}>
        <CheckCheck size={15} aria-hidden="true" />
        <span>Close PO</span>
      </button>
    ) : null

  return (
    <DocumentPage
      topNav={
        <DocumentTopNav
          title="Purchase Order"
          subtitle={`${vm.poNumber} · ${vm.supplierName}`}
          onBack={handlers.onBack}
          onShare={handlers.onShare}
          onCustomize={handlers.onCustomize}
          onMore={handlers.onMore}
        />
      }
      actionRow={
        isDesktop ? undefined : (
          <div className={styles.actionRow}>
            <div className={localStyles.actionInner}>
              {vm.archived ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handlers.onRestore}
                  disabled={!vm.canEdit}
                >
                  <ArrowRight size={15} aria-hidden="true" />
                  <span>Restore order</span>
                </button>
              ) : (
                primaryAction
              )}
              {vm.status === 'draft' && !vm.archived && (
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handlers.onEdit} disabled={!vm.canEdit}>
                  <Pencil size={15} aria-hidden="true" />
                  <span>Edit</span>
                </button>
              )}
              {vm.status === 'issued' && !vm.archived && (
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handlers.onCancel} disabled={!vm.canEdit}>
                  <Ban size={15} aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              )}
              <button
                type="button"
                className={styles.btnPill}
                onClick={handlers.onDownloadPdf}
                title="Download PDF"
                aria-label="Download PDF"
              >
                <Download size={17} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        )
      }
      floating={<FloatingDownloadButton onClick={handlers.onDownloadPdf} />}
    >
      <div className={localStyles.workspace}>
        <main style={{ minWidth: 0 }} aria-label="Purchase order document">
          <PurchaseOrderDocumentCard
            company={vm.issuer}
            po={{
              po_number: vm.poNumber,
              po_date: vm.poDate,
              status: vm.status,
              currency: vm.currency,
              notes: vm.notes,
              terms: vm.terms,
            }}
            supplierName={vm.supplierName}
            items={vm.items}
            totals={{
              subtotal: vm.totals.subtotal,
              discount: vm.totals.discount,
              extraCharges: vm.totals.extraCharges,
              vat: vm.totals.vat,
              vatPercent: vm.totals.vatPercent,
              total: vm.totals.total,
            }}
            archived={vm.archived}
            showAmountInWords={vm.showAmountInWords}
            showSignatories={vm.showSignatories}
          />
        </main>

        <PoSidebar
          poNumber={vm.poNumber}
          status={vm.status}
          archived={vm.archived}
          canEdit={vm.canEdit}
          totals={vm.totals}
          supplierName={vm.supplierName}
          activity={vm.activity}
          activityOpenSignal={vm.activityOpenSignal}
          onPrimary={vm.status === 'draft' ? handlers.onIssue : handlers.onClose}
          onCancel={handlers.onCancel}
          onArchive={handlers.onArchive}
          onRestore={handlers.onRestore}
        />
      </div>
    </DocumentPage>
  )
}
