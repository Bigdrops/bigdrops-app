import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './CsrDocumentPreview.module.css'
import { csrPreviewData } from './csrViewMockData'

export default function CsrDocumentPreview() {
  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          <div className={styles.companyName}>{csrPreviewData.serviceCompany}</div>
          <div className={styles.companyContact}>{csrPreviewData.companyContact}</div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>CSR No.</div>
          <div className={styles.number}>{csrPreviewData.documentNumber}</div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Client Info</div>
          <div className={styles.metaValue}>{csrPreviewData.clientName}</div>
          <div className={styles.metaSub}>{csrPreviewData.clientContact}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Service Asset</div>
          <div className={styles.metaValue}>{csrPreviewData.assetInfo}</div>
          <div className={styles.metaSub}>{csrPreviewData.dateTime}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Problem Description</div>
        <div className={styles.narrativeText}>{csrPreviewData.problemDescription}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Work Performed</div>
        <div className={styles.narrativeText}>{csrPreviewData.workPerformed}</div>
      </div>

      {csrPreviewData.materialsUsed.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Materials Used</div>
          <div className={styles.materialList}>
            {csrPreviewData.materialsUsed.map((item, i) => (
              <div key={i} className={styles.materialItem}>
                <div className={styles.materialName}>{item.name}</div>
                <div className={styles.materialQuantity}>{item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Observations</div>
        <div className={styles.narrativeText}>{csrPreviewData.observations}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Recommendations</div>
        <div className={styles.narrativeText}>{csrPreviewData.recommendations}</div>
      </div>

      <div className={styles.section} style={{ background: 'var(--dv-bg-2)' }}>
        <div className={styles.sectionTitle} style={{ color: 'var(--dv-text-2)' }}>Technician Notes</div>
        <div className={styles.narrativeText} style={{ fontStyle: 'italic', color: 'var(--dv-text-2)' }}>
          {csrPreviewData.technicianNotes}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.signatureGrid}>
          <div className={styles.signatureBox}>
            <div className={styles.signatureLine} />
            <div className={styles.signatureTitle}>Technician Sign & Date</div>
          </div>
          <div className={styles.signatureBox}>
            <div className={styles.signatureLine} />
            <div className={styles.signatureTitle}>Client Acknowledgement</div>
          </div>
        </div>
      </div>
    </DocumentPreviewShell>
  )
}
