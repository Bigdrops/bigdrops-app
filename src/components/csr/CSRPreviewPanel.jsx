import { useEffect, useState } from 'react'
import { getEffectiveFillableFont, resolvePdfWebFontFamily } from '@/lib/pdfDesignPreset'
import {
  CSR_READING_FIELDS,
  CSR_STATUS_OPTIONS,
  CSR_TEMPLATE_OPTIONS,
  CSR_TEMPLATE_VARIANTS,
  getCsrTemplateVariant,
} from './CSRPreviewContent'

const statusColor = {
  Complete: { bg: '#DCFCE7', color: '#16A34A' },
  Incomplete: { bg: '#FEE2E2', color: '#CC0000' },
  'Pending for spares': { bg: '#FEF9C3', color: '#CA8A04' },
  'Under observation': { bg: '#E0F2FE', color: '#0284C7' },
  'Working solution provided': { bg: '#F3E8FF', color: '#7C3AED' },
  'Field Entry Pending': { bg: '#EDE9FE', color: '#4B5563' },
}

const safe = (value) => String(value || '').trim()
const hasText = (value) => safe(value).length > 0

function hasOperationalReadings(csr) {
  return csr.showOperationalReadings && CSR_READING_FIELDS.some(({ key }) => hasText(csr[key]))
}

function renderTemplateThumb(option, active) {
  const isClassicCompact = option.key === '4'
  const isEditorialCompact = option.key === '5'

  if (isClassicCompact) {
    return (
      <div style={{ height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: active ? '#F8FAFC' : '#ffffff', border: `1px solid ${active ? '#BFDBFE' : '#E2E8F0'}` }}>
        <div style={{ height: 10, backgroundColor: '#B42318' }} />
        <div style={{ padding: '5px 7px' }}>
          <div style={{ height: 4, width: '42%', borderRadius: 999, backgroundColor: '#0B4AA8', marginBottom: 4 }} />
          <div style={{ height: 3, borderRadius: 999, backgroundColor: '#DBEAFE', marginBottom: 3 }} />
          <div style={{ height: 3, width: '70%', borderRadius: 999, backgroundColor: '#BFDBFE' }} />
        </div>
      </div>
    )
  }

  if (isEditorialCompact) {
    return (
      <div style={{ height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: '#0F172A', border: `1px solid ${active ? '#334155' : '#1E293B'}` }}>
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flex: 1.2, padding: '6px 7px' }}>
            <div style={{ height: 4, width: '58%', borderRadius: 999, backgroundColor: '#F8FAFC', marginBottom: 4 }} />
            <div style={{ height: 3, borderRadius: 999, backgroundColor: '#475569', marginBottom: 3 }} />
            <div style={{ height: 3, width: '65%', borderRadius: 999, backgroundColor: '#475569' }} />
          </div>
          <div style={{ width: 20, backgroundColor: '#C2410C' }} />
        </div>
      </div>
    )
  }

  if (option.key === '1') {
    return (
      <div style={{ height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff', border: `1px solid ${active ? '#FCA5A5' : '#E2E8F0'}` }}>
        <div style={{ height: 10, backgroundColor: '#CC0000' }} />
        <div style={{ padding: '5px 7px' }}>
          <div style={{ height: 3, borderRadius: 999, backgroundColor: '#DBEAFE', marginBottom: 3 }} />
          <div style={{ height: 3, width: '78%', borderRadius: 999, backgroundColor: '#E2E8F0' }} />
        </div>
      </div>
    )
  }

  if (option.key === '2') {
    return (
      <div style={{ height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff', border: `1px solid ${active ? '#CBD5E1' : '#E2E8F0'}` }}>
        <div style={{ padding: '7px' }}>
          <div style={{ height: 4, width: '44%', borderRadius: 999, backgroundColor: '#111827', marginBottom: 5 }} />
          <div style={{ height: 3, borderRadius: 999, backgroundColor: '#E5E7EB', marginBottom: 3 }} />
          <div style={{ height: 3, width: '68%', borderRadius: 999, backgroundColor: '#E5E7EB' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff', border: `1px solid ${active ? '#D0D8EC' : '#E2E8F0'}` }}>
      <div style={{ height: 10, backgroundColor: '#1a2744' }} />
      <div style={{ padding: '5px 7px' }}>
        <div style={{ height: 3, width: '34%', borderRadius: 999, backgroundColor: '#e67e22', marginBottom: 4 }} />
        <div style={{ height: 3, borderRadius: 999, backgroundColor: '#E2E8F0', marginBottom: 3 }} />
        <div style={{ height: 3, width: '75%', borderRadius: 999, backgroundColor: '#E2E8F0' }} />
      </div>
    </div>
  )
}

function renderPreviewHeader({ csr, branding, theme, compact }) {
  const metaPillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: compact ? '4px 8px' : '5px 10px',
    borderRadius: '999px',
    fontSize: compact ? '10px' : '11px',
    fontWeight: '700',
    backgroundColor: theme.mutedBg,
    color: theme.pageFg,
  }

  if (theme.headerMode === 'editorialSplit') {
    return (
      <div style={{ backgroundColor: '#111827', color: '#F8FAFC', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(180px,0.9fr)', gap: '0' }}>
          <div style={{ padding: compact ? '14px' : '18px' }}>
            {branding.companyName ? <div style={{ fontSize: compact ? '16px' : '18px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{branding.companyName}</div> : null}
            {branding.companyTagline ? <div style={{ marginTop: '4px', fontSize: compact ? '11px' : '12px', color: '#CBD5E1' }}>{branding.companyTagline}</div> : null}
            {branding.contactLine ? <div style={{ marginTop: '6px', fontSize: compact ? '10px' : '11px', color: '#94A3B8' }}>{branding.contactLine}</div> : null}
            <div style={{ marginTop: compact ? '12px' : '16px', fontSize: compact ? '18px' : '22px', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Customer Service Report
            </div>
          </div>
          <div style={{ backgroundColor: '#C2410C', padding: compact ? '14px 12px' : '18px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>CSR No.</div>
              <div style={{ fontSize: compact ? '15px' : '17px', fontWeight: '700', marginTop: '3px' }}>{csr.csr_number}</div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>Issued</div>
              <div style={{ fontSize: compact ? '12px' : '13px', marginTop: '3px' }}>{csr.date}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (theme.headerMode === 'compactRibbon') {
    return (
      <div style={{ marginBottom: '16px', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${theme.border}`, backgroundColor: '#ffffff' }}>
        <div style={{ backgroundColor: '#B42318', color: '#ffffff', padding: compact ? '10px 12px' : '12px 14px' }}>
          {branding.companyName ? <div style={{ fontSize: compact ? '15px' : '17px', fontWeight: '700', textTransform: 'uppercase' }}>{branding.companyName}</div> : null}
          {branding.companyTagline ? <div style={{ fontSize: compact ? '10px' : '11px', marginTop: '2px', opacity: 0.92 }}>{branding.companyTagline}</div> : null}
          {branding.contactLine ? <div style={{ fontSize: compact ? '10px' : '11px', marginTop: '4px', opacity: 0.9 }}>{branding.contactLine}</div> : null}
        </div>
        <div style={{ padding: compact ? '10px 12px' : '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: compact ? '17px' : '20px', fontWeight: '700', color: '#0B4AA8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Customer Service Report
              </div>
              <div style={{ fontSize: compact ? '11px' : '12px', color: '#475569', marginTop: '4px' }}>
                Structured service summary prepared for customer sign-off.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={metaPillStyle}>{csr.csr_number}</span>
              <span style={metaPillStyle}>{csr.date}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
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
  )
}

export default function CSRPreviewPanel({ csr, template, onTemplateChange, branding = {}, designPreset }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selectedTemplate = CSR_TEMPLATE_OPTIONS.find((option) => option.key === template) || CSR_TEMPLATE_OPTIONS[3]
  const theme = CSR_TEMPLATE_VARIANTS[getCsrTemplateVariant(template)]
  const s = statusColor[csr.status] || { bg: '#F5F5F5', color: '#555' }
  const compact = !!theme.compact
  const hasBranding = Boolean(branding.companyName || branding.companyTagline || branding.contactLine)
  const showDocumentHeader = hasBranding || theme.headerMode === 'compactRibbon' || theme.headerMode === 'editorialSplit'
  const lbl = { fontSize: compact ? '10px' : '11px', fontWeight: '700', color: theme.accent, textTransform: 'uppercase', letterSpacing: compact ? '0.24px' : '0.3px', display: 'block', marginBottom: '4px' }
  const fillableFontFamily = resolvePdfWebFontFamily(getEffectiveFillableFont(designPreset))
  const fillableColor = designPreset?.fillableColor || theme.pageFg || '#1a1a1a'
  const val = { fontSize: compact ? '12px' : '13px', color: fillableColor, fontFamily: fillableFontFamily }
  const sec = {
    backgroundColor: theme.sectionBg || 'white',
    borderRadius: isMobile ? '8px' : '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: isMobile ? '12px' : '16px',
    overflow: 'hidden',
    border: `1px solid ${theme.border}`,
  }
  const secH = {
    backgroundColor: theme.sectionTitleBg || theme.mutedBg,
    padding: compact ? '7px 14px' : '8px 16px',
    fontWeight: '700',
    fontSize: compact ? '10px' : '11px',
    color: theme.sectionTitleFg || theme.headerBg,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${theme.border}`,
  }
  const readings = CSR_READING_FIELDS.map(({ key, label }) => [label, csr[key]])
  const hasReadings = hasOperationalReadings(csr)
  const technicianDisplayName = csr.technicianSignatory?.name || csr.technicianName || ''
  const technicianRole = csr.technicianSignatory?.role || ''
  const technicianSignatureUrl = csr.technicianSignatory?.signatureUrl || ''
  const hasMaterials = hasText(csr.materialsText)
  const hasCustomerFeedback = hasText(csr.customer_feedback)
  const hasTechnicianSection = !!csr.showTechnicianSignLine
  const acknowledgementColumns = hasTechnicianSection && !isMobile ? '1fr 1fr' : '1fr'

  return (
    <>
      <div
        style={{
          background: theme.previewShell,
          border: '1px solid #DBE5F3',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '12px' : '14px',
          marginBottom: isMobile ? '14px' : '18px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>PDF Template</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>Choose the report style for preview and download.</div>
          </div>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>{csr.status}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {CSR_TEMPLATE_OPTIONS.map((option) => {
            const active = template === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onTemplateChange(option.key)}
                style={{
                  flexShrink: 0,
                  width: isMobile ? 136 : 148,
                  textAlign: 'left',
                  padding: '10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.78)',
                  border: active ? `2px solid ${option.accent}` : '1px solid #D6E0EF',
                  boxShadow: active ? '0 10px 24px rgba(15, 23, 42, 0.08)' : 'none',
                }}
              >
                {renderTemplateThumb(option, active)}
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{option.label}</div>
                <div style={{ marginTop: '2px', fontSize: '10px', lineHeight: '1.45', color: '#64748B' }}>{option.blurb}</div>
                {active ? <div style={{ marginTop: '6px', fontSize: '9px', fontWeight: '700', color: option.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active</div> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          background: theme.previewSurface,
          border: `1px solid ${theme.border}`,
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '12px' : (compact ? '16px' : '18px'),
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

        {showDocumentHeader ? renderPreviewHeader({ csr, branding, theme, compact }) : null}

        <div style={sec}>
          <div style={secH}>Customer Details</div>
          <div style={{ padding: compact ? '14px' : '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: compact ? '12px' : '16px' }}>
            <div><span style={lbl}>CSR No.</span><span style={{ ...val, color: theme.headerBg, fontWeight: '700' }}>{csr.csr_number}</span></div>
            <div><span style={lbl}>Date</span><span style={val}>{csr.date}</span></div>
            <div><span style={lbl}>Customer</span><span style={val}>{csr.client_name}</span></div>
            {csr.show_po && String(csr.po_number || '').trim() ? <div><span style={lbl}>PO No.</span><span style={val}>{String(csr.po_number || '').trim()}</span></div> : null}
            <div style={{ gridColumn: '1 / -1' }}><span style={lbl}>Address</span><span style={val}>{csr.address}</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
          <div style={sec}>
            <div style={secH}>Nature of Problem</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <span style={lbl}>Problem Reported</span>
              <p style={{ ...val, lineHeight: compact ? '1.45' : '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.problem_reported}</p>
            </div>
          </div>
          <div style={sec}>
            <div style={secH}>Equipment Details</div>
            <div style={{ padding: compact ? '14px' : '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: compact ? '10px' : '12px' }}>
              <div><span style={lbl}>Type</span><span style={val}>{csr.equipment_type}</span></div>
              <div><span style={lbl}>Capacity</span><span style={val}>{csr.capacity}</span></div>
              <div><span style={lbl}>Make</span><span style={val}>{csr.make}</span></div>
              <div><span style={lbl}>{csr.modelLabel}</span><span style={val}>{csr.model}</span></div>
              <div><span style={lbl}>{csr.serialLabel}</span><span style={val}>{csr.serial_no}</span></div>
              <div><span style={lbl}>Location</span><span style={val}>{csr.equipment_location}</span></div>
            </div>
          </div>
        </div>

        {hasReadings ? (
          <div style={sec}>
            <div style={secH}>Operational Readings</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: isMobile ? '520px' : '100%', borderCollapse: 'collapse', fontSize: compact ? '12px' : '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.mutedBg }}>
                      {readings.map(([heading]) => (
                        <th key={heading} style={{ padding: compact ? '6px 8px' : '8px 12px', border: `1px solid ${theme.border}`, fontWeight: '700', fontSize: compact ? '10px' : '11px', color: '#334155' }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {readings.map(([heading, value]) => (
                        <td key={heading} style={{ padding: compact ? '8px 8px' : '10px 12px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>{value || '-'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : hasMaterials ? '1fr 2fr' : '1fr', gap: isMobile ? '12px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
          {hasMaterials ? (
            <div style={sec}>
              <div style={secH}>Materials Used</div>
              <div style={{ padding: compact ? '14px' : '16px' }}>
                <p style={{ ...val, lineHeight: compact ? '1.55' : '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.materialsText}</p>
              </div>
            </div>
          ) : null}
          <div style={sec}>
            <div style={secH}>Service Execution</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <div style={{ marginBottom: compact ? '8px' : '14px' }}><span style={lbl}>Service Rendered</span><p style={{ ...val, lineHeight: compact ? '1.4' : '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.service_rendered}</p></div>
              {hasTechnicianSection ? (
                <div style={{ marginBottom: compact ? '10px' : '14px' }}>
                  <span style={lbl}>Technician</span>
                  <span style={val}>{technicianDisplayName || '-'}</span>
                  {technicianRole ? <div style={{ marginTop: '4px', fontSize: compact ? '11px' : '12px', color: '#64748B' }}>{technicianRole}</div> : null}
                </div>
              ) : null}
              <div style={{ marginBottom: compact ? '8px' : '14px' }}><span style={lbl}>Technician Remarks</span><p style={{ ...val, color: '#555', lineHeight: compact ? '1.4' : '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{csr.technicianRemarks || '-'}</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: compact ? '12px' : '16px', marginBottom: compact ? '12px' : '16px' }}>
                <div><span style={lbl}>Start of Service</span><span style={val}>{[csr.start_date, csr.start_time].filter(Boolean).join(' ') || '-'}</span></div>
                <div><span style={lbl}>End of Service</span><span style={val}>{[csr.end_date, csr.end_time].filter(Boolean).join(' ') || '-'}</span></div>
              </div>
              <div style={{ fontWeight: '700', fontSize: compact ? '11px' : '12px', marginBottom: '10px' }}>Status</div>
              {CSR_STATUS_OPTIONS.map((option) => {
                const active = csr.status === option
                return (
                  <div key={option} style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px', marginBottom: compact ? '6px' : '8px' }}>
                    {theme.statusStyle === 'capsule' ? (
                      <div style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: active ? theme.headerBg : theme.mutedBg, color: active ? theme.headerFg : '#64748B', fontSize: compact ? '10px' : '11px', fontWeight: '700', minWidth: compact ? '28px' : '32px', textAlign: 'center' }}>
                        {active ? 'Yes' : 'No'}
                      </div>
                    ) : (
                      <div style={{ width: compact ? '12px' : '14px', height: compact ? '12px' : '14px', border: '1px solid #333', borderRadius: '2px', backgroundColor: active ? theme.headerBg : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {active ? <span style={{ color: 'white', fontSize: compact ? '9px' : '10px' }}>{'\u2713'}</span> : null}
                      </div>
                    )}
                    <span style={{ fontSize: compact ? '11px' : '12px', fontWeight: active ? '600' : '400', color: active ? '#1a1a1a' : '#888' }}>{option}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {hasCustomerFeedback ? (
          <div style={sec}>
            <div style={secH}>Customer Feedback</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <span style={lbl}>Feedback</span>
              <span style={val}>{csr.customer_feedback}</span>
            </div>
          </div>
        ) : null}

        {csr.showAcknowledgement || hasTechnicianSection ? (
          <div style={sec}>
            <div style={secH}>Acknowledgement</div>
            <div style={{ padding: compact ? '14px' : '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: acknowledgementColumns, gap: isMobile ? '14px' : '20px' }}>
                {csr.showAcknowledgement ? (
                  <div>
                    <span style={lbl}>{csr.recipientTitle}</span>
                    <div style={{ borderTop: '1px dashed #999', marginTop: compact ? '18px' : '28px', paddingTop: compact ? '4px' : '6px', fontSize: compact ? '11px' : '12px', color: '#555' }}>
                      {csr.acknowledgement_name || ''}
                      {csr.recipientRole ? <div style={{ marginTop: '4px', color: '#888' }}>{csr.recipientRole}</div> : null}
                    </div>
                  </div>
                ) : null}
                {hasTechnicianSection ? (
                  <div>
                    <span style={lbl}>Technician Sign</span>
                    {technicianSignatureUrl ? (
                      <div style={{ marginTop: compact ? '12px' : '18px' }}>
                        <div style={{ height: compact ? '38px' : '48px', display: 'flex', alignItems: 'flex-end' }}>
                          <img src={technicianSignatureUrl} alt={`${technicianDisplayName || 'Technician'} signature`} style={{ maxHeight: '100%', maxWidth: '180px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ borderTop: '1px dashed #999', marginTop: compact ? '4px' : '6px', paddingTop: compact ? '4px' : '6px', fontSize: compact ? '11px' : '12px', color: '#555' }}>
                          {technicianDisplayName || ''}
                          {technicianRole ? <div style={{ marginTop: '4px', color: '#888' }}>{technicianRole}</div> : null}
                        </div>
                      </div>
                    ) : (
                      <div style={{ borderTop: '1px dashed #999', marginTop: compact ? '18px' : '28px', paddingTop: compact ? '4px' : '6px', fontSize: compact ? '11px' : '12px', color: '#888' }}>
                        {technicianDisplayName || ' '}
                        {technicianRole ? <div style={{ marginTop: '4px', color: '#888' }}>{technicianRole}</div> : null}
                      </div>
                    )}
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
