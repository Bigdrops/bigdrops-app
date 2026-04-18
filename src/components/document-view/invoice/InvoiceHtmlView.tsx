import './InvoiceHtmlView.css'

type InvoiceHtmlViewProps = {
  invoice: any
  viewModel: any
  previewModel: any
  pdfOutput: any
  settingsData: any
}

export default function InvoiceHtmlView({
  invoice,
  viewModel,
  previewModel,
  pdfOutput,
  settingsData,
}: InvoiceHtmlViewProps) {
  const items = Array.isArray(previewModel?.previewItems) ? previewModel.previewItems : []
  const totals = Array.isArray(previewModel?.previewTotals) ? previewModel.previewTotals : []
  const companyLines = Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : []
  const clientLines = Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : []
  const bank = pdfOutput?.showBankDetails ? previewModel?.selectedPreviewBank : null

  return (
    <div className="invoiceHtmlView">
      <div className="doc-top-accent" />

      <div className="doc-head">
        <div className="doc-company">
          <div className="doc-co-name">{settingsData?.company_name || 'BigDrops'}</div>
          <div className="doc-co-addr">
            {companyLines.map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
        <div className="doc-id-block">
          <div className="doc-type-label">{invoice?.invoice_title || 'Tax Invoice'}</div>
          <div className="doc-number">{invoice?.invoice_number || 'Draft'}</div>
        </div>
      </div>

      <div className="doc-meta-grid">
        <div className="doc-meta-cell">
          <div className="doc-meta-lbl">Bill To</div>
          <div className="doc-meta-val">{invoice?.client_name || 'Unassigned Client'}</div>
          <div className="doc-meta-sub">
            {clientLines.map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
        <div className="doc-meta-cell">
          <div className="doc-meta-lbl">Details</div>
          <div className="doc-meta-val">Date: {invoice?.issue_date || '—'}</div>
          <div className="doc-meta-sub">Due: {invoice?.due_date || 'Open'}</div>
          <div className="doc-meta-sub">Status: {viewModel?.statusLabel || invoice?.status || 'Draft'}</div>
        </div>
      </div>

      <div className="doc-items">
        <div className="doc-items-head">
          <div className="doc-col-lbl">Description</div>
          <div className="doc-col-lbl r">Qty</div>
          <div className="doc-col-lbl r">Amount</div>
        </div>

        {items.length > 0 ? (
          items.map((item: any, index: number) => {
            if (item?.type === 'group') {
              return (
                <div className="doc-item-row group-hd" key={index}>
                  <div className="group-name">{item?.label}</div>
                </div>
              )
            }

            const qtyFact = (item?.facts || []).find((f: string) => f.startsWith('Qty:'))
            const cleanQty = qtyFact ? qtyFact.replace('Qty:', '').trim() : '—'

            return (
              <div className="doc-item-row" key={index}>
                <div className="item-body">
                  <div className="item-name">{item?.label || 'Item'}</div>
                  {item?.detail ? <div className="item-desc">{item.detail}</div> : null}
                </div>
                <div className="item-qty">{cleanQty}</div>
                <div className="item-amount">{item?.value || '—'}</div>
              </div>
            )
          })
        ) : (
          <div className="doc-item-row">
            <div className="item-body">
               <div className="item-desc">No items added to this invoice.</div>
            </div>
          </div>
        )}
      </div>

      <div className="doc-totals">
        {totals.map((row: any, index: number) => {
          const isGrand = row?.emphasis && row?.label?.toLowerCase() === 'total'
          const isBalance = row?.emphasis && row?.label?.toLowerCase().includes('balance')

          return (
            <div
              key={index}
              className={`totals-row ${isGrand ? 'grand' : ''} ${isBalance ? 'balance' : ''}`}
            >
              <div className="totals-lbl">{row?.label || 'Subtotal'}</div>
              <div className="totals-val">{row?.value || '—'}</div>
            </div>
          )
        })}
        {invoice?.amount_in_words ? (
          <div className="amount-words">{invoice.amount_in_words}</div>
        ) : null}
      </div>

      <div className="doc-footer">
        {bank ? (
          <div className="doc-footer-section">
            <div className="doc-footer-lbl">Payment Details</div>
            <div className="bank-box">
              <div className="bank-row">
                <span>Bank</span>
                <span>{bank.bankName || '—'}</span>
              </div>
              <div className="bank-row">
                <span>Account</span>
                <span>{bank.accountName || '—'}</span>
              </div>
              <div className="bank-row">
                <span>Number</span>
                <span>{bank.accountNumber || '—'}</span>
              </div>
            </div>
          </div>
        ) : null}

        {invoice?.notes ? (
           <div className="doc-footer-section">
             <div className="doc-footer-lbl">Notes</div>
             <div className="doc-footer-text">{invoice.notes}</div>
           </div>
        ) : null}
      </div>
    </div>
  )
}

