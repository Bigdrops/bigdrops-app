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
  ChevronDown,
  Lock,
  User,
} from 'lucide-react'

import localStyles from './PurchaseOrderView.module.css'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import type { PurchaseOrderStatus } from '@/domain/purchase-order/types'
import type { AuditTrailEntry } from '@/domain/audit/auditTypes'

export interface PoSidebarProps {
  poNumber?: string
  status?: PurchaseOrderStatus
  archived?: boolean
  canEdit?: boolean
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
  onPrimary?: () => void
  onCancel?: () => void
  onArchive?: () => void
  onRestore?: () => void
}

export default function PoSidebar({
  totals,
  supplierName,
  activity,
  activityOpenSignal,
}: PoSidebarProps) {
  const [activityOpen, setActivityOpen] = React.useState(true)

  /* "View activity" in the More sheet opens this panel. */
  React.useEffect(() => {
    if (activityOpenSignal > 0) setActivityOpen(true)
  }, [activityOpenSignal])

  return (
    <aside className={localStyles.sidebar} aria-label="Purchase order summary">
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
