import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './RfqDocumentPreview.module.css'
import { rfqPreviewData, type RfqPreviewGroup, type RfqPreviewItem } from './rfqViewMockData'

export default function RfqDocumentPreview() {
  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.companyName}>{rfqPreviewData.companyName}</div>
          <div className={styles.companyAddress}>
            {rfqPreviewData.companyLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>RFQ No.</div>
          <div className={styles.number}>{rfqPreviewData.documentNumber}</div>
          <div style={{ marginTop: 8 }}>
            <div className={styles.typeLabel}>Our Reference</div>
            <div className={styles.poReference}>{rfqPreviewData.rfqReference}</div>
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Invitation To</div>
          <div className={styles.metaValue}>{rfqPreviewData.vendorName}</div>
          <div className={styles.metaSub}>{rfqPreviewData.vendorSubline}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Issue Date</div>
          <div className={styles.metaValue}>{rfqPreviewData.issueDate}</div>
          <div className={styles.metaLabel} style={{ marginTop: 9 }}>
            Submit By
          </div>
          <div className={styles.metaValue}>{rfqPreviewData.deadline}</div>
        </div>
      </div>

      <div className={styles.itemsHead}>
        <div className={styles.columnLabel}>Item Description</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Qty</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>UOM</div>
      </div>

      {rfqPreviewData.rows.map((row, index) =>
        row.type === 'group' ? (
          <GroupRow key={`${row.label}-${index}`} row={row} />
        ) : (
          <ItemRow key={`${row.name}-${index}`} row={row} />
        ),
      )}

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Requirements & Terms</div>
          <div className={styles.footerText}>{rfqPreviewData.notes}</div>
        </div>
      </div>
    </DocumentPreviewShell>
  )
}

function GroupRow({ row }: { row: RfqPreviewGroup }) {
  return (
    <div className={styles.groupRow}>
      <div className={styles.groupName}>{row.label}</div>
    </div>
  )
}

function ItemRow({ row }: { row: RfqPreviewItem }) {
  return (
    <div className={styles.itemRow}>
      <div>
        <div className={styles.itemName}>{row.name}</div>
        {row.description ? (
          <div className={styles.itemDescription}>{row.description}</div>
        ) : null}
      </div>
      <div className={styles.quantity}>{row.quantity}</div>
      <div className={styles.uom}>{row.uom}</div>
    </div>
  )
}
