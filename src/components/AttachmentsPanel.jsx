const SUGGESTED_LABELS = [
  'Technical Specification',
  'Warranty Terms',
  'Load Test Report',
  'Company Profile',
  'Service Checklist',
  'Site Photo Gallery',
  'Tax Certificate (TIN)',
  'Custom',
]

const emptyAttachment = () => ({ label: '', customLabel: '', url: '', _isCustom: false })

export default function AttachmentsPanel({ attachments = [], onChange }) {

  const addRow = () => onChange([...attachments, emptyAttachment()])

  const removeRow = (idx) => onChange(attachments.filter((_, i) => i !== idx))

  const updateRow = (idx, field, value) => {
    onChange(attachments.map((att, i) => {
      if (i !== idx) return att
      if (field === 'label') {
        const isCustom = value === 'Custom'
        return { ...att, label: isCustom ? '' : value, _isCustom: isCustom, customLabel: '' }
      }
      if (field === 'customLabel') return { ...att, label: value, customLabel: value }
      return { ...att, [field]: value }
    }))
  }

  const inp = {
    padding: '8px 10px', border: '1px solid #ddd', borderRadius: '7px',
    fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
    color: '#1a1a1a', backgroundColor: 'white',
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          {attachments.map((att, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px', padding: '10px 12px', backgroundColor: '#f8f8f8', borderRadius: '8px', border: '1px solid #eee' }}>
              <span style={{ fontSize: '18px', marginTop: '6px', flexShrink: 0 }}>📎</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>

                {/* Label dropdown */}
                <select
                  value={att._isCustom ? 'Custom' : (att.label || '')}
                  onChange={e => updateRow(idx, 'label', e.target.value)}
                  style={{ ...inp }}
                >
                  <option value="">— Select label —</option>
                  {SUGGESTED_LABELS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>

                {/* Custom label input (only when Custom selected) */}
                {att._isCustom && (
                  <input
                    style={inp}
                    placeholder="Type your custom label..."
                    value={att.customLabel || ''}
                    onChange={e => updateRow(idx, 'customLabel', e.target.value)}
                  />
                )}

                {/* URL input */}
                <input
                  style={inp}
                  placeholder="Paste link (Google Drive, Dropbox, etc.)"
                  value={att.url || ''}
                  onChange={e => updateRow(idx, 'url', e.target.value)}
                />

                {/* Preview link */}
                {att.url && (
                  <a href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#6366F1', textDecoration: 'none' }}>
                    ↗ Preview link
                  </a>
                )}
              </div>

              {/* Remove button */}
              <div
                onClick={() => removeRow(idx)}
                style={{ fontSize: '20px', color: '#CC0000', cursor: 'pointer', lineHeight: 1, marginTop: '4px', flexShrink: 0 }}
              >×</div>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={addRow}
        style={{
          padding: '10px 14px', border: '2px dashed #ddd', borderRadius: '8px',
          textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        <span style={{ fontSize: '16px' }}>+</span> Add Supporting Document
      </div>

      {attachments.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#bbb', textAlign: 'center' }}>
          These appear as clickable links at the bottom of the PDF under "Supporting Documents"
        </div>
      )}
    </div>
  )
}
