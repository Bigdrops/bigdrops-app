import * as React from 'react'
import { memo, useEffect, useId, useRef, useState } from 'react'
import {
  AlignLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Textarea } from '@/components/ui/textarea'
import { feedback } from '@/lib/feedback'
import UnitInput from '@/components/UnitInput'
import { useItemSuggestionEngine } from '@/modules/item-library/hooks/useItemSuggestionEngine'
import { getRecognizedHistoryPriceActionValue } from '@/modules/item-library/domain/invoiceSuggestionPriceContext'
import { normalizeQuantity } from '@/domain/invoice'
import { formatNaira } from '@/lib/formatters/money'
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile, getUnsupportedImageErrorMessage } from '@/lib/documentImageUploadPolicy'
import { ITEM_FIELD_POLICY, type ItemContext } from '@/components/shared/itemFieldPolicy'
import type { InvoiceItem } from '@/domain/invoice/types'
import type { ItemSuggestion } from '@/modules/item-library/types'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'

function getSuggestionPriceLabel(suggestion: ItemSuggestion) {
  const clientPrice = suggestion.last_price_for_client
  if (clientPrice !== null && clientPrice !== undefined) {
    return {
      label: 'Client last',
      value: formatNaira(clientPrice),
    }
  }

  const globalPrice = suggestion.last_price_global ?? suggestion.last_sold_price
  if (globalPrice !== null && globalPrice !== undefined) {
    return {
      label: 'Last used',
      value: formatNaira(globalPrice),
    }
  }

  if (suggestion.standard_price !== null && suggestion.standard_price !== undefined) {
    return {
      label: 'Standard',
      value: formatNaira(suggestion.standard_price),
    }
  }

  return {
    label: 'No price',
    value: '-',
  }
}

function getSuggestionMeta(suggestion: ItemSuggestion) {
  const parts: string[] = []
  if (suggestion.match_source === 'alias' && suggestion.matched_text && suggestion.matched_text !== suggestion.name) {
    parts.push(`Alias: ${suggestion.matched_text}`)
  }
  if (suggestion.usage_count) parts.push(`${Number(suggestion.usage_count).toLocaleString()} uses`)
  if (suggestion.last_source_document_number) parts.push(suggestion.last_source_document_number)
  return parts.join(' - ')
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
  onUngroup?: (index: number) => void
  isVisible: (field: string) => boolean
  getColumn: (field: string) => any
  compact?: boolean
  dragHandleProps?: Record<string, any>
}

function MobileItemCard({
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
  onUngroup = undefined,
  isVisible,
  getColumn,
  compact = false,
  dragHandleProps,
}: MobileItemCardProps) {
  const [showDetails, setShowDetails] = useState(Boolean(item.sub_description))
  const [uploading, setUploading] = useState(false)
  const [descriptionFocused, setDescriptionFocused] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const suggestionRootRef = useRef<HTMLDivElement>(null)
  const suggestionListId = useId()

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

  const suggestionQuery =
    enableItemSuggestions && descriptionFocused && String(item.description || '').trim().length >= 2
      ? item.description || ''
      : ''

  const {
    suggestions,
    suggestionsLoading,
    exactMatch,
    priceContext,
    priceContextText,
    selectionSource,
    recognizeExactMatch,
    handleSuggestionSelect: engineSelect,
    clearSelection,
  } = useItemSuggestionEngine(
    suggestionQuery,
    invoice?.client_id,
    enableItemSuggestions,
    descriptionFocused,
    item.row_type,
  )

  useEffect(() => {
    if (!enableItemSuggestions) return
    if (item.row_type && item.row_type !== 'standard') return
    if (resolvedItemId) return
    if (!exactMatch?.item_id) return

    recognizeExactMatch(exactMatch)
    updateField('item_id', exactMatch.item_id)
  }, [exactMatch, enableItemSuggestions, index, item.description, recognizeExactMatch, resolvedItemId, item.row_type, onUpdate])

  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)
      : null
  })()

  const showSuggestions =
    enableItemSuggestions && descriptionFocused && String(item.description || '').trim().length >= 2
  const hasSuggestionPanel = showSuggestions && (suggestionsLoading || suggestions.length > 0)
  const activeSuggestion = suggestions[activeSuggestionIndex] || null
  const usableHistoryPrice = getRecognizedHistoryPriceActionValue({
    itemId: resolvedItemId,
    priceContext,
    selectionSource,
    unitPrice: item.unit_price,
  })

  const openSuggestionInteraction = () => {
    setDescriptionFocused(true)
    setActiveSuggestionIndex(0)
  }

  const isInsideSuggestionBoundary = (target: EventTarget | null) => {
    if (!(target instanceof Node)) return false
    return Boolean(suggestionRootRef.current?.contains(target))
  }

  useEffect(() => {
    setActiveSuggestionIndex(0)
  }, [item.description, suggestions.length])

  useEffect(() => {
    if (!hasSuggestionPanel) return

    const handlePointerDown = (event: PointerEvent) => {
      if (isInsideSuggestionBoundary(event.target)) return
      setDescriptionFocused(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDescriptionFocused(false)
      }
    }

    const handleScroll = (event: Event) => {
      if (isInsideSuggestionBoundary(event.target)) return
      setDescriptionFocused(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [hasSuggestionPanel])

  const handleDescriptionBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const nextFocusedElement = event.relatedTarget
    if (isInsideSuggestionBoundary(nextFocusedElement)) return
    setDescriptionFocused(false)
  }

  const handleDescriptionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!hasSuggestionPanel) return

    if (event.key === 'Escape') {
      event.preventDefault()
      setDescriptionFocused(false)
      return
    }

    if (suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestionIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
      return
    }

    if (event.key === 'Enter' && activeSuggestion) {
      event.preventDefault()
      handleSuggestionSelect(activeSuggestion)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isSupportedImageFile(file)) {
      feedback.error('Unsupported file', { description: getUnsupportedImageErrorMessage(file.name) })
      return
    }

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
    const selection = engineSelect(suggestion)
    onUpdate(index, 'description', selection.description)
    updateField('item_id', selection.item_id)
    if (ctx !== 'waybill') {
      onUpdate(index, 'unit_price', selection.unit_price)
    }
    setDescriptionFocused(false)
  }

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextDescription = event.target.value
    onUpdate(index, 'description', nextDescription)
    setDescriptionFocused(true)
    if (resolvedItemId) {
      updateField('item_id', null)
      clearSelection()
    }
  }

  const hasSub = Boolean(item.sub_description?.trim())

  return (
    <article className={`cps-item${item.image_url ? ' has-photo' : ''}`}>
      <button
        type="button"
        className="cps-ear"
        title="Remove item"
        aria-label={`Remove item ${number}`}
        onClick={() => onRemove(index)}
      >
        <X />
      </button>

      <div className="cps-ihead">
        <div className="cps-row-rail">
          <span className="cps-idx" {...(dragHandleProps || {})}>{number}</span>
          <div className="cps-rmid">
            <button
              type="button"
              className="cps-rbtn"
              title="Move up"
              aria-label="Move up"
              disabled={isFirst}
              onClick={() => onMoveUp(index)}
            >
              <ChevronUp />
            </button>
            <button
              type="button"
              className="cps-rbtn"
              title="Move down"
              aria-label="Move down"
              disabled={isLast}
              onClick={() => onMoveDown(index)}
            >
              <ChevronDown />
            </button>
          </div>
          {onDuplicate && (
            <button
              type="button"
              className="cps-rbtn"
              title="Duplicate item"
              aria-label="Duplicate item"
              onClick={() => onDuplicate(index)}
            >
              <Copy />
            </button>
          )}
        </div>

        <div className="cps-idesc">
          {/* Main Description */}
          <div className="relative">
            <div ref={suggestionRootRef}>
              <Textarea
                value={item.description || ''}
                onChange={handleDescriptionChange}
                onPointerDown={openSuggestionInteraction}
                onFocus={openSuggestionInteraction}
                onBlur={handleDescriptionBlur}
                onKeyDown={handleDescriptionKeyDown}
                placeholder="Item description..."
                role={enableItemSuggestions ? 'combobox' : undefined}
                aria-autocomplete={enableItemSuggestions ? 'list' : undefined}
                aria-expanded={hasSuggestionPanel}
                aria-controls={hasSuggestionPanel ? suggestionListId : undefined}
                aria-activedescendant={activeSuggestion ? `${suggestionListId}-${activeSuggestionIndex}` : undefined}
                className="cps-field cps-desc"
              />
            {hasSuggestionPanel && (
              <div
                id={suggestionListId}
                role="listbox"
                aria-label="Item suggestions"
                className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-[min(13rem,calc(100dvh-14rem))] overflow-y-auto overscroll-contain rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg text-bd-text shadow-[0_8px_24px_rgba(15,23,42,0.18)] ring-1 ring-bd-border/60 dark:shadow-[0_14px_32px_rgba(0,0,0,0.45)]"
              >
                {suggestionsLoading ? (
                  <div className="p-3 text-xs font-semibold text-bd-text-muted">Loading suggestions...</div>
                ) : (
                  suggestions.map((suggestion, suggestionIndex) => {
                    const price = getSuggestionPriceLabel(suggestion)
                    const meta = getSuggestionMeta(suggestion)
                    const isActive = suggestionIndex === activeSuggestionIndex

                    return (
                    <button
                      key={`${suggestion.item_id}-${suggestion.name}`}
                      id={`${suggestionListId}-${suggestionIndex}`}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      className={[
                        'flex min-h-12 w-full items-center justify-between gap-3 border-b border-bd-border px-3 py-2.5 text-left last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-focus-ring',
                        isActive ? 'bg-bd-surface-muted text-bd-text' : 'bg-bd-card-bg text-bd-text hover:bg-bd-surface-muted',
                      ].join(' ')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      onMouseEnter={() => setActiveSuggestionIndex(suggestionIndex)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold">{suggestion.name}</div>
                        {meta ? (
                          <div className="mt-0.5 truncate text-[10px] font-semibold text-bd-text-muted">{meta}</div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[12px] font-extrabold text-bd-button-primary-bg">{price.value}</div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-bd-text-muted">{price.label}</div>
                      </div>
                    </button>
                  )})
                )}
                {!suggestionsLoading && suggestions.length > 4 ? (
                  <div className="border-t border-bd-border bg-bd-card-bg px-3 py-2 text-[10px] font-semibold text-bd-text-muted">
                    Use arrow keys or scroll for {suggestions.length - 4} more match{suggestions.length - 4 === 1 ? '' : 'es'}.
                  </div>
                ) : null}
              </div>
            )}
            </div>
            {resolvedItemId && priceContextText ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium leading-relaxed text-[var(--bd-text3)]">
                <span className="whitespace-pre-line">{priceContextText}</span>
                {usableHistoryPrice !== null ? (
                  <button
                    type="button"
                    className="inline-flex h-7 items-center rounded-[7px] border border-bd-border bg-bd-surface px-2 text-[10px] font-bold text-bd-text transition hover:bg-bd-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-focus-ring"
                    onClick={() => onUpdate(index, 'unit_price', usableHistoryPrice)}
                  >
                    Use {formatNaira(usableHistoryPrice)}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={`cps-subrow${hasSub ? ' has' : ''}${showDetails ? ' open' : ''}`}>
            <button
              type="button"
              className={`cps-subtog${hasSub ? '' : ' sub-add'}`}
              aria-expanded={showDetails}
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="stog-icon">{hasSub ? <AlignLeft /> : <Plus />}</span>
              {hasSub ? (
                <span className="stog-label">
                  <span className="sub-prev-text">{item.sub_description?.trim()}</span>
                </span>
              ) : (
                <span className="stog-label">Add sub description</span>
              )}
              <span className="stog-chev"><ChevronDown /></span>
            </button>
            {showDetails ? (
              <Textarea
                placeholder="Sub description — extra detail under the main description..."
                value={item.sub_description || ''}
                onChange={(e) => onUpdate(index, 'sub_description', e.target.value)}
                className="cps-field cps-subfield"
              />
            ) : null}
          </div>

          {isVisible('make') && (
            <input
              className="cps-field"
              placeholder="Make / brand"
              value={(item.make as string) || ''}
              onChange={(e) => onUpdate(index, 'make', e.target.value)}
              aria-label={`Make or brand for item ${number}`}
            />
          )}

          {item.image_url ? (
            <span className="cps-thumb">
              <img src={item.image_url} alt="Item photo" />
              <button
                type="button"
                className="cps-photo-x"
                title="Remove photo"
                aria-label="Remove photo"
                onClick={() => onUpdate(index, 'image_url', null)}
              >
                <X />
              </button>
            </span>
          ) : (
            <label className="cps-cam">
              {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
              Photo
              <input
                type="file"
                accept={IMAGE_ACCEPT_ATTRIBUTE}
                className="sr-only"
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>
      </div>

      <div className="cps-idata">
          <div className="cps-fgrid">
            {isVisible('quantity') && (
            <NumericInput min={1} value={(item.quantity as number) ?? 1} onChange={(val) => onUpdate(index, 'quantity', normalizeQuantity(val, 1))} placeholder="Qty *" aria-label={`Quantity for item ${number}`} className="cps-field mono" />
            )}
            {isVisible('unit') && (
              <UnitInput value={(item.unit as string) || ''} onChange={(val: string) => onUpdate(index, 'unit', val)} />
            )}
          </div>

          <div className="cps-comm-grid">
            {isVisible('unit_price') && (
            <label className="cps-cfield sell">
              <span className="cf-lab">Rate</span>
              <NumericInput value={(item.unit_price as number) ?? 0} onChange={(val) => onUpdate(index, 'unit_price', val)} aria-label={`Rate for item ${number}`} className="cps-field mono" />
            </label>
            )}
            {isVisible('amount') && (
            <div className="cps-cfield sell">
              <span className="cf-lab">Subtotal</span>
              <div className="cps-fcell tsp bd-result" aria-label={`Subtotal for item ${number}`}>
                <b>{formatNaira(computedAmount)}</b>
              </div>
            </div>
            )}
          </div>

          <div className="cps-fgrid">
            {isVisible('partNo') && (
              <label className="cps-cfield">
                <span className="cf-lab">Part No.</span>
                <Input value={(item.partNo as string) || ''} onChange={(e) => onUpdate(index, 'partNo', e.target.value)} className="cps-field" />
              </label>
            )}
            {isVisible('condition') && (
              <label className="cps-cfield">
                <span className="cf-lab">Condition</span>
                <Input value={(item.condition as string) || ''} onChange={(e) => onUpdate(index, 'condition', e.target.value)} className="cps-field" />
              </label>
            )}

            {isVisible('install_rate') && (
              <label className="cps-cfield">
                <span className="cf-lab">{getColumn('install_rate')?.label || 'Install'}</span>
                <NumericInput
                  value={item.install_rate_override ? (item.install_rate as number) ?? '' : ''}
                  placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : 'Auto'}
                  onChange={(val) => {
                    onUpdate(index, '__install_rate_override', val === 0 ? { install_rate_override: false, install_rate: null } : { install_rate_override: true, install_rate: val })
                  }}
                  className="cps-field"
                />
              </label>
            )}

            {isVisible('vat_rate') && (
              <label className="cps-cfield">
                <span className="cf-lab">{getColumn('vat_rate')?.label || 'VAT %'}</span>
                <NumericInput
                  value={(item.vat_rate as number) ?? ''}
                  placeholder="0"
                  onChange={(val) => onUpdate(index, 'vat_rate', val === 0 ? null : val)}
                  className="cps-field"
                />
              </label>
            )}

            {isVisible('discount_rate') && (
              <label className="cps-cfield">
                <span className="cf-lab">{getColumn('discount_rate')?.label || 'Disc %'}</span>
                <NumericInput
                  value={(item.discount_rate as number) ?? ''}
                  placeholder="0"
                  onChange={(val) => onUpdate(index, 'discount_rate', val === 0 ? null : val)}
                  className="cps-field"
                />
              </label>
            )}

            {/* Custom Columns */}
            {customColumns?.map((col: any) => {
              if (!isVisible(col.key)) return null
              const val = (item.custom_data || {})[col.key] ?? ''
              return (
                <label key={col.key} className="cps-cfield">
                  <span className="cf-lab">{col.label}</span>
                  {col.type === 'number' ? (
                    <NumericInput
                      value={val}
                      onChange={(nextVal) => {
                        onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: nextVal })
                      }}
                      className="cps-field"
                    />
                  ) : (
                    <Input
                      value={val}
                      onChange={(e) => {
                        onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: e.target.value })
                      }}
                      className="cps-field"
                    />
                  )}
                </label>
              )
            })}
          </div>
      </div>

      {onUngroup && item.group_id && (
        <button
          type="button"
          onClick={() => onUngroup(index)}
          className="cps-ins"
        >
          − Remove from group
        </button>
      )}
      <button
        type="button"
        onClick={() => onInsertBelow(index)}
        className="cps-ins"
      >
        + Insert below
      </button>
    </article>
  )
}

function itemCardAreEqual(prevProps: MobileItemCardProps, nextProps: MobileItemCardProps) {
  if (prevProps.index !== nextProps.index) return false
  if (prevProps.number !== nextProps.number) return false
  if (prevProps.computedAmount !== nextProps.computedAmount) return false
  if (prevProps.isFirst !== nextProps.isFirst) return false
  if (prevProps.isLast !== nextProps.isLast) return false
  if (prevProps.compact !== nextProps.compact) return false
  if (prevProps.context !== nextProps.context) return false
  if (prevProps.enableItemSuggestions !== nextProps.enableItemSuggestions) return false

  if (prevProps.onUpdate !== nextProps.onUpdate) return false
  if (prevProps.onRemove !== nextProps.onRemove) return false
  if (prevProps.onMoveUp !== nextProps.onMoveUp) return false
  if (prevProps.onMoveDown !== nextProps.onMoveDown) return false
  if (prevProps.onInsertBelow !== nextProps.onInsertBelow) return false
  if (prevProps.onDuplicate !== nextProps.onDuplicate) return false
  if (prevProps.onUngroup !== nextProps.onUngroup) return false
  if (prevProps.isVisible !== nextProps.isVisible) return false
  if (prevProps.getColumn !== nextProps.getColumn) return false

  if (prevProps.invoice !== nextProps.invoice) return false
  if (JSON.stringify(prevProps.customColumns) !== JSON.stringify(nextProps.customColumns)) return false

  const a = prevProps.item
  const b = nextProps.item
  if (a._uiKey !== b._uiKey || a.id !== b.id || a.item_id !== b.item_id) return false
  if (a.description !== b.description) return false
  if (a.sub_description !== b.sub_description) return false
  if (a.quantity !== b.quantity) return false
  if (a.unit !== b.unit) return false
  if (a.unit_price !== b.unit_price) return false
  if (a.vat_rate !== b.vat_rate) return false
  if (a.discount_rate !== b.discount_rate) return false
  if (a.row_type !== b.row_type) return false
  if (a.image_url !== b.image_url) return false
  if (a.group_id !== b.group_id) return false
  if (a.make !== b.make) return false
  if (a.partNo !== b.partNo) return false
  if (a.condition !== b.condition) return false
  if (a.install_rate !== b.install_rate) return false
  if (a.install_rate_override !== b.install_rate_override) return false
  if (JSON.stringify(a.custom_data) !== JSON.stringify(b.custom_data)) return false

  return true
}

export default memo(MobileItemCard, itemCardAreEqual)
