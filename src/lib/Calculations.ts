/**
 * src/lib/calculations.ts  — v3
 *
 * Single source of truth for all document financial math.
 * Shared by: NewInvoice, EditInvoice, NewQuotation, EditQuotation,
 *            all preview/detail screens, all PDF templates.
 *
 * ─── BUSINESS RULES (explicit, no guessing) ───────────────────────────────
 *
 * taxableBase
 *   Precise sum of the actual VAT bases that were truly taxed, row by row.
 *   Respects install_rate_taxable per row. Not approximate.
 *
 * Fixed discount before_tax
 *   Distributed proportionally across eligible taxable rows.
 *   Each row's VAT base is reduced by its allocated discount share.
 *   VAT is then computed from each row's effective rate on its reduced base.
 *   Correct for mixed row VAT behavior (overrides, exempt rows, taxable install).
 *
 * WHT base
 *   Total Contract Value - VAT
 *   WHT must not be applied on VAT itself.
 *
 * ─── SOURCE RULES ─────────────────────────────────────────────────────────
 *
 * Raw rate inputs come from cf.calculationInputs first.
 * document.vat / document.discount / document.wht are COMPUTED TOTALS.
 * They are NEVER used as rate inputs.
 *
 * null = no row override, inherit document-level setting
 * 0    = explicit override to zero (not the same as null)
 */

import Decimal from 'decimal.js'
import { normalizeQuantity } from '@/domain/invoice/normalize'
import { normalizeVisibilityMode } from '@/domain/invoice/columns'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DiscountType   = 'fixed' | 'percent'
export type DiscountTiming = 'before_tax' | 'after_tax'
export type WhtType        = 'fixed' | 'percent'

export interface InputItem {
  id?:          string
  row_type?:    'standard' | 'group_header'
  group_id?:    string | null
  group_name?:  string | null
  description?: string
  quantity:     number | string
  unit_price:   number | string
  // Row-level overrides
  // null = inherit document-level setting
  // 0    = explicit zero for this row
  install_rate?:         number | null
  install_rate_taxable?: boolean       // does this row's install rate attract VAT?
  vat_rate?:             number | null // percent e.g. 7.5; null = inherit global
  discount_rate?:        number | null // percent; null = inherit global
}

export interface ExtraCharge {
  label:         string
  value:         number | string
  vatApplicable: boolean
}

export interface VisibleRowEffects {
  install: boolean
  vat: boolean
  discount: boolean
}

export interface DocumentInput {
  items:            InputItem[]
  globalVatPercent: number        // rate e.g. 7.5 — NOT a stored computed total
  discountType:     DiscountType
  discountTiming:   DiscountTiming
  discountValue:    number        // raw user input — NOT stored computed total
  whtType:          WhtType
  whtValue:         number        // raw user input — NOT stored computed total
  extraCharges:     ExtraCharge[]
  visibleRowEffects: VisibleRowEffects
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ComputedItem {
  id?:                      string
  row_type:                 'standard' | 'group_header'
  group_id:                 string | null
  group_name:               string | null
  description?:             string
  quantity:                 number
  unit_price:               number
  install_rate:             number
  install_rate_taxable:     boolean
  effective_vat_rate:       number
  inherits_global_discount: boolean
  effective_discount_rate:  number    // resolved percent (0 if none)
  line_subtotal:            number    // qty × unit_price
  line_install:             number
  line_vat_base:            number    // the base that VAT was actually applied to
  line_discount:            number    // discount amount applied to this row
  line_vat:                 number    // VAT amount for this row
  line_total:               number
  visible_line_total:       number
}

export interface ComputedGroup {
  group_id:     string
  group_name:   string
  subtotal:     number
  installTotal: number
}

export interface DocumentResult {
  items:             ComputedItem[]
  groups:            ComputedGroup[]
  subtotal:          number   // sum of line_subtotal (all standard rows)
  installRateTotal:  number   // sum of all row install amounts
  extraChargesTotal: number   // sum of all extra charge values
  taxableBase:       number   // PRECISE: sum of actual VAT bases truly taxed
  discount:          number   // total discount amount
  discountPercentEquivalent: number   // display-only equivalent %; never used as a calc input
  vat:               number   // total VAT amount
  wht:               number   // total WHT amount
  grandTotal:        number   // total before WHT
  totalPayable:      number   // final amount due
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateDocument(input: DocumentInput): DocumentResult {
  const {
    items,
    globalVatPercent,
    discountType,
    discountTiming,
    discountValue,
    whtType,
    whtValue,
    extraCharges,
    visibleRowEffects,
  } = input

  const D = (v: number | string | null | undefined): Decimal =>
    new Decimal(v == null ? 0 : v)

  const globalVat = D(globalVatPercent)

  // ── 1. First pass: compute raw row values (before any fixed discount) ─────
  //
  // We need this pass to know each row's line_subtotal and taxability
  // before distributing a fixed discount.

  interface RowPass1 {
    item:                InputItem
    lineSubtotal:        Decimal
    lineInstall:         Decimal
    installTaxable:      boolean
    effectiveVatRate:    Decimal
    inheritsGlobal:      boolean
    // VAT base BEFORE fixed discount is applied (used for proportional allocation)
    preDiscountVatBase:  Decimal
    // Whether this row is eligible for fixed discount allocation
    // (only rows with taxable VAT base and inheriting global discount)
    fixedDiscountEligible: boolean
  }

  const pass1: RowPass1[] = []
  let docSubtotal     = new Decimal(0)
  let docInstallTotal = new Decimal(0)
  let eligibleVatBase = new Decimal(0) // sum of pre-discount VAT bases for eligible rows

  for (const item of items) {
    if (item.row_type === 'group_header') {
      pass1.push({
        item,
        lineSubtotal:          new Decimal(0),
        lineInstall:           new Decimal(0),
        installTaxable:        false,
        effectiveVatRate:      new Decimal(0),
        inheritsGlobal:        false,
        preDiscountVatBase:    new Decimal(0),
        fixedDiscountEligible: false,
      })
      continue
    }

    const qty          = D(item.quantity)
    const rate         = D(item.unit_price)
    const lineSubtotal = qty.times(rate)
    const lineInstall  = item.install_rate != null ? D(item.install_rate) : new Decimal(0)
    const installTaxable    = item.install_rate_taxable ?? false
    const effectiveVatRate  = item.vat_rate != null ? D(item.vat_rate) : globalVat
    const inheritsGlobal    = item.discount_rate == null

    // Pre-discount VAT base for this row
    const preDiscountVatBase = installTaxable
      ? lineSubtotal.plus(lineInstall)
      : lineSubtotal

    // Eligible for fixed discount allocation:
    // row must (a) inherit global discount and (b) have a non-zero VAT base
    const fixedDiscountEligible =
      discountType === 'fixed' &&
      discountTiming === 'before_tax' &&
      inheritsGlobal &&
      preDiscountVatBase.greaterThan(0) &&
      effectiveVatRate.greaterThan(0)

    pass1.push({
      item,
      lineSubtotal,
      lineInstall,
      installTaxable,
      effectiveVatRate,
      inheritsGlobal,
      preDiscountVatBase,
      fixedDiscountEligible,
    })

    docSubtotal     = docSubtotal.plus(lineSubtotal)
    docInstallTotal = docInstallTotal.plus(lineInstall)
    if (fixedDiscountEligible) {
      eligibleVatBase = eligibleVatBase.plus(preDiscountVatBase)
    }
  }

  // ── 1b. Fixed-discount fallback for non-taxable documents ────────────────
  //
  // A fixed before_tax discount is normally allocated across taxable rows
  // (effectiveVatRate > 0). When no row is taxable (a no-VAT invoice or rows
  // that are all exempt), the allocation pool is empty and the fixed discount
  // would be dropped entirely. In that case distribute it across every row
  // that inherits the global discount and has a positive base, restoring the
  // historical behavior where a fixed discount applies to the whole invoice.
  // Mixed documents keep the existing rule: exempt rows are still excluded
  // from the allocation when taxable rows exist.
  const hasInheritingBase = pass1.some(
    (p) => p.inheritsGlobal && p.preDiscountVatBase.greaterThan(0),
  )
  const useFallbackAllocation =
    discountType === 'fixed' &&
    discountTiming === 'before_tax' &&
    eligibleVatBase.lessThanOrEqualTo(0) &&
    hasInheritingBase

  if (useFallbackAllocation) {
    for (const p of pass1) {
      p.fixedDiscountEligible =
        p.inheritsGlobal && p.preDiscountVatBase.greaterThan(0)
    }
    eligibleVatBase = pass1.reduce(
      (sum, p) =>
        p.fixedDiscountEligible ? sum.plus(p.preDiscountVatBase) : sum,
      new Decimal(0),
    )
  }

  // ── 2. Resolve fixed discount total ──────────────────────────────────────

  // Percent discount is applied per-row in pass 2.
  // Fixed discount is allocated proportionally to eligible rows here.
  const fixedDiscountTotal: Decimal =
    discountType === 'fixed' ? D(discountValue) : new Decimal(0)

  // CLAMP: never allocate more fixed discount than the total eligible discountable base.
  // If the user entered a fixed discount larger than the taxable base, we cap it
  // to prevent negative VAT bases and negative row totals.
  const effectiveFixedDiscount: Decimal =
    fixedDiscountTotal.greaterThan(eligibleVatBase) && eligibleVatBase.greaterThan(0)
      ? eligibleVatBase
      : fixedDiscountTotal

  // ── 3. Second pass: compute per-row discount, VAT, totals ─────────────────

  const computedItems: ComputedItem[] = []
  const groupAccumulators: Record<
    string,
    { name: string; subtotal: Decimal; installTotal: Decimal }
  > = {}

  let totalDiscount       = new Decimal(0)
  let totalVat            = new Decimal(0)
  let preciseTaxableBase  = new Decimal(0) // PRECISE: sum of actual taxed bases

  for (const p of pass1) {
    const { item } = p

    if (item.row_type === 'group_header') {
      computedItems.push({
        id:                       item.id,
        row_type:                 'group_header',
        group_id:                 item.group_id   ?? null,
        group_name:               item.group_name ?? null,
        description:              item.description,
        quantity:                 0,
        unit_price:               0,
        install_rate:             0,
        install_rate_taxable:     false,
        effective_vat_rate:       0,
        inherits_global_discount: false,
        effective_discount_rate:  0,
        line_subtotal:            0,
        line_install:             0,
        line_vat_base:            0,
        line_discount:            0,
        line_vat:                 0,
        line_total:               0,
        visible_line_total:       0,
      })
      continue
    }

    const {
      lineSubtotal,
      lineInstall,
      installTaxable,
      effectiveVatRate,
      inheritsGlobal,
      preDiscountVatBase,
      fixedDiscountEligible,
    } = p

    // ── Discount for this row ──────────────────────────────────────────────

    let lineDiscountBeforeVat = new Decimal(0)
    let lineDiscount          = new Decimal(0)
    let effectiveDiscountRate = new Decimal(0)

    if (!inheritsGlobal) {
      // Explicit row override (including explicit 0)
      effectiveDiscountRate = D(item.discount_rate)
      if (discountTiming === 'before_tax') {
        lineDiscountBeforeVat = lineSubtotal.times(effectiveDiscountRate).dividedBy(100)
      }

    } else if (discountType === 'percent') {
      // Inherit global percent — apply row-by-row
      effectiveDiscountRate = D(discountValue)
      if (discountTiming === 'before_tax') {
        lineDiscountBeforeVat = lineSubtotal.times(effectiveDiscountRate).dividedBy(100)
      }

    } else if (fixedDiscountEligible && eligibleVatBase.greaterThan(0)) {
      // Fixed discount before_tax: allocate proportionally to this row's VAT base.
      // Use effectiveFixedDiscount (already clamped to eligibleVatBase) so
      // no row can receive more discount than the total eligible base allows.
      const allocated = effectiveFixedDiscount
        .times(preDiscountVatBase)
        .dividedBy(eligibleVatBase)
      // Per-row clamp: allocated discount cannot exceed the row's own discountable amount.
      // lineSubtotal is the merchandise base — install is not directly discountable here.
      lineDiscountBeforeVat = Decimal.min(allocated, lineSubtotal)
      // Effective discount rate for this row (informational)
      effectiveDiscountRate = lineSubtotal.greaterThan(0)
        ? lineDiscountBeforeVat.dividedBy(lineSubtotal).times(100)
        : new Decimal(0)
    }
    // else: fixed discount after_tax, or row has zero VAT base — no discount here

    // ── VAT base for this row (precise) ───────────────────────────────────

    const lineAfterDiscount = lineSubtotal.minus(lineDiscountBeforeVat)
    let lineVatBase: Decimal

    if (discountTiming === 'before_tax') {
      // Discount reduces the VAT base
      lineVatBase = installTaxable
        ? lineAfterDiscount.plus(lineInstall)
        : lineAfterDiscount
    } else {
      // after_tax: VAT is on full base, discount applied after
      lineVatBase = installTaxable
        ? lineSubtotal.plus(lineInstall)
        : lineSubtotal
    }

    const lineVat = effectiveVatRate.greaterThan(0)
      ? lineVatBase.times(effectiveVatRate).dividedBy(100)
      : new Decimal(0)

    if (discountTiming === 'before_tax') {
      lineDiscount = lineDiscountBeforeVat
    } else if (effectiveDiscountRate.greaterThan(0)) {
      // After-tax percent discounts apply on the fully taxed line amount so the
      // discount value itself changes when the timing model changes.
      const postVatLineBase = lineSubtotal.plus(lineInstall).plus(lineVat)
      lineDiscount = postVatLineBase.times(effectiveDiscountRate).dividedBy(100)
    }

    // line_total — single clean derivation, no intermediate dead variable:
    const cleanLineTotal = (() => {
      if (discountTiming === 'before_tax') {
        return lineAfterDiscount.plus(lineInstall).plus(lineVat)
      } else {
        // after_tax: full base + install + VAT − discount
        return lineSubtotal.plus(lineInstall).plus(lineVat).minus(lineDiscount)
      }
    })()

    const visibleLineTotal = lineSubtotal
      .plus(visibleRowEffects.install ? lineInstall : 0)
      .minus(visibleRowEffects.discount ? lineDiscount : 0)
      .plus(visibleRowEffects.vat ? lineVat : 0)

    computedItems.push({
      id:                       item.id,
      row_type:                 'standard',
      group_id:                 item.group_id   ?? null,
      group_name:               item.group_name ?? null,
      description:              item.description,
      quantity:                 D(item.quantity).toNumber(),
      unit_price:               D(item.unit_price).toNumber(),
      install_rate:             lineInstall.toNumber(),
      install_rate_taxable:     installTaxable,
      effective_vat_rate:       effectiveVatRate.toNumber(),
      inherits_global_discount: inheritsGlobal,
      effective_discount_rate:  effectiveDiscountRate.toNumber(),
      line_subtotal:            lineSubtotal.toNumber(),
      line_install:             lineInstall.toNumber(),
      line_vat_base:            lineVatBase.toNumber(),
      line_discount:            lineDiscount.toNumber(),
      line_vat:                 lineVat.toNumber(),
      line_total:               cleanLineTotal.toNumber(),
      visible_line_total:       visibleLineTotal.toNumber(),
    })

    totalDiscount      = totalDiscount.plus(lineDiscount)
    totalVat           = totalVat.plus(lineVat)
    preciseTaxableBase = preciseTaxableBase.plus(lineVatBase)

    // Group accumulation
    if (item.group_id) {
      if (!groupAccumulators[item.group_id]) {
        groupAccumulators[item.group_id] = {
          name:         item.group_name ?? '',
          subtotal:     new Decimal(0),
          installTotal: new Decimal(0),
        }
      }
      groupAccumulators[item.group_id].subtotal =
        groupAccumulators[item.group_id].subtotal.plus(lineSubtotal)
      groupAccumulators[item.group_id].installTotal =
        groupAccumulators[item.group_id].installTotal.plus(lineInstall)
    }
  }

  // ── 4. After_tax fixed discount (applied at document level) ──────────────

  let afterTaxFixedDiscount = new Decimal(0)
  if (discountType === 'fixed' && discountTiming === 'after_tax') {
    afterTaxFixedDiscount = fixedDiscountTotal
    totalDiscount = totalDiscount.plus(afterTaxFixedDiscount)
  }

  // ── 4b. Discount percent equivalent (display only — never feeds
  //        back into any calculation) ──────────────────────────────
  const discountDenominator: Decimal =
    discountTiming === 'before_tax'
      ? (eligibleVatBase.greaterThan(0)
          ? eligibleVatBase
          : docSubtotal.plus(docInstallTotal))
      : docSubtotal.plus(docInstallTotal)

  const discountPercentEquivalent: Decimal =
    discountType === 'percent'
      ? D(discountValue)
      : discountDenominator.greaterThan(0)
        ? totalDiscount.dividedBy(discountDenominator).times(100)
        : new Decimal(0)

  // ── 5. Extra charges ──────────────────────────────────────────────────────

  let extraChargesTotal    = new Decimal(0)
  let extraChargesVat      = new Decimal(0)
  let extraChargesTaxBase  = new Decimal(0)

  for (const charge of extraCharges) {
    const v = D(charge.value)
    extraChargesTotal = extraChargesTotal.plus(v)
    if (charge.vatApplicable) {
      extraChargesTaxBase = extraChargesTaxBase.plus(v)
      extraChargesVat     = extraChargesVat.plus(
        v.times(globalVat).dividedBy(100)
      )
    }
  }

  // Extra charges VAT base is included in preciseTaxableBase
  preciseTaxableBase = preciseTaxableBase.plus(extraChargesTaxBase)
  totalVat           = totalVat.plus(extraChargesVat)

  // ── 6. WHT base (EXPLICIT RULE) ───────────────────────────────────────────
  //
  // WHT = (Total Contract Value - VAT) × Applicable Rate
  // Total Contract Value here is grand total before WHT, so the WHT base is
  // the VAT-exclusive contract amount.

  const whtBase = Decimal.max(
    docSubtotal
      .plus(docInstallTotal)
      .plus(extraChargesTotal)
      .minus(totalDiscount),
    0,
  )

  let whtAmount: Decimal
  if (whtType === 'percent') {
    whtAmount = whtBase.times(D(whtValue)).dividedBy(100)
  } else {
    whtAmount = D(whtValue)
  }

  // ── 7. Total payable ──────────────────────────────────────────────────────
  //
  // subtotal + install + extra charges − discount + VAT − WHT

  const totalPayable = docSubtotal
    .plus(docInstallTotal)
    .plus(extraChargesTotal)
    .minus(totalDiscount)
    .plus(totalVat)
    .minus(whtAmount)

  const grandTotal = docSubtotal
    .plus(docInstallTotal)
    .plus(extraChargesTotal)
    .minus(totalDiscount)
    .plus(totalVat)

  // ── 8. Groups ─────────────────────────────────────────────────────────────

  const groups: ComputedGroup[] = Object.entries(groupAccumulators).map(
    ([group_id, acc]) => ({
      group_id,
      group_name:   acc.name,
      subtotal:     acc.subtotal.toNumber(),
      installTotal: acc.installTotal.toNumber(),
    })
  )

  // ── 9. Return ─────────────────────────────────────────────────────────────

  return {
    items:             computedItems,
    groups,
    subtotal:          docSubtotal.toNumber(),
    installRateTotal:  docInstallTotal.toNumber(),
    extraChargesTotal: extraChargesTotal.toNumber(),
    taxableBase:       preciseTaxableBase.toNumber(),
    discount:          totalDiscount.toNumber(),
    discountPercentEquivalent: discountPercentEquivalent.toNumber(),
    vat:               totalVat.toNumber(),
    wht:               whtAmount.toNumber(),
    grandTotal:        grandTotal.toNumber(),
    totalPayable:      totalPayable.toNumber(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION LAYER
// ─────────────────────────────────────────────────────────────────────────────

export interface RawDocumentInput {
  items?:    any[]
  document?: Record<string, any>
  cf?:       Record<string, any>
  columns?:  Array<{ key?: string; visible?: boolean; visibilityMode?: 'show' | 'hide_display' | 'hide_full' }>
}

function getVisibleRowEffects(
  columns: RawDocumentInput['columns'] = [],
  cf: Record<string, any> = {},
): VisibleRowEffects {
  const sourceColumns = Array.isArray(columns) && columns.length
    ? columns
    : Array.isArray(cf.columnConfig)
      ? cf.columnConfig
      : []

  const isVisible = (key: string) =>
    sourceColumns.some((column) => column?.key === key && normalizeVisibilityMode(column) === 'show')

  return {
    install: isVisible('install_rate'),
    vat: isVisible('vat_rate'),
    discount: isVisible('discount_rate'),
  }
}

export function normalizeDocumentInput(raw: RawDocumentInput): DocumentInput {
  const { items = [], document = {}, cf = {}, columns = [] } = raw
  const ci: Record<string, any> = cf.calculationInputs ?? {}
  const sourceColumns = Array.isArray(columns) && columns.length
    ? columns
    : Array.isArray(cf.columnConfig)
      ? cf.columnConfig
      : []
  const getVisibilityMode = (key: string) =>
    normalizeVisibilityMode(sourceColumns.find((column) => column?.key === key))
  const hideInstallFully = getVisibilityMode('install_rate') === 'hide_full'
  const hideVatFully = getVisibilityMode('vat_rate') === 'hide_full'
  const hideDiscountFully = getVisibilityMode('discount_rate') === 'hide_full'

  // ── VAT rate ──────────────────────────────────────────────────────────────
  // NEVER read from document.vat (computed total)
  const globalVatPercent: number =
    hideVatFully ? 0 :
    ci.vatPercent != null ? Number(ci.vatPercent) :
    ci.vatRate != null ? Number(ci.vatRate) :
    cf.vatPercent != null ? Number(cf.vatPercent) :
    _legacyVatRate(document, cf)

  // ── Discount ──────────────────────────────────────────────────────────────
  // NEVER read from document.discount (computed total)
  const discountType: DiscountType =
    (ci.discountType ?? cf.discountType) === 'percent' ? 'percent' : 'fixed'

  const discountTiming: DiscountTiming = (() => {
    const t = ci.discountTiming ?? cf.discountTiming ?? ''
    return (t === 'after_tax' || t === 'after') ? 'after_tax' : 'before_tax'
  })()

  const discountValue: number =
    hideDiscountFully ? 0 :
    ci.discountValue != null ? Number(ci.discountValue) :
    cf.discountValue != null ? Number(cf.discountValue) :
    _legacyDiscountValue(document, cf, discountType)

  // ── WHT ───────────────────────────────────────────────────────────────────
  // NEVER read from document.wht (computed total)
  const whtType: WhtType =
    (ci.whtType ?? cf.whtType) === 'fixed' ? 'fixed' : 'percent'

  const whtValue: number =
    ci.whtValue != null ? Number(ci.whtValue) :
    cf.whtValue != null ? Number(cf.whtValue) :
    _legacyWhtValue(document, cf, whtType)

  // ── Extra charges ─────────────────────────────────────────────────────────
  const extraCharges: ExtraCharge[] = []

  const workmanship    = Number(document.workmanship    || 0)
  const transportation = Number(document.transportation  || 0)
  const shipping       = Number(document.shipping        || 0)

  if (workmanship)    extraCharges.push({ label: cf.chargeLabels?.workmanship    ?? 'Workmanship',   value: workmanship,    vatApplicable: false })
  if (transportation) extraCharges.push({ label: cf.chargeLabels?.transportation ?? 'Transportation', value: transportation, vatApplicable: false })
  if (shipping)       extraCharges.push({ label: cf.chargeLabels?.shipping       ?? 'Shipping',       value: shipping,       vatApplicable: false })

  if (Array.isArray(cf.extraCharges)) {
    for (const c of cf.extraCharges) {
      const v = Number(c.value || 0)
      const label = String(c.label || '').trim()
      if (v !== 0 && label) {
        extraCharges.push({
          label,
          value:         v,
          vatApplicable: c.withTax === true,
        })
      }
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  const normalizedItems: InputItem[] = (items || []).map((item: any): InputItem => {
    if (item.row_type === 'group_header') {
      return {
        row_type:   'group_header',
        group_id:   item.group_id   ?? null,
        group_name: item.group_name ?? '',
        quantity:   0,
        unit_price: 0,
      }
    }

    const install_rate: number | null =
      hideInstallFully || item.install_rate === null || item.install_rate === undefined
        ? null : Number(item.install_rate)

    const vat_rate: number | null =
      hideVatFully || item.vat_rate === null || item.vat_rate === undefined
        ? null : Number(item.vat_rate)

    const discount_rate: number | null =
      hideDiscountFully || item.discount_rate === null || item.discount_rate === undefined
        ? null : Number(item.discount_rate)

    return {
      id:                   item.id,
      row_type:             item.row_type ?? 'standard',
      group_id:             item.group_id   ?? null,
      group_name:           item.group_name ?? null,
      description:          item.description ?? '',
      quantity:             normalizeQuantity(item.quantity, 1),
      unit_price:           Number(item.unit_price || 0),
      install_rate,
      install_rate_taxable: hideInstallFully ? false : item.install_rate_taxable ?? false,
      vat_rate,
      discount_rate,
    }
  })

  return {
    items:            normalizedItems,
    globalVatPercent,
    discountType,
    discountTiming,
    discountValue,
    whtType,
    whtValue,
    extraCharges,
    visibleRowEffects: getVisibleRowEffects(columns, cf),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatibility helpers (older persisted fields only)
// document.vat / document.discount / document.wht are NEVER used here
// ─────────────────────────────────────────────────────────────────────────────

function _legacyVatRate(doc: Record<string, any>, cf: Record<string, any>): number {
  if (doc.vat_rate  != null) return Number(doc.vat_rate)
  if (cf.vatRate    != null) return Number(cf.vatRate)
  // doc.vat is a computed total — do NOT use
  return 0
}

function _legacyDiscountValue(
  doc: Record<string, any>,
  cf: Record<string, any>,
  discountType: DiscountType
): number {
  if (discountType === 'percent' && doc.discount_percent != null) return Number(doc.discount_percent)
  if (discountType === 'fixed'   && doc.discount_amount  != null) return Number(doc.discount_amount)
  if (cf.discountInput != null) return Number(cf.discountInput)
  // doc.discount is a computed total — do NOT use
  return 0
}

function _legacyWhtValue(
  doc: Record<string, any>,
  cf: Record<string, any>,
  whtType: WhtType
): number {
  if (whtType === 'percent' && doc.wht_percent != null) return Number(doc.wht_percent)
  if (whtType === 'fixed'   && doc.wht_amount  != null) return Number(doc.wht_amount)
  if (cf.whtInput != null) return Number(cf.whtInput)
  // doc.wht is a computed total — do NOT use
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

export function computeDocument(raw: RawDocumentInput): DocumentResult {
  return calculateDocument(normalizeDocumentInput(raw))
}
