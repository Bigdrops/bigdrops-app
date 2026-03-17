import { CSR_TEMPLATE_OPTIONS, CSR_TEMPLATE_VARIANTS, getCsrTemplateVariant } from './CSRPreviewTemplates'
import { CSR_READING_FIELDS, CSR_STATUS_OPTIONS } from './CSRPreviewContent'

const statusColor = {
  Complete: { bg: '#DCFCE7', color: '#16A34A' },
  Incomplete: { bg: '#FEE2E2', color: '#CC0000' },
  'Pending for spares': { bg: '#FEF9C3', color: '#CA8A04' },
  'Under observation': { bg: '#E0F2FE', color: '#0284C7' },
  'Working solution provided': { bg: '#F3E8FF', color: '#7C3AED' },
  'Field Entry Pending': { bg: '#EDE9FE', color: '#4B5563' },
}

export default function CSRPreviewPanel({ csr, template, onTemplateChange, branding = {} }) {
  const selectedTemplate = CSR_TEMPLATE_OPTIONS.find((option) => option.key === template) || CSR_TEMPLATE_OPTIONS[2]
  const theme = CSR_TEMPLATE_VARIANTS[getCsrTemplateVariant(template)]
  const s = statusColor[csr.status] || { bg: '#F5F5F5', color: '#555' }
  const compact = !!theme.compact
  const hasBranding = Boolean(branding.companyName || branding.companyTagline || branding.contactLine)
  const lbl = { fontSize: compact ? '10px' : '11px', fontWeight: '700', color: theme.accent, textTransform: 'uppercase', letterSpacing: compact ? '0.24px' : '0.3px', display: 'block', marginBottom: '4px' }
  const val = { fontSize: compact ? '12px' : '13px', color: theme.pageFg || '#1a1a1a' }
  const sec = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px', overflow: 'hidden' }
  const secH = { backgroundColor: theme.mutedBg, padding: compact ? '7px 14px' : '8px 16px', fontWeight: '700', fontSize: compact ? '10px' : '11px', color: theme.headerBg, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${theme.border}` }
  const readings = CSR_READING_FIELDS.map(({ key, label }) => [label, csr[key]])

  return (
    <>
      <div
        style={{
          background: theme.previewShell,
          border: '1px solid #DBE5F3',
          borderRadius: '14px',
          padding: compact ? '14px' : '16px',
          marginBottom: '18px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{csr.status}</span>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>CSR Template</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            {CSR_TEMPLATE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onTemplateChange(option.key)}
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: template === option.key ? '#EFF6FF' : '#fff',
                  border: template === option.key ? `1px solid ${option.accent}` : `1px solid ${theme.border}`,
                  boxShadow: template === option.key ? '0 6px 18px rgba(37, 99, 235, 0.12)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: option.accent, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{option.label}</span>
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#64748B' }}>{option.blurb}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748B' }}>
            Current preview: <span style={{ fontWeight: '700', color: '#0F172A' }}>{selectedTemplate.label}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          background: theme.previewSurface,
          border: `1px solid ${theme.border}`,
          borderRadius: '16px',
          padding: compact ? '16px' : '18px',
          boxShadow: '0 12px 34px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>CSR Preview</div>
            <div style={{ fontSize: '14px', color: '#475569' }}>Customer-facing report preview using the selected template style.</div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>{selectedTemplate.label} template</div>
        </div>

        {hasBranding ? (
          <div
            style={{
              backgroundColor: theme.headerBg,
              color: theme.headerFg,
              borderRadius: '12px',
              padding: compact ? '10px 12px' : '12px 14px',
              marginBottom: compact ? '12px' : '14px',
            }}
          >
            {branding.companyName ? (
              <div style={{ fontSize: compact ? '14px' : '16px', fontWeight: '700', textTransform: 'uppercase' }}>
                {branding.companyName}
              </div>
            ) : null}
            {branding.companyTagline ? (
              <div style={{ fontSize: compact ? '11px' : '12px', marginTop: '2px', opacity: 0.92 }}>
                {branding.companyTagline}
              </div>
            ) : null}
            {branding.contactLine ? (
              <div style={{ fontSize: compact ? '10px' : '11px', marginTop: '4px', opacity: 0.9 }}>
                {branding.contactLine}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={sec}>
          <div style={secH}>Customer Details</div>
          <div style={{ padding: compact ? '14px' : '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: compact ? '12px' : '16px' }}>
            <div><span style={lbl}>CSR No.</span><span style={{ ...val, color: '#CC0000', fontWeight: '700' }}>{csr.csr_number}</span></div>
            <div><span style={lbl}>Date</span><span style={val}>{csr.date}</span></div>
            <div><span style={lbl}>Customer</span><span style={val}>{csr.client_name}</span></div>
            {csr.show_po && csr.po_number ? <div><span style={lbl}>PO No.</span><span style={val}>{csr.po_number}</span></div> : null}
            <div style={{ gridColumn: '1 / -1' }}><span style={lbl}>Address</span><span style={val}>{csr.address}</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={sec}>
            <div style={secH}>Nature of Problem</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <span style={lbl}>Problem Reported</span>
              <p style={{ ...val, lineHeight: compact ? '1.45' : '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.problem_reported}</p>
            </div>
          </div>
          <div style={sec}>
            <div style={secH}>Equipment Details</div>
            <div style={{ padding: compact ? '14px' : '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? '10px' : '12px' }}>
              <div><span style={lbl}>Type</span><span style={val}>{csr.equipment_type}</span></div>
              <div><span style={lbl}>Capacity</span><span style={val}>{csr.capacity}</span></div>
              <div><span style={lbl}>Make</span><span style={val}>{csr.make}</span></div>
              <div><span style={lbl}>{csr.modelLabel}</span><span style={val}>{csr.model}</span></div>
              <div><span style={lbl}>{csr.serialLabel}</span><span style={val}>{csr.serial_no}</span></div>
              <div><span style={lbl}>Location</span><span style={val}>{csr.equipment_location}</span></div>
            </div>
          </div>
        </div>

        {csr.showOperationalReadings ? (
          <div style={sec}>
            <div style={secH}>Operational Readings</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? '12px' : '13px' }}>
                <thead><tr style={{ backgroundColor: theme.mutedBg }}>
                  {readings.map(([heading]) => (
                    <th key={heading} style={{ padding: compact ? '6px 8px' : '8px 12px', border: `1px solid ${theme.border}`, fontWeight: '700', fontSize: compact ? '10px' : '11px', color: '#333' }}>{heading}</th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  {readings.map(([heading, value]) => (
                    <td key={heading} style={{ padding: compact ? '8px 8px' : '10px 12px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>{value || '-'}</td>
                  ))}
                </tr></tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
          <div style={sec}>
            <div style={secH}>Materials Used</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <p style={{ ...val, lineHeight: compact ? '1.55' : '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.materialsText || '-'}</p>
            </div>
          </div>
          <div style={sec}>
            <div style={secH}>Service Execution</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <div style={{ marginBottom: compact ? '8px' : '14px' }}><span style={lbl}>Service Rendered</span><p style={{ ...val, lineHeight: compact ? '1.4' : '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.service_rendered}</p></div>
              <div style={{ marginBottom: compact ? '10px' : '14px' }}><span style={lbl}>Technician Name</span><span style={val}>{csr.technicianName || '-'}</span></div>
              <div style={{ marginBottom: compact ? '8px' : '14px' }}><span style={lbl}>Technician Remarks</span><p style={{ ...val, color: '#555', lineHeight: compact ? '1.4' : '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.technicianRemarks || '-'}</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? '12px' : '16px', marginBottom: compact ? '12px' : '16px' }}>
                <div><span style={lbl}>Start of Service</span><span style={val}>{[csr.start_date, csr.start_time].filter(Boolean).join(' ') || '-'}</span></div>
                <div><span style={lbl}>End of Service</span><span style={val}>{[csr.end_date, csr.end_time].filter(Boolean).join(' ') || '-'}</span></div>
              </div>
              <div style={{ fontWeight: '700', fontSize: compact ? '11px' : '12px', marginBottom: '10px' }}>Status</div>
              {STATUS_OPTIONS.map((option) => (
                <div key={option} style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px', marginBottom: compact ? '6px' : '8px' }}>
                  <div style={{ width: compact ? '12px' : '14px', height: compact ? '12px' : '14px', border: '1px solid #333', borderRadius: '2px', backgroundColor: csr.status === option ? theme.headerBg : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {csr.status === option ? <span style={{ color: 'white', fontSize: compact ? '9px' : '10px' }}>{'\u2713'}</span> : null}
                  </div>
                  <span style={{ fontSize: compact ? '11px' : '12px', fontWeight: csr.status === option ? '600' : '400', color: csr.status === option ? '#1a1a1a' : '#888' }}>{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={secH}>Customer Feedback</div>
          <div style={{ padding: compact ? '14px' : '16px' }}>
            <span style={lbl}>Feedback</span>
            <span style={val}>{csr.customer_feedback || '-'}</span>
          </div>
        </div>

        {csr.showAcknowledgement ? (
          <div style={sec}>
            <div style={secH}>Acknowledgement</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: csr.showTechnicianSignLine ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div>
                  <span style={lbl}>{csr.recipientTitle}</span>
                  <div style={{ borderTop: '1px dashed #999', marginTop: compact ? '18px' : '28px', paddingTop: compact ? '4px' : '6px', fontSize: compact ? '11px' : '12px', color: '#555' }}>
                    {csr.acknowledgement_name || ''}
                    {csr.recipientRole ? <div style={{ marginTop: '4px', color: '#888' }}>{csr.recipientRole}</div> : null}
                  </div>
                </div>
                {csr.showTechnicianSignLine ? (
                  <div>
                    <span style={lbl}>Technician Sign</span>
                    <div style={{ borderTop: '1px dashed #999', marginTop: compact ? '18px' : '28px', paddingTop: compact ? '4px' : '6px', fontSize: compact ? '11px' : '12px', color: '#888' }}>Optional sign</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
