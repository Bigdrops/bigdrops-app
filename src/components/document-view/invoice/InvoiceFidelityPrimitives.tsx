import type { ReactNode } from 'react'
import {
  ArrowLeft,
  Share2,
  SlidersHorizontal,
  MoreHorizontal,
  Banknote,
  Pencil,
  Copy,
  Files,
  Download,
  ChevronRight,
  FileText,
  Briefcase,
  CheckCircle2,
  Paperclip,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import styles from './InvoicePresentation.module.css'

export function InvoicePageShell({ children, overlay, topNav, floating }: any) {
  return (
    <div className={styles.invoiceScope}>
      {topNav}
      <main className={styles.page}>{children}</main>
      {floating}
      {overlay}
    </div>
  )
}

export function InvoiceTopNav({ title, subtitle, onBack, onShare, onCustomize, onMore }: any) {
  return (
    <nav className={styles.nav}>
      <button onClick={onBack} className={styles['nav-back']} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={16} strokeWidth={2.5} />
        Invoices
      </button>
      <div className={styles['nav-center']}>
        <div className={styles['nav-title']}>{title}</div>
        <div className={styles['nav-sub']}>{subtitle}</div>
      </div>
      <div className={styles['nav-right']}>
        <button className={styles['icon-btn']} title="Share" onClick={onShare}>
          <Share2 size={17} strokeWidth={2} />
        </button>
        <button className={`${styles['icon-btn']} ${styles.amber}`} title="Customise" onClick={onCustomize}>
          <SlidersHorizontal size={18} strokeWidth={2} />
        </button>
        <button className={styles['icon-btn']} title="More actions" onClick={onMore}>
          <MoreHorizontal size={17} strokeWidth={2} />
        </button>
      </div>
    </nav>
  )
}

export function InvoiceFloatingDownloadButton({ onClick }: any) {
  return (
    <button className={styles['fab-download']} onClick={onClick}>
      <Download size={17} strokeWidth={2.5} />
      Download PDF
    </button>
  )
}

export function InvoiceHero({
  label,
  number,
  description,
  threadTag,
  status,
  totals,
}: any) {
  return (
    <div className={styles.hero}>
      <div className={styles['fade-up']}>
        <div className={styles['hero-top']}>
          <div>
            <div className={styles['doc-label']}>{label}</div>
            <div className={styles['invoice-num']}>{number}</div>
            <div className={styles['invoice-sub']}>{description}</div>
            <div className={styles['thread-tag']}>
              <Banknote size={12} strokeWidth={2.5} style={{ marginRight: 4 }} />
              {threadTag}
            </div>
          </div>
          <div className={`${styles['status-pill']} ${styles[status?.toLowerCase()] || styles.draft}`}>
            <div className={styles['status-dot']}></div>
            {status}
          </div>
        </div>
      </div>

      <div className={`${styles['money-strip']} ${styles['fade-up']}`}>
        <div className={styles['money-cell']}>
          <div className={styles['money-lbl']}>Total</div>
          <div className={styles['money-val']}>{totals?.[0]?.value}</div>
          <div className={styles['money-hint']}>incl. 7.5% VAT</div>
        </div>
        <div className={styles['money-cell']}>
          <div className={styles['money-lbl']}>Received</div>
          <div className={`${styles['money-val']} ${styles.green}`}>{totals?.[1]?.value}</div>
          <div className={styles['money-hint']}>cash + WHT</div>
        </div>
        <div className={styles['money-cell']}>
          <div className={styles['money-lbl']}>Balance Due</div>
          <div className={`${styles['money-val']} ${styles.amber}`}>{totals?.[2]?.value}</div>
          <div className={styles['money-hint']}>due 30 May 25</div>
        </div>
      </div>
    </div>
  )
}
