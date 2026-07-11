import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

interface UnitInputProps {
  value: string | number | null | undefined
  onChange: (value: string) => void
}

export default function UnitInput({ value, onChange }: UnitInputProps) {
  const [query, setQuery] = useState(String(value || ''))
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('bigdrops_units')
    return saved ? JSON.parse(saved) : DEFAULT_UNITS
  })
  const [addingNew, setAddingNew] = useState(false)
  const [newUnit, setNewUnit] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(String(value || ''))
  }, [value])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    const matches = units.filter(u => u.toLowerCase().startsWith(val.toLowerCase()))
    if (matches.length === 1) {
      onChange(matches[0])
    } else {
      onChange(val.toUpperCase())
    }
  }

  const handleSelect = (unit: string) => {
    setQuery(unit)
    onChange(unit)
    setOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Unit"
        className="w-full"
      />
      {open && (
        <Card className="absolute left-0 top-full z-[100] mt-1 min-w-40 max-h-[220px] overflow-y-auto rounded-md border border-zinc-300 bg-bd-card-bg py-0 shadow-xl">
          {filtered.length === 0 && !addingNew && (
            <div className="px-3.5 py-2.5 text-sm text-zinc-500">No matches</div>
          )}
          {filtered.map(unit => (
            <button
              key={unit}
              type="button"
              onClick={() => handleSelect(unit)}
              className={cn(
                'w-full px-3.5 py-2 text-left text-sm font-bold text-zinc-900 transition',
                'hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none'
              )}
            >
              {unit}
            </button>
          ))}
          <div className="border-t border-zinc-200">
            {addingNew ? (
              <div className="flex gap-1.5 p-2">
                <Input
                  autoFocus
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddUnit()}
                  placeholder="New unit..."
                />
                <Button type="button" size="sm" onClick={handleAddUnit}>Add</Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start rounded-none px-3 text-red-600 hover:bg-red-50 hover:text-red-600"
                onClick={() => setAddingNew(true)}
              >
                + Add Unit
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
