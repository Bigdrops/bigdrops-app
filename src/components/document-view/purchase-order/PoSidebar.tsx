/**
 * Purchase Order persistent sidebar — production.
 *
 * Always visible on desktop (right region, sticky). On narrower breakpoints
 * the same sections render in normal flow below the paper card. Presentation
 * only; transition handlers arrive via props and execute against the real
 * lifecycle service in the caller.
 *
 * Sections without a production data source are omitted by design — no
 * fixture data, no fabrication.
 */

import React from 'react'
import {
  ArrowRight,
  Archive,
  Ban,
  CheckCheck,
  ChevronDown,
  Lock,
  User,
} from 'lucide-react'

import styles from '../invoice/InvoiceWorkspace.module.css'
import localStyles from './PurchaseOrderView.module.css'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import type { PurchaseOrderStatus } from '@/domain/purchase-order/types'
import type { AuditTrailEntry } from '@/domain/audit/auditTypes'
import { PURCHASE_ORDER_STATUS_LABELS } from '@/domain/purchase-order/types'

const STATUS_PILL: Record<PurchaseOrderStatus, React.CSSProperties> = {
  draft: { background: 'hsl(var(--bd-status-warning-bg))', color: 'hsl(var(--bd-status-warning-text))' },
  issued: { background: 'hsl(var(--bd-status-info-bg))', color: 'hsl(var(--bd-status-info-text))' },
  closed: { background: 'hsl(var(--bd-status-success-bg))', color: 'hsl(var(--bd-status-success-text))' },
  cancelled: { background: 'hsl(var(--bd-status-danger-bg))', color: 'hsl(var(--bd-status-danger-text))' },
}

export interface PoSidebarProps {
  poNumber: string
  status: PurchaseOrderStatus
  archived: boolean
  canEdit: boolean
  totals: {
    subtotal: number
    discount: number
    extraCharges: Array<{ label: string; value: number; withTax: boolean }>
    vat: number
    vatPercent: number
    total: number
  }
  supplierName: string
  activity?: { entries: AuditTrailEntry[]; loading: boolean; error: string | null }
  activityOpenSignal: number
  onPrimary: () => void
  onCancel: () => void
  onArchive: () => void
  onRestore: () => void
}

export default function PoSidebar({
  poNumber,
  status,
  archived,
  canEdit,
  totals,
  supplierName,
  activity,
  activityOpenSignal,
  onPrimary,
  onCancel,
  onArchive,
  onRestore,
}: PoSidebarProps) {
  const [activityOpen, setActivityOpen] = React.useState(true)

  /* "View activity" in the More sheet opens this panel. */
  React.useEffect(() => {
    if (activityOpenSignal > 0) setActivityOpen(true)
  }, [activityOpenSignal])

  const primaryLabel =
    status === 'draft'
      ? 'Issue Purchase Order'
      : status === 'issued'
        ? 'Close Purchase Order'
        : null
  const PrimaryIcon = status === 'draft' ? ArrowRight : CheckCheck
  const primaryDisabled = !canEdit || archived

  return (
    <aside className={localStyles.sidebar} aria-label="Purchase order summary">
      {/* ── Status, identity and actions ─────────────────────────── */}
      <section className={localStyles.sideCard} aria-label="Order status">
        <div className={localStyles.sideLabel}>Order Status</div>
        <div className={localStyles.statusRow}>
          <span
            className={localStyles.statusPillLg}
            style={
              archived
                ? { background: 'hsl(var(--bd-status-neutral-bg))', color: 'hsl(var(--bd-status-neutral-text))' }
                : STATUS_PILL[status]
            }
          >
            {archived ? 'Archived' : PURCHASE_ORDER_STATUS_LABELS[status]}
          </span>
          <span style={{ fontSize: 10, color: 'hsl(var(--bd-text-muted))' }}>
            {status === 'issued' ? 'Supplier notified' : null}
          </span>
        </div>
        <div className={localStyles.poNumber}>{poNumber}</div>

        <div className={localStyles.sideActions}>
          {archived ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRestore} disabled={!canEdit}>
              <Archive size={15} aria-hidden="true" />
              <span>Restore purchase order</span>
            </button>
          ) : primaryLabel ? (
            <>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={onPrimary}
                disabled={primaryDisabled}
              >
                <PrimaryIcon size={15} aria-hidden="true" />
                <span>{primaryLabel}</span>
              </button>
              {status === 'issued' && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={onCancel}
                  disabled={!canEdit}
                >
                  <Ban size={15} aria-hidden="true" />
                  <span>Cancel purchase order</span>
                </button>
              )}
            </>
          ) : (
            <div
              className={styles.btn}
              style={{ opacity: 0.6, cursor: 'default', justifyContent: 'center' }}
              aria-disabled="true"
            >
              {PURCHASE_ORDER_STATUS_LABELS[status]} · terminal
            </div>
          )}
          {!archived && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onArchive}
              disabled={!canEdit}
            >
              <Archive size={15} aria-hidden="true" />
              <span>Archive purchase order</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Supplier ─────────────────────────────────────────────── */}
      <section className={localStyles.sideCard} aria-label="Supplier">
        <div className={localStyles.sideLabel}>Supplier / Vendor</div>
        <div className={localStyles.partyName}>{supplierName || '—'}</div>
        <div className={localStyles.partyLines}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <User size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>Supplier of record on this order</span>
          </div>
        </div>
        <div className={localStyles.frozenNote}>
          <Lock size={12} aria-hidden="true" />
          Frozen snapshot — supplier changes never reach this order.
        </div>
      </section>

      {/* ── Totals ───────────────────────────────────────────────── */}
      <section className={localStyles.sideCard} aria-label="Order totals">
        <div className={localStyles.sideLabel}>Order Totals</div>
        <div className={localStyles.totalsMini}>
          <div className={localStyles.totalsMiniRow}>
            <span>Procurement subtotal</span>
            <span>{formatNaira(totals.subtotal)}</span>
          </div>
          {Number(totals.discount) > 0 && (
            <div className={localStyles.totalsMiniRow}>
              <span>Purchase discount</span>
              <span>−{formatNaira(totals.discount)}</span>
            </div>
          )}
          {totals.extraCharges.map((charge, index) => (
            <div key={`charge-${index}`} className={localStyles.totalsMiniRow}>
              <span>
                {charge.label}
                {charge.withTax ? ' · VAT applies' : ''}
              </span>
              <span>{formatNaira(charge.value)}</span>
            </div>
          ))}
          <div className={localStyles.totalsMiniRow}>
            <span>VAT ({totals.vatPercent}%)</span>
            <span>{formatNaira(totals.vat)}</span>
          </div>
          <div className={`${localStyles.totalsMiniRow} ${localStyles.grand}`}>
            <span>Total order amount</span>
            <span>{formatNaira(totals.total)}</span>
          </div>
        </div>
      </section>

      {/* ── Activity ─────────────────────────────────────────────── */}
      <section className={localStyles.sideCard} aria-label="Activity">
        <button
          type="button"
          className={localStyles.sideLabel}
          style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0 }}
          onClick={() => setActivityOpen((open) => !open)}
          aria-expanded={activityOpen}
        >
          <span>Activity &amp; History</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{ transform: activityOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }}
          />
        </button>
        {activityOpen && (
          <div className={localStyles.activityMini}>
            {activity?.loading && (
              <div style={{ fontSize: 11, color: 'hsl(var(--bd-text-muted))' }}>Loading history…</div>
            )}
            {!activity?.loading && activity?.error && (
              <div style={{ fontSize: 11, color: 'hsl(var(--bd-status-danger-text))' }}>{activity.error}</div>
            )}
            {!activity?.loading && !activity?.error && (activity?.entries.length ?? 0) === 0 && (
              <div style={{ fontSize: 11, color: 'hsl(var(--bd-text-muted))' }}>No history recorded yet.</div>
            )}
            {!activity?.loading && !activity?.error &&
              (activity?.entries ?? []).slice(0, 12).map((entry) => (
                <div key={entry.id} className={localStyles.activityRow}>
                  <span className={localStyles.activityDot} aria-hidden="true" />
                  <span>
                    {entry.actorLabel} {entry.actionLabel}
                    <span className={localStyles.activityTime}>{entry.timestamp}</span>
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </aside>
  )
}
