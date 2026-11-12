/**
 * Purchase Order document card ("the paper") — production.
 *
 * Visual foundation is the promoted Design Lab concept (src/components/document-view/purchase-order
 * / PurchaseOrderView.module.css). Procurement semantics preserved: supplier snapshot is
 * authoritative and frozen, unit_cost only (never unit_price), flat line items,
 * no bank details, no balance due, no WHT.
 *
 * Presentational only. All data comes from the caller. No fetch, no services.
 */
import React from 'react'
import { Hash, Calendar, FileText, Sigma } from 'lucide-react'
import styles from '../shared/DocumentPreview.module.css'
import localStyles from './PurchaseOrderView.module.css'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira, numberToWords } from '@/lib/formatters/money'
import { renderRichTextContent } from '@/lib/richText'
import DocumentBrandBlock from '../shared/DocumentBrandBlock'
import DocumentMetaChips from '../shared/DocumentMetaChips'
import type { PurchaseOrderStatus } from '@/domain/purchase-order/types'

const STATUS_PILL_STYLE: Record<PurchaseOrderStatus, React.CSSProperties> = {
  draft: { background: 'hsl(var(--bd-status-warning-bg))', color: 'hsl(var(--bd-status-warning-text))' },
  issued: { background: 'hsl(var(--bd-status-info-bg))', color: 'hsl(var(--bd-status-info-text))' },
  closed: { background: 'hsl(var(--bd-status-success-bg))', color: 'hsl(var(--bd-status-success-text))' },
  cancelled: { background: 'hsl(var(--bd-status-danger-bg))', color: 'hsl(var(--bd-status-danger-text))' },
}

const money = (value: number | null | undefined) => formatNaira(Number(value || 0))

export interface PurchaseOrderDocumentCardProps {
  company: {
    name: string
    tagline?: string | null
    tin?: string | null
    addressLines: string[]
    phone?: string | null
    email?: string | null
    logoUrl?: string | null
  }
  po: {
    po_number: string
    po_date: string
    status: PurchaseOrderStatus
    currency: string
    notes: string
    terms: string
  }
  supplierName: string
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
  archived: boolean
  /** Customize sheet: toggles the on-screen blocks only. */
  showAmountInWords: boolean
  showSignatories: boolean
}

export default function PurchaseOrderDocumentCard({
  company,
  po,
  supplierName,
  items,
  totals,
  archived,
  showAmountInWords,
  showSignatories,
}: PurchaseOrderDocumentCardProps) {
  const statusLabel = archived ? 'ARCHIVED' : po.status.toUpperCase()
  const pillStyle = archived
    ? { background: 'hsl(var(--bd-status-neutral-bg))', color: 'hsl(var(--bd-status-neutral-text))' }
    : STATUS_PILL_STYLE[po.status]

  const amountInWords = showAmountInWords ? numberToWords(Number(totals.total || 0)) : null

  return (
    <div className={styles.invCard}>
      {/* Brand row */}
      <div className={styles.invTop}>
        <div className={styles.brandBlock}>
          <DocumentBrandBlock
            logoUrl={company.logoUrl ?? null}
            companyName={company.name}
            className={styles.brandLogo}
            imgClassName={styles.brandLogoImg}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className={styles.brandName}>{company.name}</div>
            {company.tagline && <div className={styles.brandSub}>{company.tagline}</div>}
            {company.addressLines.map((line) => (
              <div
                key={line}
                style={{ fontSize: 11, color: 'hsl(var(--bd-ink-muted))', marginTop: 2, lineHeight: 1.4 }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.statusPill} style={pillStyle}>
          {statusLabel}
        </div>
      </div>

      {/* Identity */}
      <div className={styles.invBody}>
        <h1 className={styles.invTitle}>Purchase Order</h1>
        <DocumentMetaChips
          className={styles.metaChips}
          itemClassName={styles.metaChip}
          items={[
            { icon: Hash, label: 'Purchase Order', value: po.po_number },
            {
              icon: Calendar,
              label: 'Order date',
              value: po.po_date ? formatDisplayDate(po.po_date) : '—',
            },
            { icon: FileText, label: 'Currency', value: po.currency || 'NGN' },
            { icon: Sigma, label: 'VAT rate', value: `VAT ${totals.vatPercent}%` },
          ]}
        />
      </div>

      {/* Parties — the artifact stands on its own: issuer vs supplier */}
      <div className={`${styles.infoGrid} ${localStyles.infoGrid}`}>
        <div className={styles.infoCell}>
          <div className={styles.infoLabel}>From · Issuer</div>
          <div className={styles.infoValue}>{company.name}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'hsl(var(--bd-ink-muted))', lineHeight: 1.5 }}>
            {company.addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            {company.phone && <div>{company.phone}</div>}
            {company.email && <div>{company.email}</div>}
            {company.tin && <div>{company.tin}</div>}
          </div>
        </div>
        <div className={styles.infoCell}>
          <div className={styles.infoLabel}>Supplier / Vendor</div>
          <div className={styles.infoValue}>{supplierName || '—'}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'hsl(var(--bd-ink-muted))', lineHeight: 1.5 }}>
            Supplier snapshot frozen at issue — it never changes with the directory.
          </div>
        </div>
      </div>

      {/* Items — real table on wide viewports, stacked cards on narrow */}
      <div className={`${localStyles.tableWrap} ${localStyles.tableLayout}`}>
        <table className={localStyles.itemsTable}>
          <colgroup>
            <col style={{ width: 38 }} />
            <col />
            <col style={{ width: 64 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 156 }} />
          </colgroup>
          <thead>
            <tr>
              <th aria-hidden="true">#</th>
              <th>Item &amp; Description</th>
              <th className={localStyles.center}>Qty</th>
              <th className={`${localStyles.num} ${localStyles.unitHeader}`}>Unit Cost</th>
              <th className={localStyles.num}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '18px 16px', color: 'hsl(var(--bd-text-muted))', fontSize: 12 }}>
                  No items recorded on this purchase order.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id || `line-${index}`}>
                  <td className={localStyles.indexCell}>{(index + 1).toString().padStart(2, '0')}</td>
                  <td className={localStyles.descCell}>
                    <div className={localStyles.descMain}>{item.description || 'Untitled item'}</div>
                  </td>
                  <td className={localStyles.qtyCell}>
                    {item.quantity}{' '}
                    <span style={{ color: 'hsl(var(--bd-text-muted))', fontWeight: 500 }}>
                      {item.unit || 'units'}
                    </span>
                  </td>
                  <td className={`${localStyles.unitCell} ${localStyles.unitHeader}`}>{money(item.unit_cost)}</td>
                  <td className={localStyles.amountCell}>{money(item.line_total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ul className={`${localStyles.itemCards} ${localStyles.cardLayout}`}>
        {items.map((item, index) => (
          <li key={item.id || `card-${index}`} className={localStyles.itemCard}>
            <div className={localStyles.itemCardNum}>{(index + 1).toString().padStart(2, '0')}</div>
            <div className={localStyles.itemCardBody}>
              <div className={localStyles.itemCardTitle}>{item.description || 'Untitled item'}</div>
              <div className={localStyles.itemCardMeta}>
                <span>
                  <strong>
                    {item.quantity} {item.unit || 'units'}
                  </strong>{' '}
                  × {money(item.unit_cost)}
                </span>
              </div>
            </div>
            <div className={localStyles.itemCardAmount}>
              {money(item.line_total)}
              <span className={localStyles.itemCardUnitCost}>
                {money(item.unit_cost)} / {item.unit || 'units'}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <div className={styles.totalsList}>
        <div className={styles.totalsRow}>
          <span className={styles.lbl}>Procurement Subtotal</span>
          <span className={styles.val}>{money(totals.subtotal)}</span>
        </div>
        {Number(totals.discount) > 0 && (
          <div className={styles.totalsRow}>
            <span className={styles.lbl}>Purchase Discount</span>
            <span className={styles.val}>−{money(totals.discount)}</span>
          </div>
        )}
        {totals.extraCharges.map((charge, index) => (
          <div key={`charge-${index}`} className={styles.totalsRow}>
            <span className={styles.lbl}>
              {charge.label}
              {charge.withTax ? ' · VAT applies' : ''}
            </span>
            <span className={styles.val}>{money(charge.value)}</span>
          </div>
        ))}
        <div className={styles.totalsRow}>
          <span className={styles.lbl}>VAT ({totals.vatPercent}%)</span>
          <span className={styles.val}>{money(totals.vat)}</span>
        </div>
        <div className={styles.totalsDivider} />
        <div className={styles.totalsGrand}>
          <span className={styles.lbl}>Total Order Amount</span>
          <span className={styles.val}>{money(totals.total)}</span>
        </div>
        {amountInWords && <div className={styles.amountWords}>{amountInWords}.</div>}
      </div>

      {/* Notes & Terms */}
      {(po.notes || po.terms) && (
        <div className={styles.notesBlock}>
          {po.notes && (
            <div className={styles.notesSection}>
              <div className={styles.notesLabel}>Notes</div>
              <div className={styles.notesContent}>{renderRichTextContent(po.notes)}</div>
            </div>
          )}
          {po.terms && (
            <div className={styles.notesSection}>
              <div className={styles.notesLabel}>Terms &amp; Conditions</div>
              <div className={styles.notesContent}>{renderRichTextContent(po.terms)}</div>
            </div>
          )}
        </div>
      )}

      {/* Procurement signatories — pre-printed blanks, nothing simulated */}
      {showSignatories && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            padding: '0 18px 20px',
          }}
        >
          <div style={{ border: '1px solid hsl(var(--bd-border) / 0.5)', borderRadius: 'var(--bd-radius-md)', padding: '14px 14px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--bd-text-muted))' }}>
              Procurement authorisation
            </div>
            <div style={{ minHeight: 40, display: 'flex', alignItems: 'flex-end', fontFamily: 'Source Serif 4, Georgia, serif', fontStyle: 'italic', fontSize: 18, color: 'hsl(var(--bd-text-muted))' }}>
              Awaiting signature
            </div>
            <div style={{ borderTop: '1px solid hsl(var(--bd-border))', paddingTop: 8, fontSize: 11, color: 'hsl(var(--bd-text-muted))' }}>
              Authorised signatory
            </div>
          </div>
          <div style={{ border: '1px solid hsl(var(--bd-border) / 0.5)', borderRadius: 'var(--bd-radius-md)', padding: '14px 14px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--bd-text-muted))' }}>
              Received by
            </div>
            <div style={{ minHeight: 40, display: 'flex', alignItems: 'flex-end', fontFamily: 'Source Serif 4, Georgia, serif', fontStyle: 'italic', fontSize: 18, color: 'hsl(var(--bd-text-muted))' }}>
              Awaiting signature
            </div>
            <div style={{ borderTop: '1px solid hsl(var(--bd-border))', paddingTop: 8, fontSize: 11, color: 'hsl(var(--bd-text-muted))' }}>
              Receiving officer
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
