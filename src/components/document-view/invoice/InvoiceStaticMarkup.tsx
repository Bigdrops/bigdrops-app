
import React from 'react';
import styles from './InvoicePresentation.module.css';

export function InvoiceStaticMarkup() {
  return (
    <>
      

{/*  ─── TOAST AREA ───  */}
<div className={styles['toast-area']} ></div>

{/*  ─── NAV ───  */}
<nav className={styles['nav']}>
  <a href="#" className={styles['nav-back']}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
    Invoices
  </a>
  <div className={styles['nav-center']}>
    <div className={styles['nav-title']}>SASINV-B047</div>
    <div className={styles['nav-sub']}>Sun & Shield Power Solutions</div>
  </div>
  <div className={styles['nav-right']}>
    <button className={styles['icon-btn']} title="Share" >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    </button>
    <button className="icon-btn amber".split(' ').map(c => styles[c] || c).join(' ') title="Customise" >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
    </button>
    <button className={styles['icon-btn']} title="More actions" >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    </button>
  </div>
</nav>

{/*  ─── MAIN PAGE ───  */}
<main className={styles['page']}>

  {/*  HERO  */}
  <div className={styles['hero']}>

    <div className={styles['fade-up']}>
      <div className={styles['hero-top']}>
        <div>
          <div className={styles['doc-label']}>Tax Invoice</div>
          <div className={styles['invoice-num']}>SASINV-B047</div>
          <div className={styles['invoice-sub']}>Supply & Installation — 40KVA Generator, Pinnacle Towers</div>
          <div className={styles['thread-tag']}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            Progress Invoice · 2 of 3
          </div>
        </div>
        <div className="status-pill partial".split(' ').map(c => styles[c] || c).join(' ')>
          <div className={styles['status-dot']}></div>
          Partial
        </div>
      </div>
    </div>

    {/*  Money strip  */}
    <div className="money-strip fade-up".split(' ').map(c => styles[c] || c).join(' ')>
      <div className={styles['money-cell']}>
        <div className={styles['money-lbl']}>Total</div>
        <div className={styles['money-val']}>₦4,720,000</div>
        <div className={styles['money-hint']}>incl. 7.5% VAT</div>
      </div>
      <div className={styles['money-cell']}>
        <div className={styles['money-lbl']}>Received</div>
        <div className="money-val green".split(' ').map(c => styles[c] || c).join(' ')>₦2,000,000</div>
        <div className={styles['money-hint']}>cash + WHT</div>
      </div>
      <div className={styles['money-cell']}>
        <div className={styles['money-lbl']}>Balance Due</div>
        <div className="money-val amber".split(' ').map(c => styles[c] || c).join(' ')>₦2,720,000</div>
        <div className={styles['money-hint']}>due 30 May 25</div>
      </div>
    </div>

    {/*  Primary actions  */}
    <div className="action-row fade-up".split(' ').map(c => styles[c] || c).join(' ')>
      <button className="btn btn-amber".split(' ').map(c => styles[c] || c).join(' ') >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Record Payment
      </button>
      <button className="btn btn-outline".split(' ').map(c => styles[c] || c).join(' ') >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
    </div>

    {/*  Secondary chip actions (Advance Invoice removed from here)  */}
    <div className="secondary-actions fade-up".split(' ').map(c => styles[c] || c).join(' ')>
      <div className={styles['chip-btn']} >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Duplicate
      </div>
      <div className={styles['chip-btn']} >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy No.
      </div>
    </div>

  </div>

  {/*  INVOICE DOCUMENT  */}
  <div className="section fade-up".split(' ').map(c => styles[c] || c).join(' ')>
    <div className={styles['section-hd']}>
      <div className={styles['section-label']}>Invoice Document</div>
    </div>
    <div className={styles['invoice-doc']}>
      <div className={styles['doc-top-accent']}></div>

      {/*  Company header  */}
      <div className={styles['doc-head']}>
        <div className={styles['doc-company']}>
          <div className={styles['doc-co-name']}>Sun & Shield Power Solutions</div>
          <div className={styles['doc-co-addr']}>
            15B Adeyemo Alakija St, Victoria Island, Lagos<br>
            +234 802 000 1234 · info@sunshieldpower.com<br>
            RC No. 1234567 · TIN: 00123456-0001
          </div>
        </div>
        <div className={styles['doc-id-block']}>
          <div className={styles['doc-type-label']}>Invoice</div>
          <div className={styles['doc-number']}>SASINV-B047</div>
          <div >
            <div className={styles['doc-type-label']}>PO Reference</div>
            <div >PTO/2024/0183</div>
          </div>
        </div>
      </div>

      {/*  Client/dates  */}
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
          <div className={styles['doc-meta-lbl']} >Due Date</div>
          <div className={styles['doc-meta-val']}>30 May 2025</div>
        </div>
      </div>

      {/*  Items  */}
      <div className={styles['doc-items']}>
        <div className={styles['doc-items-head']}>
          <div className={styles['doc-col-lbl']}>Description</div>
          <div className="doc-col-lbl r".split(' ').map(c => styles[c] || c).join(' ')>Qty</div>
          <div className="doc-col-lbl r".split(' ').map(c => styles[c] || c).join(' ')>Amount</div>
        </div>

        <div className="doc-item-row group-hd".split(' ').map(c => styles[c] || c).join(' ')>
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

        <div className="doc-item-row group-hd".split(' ').map(c => styles[c] || c).join(' ')>
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

      {/*  Totals  */}
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
        <div className="totals-row grand".split(' ').map(c => styles[c] || c).join(' ')>
          <div className={styles['totals-lbl']}>Total Due</div>
          <div className={styles['totals-val']}>₦4,720,000</div>
        </div>
        <div className="totals-row balance".split(' ').map(c => styles[c] || c).join(' ')>
          <div className={styles['totals-lbl']}>Balance Remaining</div>
          <div className={styles['totals-val']}>₦2,720,000</div>
        </div>
      </div>

      {/*  Footer  */}
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

  {/*  PAYMENTS  */}
  <div className="section fade-up".split(' ').map(c => styles[c] || c).join(' ')>
    <div className={styles['section-hd']}>
      <div className={styles['section-label']}>Payments</div>
      <button className={styles['section-link']} >+ Record</button>
    </div>
    <div className={styles['payment-card']}>
      <div className={styles['payment-summary-grid']}>
        <div className={styles['pay-sum-cell']}>
          <div className={styles['pay-sum-lbl']}>Cash Received</div>
          <div className="pay-sum-val green".split(' ').map(c => styles[c] || c).join(' ')>₦1,650,000</div>
        </div>
        <div className={styles['pay-sum-cell']}>
          <div className={styles['pay-sum-lbl']}>WHT Applied</div>
          <div className={styles['pay-sum-val']}>₦350,000</div>
        </div>
      </div>
      <div className={styles['progress-wrap']}>
        <div className={styles['progress-bar']}>
          <div className={styles['progress-fill']} ></div>
        </div>
        <div className={styles['progress-meta']}>
          <span>42% settled</span>
          <span>₦2,720,000 remaining</span>
        </div>
      </div>
      <div className={styles['payment-hist']}>
        <div className={styles['pay-hist-item']} >
          <div className={styles['pay-hist-icon']}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
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
        <div className={styles['pay-hist-item']} >
          <div className="pay-hist-icon wht".split(' ').map(c => styles[c] || c).join(' ')>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
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

  {/*  ADVANCE INVOICES (saved state)  */}
  <div className="section fade-up".split(' ').map(c => styles[c] || c).join(' ')>
    <div className={styles['section-hd']}>
      <div className={styles['section-label']}>Advance Invoices</div>
      <button className={styles['section-link']} >+ Add</button>
    </div>
    <div className={styles['advance-card']}>
      <div className={styles['advance-card-head']}>
        <div>
          <div className={styles['advance-card-title']}>Advance Invoices — SASINV-B047</div>
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
            <button className={styles['mini-btn']} title="Download" >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button className={styles['mini-btn']} title="Edit" >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button className="mini-btn danger".split(' ').map(c => styles[c] || c).join(' ') title="Remove" >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
            <button className={styles['mini-btn']} title="Download" >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button className={styles['mini-btn']} title="Edit" >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button className="mini-btn danger".split(' ').map(c => styles[c] || c).join(' ') title="Remove" >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/*  LINKED DOCS  */}
  <div className="section fade-up".split(' ').map(c => styles[c] || c).join(' ')>
    <div className={styles['section-hd']}>
      <div className={styles['section-label']}>Related Documents</div>
      <button className={styles['section-link']} >+ Link</button>
    </div>
    <div className={styles['linked-list']}>
      <a href="#" className={styles['linked-item']}>
        <div className="linked-icon quote".split(' ').map(c => styles[c] || c).join(' ')>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div className={styles['linked-body']}>
          <div className={styles['linked-title']}>Quotation · SASQUO-B031</div>
          <div className={styles['linked-sub']}>Supply & Installation — 40KVA · Approved</div>
        </div>
        <div className={styles['linked-chev']}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </a>
      <a href="#" className={styles['linked-item']}>
        <div className="linked-icon csr".split(' ').map(c => styles[c] || c).join(' ')>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <div className={styles['linked-body']}>
          <div className={styles['linked-title']}>CSR · Site Readiness Inspection</div>
          <div className={styles['linked-sub']}>Completed 08 Apr 2025</div>
        </div>
        <div className={styles['linked-chev']}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </a>
      <a href="#" className={styles['linked-item']}>
        <div className="linked-icon project".split(' ').map(c => styles[c] || c).join(' ')>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        </div>
        <div className={styles['linked-body']}>
          <div className={styles['linked-title']}>Project · Pinnacle Towers Gen Install</div>
          <div className={styles['linked-sub']}>₦12.6M contract · 3 invoices</div>
        </div>
        <div className={styles['linked-chev']}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </a>
      <a href="#" className={styles['linked-item']}>
        <div className="linked-icon waybill".split(' ').map(c => styles[c] || c).join(' ')>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>
        <div className={styles['linked-body']}>
          <div className={styles['linked-title']}>Waybill · WBL-2025-0041</div>
          <div className={styles['linked-sub']}>Delivered 10 Apr 2025 · Victoria Island</div>
        </div>
        <div className={styles['linked-chev']}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </a>
    </div>
  </div>

  {/*  ATTACHMENTS  */}
  <div className="section fade-up".split(' ').map(c => styles[c] || c).join(' ')>
    <div className={styles['section-hd']}>
      <div className={styles['section-label']}>Attachments</div>
      <button className={styles['section-link']} >+ Add</button>
    </div>
    <div className={styles['attachments-scroller']}>
      <div className={styles['attach-chip']}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        PO_Pinnacle_0183.pdf
      </div>
      <div className={styles['attach-chip']}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        site_photo_commissioning.jpg
      </div>
      <div className={styles['attach-chip']}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        WHT_cert_LAS2025.pdf
      </div>
    </div>
  </div>

  <div ></div>

</main>

{/*  ─── FLOATING DOWNLOAD BUTTON ───  */}
<button className={styles['fab-download']} >
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  Download PDF
</button>

{/*  ══════════════════════════════════════════
     SHEETS & MODALS
══════════════════════════════════════════  */}

{/*  ─── OVERLAY ───  */}
<div className={styles['overlay']}  ></div>

{/*  ─── MORE / OVERFLOW SHEET ───  */}
<div className={styles['sheet']} >
  <div className={styles['sheet-handle']}></div>
  <div className={styles['sheet-title']}>More Actions</div>

  <div className={styles['sheet-section-lbl']}>Lifecycle</div>
  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Mark as Sent</div>
      <div className={styles['sa-desc']}>Log that this invoice was delivered to client</div>
    </div>
  </button>
  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Revert to Quotation</div>
      <div className={styles['sa-desc']}>Convert this invoice back to a draft quotation</div>
    </div>
  </button>
  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Generate Waybill</div>
      <div className={styles['sa-desc']}>Create a delivery waybill linked to this invoice</div>
    </div>
  </button>

  <div className={styles['sheet-divider']}></div>
  <div className={styles['sheet-section-lbl']}>Payments & Advances</div>

  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Record Payment</div>
      <div className={styles['sa-desc']}>Add a new payment against this invoice</div>
    </div>
  </button>
  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Advance Invoice</div>
      <div className={styles['sa-desc']}>Create a partial/advance invoice</div>
    </div>
  </button>

  <div className={styles['sheet-divider']}></div>
  <div className={styles['sheet-section-lbl']}>Links & Attachments</div>

  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Link to Project</div>
      <div className={styles['sa-desc']}>Associate this invoice with a project</div>
    </div>
  </button>
  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Attach / Link Document</div>
      <div className={styles['sa-desc']}>Upload or link a document to this invoice</div>
    </div>
  </button>

  <div className={styles['sheet-divider']}></div>
  <div className={styles['sheet-section-lbl']}>Document</div>

  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Copy Invoice Number</div>
      <div className={styles['sa-desc']}>SASINV-B047</div>
    </div>
  </button>
  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Export as CSV</div>
      <div className={styles['sa-desc']}>Download line items as spreadsheet</div>
    </div>
  </button>

  <div className={styles['sheet-divider']}></div>
  <div className={styles['sheet-section-lbl']}>Danger</div>

  <button className={styles['sheet-action']} >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Archive Invoice</div>
      <div className={styles['sa-desc']}>Remove from active lists, keep on record</div>
    </div>
  </button>
  <button className="sheet-action danger".split(' ').map(c => styles[c] || c).join(' ') >
    <div className={styles['sa-icon']}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></div>
    <div className={styles['sa-body']}>
      <div className={styles['sa-lbl']}>Delete Invoice</div>
      <div className={styles['sa-desc']}>Permanently remove this document</div>
    </div>
  </button>
</div>

{/*  ─── RECORD PAYMENT SHEET ───  */}
<div className={styles['sheet']} >
  <div className={styles['sheet-handle']}></div>
  <div className={styles['sheet-title']}>Record Payment</div>
  <div className={styles['sheet-sub']}>Balance due: ₦2,720,000</div>
  <div className={styles['sheet-body']}>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>Amount</label>
      <input className={styles['form-input']} type="text" placeholder="₦0.00" value="₦2,720,000" />
    </div>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>WHT Amount (if applicable)</label>
      <input className={styles['form-input']} type="text" placeholder="₦0.00" />
    </div>
    <div className={styles['form-row']}>
      <div className={styles['form-group']}>
        <label className={styles['form-label']}>Date</label>
        <input className={styles['form-input']} type="date" value="2025-04-17" />
      </div>
      <div className={styles['form-group']}>
        <label className={styles['form-label']}>Method</label>
        <select className={styles['form-select']}>
          <option>Bank Transfer</option>
          <option>Cheque</option>
          <option>Cash</option>
          <option>WHT Credit</option>
        </select>
      </div>
    </div>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>Reference / Transaction ID</label>
      <input className={styles['form-input']} type="text" placeholder="e.g. ZEN/2025/..." />
    </div>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>WHT Certificate Ref (optional)</label>
      <input className={styles['form-input']} type="text" placeholder="e.g. WHT/LAS/2025/..." />
    </div>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>Bank Account</label>
      <select className={styles['form-select']}>
        <option>Zenith Bank — 2109384756 (Default)</option>
        <option>First Bank — 3047291836</option>
      </select>
    </div>
    <div >
      <button className="btn btn-outline".split(' ').map(c => styles[c] || c).join(' ')  >Cancel</button>
      <button className="btn btn-amber".split(' ').map(c => styles[c] || c).join(' ')  >Save Payment</button>
    </div>
  </div>
</div>

{/*  ─── ADVANCE INVOICE SHEET (creation/edit) ───  */}
<div className={styles['sheet']} >
  <div className={styles['sheet-handle']}></div>
  <div className={styles['sheet-title']} >Create Advance Invoice</div>
  <div className={styles['sheet-sub']} >Based on SASINV-B047 · Total: ₦4,720,000</div>
  <div className={styles['sheet-body']}>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>Invoice Label</label>
      <input className={styles['form-input']}  type="text" placeholder="e.g. Mobilisation Advance" value="" />
    </div>
    <div className={styles['form-group']}>
      <label className={styles['form-label']}>Amount Type</label>
      <div className={styles['advance-type-grid']} >
        <div className="advance-type-opt active".split(' ').map(c => styles[c] || c).join(' ') data-type="percentage" >
          <div className={styles['advance-type-opt-label']}>Percentage</div>
          <div className={styles['advance-type-opt-sub']}>% of total</div>
        </div>
        <div className={styles['advance-type-opt']} data-type="fixed" >
          <div className={styles['advance-type-opt-label']}>Fixed Amount</div>
          <div className={styles['advance-type-opt-sub']}>Exact ₦ value</div>
        </div>
      </div>
    </div>
    <div className={styles['form-group']} >
      <label className={styles['form-label']}>Percentage (%)</label>
      <input className={styles['form-input']}  type="number" placeholder="e.g. 30" value="30" oninput="updateComputedAmount()" />
    </div>
    <div className={styles['form-group']}  >
      <label className={styles['form-label']}>Fixed Amount (₦)</label>
      <input className={styles['form-input']}  type="number" placeholder="e.g. 800000" value="800000" oninput="updateComputedAmount()" />
    </div>
    <div className={styles['form-group']} >
      <div >Computed Amount</div>
      <div  >₦1,416,000</div>
      <div  >30% of ₦4,720,000</div>
    </div>
    <div >
      <button className="btn btn-outline".split(' ').map(c => styles[c] || c).join(' ')  >Cancel</button>
      <button className="btn btn-amber".split(' ').map(c => styles[c] || c).join(' ')   >Generate Invoice</button>
    </div>
  </div>
</div>

{/*  ─── CUSTOMISATION SHEET ───  */}
<div className={styles['sheet']} >
  <div className={styles['sheet-handle']}></div>
  <div className={styles['sheet-title']}>Customise Output</div>
  <div className={styles['sheet-sub']}>Controls how the PDF is generated and displayed</div>
  <div className={styles['sheet-body']}>

    <div className={styles['form-group']}>
      <label className={styles['form-label']}>Template</label>
      <div className={styles['template-scroll-wrap']}>
        <div className={styles['template-scroll']}>
          <div className="tmpl-card active".split(' ').map(c => styles[c] || c).join(' ') >
            <div className={styles['tmpl-preview']}>
              <div className={styles['t-bar']}></div>
              <div className={styles['t-body']}>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w40".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
              </div>
            </div>
            <div className={styles['tmpl-name']}>Proforma</div>
          </div>
          <div className={styles['tmpl-card']} >
            <div className={styles['tmpl-preview']}>
              <div className={styles['t-bar']}></div>
              <div className={styles['t-body']}>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w40".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
              </div>
            </div>
            <div className={styles['tmpl-name']}>Bold</div>
          </div>
          <div className={styles['tmpl-card']} >
            <div className={styles['tmpl-preview']}>
              <div className={styles['t-bar']}></div>
              <div className={styles['t-body']}>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w40".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
              </div>
            </div>
            <div className={styles['tmpl-name']}>Compact</div>
          </div>
          <div className={styles['tmpl-card']} >
            <div className={styles['tmpl-preview']}>
              <div className={styles['t-bar']}></div>
              <div className={styles['t-body']}>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w40".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w80".split(' ').map(c => styles[c] || c).join(' ')></div>
                <div className="t-line w60".split(' ').map(c => styles[c] || c).join(' ')></div>
              </div>
            </div>
            <div className={styles['tmpl-name']}>Classic</div>
          </div>
        </div>
      </div>
    </div>

    <div className="form-group mt8".split(' ').map(c => styles[c] || c).join(' ')>
      <label className={styles['form-label']}>Signatory</label>
      <select className={styles['form-select']}>
        <option>Engr. Babajide Olusanya — Managing Director</option>
        <option>Mrs. Folake Adeyemi — Finance Director</option>
        <option>None</option>
      </select>
    </div>

    <div className="form-group mt8".split(' ').map(c => styles[c] || c).join(' ')>
      <label className={styles['form-label']}>Accent Colour</label>
      <div className={styles['colour-swatch']}>
        <div className="colour-option blue active".split(' ').map(c => styles[c] || c).join(' ') ></div>
        <div className="colour-option black".split(' ').map(c => styles[c] || c).join(' ') ></div>
        <div className="colour-option green".split(' ').map(c => styles[c] || c).join(' ') ></div>
        <div className="colour-option amber".split(' ').map(c => styles[c] || c).join(' ') ></div>
      </div>
      <div >Changes the primary accent throughout the document.</div>
    </div>

    <div className="form-group mt8".split(' ').map(c => styles[c] || c).join(' ')>
      <label className={styles['form-label']}>Font Family</label>
      <select className={styles['form-select']}>
        <option>Plus Jakarta Sans (Default)</option>
        <option>Inter</option>
        <option>DM Sans</option>
        <option>Space Grotesk</option>
      </select>
    </div>

    <div className="form-group mt8".split(' ').map(c => styles[c] || c).join(' ')>
      <label className={styles['form-label']}>PDF Options</label>
      <div className={styles['toggle-rows']}>
        <div className={styles['toggle-row-item']}>
          <div className={styles['toggle-info']}>
            <div className={styles['toggle-item-label']}>Show Bank Details</div>
            <div className={styles['toggle-item-sub']}>Display payment account on PDF</div>
          </div>
          <label className={styles['toggle']}>
            <input type="checkbox" />
            <div className={styles['toggle-track']}><div className={styles['toggle-thumb']}></div></div>
          </label>
        </div>
        <div className={styles['toggle-row-item']}>
          <div className={styles['toggle-info']}>
            <div className={styles['toggle-item-label']}>Show Balance Due</div>
            <div className={styles['toggle-item-sub']}>Display remaining balance on document</div>
          </div>
          <label className={styles['toggle']}>
            <input type="checkbox" checked />
            <div className={styles['toggle-track']}><div className={styles['toggle-thumb']}></div></div>
          </label>
        </div>
        <div className={styles['toggle-row-item']}>
          <div className={styles['toggle-info']}>
            <div className={styles['toggle-item-label']}>Show Footer</div>
            <div className={styles['toggle-item-sub']}>Company footer on each page</div>
          </div>
          <label className={styles['toggle']}>
            <input type="checkbox" checked />
            <div className={styles['toggle-track']}><div className={styles['toggle-thumb']}></div></div>
          </label>
        </div>
        <div className={styles['toggle-row-item']}>
          <div className={styles['toggle-info']}>
            <div className={styles['toggle-item-label']}>Show Tagline</div>
            <div className={styles['toggle-item-sub']}>Company tagline below name</div>
          </div>
          <label className={styles['toggle']}>
            <input type="checkbox" checked />
            <div className={styles['toggle-track']}><div className={styles['toggle-thumb']}></div></div>
          </label>
        </div>
      </div>
    </div>

    <div >
      <button className="btn btn-amber".split(' ').map(c => styles[c] || c).join(' ')  >Save Settings</button>
    </div>
  </div>
</div>

{/*  ══════════════════ MODALS ══════════════════  */}

{/*  DELETE MODAL  */}
<div className={styles['modal-backdrop']}  >
  <div className={styles['modal']} >
    <div className={styles['modal-header']}>
      <div className="modal-icon-wrap danger".split(' ').map(c => styles[c] || c).join(' ')>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </div>
      <div className={styles['modal-title']}>Delete Invoice?</div>
    </div>
    <div className={styles['modal-body']}>
      <strong>SASINV-B047</strong> will be permanently deleted. This cannot be undone. All payment records and linked data for this invoice will be removed.
    </div>
    <div className={styles['modal-footer']}>
      <button className={styles['modal-cancel-btn']} >Cancel</button>
      <button className={styles['modal-danger-btn']} >Delete</button>
    </div>
  </div>
</div>

{/*  ARCHIVE MODAL  */}
<div className={styles['modal-backdrop']}  >
  <div className={styles['modal']} >
    <div className={styles['modal-header']}>
      <div className="modal-icon-wrap amber".split(' ').map(c => styles[c] || c).join(' ')>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
      </div>
      <div className={styles['modal-title']}>Archive Invoice?</div>
    </div>
    <div className={styles['modal-body']}>
      <strong>SASINV-B047</strong> will be moved to your archive. It won't appear in your active invoice list but remains accessible and recoverable.
    </div>
    <div className={styles['modal-footer']}>
      <button className={styles['modal-cancel-btn']} >Cancel</button>
      <button className="btn btn-amber".split(' ').map(c => styles[c] || c).join(' ')  >Archive</button>
    </div>
  </div>
</div>

{/*  REVERT MODAL  */}
<div className={styles['modal-backdrop']}  >
  <div className={styles['modal']} >
    <div className={styles['modal-header']}>
      <div className="modal-icon-wrap primary".split(' ').map(c => styles[c] || c).join(' ')>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
      </div>
      <div className={styles['modal-title']}>Revert to Quotation?</div>
    </div>
    <div className={styles['modal-body']}>
      <strong>SASINV-B047</strong> will be converted back to a draft quotation. Existing payment records will be preserved but the invoice status will be removed.
    </div>
    <div className={styles['modal-footer']}>
      <button className={styles['modal-cancel-btn']} >Cancel</button>
      <button className="btn btn-outline".split(' ').map(c => styles[c] || c).join(' ')  >Revert</button>
    </div>
  </div>
</div>

{/*  VOID PAYMENT MODAL  */}
<div className={styles['modal-backdrop']}  >
  <div className={styles['modal']} >
    <div className={styles['modal-header']}>
      <div className="modal-icon-wrap danger".split(' ').map(c => styles[c] || c).join(' ')>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      </div>
      <div className={styles['modal-title']}>Void Payment?</div>
    </div>
    <div className={styles['modal-body']}>
      <strong>Bank Transfer · ₦1,650,000</strong> recorded on 14 Apr 2025 will be marked as voided. The invoice balance will be updated accordingly.
      <div >
        <label className={styles['form-label']} >Void Reason</label>
        <input className={styles['form-input']} type="text" placeholder="Reason for voiding this payment" />
      </div>
    </div>
    <div className={styles['modal-footer']}>
      <button className={styles['modal-cancel-btn']} >Cancel</button>
      <button className={styles['modal-danger-btn']} >Void Payment</button>
    </div>
  </div>
</div>

<script>
// Sheet control
function openSheet(id) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}
function closeAll() {
  document.getElementById('overlay').classList.remove('open');
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
}

// Modal control
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Toast
function fireToast(msg, type) {
  const area = document.getElementById('toast-area');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    ${msg}
  `;
  area.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

// Template selection
function selectTemplate(el) {
  document.querySelectorAll('.tmpl-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// Colour selection in customisation
function selectColour(el, colour) {
  document.querySelectorAll('.colour-option').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// Advance type selection
function selectAdvanceType(el) {
  const grid = document.getElementById('advanceTypeGrid');
  grid.querySelectorAll('.advance-type-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  const type = el.dataset.type;
  document.getElementById('percentageField').style.display = type === 'percentage' ? 'block' : 'none';
  document.getElementById('fixedField').style.display = type === 'fixed' ? 'block' : 'none';
  updateComputedAmount();
}

function updateComputedAmount() {
  const isPercentage = document.querySelector('.advance-type-opt.active').dataset.type === 'percentage';
  const total = 4720000;
  let amount = 0;
  if (isPercentage) {
    const pct = parseFloat(document.getElementById('advancePercent').value) || 0;
    amount = (total * pct / 100);
    document.getElementById('computedDescription').innerText = `${pct}% of ₦4,720,000`;
  } else {
    amount = parseFloat(document.getElementById('advanceFixed').value) || 0;
    document.getElementById('computedDescription').innerText = `Fixed amount`;
  }
  document.getElementById('computedAmount').innerText = '₦' + amount.toLocaleString('en-NG');
}

// Open advance sheet (new or edit)
function openAdvanceSheet(mode, data = null) {
  const sheet = document.getElementById('advance-sheet');
  const title = document.getElementById('advanceSheetTitle');
  const sub = document.getElementById('advanceSheetSub');
  const labelInput = document.getElementById('advanceLabel');
  const percentInput = document.getElementById('advancePercent');
  const fixedInput = document.getElementById('advanceFixed');
  const submitBtn = document.getElementById('advanceSubmitBtn');
  const typeGrid = document.getElementById('advanceTypeGrid');
  const typeOpts = typeGrid.querySelectorAll('.advance-type-opt');
  
  if (mode === 'edit' && data) {
    title.innerText = 'Edit Advance Invoice';
    sub.innerText = `Editing "${data.label}" · Total: ₦4,720,000`;
    labelInput.value = data.label;
    if (data.type === 'percentage') {
      typeOpts[0].classList.add('active');
      typeOpts[1].classList.remove('active');
      percentInput.value = data.value;
      document.getElementById('percentageField').style.display = 'block';
      document.getElementById('fixedField').style.display = 'none';
    } else {
      typeOpts[0].classList.remove('active');
      typeOpts[1].classList.add('active');
      fixedInput.value = data.value;
      document.getElementById('percentageField').style.display = 'none';
      document.getElementById('fixedField').style.display = 'block';
    }
    submitBtn.innerText = 'Save Changes';
  } else {
    title.innerText = 'Create Advance Invoice';
    sub.innerText = 'Based on SASINV-B047 · Total: ₦4,720,000';
    labelInput.value = '';
    typeOpts[0].classList.add('active');
    typeOpts[1].classList.remove('active');
    percentInput.value = 30;
    fixedInput.value = 800000;
    document.getElementById('percentageField').style.display = 'block';
    document.getElementById('fixedField').style.display = 'none';
    submitBtn.innerText = 'Generate Invoice';
  }
  updateComputedAmount();
  openSheet('advance-sheet');
}

// Segmented control (if any)
document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    this.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});
</script>

    </>
  );
}
