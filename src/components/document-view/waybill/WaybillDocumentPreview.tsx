import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { richTextToPlainText } from '@/lib/richTextPlain'
import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './WaybillDocumentPreview.module.css'

function safeText(val: unknown, fallback = ''): string {
  if (val == null) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map((v) => safeText(v, '')).filter(Boolean).join(', ') || fallback
    const obj = val as Record<string, unknown>
    const parts = [obj.address, obj.street, obj.city, obj.state, obj.name, obj.label, obj.value].filter(Boolean)
    if (parts.length > 0) return parts.map((p) => safeText(p, '')).join(', ')
    try {
      return JSON.stringify(val)
    } catch {
      return fallback
    }
  }
  return String(val)
}

export default function WaybillDocumentPreview({ model }: { model: WaybillRenderModel | null }) {
  if (!model) return null

  const { branding, header, parties, logistics, notes, table } = model

  const columnTemplate = table.columns.map((_, i) => (i === 0 ? '1fr' : 'minmax(70px, auto)')).join(' ')

  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.typeLabel}>Shipper</div>
          <div className={styles.shipperName}>{safeText(branding.name, 'Company not set')}</div>
          <div className={styles.shipperAddress}>
            {branding.address ? <div>{safeText(branding.address)}</div> : <div>No company identity saved.</div>}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>Waybill No.</div>
          <div className={styles.number}>{safeText(header.waybillNumber)}</div>
          <div style={{ marginTop: 12 }}>
            <div className={styles.typeLabel}>Dispatch Date</div>
            <div className={styles.number} style={{ fontSize: 13, color: 'hsl(var(--bd-text))' }}>
              {safeText(header.date)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Consignee / Deliver To</div>
          <div className={styles.metaValue}>{safeText(parties.clientName)}</div>
          {parties.clientAddress && <div className={styles.metaSub}>{safeText(parties.clientAddress)}</div>}
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Logistics Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <div>
              <div className={styles.metaSub}>Vehicle Reg:</div>
              <div className={styles.metaValue}>{safeText(logistics.vehiclePlate)}</div>
            </div>
            <div>
              <div className={styles.metaSub}>P.O. No:</div>
              <div className={styles.metaValue}>{safeText(header.poNumber)}</div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
              <div className={styles.metaSub}>Driver:</div>
              <div className={styles.metaValue}>{safeText(logistics.driverName)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.itemsHead} style={{ gridTemplateColumns: columnTemplate }}>
        {table.columns.map((col) => (
          <div key={col.key} className={`${styles.columnLabel}${col.key === 'description' ? '' : ` ${styles.right}`}`}>
            {safeText(col.label)}
          </div>
        ))}
      </div>

      {table.rows.length > 0
        ? table.rows.map((row, index) => (
            <div key={index} className={styles.itemRow} style={{ gridTemplateColumns: columnTemplate }}>
              {table.columns.map((col) => {
                const rawCell = row.cells[col.key]
                const cellText = typeof rawCell === 'object' && rawCell !== null
                  ? safeText(rawCell)
                  : richTextToPlainText(rawCell || '')
                return (
                  <div key={col.key} className={col.key === 'description' ? styles.itemName : styles.metric}>
                    {safeText(cellText)}
                  </div>
                )
              })}
            </div>
          ))
        : (
        <div className={styles.itemRow} style={{ gridTemplateColumns: columnTemplate }}>
          <div className={styles.itemName} style={{ fontStyle: 'italic', color: 'hsl(var(--bd-text-muted) / 0.8)' }}>
            No items added yet.
          </div>
        </div>
        )}

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Delivery Remarks</div>
          <div className={styles.footerText}>{safeText(typeof notes === 'object' ? safeText(notes) : richTextToPlainText(notes))}</div>
        </div>

        <div className={styles.signatureGrid}>
          <div className={styles.signatureBox}>
            <div className={styles.signatureLine} />
            <div className={styles.signatureTitle}>Dispatched By / Date</div>
          </div>
          <div className={styles.signatureBox}>
            <div className={styles.signatureLine} />
            <div className={styles.signatureTitle}>Received By (Sign & Stamp) / Date</div>
          </div>
        </div>
      </div>
    </DocumentPreviewShell>
  )
}
