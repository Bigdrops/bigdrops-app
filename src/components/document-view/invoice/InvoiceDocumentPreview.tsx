import './InvoiceDocumentPreview.css'
import { renderRichTextContent } from '@/lib/richText'

type InvoiceDocumentPreviewProps = {
  invoice: any
  viewModel: any
  previewModel: any
  pdfOutput: any
  settingsData: any
  mergeQtyUnit?: boolean
}

/**
 * TRUE STRUCTURAL TRANSPLANT
 * Mirrors viewpage.html internal .inv-card structure
 */
export default function InvoiceDocumentPreview({
  invoice,
  viewModel,
  previewModel,
  settingsData,
  mergeQtyUnit,
}: InvoiceDocumentPreviewProps) {
  const items = Array.isArray(previewModel?.previewItems) ? previewModel.previewItems : []
  const totals = Array.isArray(previewModel?.previewTotals) ? previewModel.previewTotals : []
  const companyLines = Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : []
  const clientLines = Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : []
  const detailRows = Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : []
  const notesSections = Array.isArray(previewModel?.previewNotesSections) ? previewModel.previewNotesSections : []
  const signatory = previewModel?.signatory || null
  const statusLabel = String(viewModel?.statusLabel || invoice?.status || 'Draft')
  
  const statusTone =
    /paid/i.test(statusLabel)
      ? 'success'
      : /partial/i.test(statusLabel)
        ? 'warning'
        : /overdue|unpaid/i.test(statusLabel)
          ? 'danger'
          : 'neutral'

  return (
    <div className={`invoiceDocumentPreview ${mergeQtyUnit ? 'merged-qty' : ''}`}>
      {/* 1. inv-top */}
      <div className="inv-top">
        <div className="brand-block">
          <div className="brand-logo">
            {settingsData?.company_name ? settingsData.company_name.substring(0, 3) : 'BD'}
          </div>
          <div>
            <div className="brand-name">{settingsData?.company_name || 'BigDrops'}</div>
            <div className="brand-sub">
              {companyLines.map((line: string, i: number) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>
        <div className={`status-pill ${statusTone}`}>{statusLabel}</div>
      </div>

      {/* 2. inv-body */}
      <div className="inv-body">
        <div className="inv-title">{invoice?.invoice_title || 'Invoice'}</div>
        <div className="meta-chips">
          {invoice?.invoice_number && (
            <div className="meta-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {invoice.invoice_number}
            </div>
          )}
          {invoice?.po_number && (
            <div className="meta-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {invoice.po_number}
            </div>
          )}
          {invoice?.issue_date && (
             <div className="meta-chip">{invoice.issue_date}</div>
          )}
        </div>
      </div>

      {/* 3. info-grid */}
      <div className="info-grid">
        <div className="info-cell">
          <div className="info-label">Bill To</div>
          <div className="info-value">{invoice?.client_name || 'Unassigned Client'}</div>
          <div className="info-sub">
            {clientLines.map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
        <div className="info-cell">
          <div className="info-label">Details</div>
          {detailRows.length > 0 ? (
            detailRows.map((row: any, index: number) => (
              <div key={index} className="info-value-small">
                {row?.label}: {row?.value || '—'}
              </div>
            ))
          ) : (
             <div className="info-value-small">Issued: {invoice?.issue_date || '—'}</div>
          )}
        </div>
      </div>

      {/* 4. item-list */}
      <div className="item-list">
        {items.length > 0 ? (
          items.map((item: any, index: number) => {
            if (item?.type === 'group') {
              return (
                <div className="item-row group-hd" key={index}>
                  <div className="group-name">{item?.label}</div>
                </div>
              )
            }
            if (item?.type === 'group_footer') {
              return (
                <div className="item-row group-ft" key={index}>
                   <div className="group-footer-value">{item?.showSubtotal ? item?.value || '' : ''}</div>
                </div>
              )
            }

            return (
              <div className="item-row" key={index}>
                <div className="item-num">{index + 1}</div>
                <div className="item-body">
                  <div className="item-name">{item?.label || 'Item'}</div>
                  {item?.detail && <div className="item-sub">{item.detail}</div>}
                  <div className="item-meta">
                    {(item?.facts || []).filter(Boolean).map((fact: string, factIdx: number) => (
                      <span key={factIdx} className="item-pill">{fact}</span>
                    ))}
                  </div>
                  {item?.imageUrl && (
                    <img className="item-thumb" src={item.imageUrl} alt={item?.label || 'Item image'} loading="lazy" />
                  )}
                </div>
                <div className="item-amount">{item?.value || '—'}</div>
              </div>
            )
          })
        ) : (
          <div className="item-row">
             <div className="item-body">
               <div className="item-sub">No items added.</div>
             </div>
          </div>
        )}
      </div>

      {/* 5. totals-list */}
      <div className="totals-list">
        {totals.map((row: any, index: number) => {
          const isGrand = row?.emphasis && row?.label?.toLowerCase() === 'total'
          if (isGrand) {
             return (
               <div key={index} className="totals-grand">
                 <span className="lbl">{row.label} Payable</span>
                 <span className="val">{row.value}</span>
               </div>
             )
          }
          return (
            <div key={index} className="totals-row">
              <span className="lbl">{row.label}</span>
              <span className="val">{row.value}</span>
            </div>
          )
        })}
        {previewModel?.previewAmountInWords && (
          <div className="amount-words">{previewModel.previewAmountInWords}</div>
        )}
      </div>

      {/* 6. Signature & Footer (Notes) */}
      {signatory && (
        <>
          <div className="section-header">Authorized Signatory</div>
          <div className="item-list">
             <div className="item-row">
                <div className="item-body">
                  {signatory.signatureUrl ? (
                    <img src={signatory.signatureUrl} alt="Signature" className="doc-signature-image" />
                  ) : (
                    <div className="signature-fallback">Authorized Signature</div>
                  )}
                  <div className="item-name" style={{ marginTop: '8px' }}>{signatory.name}</div>
                  {signatory.role && <div className="item-sub">{signatory.role}</div>}
                </div>
             </div>
          </div>
        </>
      )}

      {notesSections.length > 0 && (
        <div className="doc-notes">
          {notesSections.map((section: any, index: number) => (
            <div className="notes-section" key={index}>
              <div className="notes-label">{section?.title || 'Notes'}</div>
              {section?.kind === 'html' ? (
                <div className="notes-content">{renderRichTextContent(section?.html)}</div>
              ) : (
                <div className="notes-content">{section?.text || section?.value || ''}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
