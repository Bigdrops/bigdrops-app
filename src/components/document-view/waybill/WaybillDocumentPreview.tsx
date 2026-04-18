import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './WaybillDocumentPreview.module.css'
import {
  waybillPreviewData,
  type WaybillPreviewGroup,
  type WaybillPreviewItem,
} from './waybillViewMockData'

export default function WaybillDocumentPreview() {
  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.typeLabel}>Shipper</div>
          <div className={styles.shipperName}>{waybillPreviewData.shipperName}</div>
          <div className={styles.shipperAddress}>
            {waybillPreviewData.shipperLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>Waybill No.</div>
          <div className={styles.number}>{waybillPreviewData.documentNumber}</div>
          <div style={{ marginTop: 12 }}>
            <div className={styles.typeLabel}>Dispatch Date</div>
            <div className={styles.number} style={{ fontSize: 13, color: 'var(--dv-text)' }}>
              {waybillPreviewData.dateIssued}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Consignee / Deliver To</div>
          <div className={styles.metaValue}>{waybillPreviewData.consigneeName}</div>
          {waybillPreviewData.consigneeLines.map((line) => (
            <div key={line} className={styles.metaSub}>{line}</div>
          ))}
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Logistics Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <div>
              <div className={styles.metaSub}>Vehicle Reg:</div>
              <div className={styles.metaValue}>{waybillPreviewData.vehicleReg}</div>
            </div>
            <div>
              <div className={styles.metaSub}>Ref No:</div>
              <div className={styles.metaValue}>{waybillPreviewData.deliveryReference}</div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
              <div className={styles.metaSub}>Driver:</div>
              <div className={styles.metaValue}>{waybillPreviewData.driverName} ({waybillPreviewData.driverPhone})</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.itemsHead}>
        <div className={styles.columnLabel}>Item Description</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Qty</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Pkg</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Weight</div>
      </div>

      {waybillPreviewData.rows.map((row, index) =>
        row.type === 'group' ? (
          <GroupRow key={`${row.label}-${index}`} row={row} />
        ) : (
          <ItemRow key={`${row.name}-${index}`} row={row} />
        ),
      )}

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Delivery Remarks</div>
          <div className={styles.footerText}>{waybillPreviewData.notes}</div>
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

function GroupRow({ row }: { row: WaybillPreviewGroup }) {
  return (
    <div className={styles.groupRow}>
      <div className={styles.groupName}>{row.label}</div>
    </div>
  )
}

function ItemRow({ row }: { row: WaybillPreviewItem }) {
  return (
    <div className={styles.itemRow}>
      <div>
        <div className={styles.itemName}>{row.name}</div>
        {row.description ? (
          <div className={styles.itemDescription}>{row.description}</div>
        ) : null}
      </div>
      <div className={styles.quantity}>{row.quantity}</div>
      <div className={styles.metric}>{row.unit}</div>
      <div className={styles.metric}>{row.weight || '-'}</div>
    </div>
  )
}
