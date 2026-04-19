import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  ImageIcon,
  Plus,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import UnitInput from '@/components/UnitInput'
import { useItemSuggestions } from '@/modules/item-library/hooks'
import { getInvoiceSuggestionSelection } from '@/modules/item-library/domain/invoiceSuggestionSelection'
import { fieldCls, labelCls } from '@/components/invoice/mobile/mobileFormPrimitives'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'

function ItemMiniBtn({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text3)] transition hover:bg-[var(--bd-bg3)] hover:text-[var(--bd-text2)] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function formatCurrency(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

export default function MobileItemCard({
  item,
  index,
  number,
  invoice,
  enableItemSuggestions = false,
  customColumns,
  computedAmount,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  onDuplicate = undefined,
  isVisible,
  getColumn,
  compact = false,
}) {
  const [showDetails, setShowDetails] = useState(Boolean(item.sub_description))
  const [uploading, setUploading] = useState(false)
  const [descriptionFocused, setDescriptionFocused] = useState(false)
  const [debouncedDescription, setDebouncedDescription] = useState(item.description || '')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedDescription(item.description || '')
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [item.description])

  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0)
      : null
  })()

  const suggestionQuery =
    enableItemSuggestions && descriptionFocused && String(debouncedDescription || '').trim().length >= 2
      ? debouncedDescription
      : ''
  const { data: suggestions, loading: suggestionsLoading } = useItemSuggestions(suggestionQuery, 5)
  const showSuggestions =
    enableItemSuggestions && descriptionFocused && String(item.description || '').trim().length >= 2

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      onUpdate(index, 'image_url', data.secure_url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: 'Upload failed', description: message, variant: 'destructive' })
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleSuggestionSelect = (suggestion) => {
    const selection = getInvoiceSuggestionSelection(suggestion)
    onUpdate(index, 'description', selection.description)
    onUpdate(index, 'item_id', selection.item_id)
    onUpdate(index, 'unit_price', selection.unit_price)
    setDescriptionFocused(false)
  }

  return (
    <div className={`relative border-b border-[var(--bd-border-soft)] bg-[var(--bd-surface)] p-4 transition-colors hover:bg-[#faf9f8]`}>
      <div className="mb-4 flex items-start gap-3">
        {/* Row Number & Enumeration */}
        <div className="flex flex-col items-center gap-1 pt-2">
          <div className="text-[12px] font-black text-[var(--bd-text4)]">{number}</div>
          <div className="flex h-5 items-center justify-center text-[var(--bd-text4)] cursor-grab">
            <GripVertical className="h-4 w-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Main Description */}
          <div className="relative">
            <Textarea
              value={item.description || ''}
              onChange={(e) => onUpdate(index, 'description', e.target.value)}
              onFocus={() => setDescriptionFocused(true)}
              onBlur={() => setTimeout(() => setDescriptionFocused(false), 150)}
              placeholder="Item description..."
              className="min-h-[44px] w-full resize-none rounded-[var(--bd-radius)] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] p-3 text-[14px] font-bold text-[var(--bd-text)] shadow-none focus:border-[var(--bd-indigo-border)] focus:bg-[var(--bd-surface)] focus-visible:ring-0"
            />
            {showSuggestions && (suggestionsLoading || (suggestions && suggestions.length > 0)) && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] shadow-lg">
                {suggestionsLoading ? (
                  <div className="p-3 text-xs text-[var(--bd-text3)]">Loading suggestions...</div>
                ) : (
                  suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.item_id}-${suggestion.name}`}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-[var(--bd-bg2)] p-3 text-left last:border-0 hover:bg-[var(--bd-bg2)]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-[var(--bd-text)]">{suggestion.name}</div>
                        <div className="text-[11px] text-[var(--bd-text3)]">Master Item</div>
                      </div>
                      <div className="text-[13px] font-bold text-[var(--bd-indigo)]">
                        {suggestion.standard_price ? `N${Number(suggestion.standard_price).toLocaleString()}` : '—'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sub-description Collapse */}
          {showDetails && (
            <div className="rounded-[var(--bd-radius)] border border-[var(--bd-border-soft)] bg-[var(--bd-bg2)] p-2">
              <Textarea
                placeholder="Product sub-description, specs, or notes..."
                value={item.sub_description || ''}
                onChange={(e) => onUpdate(index, 'sub_description', e.target.value)}
                className="min-h-[32px] w-full resize-none border-0 bg-transparent p-0 text-[12px] font-medium text-[var(--bd-text2)] shadow-none focus-visible:ring-0"
              />
            </div>
          )}

          {/* Image Preview */}
          {item.image_url && (
            <div className="group relative w-fit">
              <img src={item.image_url} alt="" className="h-20 w-20 rounded-[var(--bd-radius)] border border-[var(--bd-border)] object-cover shadow-sm" />
              <button
                type="button"
                onClick={() => onUpdate(index, 'image_url', null)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bd-rose)] text-white shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Form Actions (Sub-desc, Photo, Duplicate) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${showDetails ? 'border-[var(--bd-indigo)] bg-[var(--bd-indigo-bg)] text-[var(--bd-indigo)]' : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text3)]'}`}
            >
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Sub-desc
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${item.image_url ? 'border-[var(--bd-emerald)] bg-[var(--bd-emerald-bg)] text-[var(--bd-emerald)]' : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text3)]'}`}
            >
              <Camera className="h-3.5 w-3.5" />
              Photo
            </button>
            {onDuplicate ? (
              <button
                type="button"
                onClick={() => onDuplicate(index)}
                className="flex items-center gap-1.5 rounded-full border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--bd-text3)] transition hover:bg-[var(--bd-bg2)]"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>
            ) : null}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Grid Area */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {isVisible('make') && (
              <div className="col-span-1">
                <label className={labelCls}>Make</label>
                <Input
                  value={item.make || ''}
                  onChange={(e) => onUpdate(index, 'make', e.target.value)}
                  className={fieldCls}
                />
              </div>
            )}
            <div className="col-span-1">
              <label className={labelCls}>Quantity</label>
              <Input
                type="number"
                value={item.quantity ?? 1}
                onChange={(e) => onUpdate(index, 'quantity', Number(e.target.value))}
                className={`${fieldCls} text-center font-bold`}
              />
            </div>
            {isVisible('unit') && (
              <div className="col-span-1">
                <label className={labelCls}>Unit</label>
                <UnitInput value={item.unit || ''} onChange={(val) => onUpdate(index, 'unit', val)} className={fieldCls} />
              </div>
            )}
            <div className="col-span-1">
              <label className={labelCls}>Unit Price</label>
              <Input
                type="number"
                value={item.unit_price ?? 0}
                onChange={(e) => onUpdate(index, 'unit_price', Number(e.target.value))}
                className={`${fieldCls} text-right font-mono font-bold text-[var(--bd-text)]`}
              />
            </div>
          </div>

          {/* Conditional Row: Install Rate */}
          {isVisible('install_rate') && (
            <div>
              <label className={labelCls}>Install Rate</label>
              <Input
                type="number"
                value={item.install_rate_override ? item.install_rate ?? '' : ''}
                placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : 'Auto formula'}
                onChange={(e) => {
                  const val = e.target.value
                  onUpdate(index, '__install_rate_override', val === '' ? { install_rate_override: false, install_rate: null } : { install_rate_override: true, install_rate: Number(val) })
                }}
                className={fieldCls}
              />
            </div>
          )}

          {/* Amount Box */}
          <div className="rounded-[var(--bd-radius-lg)] bg-[var(--bd-text)] p-3 text-white">
            <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Line Subtotal</div>
            <div className="mt-1 text-[20px] font-black tracking-tight text-[var(--bd-emerald-border)]">
              {formatCurrency(computedAmount)}
            </div>
          </div>
        </div>

        {/* Vertical Actions (Reorder & Remove) */}
        <div className="flex shrink-0 flex-col gap-1.5">
          <ItemMiniBtn onClick={() => onMoveUp(index)} disabled={isFirst} className={isFirst ? 'opacity-30' : ''}>
            <ChevronUp className="h-4 w-4" />
          </ItemMiniBtn>
          <ItemMiniBtn onClick={() => onMoveDown(index)} disabled={isLast} className={isLast ? 'opacity-30' : ''}>
            <ChevronDown className="h-4 w-4" />
          </ItemMiniBtn>
          <div className="mt-4 flex flex-col gap-1.5">
            <ItemMiniBtn onClick={() => onRemove(index)} className="border-[var(--bd-rose-border)] bg-[var(--bd-rose-bg)] text-[var(--bd-rose)] hover:bg-[var(--bd-rose-bg)]">
              <X className="h-4 w-4" />
            </ItemMiniBtn>
          </div>
        </div>
      </div>

      {/* Add Item Below Trigger */}
      <button
        type="button"
        onClick={() => onInsertBelow(index)}
        className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[var(--bd-text3)] transition hover:text-[var(--bd-indigo)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Item Below
      </button>
    </div>
  )
}
