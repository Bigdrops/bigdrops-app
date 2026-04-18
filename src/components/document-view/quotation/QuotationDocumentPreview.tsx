import styles from './quotationDocumentPreview.module.css'
import {
  quotationPreviewData,
  type quotationPreviewGroup,
  type quotationPreviewItem,
} from './quotationViewMockData'

export default function quotationDocumentPreview() {
  return (
    <article className={styles.document}>
      <div className={styles.accent} />

      <div className={styles.head}>
        <div>
          <div className={styles.companyName}>{quotationPreviewData.companyName}</div>
          <div className={styles.companyAddress}>
            {quotationPreviewData.companyLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>quotation</div>
          <div className={styles.number}>{quotationPreviewData.documentNumber}</div>
          <div style={{ marginTop: 8 }}>
            <div className={styles.typeLabel}>PO Reference</div>
            <div className={styles.poReference}>{quotationPreviewData.poReference}</div>
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Bill To</div>
          <div className={styles.metaValue}>{quotationPreviewData.clientName}</div>
          <div className={styles.metaSub}>{quotationPreviewData.clientSubline}</div>
          <div className={styles.metaSub}>{quotationPreviewData.clientAddress}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Issue Date</div>
          <div className={styles.metaValue}>{quotationPreviewData.issueDate}</div>
          <div className={styles.metaLabel} style={{ marginTop: 9 }}>
            Due Date
          </div>
          <div className={styles.metaValue}>{quotationPreviewData.dueDate}</div>
        </div>
      </div>

      <div className={styles.itemsHead}>
        <div className={styles.columnLabel}>Description</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Qty</div>
        <div className={`${styles.columnLabel} ${styles.right}`}>Amount</div>
      </div>

      {quotationPreviewData.rows.map((row, index) =>
        row.type === 'group' ? (
          <GroupRow key={`${row.label}-${index}`} row={row} />
        ) : (
          <ItemRow key={`${row.name}-${index}`} row={row} />
        ),
      )}

      <div className={styles.totals}>
        {quotationPreviewData.totals.map((total) => (
          <div
            key={total.label}
            className={[
              styles.totalsRow,
              total.tone === 'grand' ? styles.grand : '',
              total.tone === 'balance' ? styles.balance : '',
            ].join(' ')}
          >
            <div className={styles.totalsLabel}>{total.label}</div>
            <div className={styles.totalsValue}>{total.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div>
          <div className={styles.footerLabel}>Notes</div>
          <div className={styles.footerText}>{quotationPreviewData.notes}</div>
        </div>

        <div>
          <div className={styles.footerLabel}>Bank Details</div>
          <div className={styles.bankBox}>
            {quotationPreviewData.bankRows.map(([label, value]) => (
              <div key={label} className={styles.bankRow}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.amountWords}>{quotationPreviewData.amountWords}</div>
      </div>
    </article>
  )
}

function GroupRow({ row }: { row: quotationPreviewGroup }) {
  return (
    <div className={styles.groupRow}>
      <div className={styles.groupName}>{row.label}</div>
    </div>
  )
}

function ItemRow({ row }: { row: quotationPreviewItem }) {
  return (
    <div className={styles.itemRow}>
      <div>
        <div className={styles.itemName}>{row.name}</div>
        {row.description ? (
          <div className={styles.itemDescription}>{row.description}</div>
        ) : null}
      </div>
      <div className={styles.quantity}>{row.quantity}</div>
      <div className={styles.amount}>{row.amount}</div>
    </div>
  )
}
