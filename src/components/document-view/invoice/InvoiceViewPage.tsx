import {
  Banknote,
  Pencil,
  Copy,
  Files,
  Download,
  ChevronRight,
  FileText,
  Briefcase,
  CheckCircle2,
  XCircle,
  FileBadge2,
} from 'lucide-react'
import type { BaseDocument } from '../types/documentView'
import styles from './InvoicePresentation.module.css'
import type { InvoiceMetric } from './invoiceViewMockData'

interface InvoiceViewPageProps {
  document: BaseDocument
  metrics: InvoiceMetric[]
  onRecordPayment: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onAdvanceDownload: () => void
  onAdvanceEdit: () => void
  onAdvanceRemove: () => void
  onVoidPayment: () => void
}

export default function InvoiceViewPage({
  document: _document,
  metrics,
  onRecordPayment,
  onEdit,
  onDuplicate,
  onCopyNumber,
  onAdvanceDownload,
  onAdvanceEdit,
  onAdvanceRemove,
  onVoidPayment,
}: InvoiceViewPageProps) {
  return (
    <>
      <div className={`${styles['action-row']} ${styles['fade-up']}`}>
        <button className={`${styles.btn} ${styles['btn-amber']}`} onClick={onRecordPayment}>
          <Banknote size={15} strokeWidth={2.5} />
          Record Payment
        </button>
        <button className={`${styles.btn} ${styles['btn-outline']}`} onClick={onEdit}>
          <Pencil size={15} strokeWidth={2} />
          Edit
        </button>
      </div>

      <div className={`${styles['secondary-actions']} ${styles['fade-up']}`}>
        <div className={styles['chip-btn']} onClick={onDuplicate}>
          <Copy size={12} strokeWidth={2.5} />
          Duplicate
        </div>
        <div className={styles['chip-btn']} onClick={onCopyNumber}>
          <Files size={12} strokeWidth={2.5} />
          Copy No.
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Invoice Document</div>
        </div>
        <div className={styles['invoice-doc']}>
          <div className={styles['doc-top-accent']}></div>

          <div className={styles['doc-head']}>
            <div className={styles['doc-company']}>
              <div className={styles['doc-co-name']}>Sun & Shield Power Solutions</div>
              <div className={styles['doc-co-addr']}>
                15B Adeyemo Alakija St, Victoria Island, Lagos<br />
                +234 802 000 1234 · info@sunshieldpower.com<br />
                RC No. 1234567 · TIN: 00123456-0001
              </div>
            </div>
            <div className={styles['doc-id-block']}>
              <div className={styles['doc-type-label']}>Invoice</div>
              <div className={styles['doc-number']}>{_document.number}</div>
              <div style={{ marginTop: 8 }}>
                <div className={styles['doc-type-label']}>PO Reference</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>PTO/2024/0183</div>
              </div>
            </div>
          </div>

          <div className={styles['doc-meta-grid']}>
            <div className={styles['doc-meta-cell']}>
              <div className={styles['doc-meta-lbl']}>Bill To</div>
              <div className={styles['doc-meta-val']}>Pinnacle Towers Ltd</div>
              <div className={styles['doc-meta-sub']}>Attn: Adekunle Afolabi</div>
              <div className={styles['doc-meta-sub']}>Pinnacle Building, Ozumba Mbadiwe</div>
            </div>
            <div className={styles['doc-meta-cell']}>
              <div className={styles['doc-meta-lbl']}>Issue Date</div>
              <div className={styles['doc-meta-val']}>12 April 2025</div>
              <div className={styles['doc-meta-lbl']} style={{ marginTop: 9 }}>Due Date</div>
              <div className={styles['doc-meta-val']}>30 May 2025</div>
            </div>
          </div>

          <div className={styles['doc-items']}>
            <div className={styles['doc-items-head']}>
              <div className={styles['doc-col-lbl']}>Description</div>
              <div className={`${styles['doc-col-lbl']} ${styles.r}`}>Qty</div>
              <div className={`${styles['doc-col-lbl']} ${styles.r}`}>Amount</div>
            </div>

            <div className={`${styles['doc-item-row']} ${styles['group-hd']}`}>
              <div className={styles['group-name']}>Supply of Equipment</div>
            </div>
            <div className={styles['doc-item-row']}>
              <div>
                <div className={styles['item-name']}>40KVA Soundproof Generator (FG Wilson)</div>
                <div className={styles['item-desc']}>3-phase, 415V output, with ATS panel and warranty</div>
              </div>
              <div className={styles['item-qty']}>1 unit</div>
              <div className={styles['item-amount']}>₦3,200,000</div>
            </div>
            <div className={styles['doc-item-row']}>
              <div>
                <div className={styles['item-name']}>ATS / Changeover Panel (100A)</div>
              </div>
              <div className={styles['item-qty']}>1 set</div>
              <div className={styles['item-amount']}>₦180,000</div>
            </div>

            <div className={`${styles['doc-item-row']} ${styles['group-hd']}`}>
              <div className={styles['group-name']}>Installation & Labour</div>
            </div>
            <div className={styles['doc-item-row']}>
              <div>
                <div className={styles['item-name']}>Civil & Electrical Installation</div>
                <div className={styles['item-desc']}>Concrete plinth, cabling, conduits, earthing, load testing</div>
              </div>
              <div className={styles['item-qty']}>1 lot</div>
              <div className={styles['item-amount']}>₦650,000</div>
            </div>
            <div className={styles['doc-item-row']}>
              <div>
                <div className={styles['item-name']}>Commissioning & Handover</div>
              </div>
              <div className={styles['item-qty']}>1</div>
              <div className={styles['item-amount']}>₦120,000</div>
            </div>
          </div>

          <div className={styles['doc-totals']}>
            <div className={styles['totals-row']}>
              <div className={styles['totals-lbl']}>Subtotal</div>
              <div className={styles['totals-val']}>₦4,150,000</div>
            </div>
            <div className={styles['totals-row']}>
              <div className={styles['totals-lbl']}>Workmanship</div>
              <div className={styles['totals-val']}>₦120,000</div>
            </div>
            <div className={styles['totals-row']}>
              <div className={styles['totals-lbl']}>Transportation</div>
              <div className={styles['totals-val']}>₦85,000</div>
            </div>
            <div className={styles['totals-row']}>
              <div className={styles['totals-lbl']}>VAT (7.5%)</div>
              <div className={styles['totals-val']}>₦365,000</div>
            </div>
            <div className={styles['totals-rule']}></div>
            <div className={`${styles['totals-row']} ${styles.grand}`}>
              <div className={styles['totals-lbl']}>Total Due</div>
              <div className={styles['totals-val']}>₦4,720,000</div>
            </div>
            <div className={`${styles['totals-row']} ${styles.balance}`}>
              <div className={styles['totals-lbl']}>Balance Remaining</div>
              <div className={styles['totals-val']}>₦2,720,000</div>
            </div>
          </div>

          <div className={styles['doc-footer']}>
            <div className={styles['doc-footer-section']}>
              <div className={styles['doc-footer-lbl']}>Payment Details</div>
              <div className={styles['bank-box']}>
                <div className={styles['bank-row']}><span>Bank</span><span>Zenith Bank PLC</span></div>
                <div className={styles['bank-row']}><span>Account Name</span><span>Sun & Shield Power Solutions</span></div>
                <div className={styles['bank-row']}><span>Account No.</span><span>2109384756</span></div>
              </div>
            </div>
            <div className={styles['doc-footer-section']}>
              <div className={styles['doc-footer-lbl']}>Notes</div>
              <div className={styles['doc-footer-text']}>All equipment carries a 12-month warranty from commissioning. WHT deductions must be accompanied by a valid WHT certificate. Payment within stipulated period.</div>
            </div>
            <div className={styles['amount-words']}>
              Four million, seven hundred and twenty thousand naira only (₦4,720,000.00)
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Payments</div>
          <button className={styles['section-link']} onClick={onRecordPayment}>+ Record</button>
        </div>
        <div className={styles['payment-card']}>
          <div className={styles['payment-summary-grid']}>
            <div className={styles['pay-sum-cell']}>
              <div className={styles['pay-sum-lbl']}>Cash Received</div>
              <div className={`${styles['pay-sum-val']} ${styles.green}`}>₦1,650,000</div>
            </div>
            <div className={styles['pay-sum-cell']}>
              <div className={styles['pay-sum-lbl']}>WHT Applied</div>
              <div className={styles['pay-sum-val']}>₦350,000</div>
            </div>
          </div>
          <div className={styles['progress-wrap']}>
            <div className={styles['progress-bar']}>
              <div className={styles['progress-fill']} style={{ width: '42%' }}></div>
            </div>
            <div className={styles['progress-meta']}>
              <span>42% settled</span>
              <span>₦2,720,000 remaining</span>
            </div>
          </div>
          <div className={styles['payment-hist']}>
            <div className={styles['pay-hist-item']} onClick={onVoidPayment}>
              <div className={styles['pay-hist-icon']}>
                <CheckCircle2 size={14} strokeWidth={2.5} />
              </div>
              <div className={styles['pay-hist-body']}>
                <div className={styles['pay-hist-method']}>Bank Transfer</div>
                <div className={styles['pay-hist-ref']}>ZEN/2025/0041938</div>
              </div>
              <div className={styles['pay-hist-right']}>
                <div className={styles['pay-hist-amount']}>₦1,650,000</div>
                <div className={styles['pay-hist-date']}>14 Apr 2025</div>
              </div>
            </div>
            <div className={styles['pay-hist-item']} onClick={onVoidPayment}>
              <div className={`${styles['pay-hist-icon']} ${styles.wht}`}>
                <FileBadge2 size={14} strokeWidth={2.5} />
              </div>
              <div className={styles['pay-hist-body']}>
                <div className={styles['pay-hist-method']}>WHT Credit</div>
                <div className={styles['pay-hist-ref']}>WHT/LAS/2025/1177</div>
                <span className={styles['wht-tag']}>5% WHT rate</span>
              </div>
              <div className={styles['pay-hist-right']}>
                <div className={styles['pay-hist-amount']}>₦350,000</div>
                <div className={styles['pay-hist-date']}>12 Apr 2025</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Advance Invoices</div>
          <button className={styles['section-link']} onClick={onAdvanceEdit}>+ Add</button>
        </div>
        <div className={styles['advance-card']}>
          <div className={styles['advance-card-head']}>
            <div>
              <div className={styles['advance-card-title']}>Advance Invoices — {_document.number}</div>
              <div className={styles['advance-card-sub']}>₦4,720,000 contract · 2 advance invoices generated</div>
            </div>
          </div>
          <div className={styles['advance-card-body']}>
            <div className={styles['advance-item']}>
              <div className={styles['advance-item-left']}>
                <div className={styles['advance-item-label']}>Mobilisation Advance</div>
                <div className={styles['advance-item-sub']}>30% · Generated 01 Mar 2025</div>
              </div>
              <div className={styles['advance-item-amount']}>₦1,416,000</div>
              <div className={styles['advance-item-actions']}>
                <button className={styles['mini-btn']} title="Download" onClick={onAdvanceDownload}>
                  <Download size={13} strokeWidth={2.5} />
                </button>
                <button className={styles['mini-btn']} title="Edit" onClick={onAdvanceEdit}>
                  <Pencil size={13} strokeWidth={2.5} />
                </button>
                <button className={`${styles['mini-btn']} ${styles.danger}`} title="Remove" onClick={onAdvanceRemove}>
                  <XCircle size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className={styles['advance-item']}>
              <div className={styles['advance-item-left']}>
                <div className={styles['advance-item-label']}>Interim Progress Billing</div>
                <div className={styles['advance-item-sub']}>Fixed · Generated 28 Mar 2025</div>
              </div>
              <div className={styles['advance-item-amount']}>₦800,000</div>
              <div className={styles['advance-item-actions']}>
                <button className={styles['mini-btn']} title="Download" onClick={onAdvanceDownload}>
                  <Download size={13} strokeWidth={2.5} />
                </button>
                <button className={styles['mini-btn']} title="Edit" onClick={onAdvanceEdit}>
                  <Pencil size={13} strokeWidth={2.5} />
                </button>
                <button className={`${styles['mini-btn']} ${styles.danger}`} title="Remove" onClick={onAdvanceRemove}>
                  <XCircle size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Related Documents</div>
          <button className={styles['section-link']}>+ Link</button>
        </div>
        <div className={styles['linked-list']}>
          <a href="#" className={styles['linked-item']}>
            <div className={`${styles['linked-icon']} ${styles.quote}`}>
              <FileText size={15} strokeWidth={2} />
            </div>
            <div className={styles['linked-body']}>
              <div className={styles['linked-title']}>Quotation · SASQUO-B031</div>
              <div className={styles['linked-sub']}>Supply & Installation — 40KVA · Approved</div>
            </div>
            <div className={styles['linked-chev']}><ChevronRight size={14} strokeWidth={2} /></div>
          </a>
          <a href="#" className={styles['linked-item']}>
            <div className={`${styles['linked-icon']} ${styles.csr}`}>
              <CheckCircle size={15} strokeWidth={2} />
            </div>
            <div className={styles['linked-body']}>
              <div className={styles['linked-title']}>CSR · Site Readiness Inspection</div>
              <div className={styles['linked-sub']}>Completed 08 Apr 2025</div>
            </div>
            <div className={styles['linked-chev']}><ChevronRight size={14} strokeWidth={2} /></div>
          </a>
          <a href="#" className={styles['linked-item']}>
            <div className={`${styles['linked-icon']} ${styles.project}`}>
              <Briefcase size={15} strokeWidth={2} />
            </div>
            <div className={styles['linked-body']}>
              <div className={styles['linked-title']}>Project · Pinnacle Towers Gen Install</div>
              <div className={styles['linked-sub']}>₦12.6M contract · 3 invoices</div>
            </div>
            <div className={styles['linked-chev']}><ChevronRight size={14} strokeWidth={2} /></div>
          </a>
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Attachments</div>
          <button className={styles['section-link']}>+ Add</button>
        </div>
        <div className={styles['attachments-scroller']}>
          <div className={styles['attach-chip']}>
            <FileText size={12} strokeWidth={2} />
            PO_Pinnacle_0183.pdf
          </div>
          <div className={styles['attach-chip']}>
            <Paperclip size={12} strokeWidth={2} />
            site_photo_commissioning.jpg
          </div>
          <div className={styles['attach-chip']}>
            <FileText size={12} strokeWidth={2} />
            WHT_cert_LAS2025.pdf
          </div>
        </div>
      </div>
      <div style={{ height: 32 }}></div>
    </>
  )
}
