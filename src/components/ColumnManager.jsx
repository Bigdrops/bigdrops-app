import { COLUMN_TYPES } from './useInvoiceColumns.jsx'

export default function ColumnManager({ columns, onUpdate, onToggle, onAddCustom, onRemoveCustom, onReset, onMove, onClose }) {
  const inp = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', outline: 'none', color: '#1a1a1a', backgroundColor: 'white', boxSizing: 'border-box', width: '100%' }

  const builtinCols = columns.filter(c => !c.key.startsWith('custom_'))
  const customCols  = columns.filter(c =>  c.key.startsWith('custom_'))

  const handleDragStart = (e, key) => e.dataTransfer.setData('text/plain', key)
  const handleDragOver  = e => e.preventDefault()
  const handleDrop = (e, targetKey) => {
    e.preventDefault()
    const draggedKey = e.dataTransfer.getData('text/plain')
    if (!draggedKey || draggedKey === targetKey || !onMove) return
    const fromIdx = columns.findIndex(c => c.key === draggedKey)
    const toIdx   = columns.findIndex(c => c.key === targetKey)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    onMove(draggedKey, toIdx)
  }

  const typeLabel = t => ({ install_rate: 'Rate', vat_rate: 'VAT%', discount_rate: 'Disc%' }[t] || t)

  // Eye button — clear 👁 / hidden 🚫 with tooltip
  const EyeBtn = ({ visible, onToggle }) => (
    <button
      onClick={onToggle}
      title={visible ? 'Hide column' : 'Show column'}
      style={{
        width: '34px', height: '34px', borderRadius: '8px', border: '1px solid',
        borderColor: visible ? '#c7d2fe' : '#e0e0e0',
        backgroundColor: visible ? '#eef2ff' : '#f5f5f5',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '17px', lineHeight: 1, flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {visible ? '👁️' : '🚫'}
    </button>
  )

  const ColRow = ({ col, idx, isCustom }) => (
    <div
      key={col.key}
      draggable
      onDragStart={e => handleDragStart(e, col.key)}
      onDragOver={handleDragOver}
      onDrop={e => handleDrop(e, col.key)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '10px 0', borderBottom: '1px solid #f5f5f5',
        cursor: 'grab', opacity: col.visible ? 1 : 0.5,
      }}
    >
      {/* Drag handle */}
      <div style={{ fontSize: '14px', color: '#ccc', paddingTop: '8px', userSelect: 'none', flexShrink: 0 }}>⠿</div>

      {/* Eye toggle */}
      <EyeBtn visible={col.visible} onToggle={() => onToggle(col.key)} />

      {/* Column info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isCustom
          ? <input style={inp} value={col.label} onChange={e => onUpdate(col.key, 'label', e.target.value)} placeholder="Column name" />
          : <div style={{ fontSize: '13px', fontWeight: '600', color: col.visible ? '#1a1a1a' : '#aaa', paddingTop: '6px' }}>{col.label}</div>
        }

        {/* Install rate formula */}
        {col.key === 'install_rate' && (
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>
              Multiplier (e.g. 0.1 = 10% of Qty×Rate). Blank = manual per row.
            </div>
            <input
              style={inp} type="number" step="0.01" min="0"
              value={col.formula || ''}
              onChange={e => onUpdate(col.key, 'formula', e.target.value)}
              placeholder="e.g. 0.1"
            />
          </div>
        )}
        {(col.key === 'vat_rate' || col.key === 'discount_rate') && (
          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
            Set 0 on a row to exclude it. Blank = global rate.
          </div>
        )}

        {/* Custom: type + include in total */}
        {isCustom && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
            <select style={{ ...inp, width: 'auto', flex: 1 }} value={col.type} onChange={e => onUpdate(col.key, 'type', e.target.value)}>
              {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {col.type === 'number' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#555', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!col.includeInTotal} onChange={e => onUpdate(col.key, 'includeInTotal', e.target.checked)} />
                Add to total
              </label>
            )}
          </div>
        )}
      </div>

      {/* Type badge for builtins */}
      {!isCustom && (
        <div style={{ fontSize: '11px', color: '#bbb', padding: '2px 8px', border: '1px solid #eee', borderRadius: '4px', whiteSpace: 'nowrap', marginTop: '6px', flexShrink: 0 }}>
          {typeLabel(col.type || 'text')}
        </div>
      )}

      {/* Delete for custom */}
      {isCustom && (
        <div
          onClick={() => onRemoveCustom(col.key)}
          style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#CC0000', fontSize: '20px', flexShrink: 0 }}
        >×</div>
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a1a' }}>Edit Columns</h3>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>👁️ show/hide · ⠿ drag to reorder</div>
          </div>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '22px', color: '#888', lineHeight: 1 }}>×</span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 16px' }}>

          {/* Standard columns */}
          <div style={{ fontSize: '10px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>
            Standard Columns
          </div>
          {builtinCols.map((col, idx) => (
            <ColRow key={col.key} col={col} idx={idx} isCustom={false} />
          ))}

          {/* Custom columns */}
          {customCols.length > 0 && (
            <>
              <div style={{ fontSize: '10px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '16px 0 4px' }}>
                Custom Columns
              </div>
              {customCols.map((col, idx) => (
                <ColRow key={col.key} col={col} idx={idx} isCustom={true} />
              ))}
            </>
          )}

          {/* Add custom */}
          <div style={{ padding: '14px 0 4px' }}>
            <div
              onClick={onAddCustom}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#6366F1', fontSize: '13px', fontWeight: 'bold', padding: '8px 14px', border: '1px dashed #6366F1', borderRadius: '8px' }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Add Custom Column
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
          <div onClick={onReset} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: '#555' }}>Reset</div>
          <div onClick={onClose} style={{ flex: 2, padding: '10px', backgroundColor: '#6366F1', color: 'white', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Done</div>
        </div>
      </div>
    </div>
  )
}
