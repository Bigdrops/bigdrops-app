import { useState, type ReactNode } from 'react'
import type { DiscountTiming, DiscountType, ExtraCharge, InvoiceFieldEntry, WhtType } from '@/domain/invoice'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, Percent, Plus, X } from 'lucide-react'
import { formatCurrency } from '@/components/invoice/mobile/mobileFormPrimitives'
import { DocumentSectionHead } from './DocumentFormPresentation'

type CommercialTermsSectionProps = {
  invoice: Record<string, any>
  isQuotation: boolean
  updateInvoice: (field: string, value: unknown) => void
  discountType: DiscountType
  setDiscountType: (value: DiscountType) => void
  discountTiming: DiscountTiming
  setDiscountTiming: (value: DiscountTiming) => void
  whtType: WhtType
  setWhtType: (value: WhtType) => void
  extraCharges: ExtraCharge[]
  onAddExtraCharge: (withTax: boolean) => void
  onUpdateExtraCharge: (id: string | undefined, field: string, value: unknown) => void
  onRemoveExtraCharge: (id: string | undefined) => void
  additionalFields: InvoiceFieldEntry[]
  onAddAdditionalField: () => void
  onUpdateAdditionalField: (id: string | undefined, field: 'label' | 'value', value: string) => void
  onRemoveAdditionalField: (id: string | undefined) => void
}

type OpenSections = {
  discount: boolean
  vat: boolean
  wht: boolean
  fields: boolean
}

function SettingRow({
  id,
  icon,
  title,
  helper,
  value,
  effect,
  tone,
  open,
  onToggle,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  helper: string
  value: string
  effect: string
  tone?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={`bd-setting-row${open ? ' open' : ''}`} data-tcard={id}>
      <button type="button" className="bd-setting-hit" aria-expanded={open} onClick={onToggle} aria-label={`${title} settings`}>
        <span className="bd-setting-ico">{icon}</span>
        <span className="bd-setting-copy"><b>{title}</b><small>{helper}</small></span>
        <span className={`bd-setting-value${tone ? ` ${tone}` : ''}`}><b>{value}</b><small>{effect}</small></span>
        <span className="bd-setting-chev"><ChevronDown /></span>
      </button>
      {open ? <div className="bd-setting-editor">{children}</div> : null}
    </div>
  )
}

export function FormCommercialTerms({
  invoice,
  isQuotation,
  updateInvoice,
  discountType,
  setDiscountType,
  discountTiming,
  setDiscountTiming,
  whtType,
  setWhtType,
  extraCharges,
  onAddExtraCharge,
  onUpdateExtraCharge,
  onRemoveExtraCharge,
  additionalFields,
  onAddAdditionalField,
  onUpdateAdditionalField,
  onRemoveAdditionalField,
}: CommercialTermsSectionProps) {
  const [openSections, setOpenSections] = useState<OpenSections>({
    discount: false,
    vat: false,
    wht: false,
    fields: false,
  })

  const toggleSection = (key: keyof OpenSections) =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }))

  const discountValue = Number(invoice.discount || 0)
  const vatValue = Number(invoice.vat || 0)
  const whtValue = Number(invoice.wht || 0)

  const discountDisplay = discountValue > 0
    ? (discountType === 'percent' ? `${discountValue}%` : formatCurrency(discountValue))
    : '—'
  const discountEffect = discountValue > 0
    ? (discountTiming === 'before' ? 'Before VAT' : 'After VAT')
    : 'Not set'
  const vatDisplay = vatValue > 0 ? `${vatValue}%` : '—'
  const vatEffect = vatValue > 0 ? 'Tax rate' : 'Not set'
  const whtDisplay = whtValue > 0
    ? (whtType === 'percent' ? `${whtValue}%` : formatCurrency(whtValue))
    : '—'
  const whtEffect = whtValue > 0 ? 'Deduction' : 'Not set'

  const taxedCount = extraCharges.filter((charge) => charge.withTax !== false).length
  const chargeCount = extraCharges.length

  return (
    <section className="cps-sec">
      <DocumentSectionHead number="3." title="Commercial terms" meta="Payment · tax · charges" />

      <div className="bd-ux-shell">
        <div className="bd-payment-stage">
          <div className="bd-payment-stage-head">
            <div className="copy">
              <small>Payment</small>
              <b>{isQuotation ? 'When this quotation is due' : 'When this invoice is due'}</b>
            </div>
            <span className="bd-payment-current">{String(invoice.payment_terms || 'Custom')}</span>
          </div>
          <div className="cps-dgrid">
            <div>
              <label className="cps-label">Payment Terms</label>
              <Select
                value={String(invoice.payment_terms || 'Custom')}
                onValueChange={(value) => updateInvoice('payment_terms', value)}
              >
                <SelectTrigger className="cps-field">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Custom">Custom</SelectItem>
                  <SelectItem value="Net 7">Net 7 Days</SelectItem>
                  <SelectItem value="Net 14">Net 14 Days</SelectItem>
                  <SelectItem value="Net 30">Net 30 Days</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="cps-label">Due / Validity Note</label>
              <Input
                value={String(invoice.custom_payment_terms || '')}
                onChange={(event) => updateInvoice('custom_payment_terms', event.target.value)}
                placeholder={isQuotation ? 'e.g. 14 days validity' : 'e.g. Due in 14 days'}
                className="cps-field"
              />
            </div>
          </div>
        </div>

        <div className="bd-commercial-split">
          <div className="bd-ux-block">
            <div className="bd-ux-block-head">
              <div className="bd-ux-block-title">
                <small>Pricing logic</small>
                <b>Tax &amp; adjustments</b>
                <span>Closed rows still show the active value and its effect.</span>
              </div>
              <span className="bd-ux-count">3 controls</span>
            </div>

            <SettingRow
              id="discount"
              icon={<Percent />}
              title="Discount"
              helper={discountValue > 0 ? 'Invoice-level discount is active' : 'Optional invoice-level reduction'}
              value={discountDisplay}
              effect={discountEffect}
              tone="disc"
              open={openSections.discount}
              onToggle={() => toggleSection('discount')}
            >
              <div className="cps-dgrid">
                <div>
                  <label className="cps-label">Discount value</label>
                  <NumericInput
                    min={0}
                    value={discountValue}
                    onChange={(val) => updateInvoice('discount', val)}
                    className="cps-field mono"
                  />
                </div>
                <div>
                  <label className="cps-label">Type</label>
                  <div className="bd-seg">
                    <button type="button" className={discountType === 'fixed' ? 'on' : ''} onClick={() => setDiscountType('fixed')}>NGN</button>
                    <button type="button" className={discountType === 'percent' ? 'on' : ''} onClick={() => setDiscountType('percent')}>%</button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="cps-label">When discount reduces tax</label>
                <div className="bd-seg">
                  <button type="button" className={discountTiming === 'before' ? 'on' : ''} onClick={() => setDiscountTiming('before')}>Before VAT</button>
                  <button type="button" className={discountTiming === 'after' ? 'on' : ''} onClick={() => setDiscountTiming('after')}>After VAT</button>
                </div>
              </div>
              <span className="bd-setting-help">This choice remains visible in the collapsed row so the tax effect is never hidden.</span>
            </SettingRow>

            <SettingRow
              id="vat"
              icon={<Percent />}
              title="VAT"
              helper="Applies to taxable lines and taxable charges"
              value={vatDisplay}
              effect={vatEffect}
              tone="tax"
              open={openSections.vat}
              onToggle={() => toggleSection('vat')}
            >
              <div>
                <label className="cps-label">VAT rate (%)</label>
                <NumericInput
                  min={0}
                  value={vatValue}
                  onChange={(val) => updateInvoice('vat', val)}
                  className="cps-field mono"
                />
              </div>
              <span className="bd-setting-help">Applied to taxable item lines and Additional Charges marked VAT applies. A line VAT override still takes priority.</span>
            </SettingRow>

            <SettingRow
              id="wht"
              icon={<Percent />}
              title="Withholding Tax (WHT)"
              helper="Deducted after the invoice total is calculated"
              value={whtDisplay}
              effect={whtEffect}
              tone="wht"
              open={openSections.wht}
              onToggle={() => toggleSection('wht')}
            >
              <div className="cps-dgrid">
                <div>
                  <label className="cps-label">WHT value</label>
                  <NumericInput
                    min={0}
                    value={whtValue}
                    onChange={(val) => updateInvoice('wht', val)}
                    className="cps-field mono"
                  />
                </div>
                <div>
                  <label className="cps-label">Type</label>
                  <div className="bd-seg">
                    <button type="button" className={whtType === 'percent' ? 'on' : ''} onClick={() => setWhtType('percent')}>%</button>
                    <button type="button" className={whtType === 'fixed' ? 'on' : ''} onClick={() => setWhtType('fixed')}>NGN</button>
                  </div>
                </div>
              </div>
              <span className="bd-setting-help">WHT is deducted from the amount payable. It is not presented as another VAT-like charge.</span>
            </SettingRow>
          </div>

          <div className="bd-ux-block">
            <div className="bd-ux-block-head">
              <div className="bd-ux-block-title">
                <small>Invoice additions</small>
                <b>Additional charges</b>
                <span>{chargeCount ? `${taxedCount} taxable · ${chargeCount - taxedCount} non-taxable` : 'No additional charges'}</span>
              </div>
              <span className="bd-ux-count">{chargeCount}</span>
            </div>
            <div className="bd-charge-ledger">
              {extraCharges.length === 0 ? (
                <div className="cps-empty" style={{ margin: 0 }}>No additional charges yet.</div>
              ) : null}
              {extraCharges.map((charge) => {
                const taxed = charge.withTax !== false
                return (
                  <div key={charge.id} className={`bd-charge-entry${taxed ? ' taxable' : ' untaxed'}`}>
                    <div className="bd-charge-inputs">
                      <Input
                        value={String(charge.label || '')}
                        onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)}
                        placeholder="Charge label"
                        aria-label="Charge label"
                        className="cps-field"
                      />
                      <NumericInput
                        min={0}
                        value={Number(charge.value || 0)}
                        onChange={(val) => onUpdateExtraCharge(charge.id, 'value', val)}
                        aria-label="Charge amount"
                        className="cps-field mono"
                      />
                      <button
                        type="button"
                        className="cdel"
                        onClick={() => onRemoveExtraCharge(charge.id)}
                        aria-label="Remove charge"
                      >
                        <X />
                      </button>
                    </div>
                    <div className="bd-charge-effect">
                      <span className="bd-effect-copy">
                        <b>{taxed ? 'VAT applies' : 'No VAT'}</b>
                        <small>{taxed ? 'Included in the VAT base' : 'Added after VAT'}</small>
                      </span>
                      <span className="bd-tax-choice" role="group" aria-label={`Tax treatment for ${charge.label || 'charge'}`}>
                        <button
                          type="button"
                          className={taxed ? 'on taxed' : ''}
                          onClick={() => onUpdateExtraCharge(charge.id, 'withTax', true)}
                        >
                          VAT
                        </button>
                        <button
                          type="button"
                          className={!taxed ? 'on untaxed' : ''}
                          onClick={() => onUpdateExtraCharge(charge.id, 'withTax', false)}
                        >
                          No VAT
                        </button>
                      </span>
                    </div>
                  </div>
                )
              })}
              <button type="button" className="bd-ledger-add" onClick={() => onAddExtraCharge(true)}>
                + Add charge
              </button>
            </div>
          </div>
        </div>

        <div className="bd-ux-block">
          <div className="bd-ux-block-head">
            <div className="bd-ux-block-title">
              <small>Secondary</small>
              <b>Other commercial details</b>
              <span>Less-used controls stay available without competing with tax and charges.</span>
            </div>
          </div>
          <SettingRow
            id="fields"
            icon={<Plus />}
            title="Additional fields"
            helper="Extra document information only"
            value={additionalFields.length ? String(additionalFields.length) : '—'}
            effect={additionalFields.length ? 'Document only' : 'None'}
            open={openSections.fields}
            onToggle={() => toggleSection('fields')}
          >
              {additionalFields.map((field) => (
                <div key={field.id} className="bd-afield-row">
                  <Input
                    value={String(field.label || '')}
                    onChange={(event) => onUpdateAdditionalField(field.id, 'label', event.target.value)}
                    placeholder="Field label"
                    aria-label="Field label"
                    className="cps-field"
                  />
                  <Input
                    value={String(field.value || '')}
                    onChange={(event) => onUpdateAdditionalField(field.id, 'value', event.target.value)}
                    placeholder="Value"
                    aria-label="Field value"
                    className="cps-field"
                  />
                  <button
                    type="button"
                    className="adel"
                    onClick={() => onRemoveAdditionalField(field.id)}
                    aria-label="Remove field"
                  >
                    <X />
                  </button>
                </div>
              ))}
              <button type="button" className="bd-addrowbtn" onClick={onAddAdditionalField}>
                + Add document field
              </button>
              <span className="bd-setting-help">Document fields are informational. They do not affect subtotal, VAT, WHT, or payable amount.</span>
            </SettingRow>
        </div>
      </div>
    </section>
  )
}
