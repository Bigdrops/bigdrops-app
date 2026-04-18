type InvoiceHtmlViewProps = {
  invoice: any
  viewModel: any
  previewModel: any
  pdfOutput: any
  settingsData: any
}

function Section({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section className="invoice-html-section">
      {title ? <h3 className="invoice-html-section-title">{title}</h3> : null}
      <div className="invoice-html-section-body">{children}</div>
    </section>
  )
}
import './InvoiceHtmlView.css'
function KeyValue({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="invoice-html-kv">
      <span className="invoice-html-kv-label">{label}</span>
      <span className="invoice-html-kv-value">{value || '—'}</span>
    </div>
  )
}

export default function InvoiceHtmlView({
  invoice,
  viewModel,
  previewModel,
  pdfOutput,
  settingsData,
}: InvoiceHtmlViewProps) {
  const items = Array.isArray(previewModel?.previewItems)
    ? previewModel.previewItems
    : []

  const totals = Array.isArray(previewModel?.previewTotals)
    ? previewModel.previewTotals
    : []

  const companyLines = Array.isArray(previewModel?.companyPreviewLines)
    ? previewModel.companyPreviewLines
    : []

  const clientLines = Array.isArray(previewModel?.clientPreviewLines)
    ? previewModel.clientPreviewLines
    : []

  const detailRows = Array.isArray(previewModel?.previewDetailRows)
    ? previewModel.previewDetailRows
    : []

  const noteSections = Array.isArray(previewModel?.previewNotesSections)
    ? previewModel.previewNotesSections
    : []

  const bank = pdfOutput?.showBankDetails
    ? previewModel?.selectedPreviewBank
    : null

  return (
    <div className="invoice-html-view">
      <Section>
        <div className="invoice-html-header">
          <div>
            <p className="invoice-html-eyebrow">
              {invoice?.invoice_title || 'Invoice'}
            </p>
            <h2 className="invoice-html-number">
              {invoice?.invoice_number || 'Invoice'}
            </h2>
            <p className="invoice-html-client">
              {invoice?.client_name || 'No client specified'}
            </p>
          </div>

          <div className="invoice-html-meta">
            <KeyValue label="Issue Date" value={invoice?.issue_date} />
            <KeyValue label="Due Date" value={invoice?.due_date || 'Open'} />
            <KeyValue
              label="Status"
              value={viewModel?.statusLabel || invoice?.status || 'draft'}
            />
          </div>
        </div>
      </Section>

      <Section title="Details">
        <div className="invoice-html-grid">
          {detailRows.length ? (
            detailRows.map((row: any, index: number) => (
              <KeyValue
                key={`${row?.label || 'detail'}-${index}`}
                label={String(row?.label || 'Field')}
                value={String(row?.value || '—')}
              />
            ))
          ) : (
            <p className="invoice-html-empty">No invoice details yet.</p>
          )}
        </div>
      </Section>

      <Section title="Billed By">
        <div className="invoice-html-lines">
          <p>{settingsData?.company_name || 'Company'}</p>
          {companyLines.map((line: string, index: number) => (
            <p key={`company-line-${index}`}>{line}</p>
          ))}
        </div>
      </Section>

      <Section title="Bill To">
        <div className="invoice-html-lines">
          <p>{invoice?.client_name || 'Unassigned'}</p>
          {clientLines.map((line: string, index: number) => (
            <p key={`client-line-${index}`}>{line}</p>
          ))}
        </div>
      </Section>

      <Section title="Items">
        <div className="invoice-html-items">
          {items.length ? (
            items.map((item: any, index: number) => (
              <article className="invoice-html-item" key={item?.id || index}>
                <div className="invoice-html-item-top">
                  <h4 className="invoice-html-item-title">
                    {item?.title || item?.name || item?.description || `Item ${index + 1}`}
                  </h4>
                  <div className="invoice-html-item-amount">
                    {item?.amountLabel || item?.amount || '—'}
                  </div>
                </div>

                {item?.subtitle ? (
                  <p className="invoice-html-item-subtitle">{item.subtitle}</p>
                ) : null}

                <div className="invoice-html-item-meta">
                  {item?.quantityLabel ? (
                    <KeyValue label="Qty" value={item.quantityLabel} />
                  ) : null}
                  {item?.rateLabel ? (
                    <KeyValue label="Rate" value={item.rateLabel} />
                  ) : null}
                  {item?.unitLabel ? (
                    <KeyValue label="Unit" value={item.unitLabel} />
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="invoice-html-empty">No items added.</p>
          )}
        </div>
      </Section>

      <Section title="Totals">
        <div className="invoice-html-totals">
          {totals.length ? (
            totals.map((row: any, index: number) => (
              <div
                key={`${row?.label || 'total'}-${index}`}
                className={`invoice-html-total-row ${row?.emphasis ? 'is-emphasis' : ''}`}
              >
                <span>{row?.label || 'Total'}</span>
                <strong>{row?.value || '—'}</strong>
              </div>
            ))
          ) : (
            <p className="invoice-html-empty">No totals available.</p>
          )}
        </div>

        {invoice?.amount_in_words ? (
          <p className="invoice-html-amount-words">{invoice.amount_in_words}</p>
        ) : null}
      </Section>

      {bank ? (
        <Section title="Bank Details">
          <div className="invoice-html-grid">
            {bank.bank_name ? <KeyValue label="Bank" value={bank.bank_name} /> : null}
            {bank.account_name ? <KeyValue label="Account Name" value={bank.account_name} /> : null}
            {bank.account_number ? <KeyValue label="Account Number" value={bank.account_number} /> : null}
          </div>
        </Section>
      ) : null}

      {noteSections.length ? (
        <Section title="Notes">
          <div className="invoice-html-notes">
            {noteSections.map((section: any, index: number) => (
              <div key={section?.title || index} className="invoice-html-note-block">
                {section?.title ? <h4>{section.title}</h4> : null}
                <div>{section?.content || section?.body || '—'}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  )
}