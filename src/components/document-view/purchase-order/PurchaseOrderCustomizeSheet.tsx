/**
 * Purchase Order — Customize sheet (production).
 *
 * Uses the same global BOURXE customization surface as the other commercial
 * document families (DocumentCustomizeCard + CommercialTemplatePicker backed
 * by the PDF Customization Engine at family key 'purchase_order').
 *
 * Scope honesty:
 *  - Template selection drives the PDFs generated during this visit (session
 *    state in the caller). purchase_orders has no PDF preferences column, so
 *    per-document template persistence is unavailable without a schema change.
 *  - Compact Layout toggle feeds the PDF generator's compact flag.
 *  - Amount-in-words and Signature-block toggles control on-screen blocks only.
 *  - Accent colour / document font are hidden: PO templates render with
 *    intrinsic palettes (same policy as every intrinsic Commercial template).
 */

import React from 'react'
import { RotateCcw } from 'lucide-react'

import DocumentSheet from '../shared/DocumentSheet'
import DocumentCustomizeCard from '../shared/DocumentCustomizeCard'
import CommercialTemplatePicker from '../shared/CommercialTemplatePicker'
import { usePdfCustomization } from '@/domain/pdf/customization/hooks'
import { COMMERCIAL_TEMPLATE_DEFAULTS, COMMERCIAL_CAPABILITIES, COMMERCIAL_POLICY } from '@/domain/pdf/customization/commercial'
import { cn } from '@/lib/utils'
import localStyles from './PurchaseOrderView.module.css'

export type PoCustomizeState = {
  templateId: string
  compact: boolean
  showAmountInWords: boolean
  showSignatories: boolean
}

export const DEFAULT_PO_CUSTOMIZE: PoCustomizeState = {
  templateId: 'industry',
  compact: false,
  showAmountInWords: true,
  showSignatories: true,
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description?: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-bd-border bg-bd-card-bg px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-bd-text">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-bd-text-muted">{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className={cn(
          'relative ml-3 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-bd-brand',
          checked ? 'bg-bd-brand' : 'bg-bd-border',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-bd-card-bg shadow-md transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}

export default function PurchaseOrderCustomizeSheet({
  open,
  onClose,
  value,
  onChange,
  onReset,
}: {
  open: boolean
  onClose: () => void
  value: PoCustomizeState
  onChange: (next: PoCustomizeState) => void
  onReset: () => void
}) {
  const { customization, setDocumentFont, setAccentColor, setAccentEnabled, setInkFont, setInkColour } =
    usePdfCustomization({
      // PO-local engine bucket (isolated from invoice/quotation settings).
      documentFamily: 'purchase_order',
      templateDefaults: COMMERCIAL_TEMPLATE_DEFAULTS,
      capabilities: COMMERCIAL_CAPABILITIES,
      policy: COMMERCIAL_POLICY,
    })

  const set = (patch: Partial<PoCustomizeState>) => onChange({ ...value, ...patch })

  return (
    <DocumentSheet
      open={open}
      title="Customize document"
      subtitle="Purchase order · local preview settings"
      onClose={onClose}
    >
      <div className={localStyles.sheetBody}>
        {/* Amount in words — on-screen toggle */}
        <ToggleRow
          label="Amount in words"
          description="Spelled-out naira amount under the totals"
          checked={value.showAmountInWords}
          onToggle={() => set({ showAmountInWords: !value.showAmountInWords })}
        />
        <div className="h-2" />
        <ToggleRow
          label="Signature blocks"
          description="Procurement authorisation and receipt blocks in the preview"
          checked={value.showSignatories}
          onToggle={() => set({ showSignatories: !value.showSignatories })}
        />

        <div className="mt-4" />

        <DocumentCustomizeCard
          customization={customization}
          setDocumentFont={setDocumentFont}
          setInkFont={setInkFont}
          setInkColour={setInkColour}
          templatePicker={
            <CommercialTemplatePicker
              value={value.templateId}
              onChange={(id) => set({ templateId: id })}
            />
          }
          colorSwatches={[]}
          customColor="auto"
          onCustomColorChange={() => undefined}
          handwritingFonts={[]}
          customFont="auto"
          onCustomFontChange={() => undefined}
          showAccentColor={false}
          showDocumentFont={false}
          showCompact
          compact={value.compact}
          onCompactChange={(compact) => set({ compact })}
          onSave={() => onClose()}
        />

        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-bd-text-muted hover:text-bd-text"
        >
          <RotateCcw size={12} aria-hidden="true" /> Reset to defaults
        </button>

        <div className={localStyles.sheetNote}>
          Template and Compact Layout apply to PDFs generated during this visit. accent / font
          customization is hidden because PO templates render intrinsic palettes. Engine settings are
          stored on this device under the purchase-order family bucket; per-document template persistence
          requires a purchase_orders PDF preferences column and is out of scope.
        </div>
      </div>
    </DocumentSheet>
  )
}
