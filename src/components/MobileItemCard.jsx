/**
 * MobileItemCard.jsx
 * 
 * Renders a single invoice line item as a vertical card on mobile.
 * Drop-in replacement for the table <tr> on small screens.
 * 
 * Props match exactly what NewInvoice/EditInvoice already have per row.
 */
import UnitInput from './UnitInput'
import ItemImageUpload from './ItemImageUpload'

export default function MobileItemCard({
  item, index, number,
  isVisible, getColumn, customColumns, showItemImages,
  invoice,
  onUpdate, onRemove, onMoveUp, onMoveDown,
  isFirst, isLast,
}) {
  const inp = {
    width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0',
    borderRadius: '6px', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', color: '#1a1a1a', backgroundColor: 'white',
  }
  const lbl = { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }
  const row = { marginBottom: '12px' }
  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0) : null
  })()

  // Group header card
  if (item.row_type === 'group_header') {
    return (
      <div style={{ backgroundColor: '#333', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          style={{ ...inp, backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #555', borderRadius: 0, flex: 1 }}
          value={item.group_name || ''}
          onChange={e => onUpdate(index, 'group_name', e.target.value)}
          placeholder="Group name"
        />
        <span onClick={() => onRemove(index)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</span>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '14px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* Card header: number + reorder + delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{number}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => onMoveUp(index)} disabled={isFirst} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', cursor: isFirst ? 'not-allowed' : 'pointer', color: isFirst ? '#ddd' : '#555', fontSize: '12px' }}>▲</button>
            <button onClick={() => onMoveDown(index)} disabled={isLast} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', cursor: isLast ? 'not-allowed' : 'pointer', color: isLast ? '#ddd' : '#555', fontSize: '12px' }}>▼</button>
          </div>
        </div>
        <span onClick={() => onRemove(index)} style={{ color: '#CC0000', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px' }}>×</span>
      </div>

      {/* Description */}
      <div style={row}>
        <label style={lbl}>Description</label>
        <input style={inp} value={item.description || ''} onChange={e => onUpdate(index, 'description', e.target.value)} placeholder="Item description" />
        <input style={{ ...inp, marginTop: '6px', fontSize: '13px', color: '#888' }} value={item.sub_description || ''} onChange={e => onUpdate(index, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" />
      </div>

      {/* Make */}
      {isVisible('make') && (
        <div style={row}>
          <label style={lbl}>Make / Brand</label>
          <input style={inp} value={item.make || ''} onChange={e => onUpdate(index, 'make', e.target.value)} placeholder="Brand" />
        </div>
      )}

      {/* Qty + Unit side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={lbl}>Quantity</label>
          <input style={inp} type="number" min="0" value={item.quantity} onChange={e => onUpdate(index, 'quantity', Number(e.target.value))} />
        </div>
        {isVisible('unit') && (
          <div>
            <label style={lbl}>Unit</label>
            <UnitInput value={item.unit || ''} onChange={val => onUpdate(index, 'unit', val)} />
          </div>
        )}
      </div>

      {/* Rate + Amount side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={lbl}>Unit Rate (₦)</label>
          <input style={inp} type="number" min="0" value={item.unit_price} onChange={e => onUpdate(index, 'unit_price', Number(e.target.value))} />
        </div>
        <div>
          <label style={lbl}>Amount</label>
          <div style={{ padding: '8px 10px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontSize: '14px', fontWeight: '700', color: '#1a1a1a', border: '1px solid #e0e0e0' }}>
            ₦{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Install Rate */}
      {isVisible('install_rate') && (
        <div style={row}>
          <label style={lbl}>Install Rate</label>
          <input
            style={inp} type="number" min="0"
            value={item.install_rate_override ? (item.install_rate ?? '') : ''}
            placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
            onChange={e => {
              const val = e.target.value
              onUpdate(index, '__install_rate_override', val === ''
                ? { install_rate_override: false, install_rate: null }
                : { install_rate_override: true, install_rate: Number(val) }
              )
            }}
          />
        </div>
      )}

      {/* VAT Rate */}
      {isVisible('vat_rate') && (
        <div style={row}>
          <label style={lbl}>VAT % (blank = global {invoice.vat || 0}%)</label>
          <input
            style={{ ...inp, backgroundColor: item.vat_rate !== null && item.vat_rate !== undefined ? 'white' : '#f9f9f9', color: item.vat_rate === 0 ? '#CC0000' : '#1a1a1a' }}
            type="number" min="0" max="100"
            value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ''}
            placeholder={String(invoice.vat || 0)}
            onChange={e => { const val = e.target.value; onUpdate(index, 'vat_rate', val === '' ? null : Number(val)) }}
          />
          {item.vat_rate === 0 && <div style={{ fontSize: '11px', color: '#CC0000', marginTop: '3px' }}>VAT excluded for this item</div>}
        </div>
      )}

      {/* Discount Rate */}
      {isVisible('discount_rate') && (() => {
        const drVal = item.discount_rate
        const isExcluded = drVal === 0
        const hasOverride = drVal !== null && drVal !== undefined
        return (
          <div style={row}>
            <label style={lbl}>Discount % (blank = global)</label>
            <input
              style={{ ...inp, backgroundColor: isExcluded ? '#fff0f0' : hasOverride ? '#fffbe6' : '#f9f9f9', color: isExcluded ? '#CC0000' : '#1a1a1a' }}
              type="number" min="0" max="100"
              value={hasOverride ? drVal : ''}
              placeholder="global"
              onChange={e => { const val = e.target.value; onUpdate(index, 'discount_rate', val === '' ? null : Number(val)) }}
            />
            {isExcluded
              ? <div style={{ fontSize: '11px', color: '#CC0000', marginTop: '3px' }}>✕ No discount on this item</div>
              : drVal > 0
                ? <div style={{ fontSize: '11px', color: '#B45309', marginTop: '3px' }}>{drVal}% discount on this row</div>
                : null
            }
          </div>
        )
      })()}

      {/* Custom columns */}
      {customColumns.filter(c => c.visible).map(col => (
        <div key={col.key} style={row}>
          <label style={lbl}>{col.label}</label>
          <input
            style={inp}
            type={col.type === 'number' ? 'number' : 'text'}
            value={(item.custom_data || {})[col.key] || ''}
            onChange={e => onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value })}
          />
        </div>
      ))}

      {/* Item image */}
      {showItemImages && (
        <div style={row}>
          <label style={lbl}>Item Image</label>
          <ItemImageUpload value={item.image_url || null} onChange={url => onUpdate(index, 'image_url', url)} />
        </div>
      )}
    </div>
  )
}
