import './QuotationDocumentPreview.css'
import { renderRichTextContent } from '@/lib/richText'

type QuotationDocumentPreviewProps = {
  quotation: any
  viewModel: any
  previewModel: any
  pdfOutput: any
  settingsData: any
}

export default function QuotationDocumentPreview({
  quotation,
  viewModel,
  previewModel,
  pdfOutput,
  settingsData,
}: QuotationDocumentPreviewProps) {
  const items = Array.isArray(previewModel?.previewItems) ? previewModel.previewItems : []
  const totals = Array.isArray(previewModel?.previewTotals) ? previewModel.previewTotals : []
  const companyLines = Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : []
  const clientLines = Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : []
  const detailRows = Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : []
  const notesSections = Array.isArray(previewModel?.previewNotesSections) ? previewModel.previewNotesSections : []

  return (
    <div className="quotationDocumentPreview">
      <div className="doc-top-accent" />

      <div className="doc-head">
        <div className="doc-company">
          {settingsData?.company_logo_url ? (
            <div className="doc-logo-container" style={{ marginBottom: '1rem' }}>
              <img src={settingsData.company_logo_url} alt="Logo" className="doc-logo" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }} />
            </div>
          ) : null}
          <div className="doc-co-name">{settingsData?.company_name || 'BigDrops'}</div>
          <div className="doc-co-addr">
            {companyLines.map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
        <div className="doc-id-block">
          <div className="doc-type-label">QUOTATION</div>
          <div className="doc-number">{quotation?.quotation_number || 'Draft'}</div>
          {quotation?.quotation_title ? <div className="doc-quotation-title">{quotation.quotation_title}</div> : null}
        </div>
      </div>

      <div className="doc-meta-grid">
        <div className="doc-meta-cell">
          <div className="doc-meta-lbl">Prepared For</div>
          <div className="doc-meta-val">{quotation?.client_name || 'Unassigned Client'}</div>
          <div className="doc-meta-sub">
            {clientLines.map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
        <div className="doc-meta-cell">
          <div className="doc-meta-lbl">Details</div>
          <div className="doc-meta-val">Date: {quotation?.issue_date || '—'}</div>
          <div className="doc-meta-sub">Valid Until: {quotation?.valid_until || 'Open'}</div>
          <div className="doc-meta-sub">Status: {viewModel?.statusLabel || quotation?.status || 'Draft'}</div>
        </div>
      </div>

      {detailRows.length > 0 && (
        <div className="doc-detail-grid">
          {detailRows.map((row: any, index: number) => (
            <div className="doc-detail-cell" key={index}>
              <span className="doc-detail-label">{row?.label || ''}</span>
              <span className="doc-detail-value">{row?.value || '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="doc-items">
        <div className="doc-items-head">
          <div className="doc-col-lbl">Description</div>
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

            return (
              <div className="doc-item-row" key={index}>
                <div className="item-body">
                  <div className="item-name">{item?.label || 'Item'}</div>
                  {item?.detail ? <div className="item-desc">{item.detail}</div> : null}
                  {(item?.facts || []).length > 0 && (
                    <div className="item-facts">
                      {(item.facts as string[]).filter(Boolean).map((fact: string, factIdx: number) => (
                        <div key={factIdx} className="item-fact">{fact}</div>
                      ))}
                    </div>
                  )}
                  {item?.imageUrl ? (
                    <img className="item-image" src={item.imageUrl} alt={item?.label || 'Item image'} />
                  ) : null}
                </div>
                <div className="item-amount">{item?.value || '—'}</div>
              </div>
            )
          })
        ) : (
          <div className="doc-item-row">
            <div className="item-body">
               <div className="item-desc">No items added to this quotation.</div>
            </div>
          </div>
        )}
      </div>

      <div className="doc-totals">
        {totals.map((row: any, index: number) => {
          const isGrand = row?.emphasis && row?.label?.toLowerCase() === 'total'

          return (
            <div
              key={index}
              className={`totals-row ${isGrand ? 'grand' : ''}`}
            >
              <div className="totals-lbl">{row?.label || 'Subtotal'}</div>
              <div className="totals-val">{row?.value || '—'}</div>
            </div>
          )
        })}
        {previewModel?.previewAmountInWords ? (
          <div className="amount-words">{previewModel.previewAmountInWords}</div>
        ) : null}
      </div>

      <div className="doc-footer">
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