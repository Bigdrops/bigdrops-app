import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './WaybillDocumentPreview.module.css'

type WaybillPreviewItem = {
  description?: string
  quantity?: number
  unit?: string
  condition?: string
}

type WaybillPreviewData = {
  companyName: string
  companyLines: string[]
  documentNumber: string
  dispatchDate: string
  consigneeName: string
  consigneeLines: string[]
  vehicleReg: string
  deliveryReference: string
  driverName: string
  driverPhone: string
  notes: string
  items: WaybillPreviewItem[]
}

export default function WaybillDocumentPreview({ preview }: { preview: WaybillPreviewData }) {
  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.typeLabel}>Shipper</div>
          <div className={styles.shipperName}>{preview.companyName || 'Company not set'}</div>
          <div className={styles.shipperAddress}>
            {preview.companyLines.length > 0 ? preview.companyLines.map((line) => <div key={line}>{line}</div>) : <div>No company identity saved.</div>}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>Waybill No.</div>
          <div className={styles.number}>{preview.documentNumber || '—'}</div>
          <div style={{ marginTop: 12 }}>
            <div className={styles.typeLabel}>Dispatch Date</div>
            <div className={styles.number} style={{ fontSize: 13, color: 'var(--dv-text)' }}>
              {preview.dispatchDate || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Consignee / Deliver To</div>
          <div className={styles.metaValue}>{preview.consigneeName || '—'}</div>
          {preview.consigneeLines.map((line) => (
            <div key={line} className={styles.metaSub}>
              {line}
            </div>
          ))}
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Logistics Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <div>
              <div className={styles.metaSub}>Vehicle Reg:</div>
              <div className={styles.metaValue}>{preview.vehicleReg || '—'}</div>
            </div>
            <div>
              <div className={styles.metaSub}>Ref No:</div>
              <div className={styles.metaValue}>{preview.deliveryReference || '—'}</div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
              <div className={styles.metaSub}>Driver:</div>
              <div className={styles.metaValue}>
                {[preview.driverName, preview.driverPhone].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.itemsHead}>
        <div className={styles.columnLabel}>Item Description</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Qty</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Unit</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Condition</div>
      </div>

      {preview.items.length > 0 ? (
        preview.items.map((item, index) => (
          <div key={`${item.description || 'item'}-${index}`} className={styles.itemRow}>
            <div>
              <div className={styles.itemName}>{item.description || 'Untitled item'}</div>
            </div>
            <div className={styles.quantity}>{String(item.quantity ?? '—')}</div>
            <div className={styles.metric}>{item.unit || '—'}</div>
            <div className={styles.metric}>{item.condition || '—'}</div>
          </div>
        ))
      ) : (
        <div className={styles.footerText}>No items added yet.</div>
      )}

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Delivery Remarks</div>
          <div className={styles.footerText}>{preview.notes || 'No delivery notes recorded.'}</div>
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
