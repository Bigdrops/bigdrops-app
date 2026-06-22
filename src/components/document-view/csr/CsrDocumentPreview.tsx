import './CsrDocumentPreview.css'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'

type CsrDocumentPreviewProps = {
  csr: CsrRenderModel
  previewModel?: any
  settingsData: any
}

export default function CsrDocumentPreview({
  csr,
  previewModel,
  settingsData,
}: CsrDocumentPreviewProps) {
  const csrData = csr || {}
  const model = previewModel || {}
  const settings = settingsData || {}

  const clientLines = [
    csrData.client_name,
    csrData.address,
    csrData.phone,
    csrData.email,
  ].filter(Boolean)

  const equipmentLines = [
    csrData.equipment_type,
    csrData.equipment_location,
    csrData.make,
    csrData.model,
    csrData.serial_no,
    csrData.capacity,
    csrData.engineNo,
  ].filter(Boolean)

  const materialsRows = Array.isArray(csrData.materialsRows)
    ? csrData.materialsRows
    : Array.isArray(model?.materialsRows)
      ? model.materialsRows
      : []
  const parsedMaterials = materialsRows.filter((row: any) => row.item || row.quantity || row.unit)

  const statusLabel = csrData.status ? String(csrData.status).toUpperCase() : ''
  const callType = csrData.callTypeDisplay && csrData.callTypeDisplay !== 'NOT SPECIFIED' ? csrData.callTypeDisplay : null
  const systemStatus = csrData.systemDownDisplay && csrData.systemDownDisplay !== 'NOT SPECIFIED' ? csrData.systemDownDisplay : null

  return (
    <div className="csrDocumentPreview">
      <div className="doc-top-accent" />

      <div className="doc-head">
        <div className="doc-company">
          {settings.company_logo_url ? (
            <div className="doc-logo-container" style={{ marginBottom: '1rem' }}>
              <img
                src={settings.company_logo_url}
                alt="Logo"
                className="doc-logo"
                style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
              />
            </div>
          ) : null}
          <div className="doc-co-name">{settings.company_name || 'BigDrops'}</div>
          <div className="doc-co-addr">
            {[
              settings.company_address,
              settings.company_city,
              settings.company_phone,
              settings.company_email,
            ]
              .filter(Boolean)
              .map((line: string, i: number) => (
                <div key={i}>{line}</div>
              ))}
          </div>
        </div>
        <div className="doc-id-block">
          <div className="doc-type-label">SERVICE REPORT</div>
          <div className="doc-number">{csrData.csr_number || 'Draft'}</div>
          {statusLabel && <div className="doc-csr-status">{statusLabel}</div>}
        </div>
      </div>

      <div className="doc-meta-grid">
        <div className="doc-meta-cell">
          <div className="doc-meta-label">Service Date</div>
          <div className="doc-meta-value">{csrData.date || '—'}</div>
        </div>
        <div className="doc-meta-cell">
          <div className="doc-meta-label">Client</div>
          <div className="doc-meta-value">{csrData.client_name || 'Unassigned'}</div>
        </div>
        {clientLines.length > 0 && (
          <div className="doc-meta-cell" style={{ gridColumn: '1 / -1' }}>
            <div className="doc-meta-label">Client Details</div>
            <div className="doc-meta-sub">{clientLines.slice(1).join(' · ')}</div>
          </div>
        )}
        {(callType || systemStatus) && (
          <div className="doc-meta-cell" style={{ gridColumn: '1 / -1' }}>
            <div className="doc-meta-label">Call Type</div>
            <div className="doc-meta-value">
              {[callType, systemStatus].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}
        {equipmentLines.length > 0 && (
          <div className="doc-meta-cell" style={{ gridColumn: '1 / -1' }}>
            <div className="doc-meta-label">Equipment / Asset</div>
            <div className="doc-meta-sub">{equipmentLines.join(' · ')}</div>
          </div>
        )}
      </div>

      {csrData.problem_reported && (
        <div className="doc-section">
          <div className="doc-section-title">Problem Reported</div>
          <div className="doc-narrative">{csrData.problem_reported}</div>
        </div>
      )}

      {csrData.service_rendered && (
        <div className="doc-section">
          <div className="doc-section-title">Service Rendered</div>
          <div className="doc-narrative">{csrData.service_rendered}</div>
        </div>
      )}

      {csrData.defects_found && (
        <div className="doc-section">
          <div className="doc-section-title">Defects Found</div>
          <div className="doc-narrative">{csrData.defects_found}</div>
        </div>
      )}

      {parsedMaterials.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Materials Used</div>
          <div className="doc-materials-list">
            {parsedMaterials.map((row: any, i: number) => (
              <div key={i} className="doc-material-item">
                <div className="doc-material-name">{row.item || '—'}</div>
                <div className="doc-material-qty">
                  {row.quantity} {row.unit || ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {csrData.engineer_remarks && (
        <div className="doc-section">
          <div className="doc-section-title">Engineer Remarks</div>
          <div className="doc-narrative">{csrData.engineer_remarks}</div>
        </div>
      )}

      {csrData.customer_feedback && (
        <div className="doc-section">
          <div className="doc-section-title">Customer Feedback</div>
          <div className="doc-narrative">{csrData.customer_feedback}</div>
        </div>
      )}

      <div className="doc-signature-grid">
        <div className="doc-signature-box">
          <div className="doc-signature-line" />
          <div className="doc-signature-label">Technician Sign & Date</div>
          {(csrData.technicianName || model.technicianName) && (
            <div className="doc-signature-name">{csrData.technicianName || model.technicianName}</div>
          )}
        </div>
        <div className="doc-signature-box">
          <div className="doc-signature-line" />
          <div className="doc-signature-label">Client Acknowledgement</div>
        </div>
      </div>
    </div>
  )
}