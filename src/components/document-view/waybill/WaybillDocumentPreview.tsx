import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { richTextToPlainText } from '@/lib/richTextPlain'
import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './WaybillDocumentPreview.module.css'

export default function WaybillDocumentPreview({ model }: { model: WaybillRenderModel | null }) {
  if (!model) return null

  const { branding, header, parties, logistics, notes, table } = model

  const columnTemplate = table.columns.map((_, i) => (i === 0 ? '1fr' : 'minmax(70px, auto)')).join(' ')

  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.typeLabel}>Shipper</div>
          <div className={styles.shipperName}>{branding.name || 'Company not set'}</div>
          <div className={styles.shipperAddress}>
            {branding.address ? <div>{branding.address}</div> : <div>No company identity saved.</div>}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>Waybill No.</div>
          <div className={styles.number}>{header.waybillNumber || ''}</div>
          <div style={{ marginTop: 12 }}>
            <div className={styles.typeLabel}>Dispatch Date</div>
            <div className={styles.number} style={{ fontSize: 13, color: 'var(--dv-text)' }}>
              {header.date || ''}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Consignee / Deliver To</div>
          <div className={styles.metaValue}>{parties.clientName || ''}</div>
          {parties.clientAddress && <div className={styles.metaSub}>{parties.clientAddress}</div>}
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Logistics Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <div>
              <div className={styles.metaSub}>Vehicle Reg:</div>
              <div className={styles.metaValue}>{logistics.vehiclePlate || ''}</div>
            </div>
            <div>
              <div className={styles.metaSub}>P.O. No:</div>
              <div className={styles.metaValue}>{header.poNumber || ''}</div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
              <div className={styles.metaSub}>Driver:</div>
              <div className={styles.metaValue}>{logistics.driverName || ''}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.itemsHead} style={{ gridTemplateColumns: columnTemplate }}>
        {table.columns.map((col) => (
          <div key={col.key} className={`${styles.columnLabel}${col.key === 'description' ? '' : ` ${styles.right}`}`}>
            {col.label}
          </div>
        ))}
      </div>

      {table.rows.length > 0
        ? table.rows.map((row, index) => (
            <div key={index} className={styles.itemRow} style={{ gridTemplateColumns: columnTemplate }}>
              {table.columns.map((col) => {
                const value = richTextToPlainText(row.cells[col.key] || '')
                return (
                  <div key={col.key} className={col.key === 'description' ? styles.itemName : styles.metric}>
                    {value || ''}
                  </div>
                )
              })}
            </div>
          ))
        : (
        <div className={styles.itemRow} style={{ gridTemplateColumns: columnTemplate }}>
          <div className={styles.itemName} style={{ fontStyle: 'italic', color: 'var(--dv-text-3)' }}>
            No items added yet.
          </div>
        </div>
        )}

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Delivery Remarks</div>
          <div className={styles.footerText}>{richTextToPlainText(notes) || 'No delivery notes recorded.'}</div>
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
