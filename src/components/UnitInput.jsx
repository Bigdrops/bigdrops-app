import { useState, useRef, useEffect } from 'react'

const DEFAULT_UNITS = [
  'M', 'KM', 'CM', 'MM', 'IN', 'FT', 'YD', 'MI',
  'KG', 'G', 'MG', 'T', 'LB', 'OZ', 'ST',
  'L', 'ML', 'GAL', 'QT', 'PT', 'FL OZ',
  'M²', 'FT²', 'M³', 'FT³', 'ACRE', 'HECTARE',
  'PCS', 'UNIT', 'PAIR', 'DOZEN', 'GROSS', 'REAM', 'SET',
  'PACK', 'BOX', 'CARTON', 'CASE', 'BUNDLE', 'ROLL', 'SHEET',
  'HR', 'MIN', 'DAY', 'WEEK', 'MONTH', 'YEAR',
  'KWH', 'BTU', 'CT', 'OZ T', 'BOARD FOOT', 'NOS',
  'KVA', 'KW', 'MW', 'AMP', 'VOLT', 'HZ', 'MTR', 'LM',
  'LOT', 'JOB', 'SERVICE', 'TRIP', 'VISIT',
]

export default function UnitInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState(() => {
    const saved = localStorage.getItem('bigdrops_units')
    return saved ? JSON.parse(saved) : DEFAULT_UNITS
  })
  const [addingNew, setAddingNew] = useState(false)
  const [newUnit, setNewUnit] = useState('')
  const ref = useRef()

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setAddingNew(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query
    ? units.filter(u => u.toLowerCase().startsWith(query.toLowerCase()))
    : units

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    // Auto-complete if only one match
    const matches = units.filter(u => u.toLowerCase().startsWith(val.toLowerCase()))
    if (matches.length === 1) {
      onChange(matches[0])
    } else {
      onChange(val.toUpperCase())
    }
  }

  const handleSelect = (unit) => {
    setQuery(unit)
    onChange(unit)
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[0])
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const handleAddUnit = () => {
    if (!newUnit.trim()) return
    const upper = newUnit.trim().toUpperCase()
    if (!units.includes(upper)) {
      const updated = [...units, upper].sort()
      setUnits(updated)
      localStorage.setItem('bigdrops_units', JSON.stringify(updated))
    }
    handleSelect(newUnit.trim().toUpperCase())
    setNewUnit('')
    setAddingNew(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Unit"
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '160px',
          maxHeight: '220px', overflowY: 'auto'
        }}>
          {filtered.length === 0 && !addingNew && (
            <div style={{ padding: '10px 14px', color: '#888', fontSize: '13px' }}>No matches</div>
          )}
          {filtered.map(unit => (
            <div key={unit} onClick={() => handleSelect(unit)} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#1a1a1a' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
              {unit}
            </div>
          ))}
          <div style={{ borderTop: '1px solid #eee' }}>
            {addingNew ? (
              <div style={{ padding: '8px', display: 'flex', gap: '6px' }}>
                <input
                  autoFocus
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddUnit()}
                  placeholder="New unit..."
                  style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', outline: 'none' }}
                />
                <div onClick={handleAddUnit} style={{ padding: '6px 10px', backgroundColor: '#CC0000', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  Add
                </div>
              </div>
            ) : (
              <div onClick={() => setAddingNew(true)} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#CC0000', fontWeight: 'bold' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF0F0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                + Add Unit
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}