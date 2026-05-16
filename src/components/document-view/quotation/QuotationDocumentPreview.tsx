import { useMemo } from 'react'
import './QuotationDocumentPreview.css'
import previewStyles from '../shared/DocumentPreview.module.css'
import DocumentBrandBlock from '../shared/DocumentBrandBlock'
import { renderRichTextContent } from '@/lib/richText'
import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'

type QuotationDocumentPreviewProps = {
  quotation: any
  viewModel: any
  previewModel: any
  settingsData: any
  mergeQtyUnit?: boolean
}

/**
 * TRUE STRUCTURAL TRANSPLANT
 * Mirrors viewpage.html internal .inv-card structure
 */
export default function QuotationDocumentPreview({
  quotation,
  viewModel,
  previewModel,
  settingsData,
  mergeQtyUnit,
}: QuotationDocumentPreviewProps) {
  const items = Array.isArray(previewModel?.previewItems) ? previewModel.previewItems : []
  const totals = Array.isArray(previewModel?.previewTotals) ? previewModel.previewTotals : []
  const companyLines = Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : []
  const clientLines = Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : []
  const detailRows = Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : []
  const notesSections = Array.isArray(previewModel?.previewNotesSections) ? previewModel.previewNotesSections : []
  const signatory = previewModel?.signatory || null
  const statusLabel = String(viewModel?.statusLabel || quotation?.status || 'Draft')
  
  const statusTone =
    /accepted/i.test(statusLabel)
      ? 'success'
      : /sent/i.test(statusLabel)
        ? 'warning'
        : /rejected/i.test(statusLabel)
          ? 'danger'
          : 'neutral'

  const logoUrl = useMemo(() => resolveCanonicalLogoUrl(settingsData), [settingsData])
  const companyName = settingsData?.company_name || ''

  return (
    <div className={`quotationDocumentPreview ${mergeQtyUnit ? 'merged-qty' : ''}`}>
      {/* 1. inv-top */}
      <div className="inv-top">
        <div className="brand-block">
          <DocumentBrandBlock
            logoUrl={logoUrl}
            companyName={companyName}
            className="brand-logo"
            imgClassName={previewStyles.brandLogoImg}
          />
          <div>
            {companyName && <div className="brand-name">{companyName}</div>}
            {companyLines.length > 0 && (
              <div className="brand-sub">
                {companyLines.map((line: string, i: number) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        </div>
        <div className={`status-pill ${statusTone}`}>{statusLabel}</div>
      </div>

      {/* 2. inv-body */}
      <div className="inv-body">
        {quotation?.quotation_title && (
          <div className="inv-title">{quotation.quotation_title}</div>
        )}
        <div className="meta-chips">
          {quotation?.quotation_number && (
            <div className="meta-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {quotation.quotation_number}
            </div>
          )}
          {quotation?.issue_date && (
             <div className="meta-chip">{quotation.issue_date}</div>
          )}
        </div>
      </div>

      {/* 3. info-grid */}
      <div className="info-grid">
        <div className="info-cell">
          <div className="info-label">Client</div>
          <div className="info-value">{quotation?.client_name || '—'}</div>
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
          ) : null}
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
                    <img src={item.imageUrl} alt={item?.label || 'Item image'} loading="lazy" style={{ width: '100%', maxWidth: 200, height: 120, borderRadius: 'var(--bd-radius-md)', objectFit: 'cover', border: '1px solid hsl(var(--bd-border))', background: 'hsl(var(--bd-surface-muted))', marginTop: 8, display: 'block' }} />
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
                 <span className="lbl">{row.label}</span>
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
      </div>

      {signatory && (
        <div className={previewStyles.signatoryBlock}>
          {signatory.signatureUrl ? (
            <img src={signatory.signatureUrl} alt="Signature" className={previewStyles.signatoryImage} />
          ) : (
            <div className={previewStyles.signatoryFallback}>Authorized Signature</div>
          )}
          <div>
            <div className={previewStyles.signatoryName}>{signatory.name}</div>
            {signatory.role && <div className={previewStyles.signatoryRole}>{signatory.role}</div>}
          </div>
        </div>
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
