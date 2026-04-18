import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  MoveDown,
  MoveUp,
  Plus,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import UnitInput from '@/components/UnitInput'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'
const labelCls =
  'mb-1 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]'
const inputCls =
  'h-11 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#0f172a] shadow-none transition focus:border-[#94a3b8] focus:bg-white focus:ring-0 focus-visible:ring-0'

function MiniButton({ active = false, disabled = false, children, className = '', ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border-[1.5px] px-3 text-[11px] font-extrabold uppercase tracking-[0.04em] transition ${
        active
          ? 'border-[#0f172a] bg-[#0f172a] text-white'
          : 'border-[#e2e8f0] bg-white text-[#475569]'
      } ${disabled ? 'cursor-not-allowed opacity-45' : ''} ${className}`}
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
  customColumns,
  computedAmount,
  groupName = '',
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  onDuplicate,
  isVisible,
  getColumn,
  compact = false,
}) {
  const [showDetails, setShowDetails] = useState(Boolean(item.sub_description))
  const [showImageSlot, setShowImageSlot] = useState(Boolean(item.image_url))
  const [uploading, setUploading] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (item.image_url) setShowImageSlot(true)
  }, [item.image_url])

  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0)
      : null
  })()
  const discountValue = item.discount_rate
  const hasDiscountOverride = discountValue !== null && discountValue !== undefined
  const discountExcluded = discountValue === 0

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setValidationError(null)

    if (!file.type.startsWith('image/')) {
      setValidationError('Please choose an image file.')
      if (event.target) event.target.value = ''
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setValidationError('Image is too large. Use one under 5MB.')
      if (event.target) event.target.value = ''
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
      setShowImageSlot(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: 'Upload failed', description: `Image upload failed: ${message}`, variant: 'destructive' })
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  return (
    <div className={`relative ${compact ? '' : 'mt-3 rounded-[16px] border border-[#e2e8f0] bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]'}`}>
      <div className={`flex items-center justify-between px-3 py-2.5 ${compact ? '' : 'border-b border-[#e2e8f0]'}`}>
        <div className="text-sm font-semibold text-[#0f172a]">{number}</div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMoveUp(index)} disabled={isFirst} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2e8f0] text-[#475569] disabled:opacity-40"><MoveUp className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onMoveDown(index)} disabled={isLast} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2e8f0] text-[#475569] disabled:opacity-40"><MoveDown className="h-3.5 w-3.5" /></button>
          {onDuplicate ? <button type="button" onClick={() => onDuplicate(index)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2e8f0] text-[#475569]"><Copy className="h-3.5 w-3.5" /></button> : null}
          <button type="button" onClick={() => onRemove(index)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#fecaca] text-[#ef4444]"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="space-y-3 p-3 pt-0">
        <div className={`rounded-[14px] border-[1.5px] border-[#e2e8f0] px-3 py-2.5 ${compact ? 'bg-white' : 'bg-[#f8fafc]'}`}>
          <Textarea
            value={item.description || ''}
            onChange={(event) => onUpdate(index, 'description', event.target.value)}
            placeholder="Item description"
            className="min-h-[30px] border-0 bg-transparent px-0 py-0 text-[14px] font-bold text-[#0f172a] shadow-none focus-visible:ring-0"
          />
          {showDetails ? (
            <Input
              value={item.sub_description || ''}
              onChange={(event) => onUpdate(index, 'sub_description', event.target.value)}
              placeholder="Sub-description"
              className="mt-2 h-9 rounded-[10px] border-[#dbe3ee] bg-white text-[13px]"
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MiniButton active={showDetails} onClick={() => setShowDetails((current) => !current)}>
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Sub-desc
          </MiniButton>
          <MiniButton
            className={item.image_url ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#059669]' : ''}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
            Photo
          </MiniButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className={`grid gap-2 ${isVisible('make') && isVisible('unit') ? 'grid-cols-4' : isVisible('make') || isVisible('unit') ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {isVisible('make') ? (
            <div className="min-w-0">
              <label className={labelCls}>Make</label>
              <Input
                value={item.make || ''}
                onChange={(event) => onUpdate(index, 'make', event.target.value)}
                placeholder="Make"
                className={inputCls}
              />
            </div>
          ) : null}

          <div>
            <label className={labelCls}>Qty</label>
            <Input
              type="number"
              min="0"
              value={item.quantity ?? 1}
              onChange={(event) => onUpdate(index, 'quantity', Number(event.target.value))}
              className={`${inputCls} text-center`}
            />
          </div>

          {isVisible('unit') ? (
            <div className="min-w-0">
              <label className={labelCls}>Unit</label>
              <div className="[&>div>input]:h-11 [&>div>input]:rounded-[12px] [&>div>input]:border-[1.5px] [&>div>input]:border-[#e2e8f0] [&>div>input]:bg-[#f8fafc] [&>div>input]:px-3">
                <UnitInput value={item.unit || ''} onChange={(value) => onUpdate(index, 'unit', value)} />
              </div>
            </div>
          ) : null}

          <div className="min-w-0">
            <label className={labelCls}>Unit Price</label>
            <Input
              type="number"
              min="0"
              value={item.unit_price ?? 0}
              onChange={(event) => onUpdate(index, 'unit_price', Number(event.target.value))}
              className={`${inputCls} text-right`}
            />
          </div>
        </div>

        {isVisible('install_rate') ? (
          <div>
            <label className={labelCls}>Install Rate</label>
            <Input
              type="number"
              min="0"
              value={item.install_rate_override ? item.install_rate ?? '' : ''}
              placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : 'Auto formula'}
              onChange={(event) => {
                const value = event.target.value
                onUpdate(
                  index,
                  '__install_rate_override',
                  value === ''
                    ? { install_rate_override: false, install_rate: null }
                    : { install_rate_override: true, install_rate: Number(value) },
                )
              }}
              className={inputCls}
            />
          </div>
        ) : null}

        <div className="rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">
            Amount
          </div>
          <div className="mt-1 text-[24px] font-black leading-none tracking-[-0.03em] text-[#0f172a]">
            {formatCurrency(computedAmount)}
          </div>
        </div>

        {isVisible('vat_rate') || isVisible('discount_rate') ? (
          <div className={`grid gap-2 ${isVisible('vat_rate') && isVisible('discount_rate') ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isVisible('vat_rate') ? (
              <div>
                <label className={labelCls}>VAT %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ''}
                  placeholder={String(invoice.vat || 0)}
                  onChange={(event) => {
                    const value = event.target.value
                    onUpdate(index, 'vat_rate', value === '' ? null : Number(value))
                  }}
                  className={`${inputCls} ${item.vat_rate === 0 ? 'border-[#fca5a5] bg-[#fef2f2] text-[#dc2626]' : ''}`}
                />
              </div>
            ) : null}

            {isVisible('discount_rate') ? (
              <div>
                <label className={labelCls}>Discount %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={hasDiscountOverride ? discountValue : ''}
                  placeholder="global"
                  onChange={(event) => {
                    const value = event.target.value
                    onUpdate(index, 'discount_rate', value === '' ? null : Number(value))
                  }}
                  className={`${inputCls} ${discountExcluded ? 'border-[#fca5a5] bg-[#fef2f2] text-[#dc2626]' : hasDiscountOverride ? 'border-[#fcd34d] bg-[#fffbeb] text-[#b45309]' : ''}`}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {customColumns.filter((column) => column.visible).length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {customColumns
              .filter((column) => column.visible)
              .map((column) => (
                <div key={column.key}>
                  <label className={labelCls}>{column.label}</label>
                  <Input
                    type={column.type === 'number' ? 'number' : 'text'}
                    value={(item.custom_data || {})[column.key] ?? ''}
                    onChange={(event) =>
                      onUpdate(index, 'custom_data', {
                        ...(item.custom_data || {}),
                        [column.key]:
                          column.type === 'number' ? Number(event.target.value) : event.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
              ))}
          </div>
        ) : null}

        {showImageSlot || item.image_url ? (
          <div className="rounded-[16px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Photo</div>
                <div className="mt-0.5 text-[11px] text-[#64748b]">Attach a product reference</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null)
                    fileInputRef.current?.click()
                  }}
                  className="inline-flex h-8 items-center rounded-full border-[1.5px] border-[#e2e8f0] bg-white px-[13px] text-[12px] font-bold text-[#334155]"
                >
                  {item.image_url ? 'Change' : uploading ? 'Uploading...' : 'Upload'}
                </button>
                {item.image_url ? (
                  <button
                    type="button"
                    onClick={() => onUpdate(index, 'image_url', null)}
                    className="inline-flex h-8 items-center rounded-full border-[1.5px] border-[#fecaca] bg-[#fff5f5] px-[13px] text-[12px] font-bold text-[#ef4444]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            {validationError && (
              <div className="mb-3 text-[11px] font-medium text-red-600">
                {validationError}
              </div>
            )}

            {item.image_url ? (
              <img src={item.image_url} alt="Item preview" className="h-20 w-20 rounded-[12px] border border-[#e2e8f0] object-cover" />
            ) : null}
          </div>
        ) : null}
      </div>

      {!compact && (
        <button
          type="button"
          onClick={() => onInsertBelow(index)}
          className="flex w-full items-center justify-center gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] py-3 text-[12px] font-bold text-[#475569]"
        >
          <Plus className="h-4 w-4" />
          Add item below
        </button>
      )}
    </div>
  )
}
