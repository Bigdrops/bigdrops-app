import './InvoiceHtmlView.css'
import { renderRichTextContent } from '@/lib/richText'

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
  const balanceDue = previewModel?.previewBalanceDue || null
  const companyLines = Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : []
  const clientLines = Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : []
  const bank = pdfOutput?.showBankDetails ? previewModel?.selectedPreviewBank : null
  const notesSections = Array.isArray(previewModel?.previewNotesSections) ? previewModel.previewNotesSections : []

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

            if (item?.type === 'group_footer') {
              return (
                <div className="doc-item-row group-ft" key={index}>
                  <div className="group-footer-value">{item?.showSubtotal ? item?.value || '' : ''}</div>
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
                  {item?.imageUrl ? (
                    <img className="item-image" src={item.imageUrl} alt={item?.label || 'Item image'} />
                  ) : null}
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
        {previewModel?.previewAmountInWords ? (
          <div className="amount-words">{previewModel.previewAmountInWords}</div>
        ) : null}
        {balanceDue ? (
          <div className="totals-row balance">
            <div className="totals-lbl">{balanceDue.label}</div>
            <div className="totals-val">{balanceDue.value}</div>
          </div>
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

        {notesSections.map((section: any, index: number) => (
          <div className="doc-footer-section" key={`${section?.title || 'section'}-${index}`}>
            <div className="doc-footer-lbl">{section?.title || 'Notes'}</div>
            {section?.kind === 'html' ? (
              <div className="doc-footer-rich-text">{renderRichTextContent(section?.html, 'prose prose-sm max-w-none break-words text-stone-700')}</div>
            ) : section?.kind === 'fields' ? (
              <div className="doc-footer-fields">
                {(Array.isArray(section?.fields) ? section.fields : []).map((field: any, fieldIndex: number) => (
                  <div className="doc-footer-field" key={`${field?.label || 'field'}-${fieldIndex}`}>
                    {field?.label ? <div className="doc-footer-field-label">{field.label}</div> : null}
                    <div className="doc-footer-text">{field?.value || '—'}</div>
                  </div>
                ))}
              </div>
            ) : section?.kind === 'links' ? (
              <div className="doc-footer-links">
                {(Array.isArray(section?.links) ? section.links : []).map((link: any, linkIndex: number) => (
                  <a key={`${link?.label || 'link'}-${linkIndex}`} href={link?.url || '#'} target="_blank" rel="noreferrer">
                    {link?.label || link?.url || 'Reference'}
                  </a>
                ))}
              </div>
            ) : (
              <div className="doc-footer-text">{section?.text || ''}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

