import * as React from 'react'
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
import { NumericInput } from '@/components/ui/numeric-input'
import { Textarea } from '@/components/ui/textarea'
import { feedback } from '@/lib/feedback'
import UnitInput from '@/components/UnitInput'
import { useItemSuggestions } from '@/modules/item-library/hooks'
import { getInvoiceSuggestionSelection } from '@/modules/item-library/domain/invoiceSuggestionSelection'
import { getInvoiceSuggestionPriceContextText } from '@/modules/item-library/domain/invoiceSuggestionPriceContext'
import { loadItemPriceContext, resolveExactItemMatch } from '@/modules/item-library/services'
import { fieldCls, labelCls } from '@/components/invoice/mobile/mobileFormPrimitives'
import { normalizeQuantity } from '@/domain/invoice'
import { formatNaira } from '@/lib/formatters/money'
import { ITEM_FIELD_POLICY, type ItemContext } from '@/components/shared/itemFieldPolicy'
import type { InvoiceItem } from '@/domain/invoice/types'
import type { ItemSuggestion } from '@/modules/item-library/types'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'

interface ItemMiniBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

function ItemMiniBtn({ children, className = '', ...props }: ItemMiniBtnProps) {
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

interface MobileItemCardProps {
  item: InvoiceItem
  index: number
  number: number | string
  invoice?: any
  context?: ItemContext
  enableItemSuggestions?: boolean
  customColumns?: any
  computedAmount: number | string
  isFirst: boolean
  isLast: boolean
  onUpdate: (index: number, field: string, value: any) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onInsertBelow: (index: number) => void
  onDuplicate?: (index: number) => void
  isVisible: (field: string) => boolean
  getColumn: (field: string) => any
  compact?: boolean
}

export default function MobileItemCard({
  item,
  index,
  number,
  invoice,
  context: ctx = 'invoice',
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
}: MobileItemCardProps) {
  const [showDetails, setShowDetails] = useState(Boolean(item.sub_description))
  const [uploading, setUploading] = useState(false)
  const [descriptionFocused, setDescriptionFocused] = useState(false)
  const [debouncedDescription, setDebouncedDescription] = useState(item.description || '')
  const [selectedSuggestionContextText, setSelectedSuggestionContextText] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateField = (key: string, value: any) => {
    const policy = ITEM_FIELD_POLICY[ctx]
    if (policy.root.includes(key)) {
      onUpdate(index, key, value)
      return
    }
    if (policy.custom.includes(key)) {
      onUpdate(index, 'custom_data', {
        ...(item.custom_data || {}),
        [key]: value,
      })
      return
    }
    console.warn(`[MobileItemCard] blocked unknown field: ${key}`)
  }

  const getItemId = () => {
    if (ctx === 'waybill') return (item.custom_data as any)?.item_id ?? null
    return (item as any).item_id ?? null
  }

  const resolvedItemId = getItemId()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedDescription(item.description || '')
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [item.description])

  useEffect(() => {
    if (!resolvedItemId) {
      setSelectedSuggestionContextText(null)
    }
  }, [resolvedItemId])

  useEffect(() => {
    if (!enableItemSuggestions) return undefined
    if (item.row_type && item.row_type !== 'standard') return undefined
    if (resolvedItemId) return undefined

    const trimmedDescription = String(debouncedDescription || '').trim()
    if (trimmedDescription.length < 2) return undefined
    if (trimmedDescription !== String(item.description || '').trim()) return undefined

    let cancelled = false

    const run = async () => {
      const exactMatch = await resolveExactItemMatch(trimmedDescription, invoice?.client_id)
      if (cancelled || !exactMatch?.item_id) return
      if (resolvedItemId) return
      if (trimmedDescription !== String(item.description || '').trim()) return
      updateField('item_id', exactMatch.item_id)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [debouncedDescription, enableItemSuggestions, index, invoice?.client_id, item.description, resolvedItemId, item.row_type, onUpdate])

  useEffect(() => {
    if (!resolvedItemId) return undefined

    let cancelled = false

    const run = async () => {
      const priceContext = await loadItemPriceContext(resolvedItemId || '', invoice?.client_id)
      if (cancelled) return
      setSelectedSuggestionContextText(getInvoiceSuggestionPriceContextText(priceContext))
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [resolvedItemId, invoice?.client_id])

  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)
      : null
  })()

  const suggestionQuery =
    enableItemSuggestions && descriptionFocused && String(debouncedDescription || '').trim().length >= 2
      ? debouncedDescription
      : ''
  const { data: suggestions, loading: suggestionsLoading } = useItemSuggestions(suggestionQuery, 5, invoice?.client_id)
  const showSuggestions =
    enableItemSuggestions && descriptionFocused && String(item.description || '').trim().length >= 2

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      feedback.error('Upload failed', { description: message })
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleSuggestionSelect = (suggestion: ItemSuggestion) => {
    const selection = getInvoiceSuggestionSelection(suggestion)
    onUpdate(index, 'description', selection.description)
    updateField('item_id', selection.item_id)
    if (ctx !== 'waybill') {
      onUpdate(index, 'unit_price', selection.unit_price)
    }
    setSelectedSuggestionContextText(selection.item_id ? getInvoiceSuggestionPriceContextText(suggestion) : null)
    setDescriptionFocused(false)
  }

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextDescription = event.target.value
    onUpdate(index, 'description', nextDescription)
    if (resolvedItemId) {
      updateField('item_id', null)
      setSelectedSuggestionContextText(null)
    }
  }

  return (
    <div className="relative border-b border-[var(--bd-border-soft)] bg-[var(--bd-surface)] px-0 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
      <div className="grid grid-cols-[16px_minmax(0,1fr)_30px] items-start gap-2">
        {/* Row Number & Enumeration */}
        <div className="flex w-4 flex-col items-center gap-0.5 pt-2">
          <div className="text-[10px] font-bold leading-none text-[var(--bd-text3)]">{number}</div>
          <div className="cursor-grab text-[var(--bd-text4)] transition-colors hover:text-[var(--bd-text2)] active:cursor-grabbing">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Main Description */}
          <div className="relative">
            <Textarea
              value={item.description || ''}
              onChange={handleDescriptionChange}
              onFocus={() => setDescriptionFocused(true)}
              onBlur={() => setTimeout(() => setDescriptionFocused(false), 150)}
              placeholder="Item description..."
              className="min-h-[38px] w-full resize-none rounded-[8px] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] p-2.5 text-[13px] font-medium text-[var(--bd-text)] shadow-none focus:border-[var(--bd-indigo-border)] focus:bg-[var(--bd-surface)] focus-visible:ring-0"
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
                      </div>
                      <div className="text-[13px] font-bold text-[var(--bd-indigo)]">
                        {suggestion.standard_price ? `N${Number(suggestion.standard_price).toLocaleString()}` : '—'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {resolvedItemId && selectedSuggestionContextText ? (
              <div className="mt-2 text-[11px] font-medium leading-relaxed text-[var(--bd-text3)] whitespace-pre-line">
                {selectedSuggestionContextText}
              </div>
            ) : null}
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

          {/* Form Actions (Sub-desc, Photo) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${showDetails ? 'border-[var(--bd-indigo)] bg-[var(--bd-indigo-bg)] text-[var(--bd-indigo)]' : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text3)] hover:bg-[var(--bd-bg2)]'}`}
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Sub-desc
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${item.image_url ? 'border-[var(--bd-emerald)] bg-[var(--bd-emerald-bg)] text-[var(--bd-emerald)]' : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text3)] hover:bg-[var(--bd-bg2)]'}`}
            >
              <Camera className="h-3 w-3" />
              Photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>          {/* Compact Inputs Row */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 sm:grid-cols-5">
            {isVisible('make') && (
              <div className="min-w-0">
                <label className={labelCls}>Make</label>
                <Input value={(item.make as string) || ''} onChange={(e) => onUpdate(index, 'make', e.target.value)} className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]" />
              </div>
            )}
            {isVisible('quantity') && (
            <div className="min-w-0">
              <label className={labelCls}>Qty</label>
              <NumericInput min={1} value={(item.quantity as number) ?? 1} onChange={(val) => onUpdate(index, 'quantity', normalizeQuantity(val, 1))} className="h-9 px-2 text-center text-[13px] font-bold rounded-lg border-[var(--bd-border-soft)]" />
            </div>
            )}
            {isVisible('unit') && (
              <div className="min-w-0">
                <label className={labelCls}>Unit</label>
                <UnitInput value={(item.unit as string) || ''} onChange={(val: string) => onUpdate(index, 'unit', val)} />
              </div>
            )}
            {isVisible('unit_price') && (
            <div className="min-w-0">
              <label className={labelCls}>Rate</label>
              <NumericInput value={(item.unit_price as number) ?? 0} onChange={(val) => onUpdate(index, 'unit_price', val)} className="h-9 px-2.5 text-right font-mono text-[13px] font-bold rounded-lg border-[var(--bd-border-soft)]" />
            </div>
            )}
            {isVisible('partNo') && (
              <div className="min-w-0">
                <label className={labelCls}>Part No.</label>
                <Input value={(item.partNo as string) || ''} onChange={(e) => onUpdate(index, 'partNo', e.target.value)} className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]" />
              </div>
            )}
            {isVisible('condition') && (
              <div className="min-w-0">
                <label className={labelCls}>Condition</label>
                <Input value={(item.condition as string) || ''} onChange={(e) => onUpdate(index, 'condition', e.target.value)} className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]" />
              </div>
            )}

            {isVisible('install_rate') && (
              <div className="min-w-0">
                <label className={labelCls}>{getColumn('install_rate')?.label || 'Install'}</label>
                <NumericInput
                  value={item.install_rate_override ? (item.install_rate as number) ?? '' : ''}
                  placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : 'Auto'}
                  onChange={(val) => {
                    onUpdate(index, '__install_rate_override', val === 0 ? { install_rate_override: false, install_rate: null } : { install_rate_override: true, install_rate: val })
                  }}
                  className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]"
                />
              </div>
            )}

            {isVisible('vat_rate') && (
              <div className="min-w-0">
                <label className={labelCls}>{getColumn('vat_rate')?.label || 'VAT %'}</label>
                <NumericInput
                  value={(item.vat_rate as number) ?? ''}
                  placeholder="0"
                  onChange={(val) => onUpdate(index, 'vat_rate', val === 0 ? null : val)}
                  className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]"
                />
              </div>
            )}

            {isVisible('discount_rate') && (
              <div className="min-w-0">
                <label className={labelCls}>{getColumn('discount_rate')?.label || 'Disc %'}</label>
                <NumericInput
                  value={(item.discount_rate as number) ?? ''}
                  placeholder="0"
                  onChange={(val) => onUpdate(index, 'discount_rate', val === 0 ? null : val)}
                  className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]"
                />
              </div>
            )}

            {/* Custom Columns */}
            {customColumns?.map((col: any) => {
              if (!isVisible(col.key)) return null
              const val = (item.custom_data || {})[col.key] ?? ''
              return (
                <div key={col.key} className="min-w-0">
                  <label className={labelCls}>{col.label}</label>
                  <NumericInput
                    value={val}
                    onChange={(nextVal) => {
                      onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: nextVal })
                    }}
                    className="h-9 px-2.5 text-[13px] rounded-lg border-[var(--bd-border-soft)]"
                  />
                </div>
              )
            })}
          </div>

          {isVisible('amount') && (
          <div className="flex items-end justify-between gap-3 rounded-[12px] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[var(--bd-text3)]">Subtotal</div>
            </div>
            <div className="min-w-0 text-right">
              <div className="font-mono text-[18px] font-extrabold tracking-[-0.03em] text-[var(--bd-text)]">
                {formatNaira(computedAmount).replace('₦', '').trim()}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Vertical Actions */}
        <div className="flex w-[30px] flex-col gap-1 py-1">
          <button onClick={() => onMoveUp(index)} disabled={isFirst} className={`flex h-7 w-7 items-center justify-center rounded-[8px] border transition ${isFirst ? 'cursor-not-allowed border-[var(--bd-border-soft)] bg-[var(--bd-bg)] text-[var(--bd-text4)] opacity-50' : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text2)] hover:bg-[var(--bd-bg2)]'}`}>
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onMoveDown(index)} disabled={isLast} className={`flex h-7 w-7 items-center justify-center rounded-[8px] border transition ${isLast ? 'cursor-not-allowed border-[var(--bd-border-soft)] bg-[var(--bd-bg)] text-[var(--bd-text4)] opacity-50' : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text2)] hover:bg-[var(--bd-bg2)]'}`}>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onRemove(index)} className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[var(--bd-rose-border)] bg-[var(--bd-rose-bg)] text-[var(--bd-rose)] transition hover:brightness-95">
            <X className="h-3.5 w-3.5" />
          </button>
          {onDuplicate && (
            <button onClick={() => onDuplicate(index)} title="Duplicate Row" className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text3)] transition hover:bg-[var(--bd-bg2)]">
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Insert Below Trigger */}
      <div className="ml-6 mt-1">
        <button
          type="button"
          onClick={() => onInsertBelow(index)}
          className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--bd-text4)] transition hover:text-[var(--bd-indigo)]"
        >
          <Plus className="h-3 w-3" />
          Insert below
        </button>
      </div>
    </div>
  )
}
