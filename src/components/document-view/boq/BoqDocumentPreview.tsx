import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './BoqDocumentPreview.module.css'
import {
  boqPreviewData,
  type BoqPreviewGroup,
  type BoqPreviewItem,
} from './boqViewMockData'

export default function BoqDocumentPreview() {
  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.typeLabel}>Project / Site</div>
          <div className={styles.projectName}>{boqPreviewData.projectName}</div>
          <div className={styles.clientName}>For: {boqPreviewData.clientName}</div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>BOQ Ref.</div>
          <div className={styles.number}>{boqPreviewData.documentNumber}</div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Issued By</div>
          <div className={styles.metaValue}>{boqPreviewData.preparedBy}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Date Issued</div>
          <div className={styles.metaValue}>{boqPreviewData.dateIssued}</div>
        </div>
      </div>

      <div className={styles.itemsHead}>
        <div className={styles.columnLabel}>Ref</div>
        <div className={styles.columnLabel}>Item Description</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Qty</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Unit</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Rate</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Amount</div>
      </div>

      {boqPreviewData.rows.map((row, index) =>
        row.type === 'group' ? (
          <GroupRow key={`${row.label}-${index}`} row={row} />
        ) : (
          <ItemRow key={`${row.name}-${index}`} row={row} />
        ),
      )}

      <div className={styles.totalsSet}>
        {boqPreviewData.totals.map((total) => {
          const isGrand = total.tone === 'grand'
          const isSub = total.tone === 'sub'
          return (
            <div key={total.label} className={styles.totalRow}>
              <div
                className={[
                  styles.totalLabel,
                  isGrand ? styles.grandLabel : '',
                  isSub ? styles.subLabel : '',
                ].join(' ')}
              >
                {total.label}
              </div>
              <div
                className={[
                  styles.totalValue,
                  isGrand ? styles.grandValue : '',
                ].join(' ')}
              >
                {total.value}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Notes & Exclusions</div>
          <div className={styles.footerText}>{boqPreviewData.notes}</div>
        </div>
      </div>
    </DocumentPreviewShell>
  )
}

function GroupRow({ row }: { row: BoqPreviewGroup }) {
  return (
    <div className={styles.groupRow}>
      <div className={styles.groupName}>{row.label}</div>
    </div>
  )
}

function ItemRow({ row }: { row: BoqPreviewItem }) {
  return (
    <div className={styles.itemRow}>
      <div className={styles.refCode}>{row.refCode || '-'}</div>
      <div>
        <div className={styles.itemName}>{row.name}</div>
        {row.description ? (
          <div className={styles.itemDescription}>{row.description}</div>
        ) : null}
      </div>
      <div className={styles.metricValue}>{row.quantity}</div>
      <div className={styles.metricValue}>{row.unit}</div>
      <div className={styles.metricValue}>{row.rate}</div>
      <div className={styles.metricValue} style={{ fontWeight: 600 }}>
        {row.amount}
      </div>
    </div>
  )
}
