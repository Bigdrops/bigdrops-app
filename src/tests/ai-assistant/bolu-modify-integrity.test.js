import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Stage 0 — Bolu Modification Integrity harness.
 *
 * `createHarness` emulates the tenant persistence contract at the granularity
 * of the composite RPC migrations (20261118130000_bolu_tenant_rpc_installer.sql,
 * update branches: invoice lines ~150-205, quotation lines ~2214-2265) and the
 * plain table builders used by the service fallback path.
 *
 * It is NOT a database: RPC SQL semantics are hand-mirrored (NULLIF / COALESCE
 * / absent-key → NULL, invoice custom_fields → NULL with no COALESCE guard,
 * quotation custom_fields → '{}' with COALESCE(NULLIF(...,''),'{}') guard,
 * DELETE+INSERT of the whole item set). It is surfaced here only to give
 * behavioral before/after evidence. Hosted-database behaviour remains
 * unverified; see the stage-0 report.
 */
import {
  buildInvoiceModifyProposal,
  validateInvoiceModifyInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import { computeDocument } from '../../lib/Calculations.ts'
import {
  persistInvoiceModification,
  persistQuotationModification,
} from '../../lib/ai-assistant/bolu-document-service.ts'

const asJson = (v) => JSON.parse(JSON.stringify(v))
const semanticJsonEqual = (a, b) => {
  const norm = (v) => {
    if (v === null || v === undefined) return v
    if (typeof v === 'string') {
      try { return JSON.parse(v) } catch { return v }
    }
    return v
  }
  assert.deepEqual(norm(a), norm(b))
}
const num = (v, fallback) => {
  if (v === undefined || v === null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const NUL = (v) => (v === '' || v === undefined || v === null ? null : v)

const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const QUOTATION_ID = '123e4567-e89b-12d3-a456-426614174001'
const ENTITY_ID = '11111111-2222-3333-4444-555555555555'
const PROJECT_ID = '33333333-4444-5555-6666-777777777777'
const SIG_ID = 'sig-0001'
const CATALOG_ID = '44444444-5555-4555-8555-444444444444'
const CAT_A = 'aaaa1111-1111-4111-8111-aaaaaaaaaaaa'
const CAT_B = 'bbbb2222-2222-4222-8222-bbbbbbbbbbbb'
const CAT_X = 'cccc3333-3333-4333-8333-cccccccccccc'
const CAT_UNKNOWN = 'dddd4444-4444-4444-8444-dddddddddddd'
const LIO = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa${String(n).padStart(2, '0')}`

const ADVANCE_BLOCK = {
  enabled: true,
  amount: 240000,
  mode: 'percentage',
  value: 30,
  document_number: 'INV-000042-A',
  suffix: 'A',
  primary_label: 'Advance invoice due now',
  secondary_label: 'Balance upon completion',
  contract_value: 800000,
}
const CF_INVOICE = {
  operation_id: 'op-seed-1',
  advance_invoice: ADVANCE_BLOCK,
  header: [{ id: 'h1', label: 'Account No.', value: '0011223344' }],
  additionalFields: [{ id: 'a1', label: 'Site', value: 'Ikeja depot' }],
  extraCharges: [
    { label: 'Installation fee', value: 50000, withTax: true },
    { label: 'Mobilisation', value: 30000, withTax: false },
  ],
  chargeLabels: { workmanship: 'Rigging', transportation: 'Haulage', shipping: 'Freight' },
  calculationInputs: {
    vatPercent: 10,
    discountValue: 10,
    discountType: 'percent',
    discountTiming: 'before_tax',
    whtValue: 5,
    whtType: 'percent',
  },
  columnConfig: [
    { key: 'description', visibilityMode: 'show' },
    { key: 'quantity', visibilityMode: 'show' },
    { key: 'install_rate', visibilityMode: 'show', includeInTotal: true },
    { key: 'vat_rate', visibilityMode: 'hide_display' },
    { key: 'discount_rate', visibilityMode: 'hide_display' },
  ],
  notesTitle: 'Remarks',
  termsTitle: 'Contract terms',
  mergeQtyUnit: false,
  showItemImages: true,
  pdfOutput: {
    showBankDetails: false,
    bankAccountId: 'acct-9',
    showFooter: true,
    showTagline: false,
    showBalanceDue: true,
    showAmountInWords: true,
  },
  signatoryId: SIG_ID,
  attachments: [{ label: 'Spec sheet', url: 'https://example.test/spec.pdf' }],
  groupMeta: { g1: { name: 'Phase 1', showSubtotal: true } },
  conversionTrail: [{ from: 'QTN-000100', to: 'INV-000042' }],
  created_via: 'cost_pricing_sheet',
}

const SEED_INVOICE = {
  id: INVOICE_ID,
  invoice_number: 'INV-000042',
  invoice_title: 'Reactor maintenance — Q3',
  po_number: 'PO-7788',
  client_id: '99999999-8888-7777-6666-555555555555',
  client_name: 'Sasol Nigeria Ltd',
  project_id: PROJECT_ID,
  issue_date: '2026-10-01',
  due_date: '2026-11-30',
  status: 'paid',
  document_type: 'invoice',
  payment_terms: 'Net 14',
  notes: 'Handle with crane',
  terms: 'Winch access required. <b>Original contract terms.</b>',
  workmanship: 60000,
  transportation: 20000,
  shipping: 10000,
  discount: 65000,
  vat: 48750,
  wht: 30250,
  subtotal: 650000,
  install_rate_total: 25000,
  total: 715000,
  amount_in_words: 'Seven Hundred and Fifteen Thousand Naira Only',
  work_duration: '3 weeks',
  custom_fields: JSON.stringify(CF_INVOICE),
  archived_at: null,
  updated_at: '2026-10-01T00:00:00.000Z',
  created_at: '2026-10-01T00:00:00.000Z',
}

const SEED_INVOICE_ITEMS = [
  {
    id: 'item-invoice-1',
    invoice_id: INVOICE_ID,
    description: 'Reactor vessel body',
    sub_description: 'Grade 316L, 12 m³',
    make: 'SasolFab',
    quantity: 1,
    unit: 'unit',
    unit_price: 650000,
    amount: 650000,
    vat_rate: 15,
    install_rate: 25000,
    install_rate_taxable: true,
    show_install_rate: true,
    sort_order: 0,
    formula: '',
    row_type: 'standard',
    group_name: null,
    image_url: 'https://cdn.example.test/items/reactor.jpg',
    custom_data: JSON.stringify({ partNo: 'RV-12-316L', condition: 'refurbished', vendor_ref: 'VND-99' }),
    discount_rate: 5,
    install_rate_override: true,
    group_id: null,
    item_id: CATALOG_ID,
    source_cps_id: LIO(1),
    source_cps_row_id: LIO(2),
    source_quotation_id: LIO(3),
    source_quotation_item_id: LIO(4),
  },
  {
    id: 'item-invoice-2',
    invoice_id: INVOICE_ID,
    description: 'Mounting rig',
    sub_description: null,
    make: null,
    quantity: 2,
    unit: 'set',
    unit_price: 40000,
    amount: 80000,
    vat_rate: null,
    install_rate: null,
    install_rate_taxable: false,
    show_install_rate: false,
    sort_order: 1,
    formula: '',
    row_type: 'group_header',
    group_name: 'Phase 1',
    image_url: null,
    custom_data: JSON.stringify({ partNo: 'RIG-2' }),
    discount_rate: null,
    install_rate_override: false,
    group_id: 'g1',
    item_id: null,
    source_cps_id: null,
    source_cps_row_id: null,
    source_quotation_id: null,
    source_quotation_item_id: null,
  },
  {
    id: 'item-invoice-3',
    invoice_id: INVOICE_ID,
    description: 'Lifting lugs',
    sub_description: 'Bolt-on',
    make: null,
    quantity: 4,
    unit: 'pcs',
    unit_price: 15000,
    amount: 60000,
    vat_rate: null,
    install_rate: null,
    install_rate_taxable: false,
    show_install_rate: true,
    sort_order: 2,
    formula: '',
    row_type: 'standard',
    group_name: 'Phase 1',
    image_url: null,
    custom_data: JSON.stringify({ partNo: 'LL-4', condition: 'new', vendor_ref: 'VND-101' }),
    discount_rate: 0,
    install_rate_override: false,
    group_id: 'g1',
    item_id: null,
    source_cps_id: LIO(5),
    source_cps_row_id: null,
    source_quotation_id: null,
    source_quotation_item_id: null,
  },
]

const CF_QUOTATION = {
  operation_id: 'op-seed-q',
  payment_terms: 'Payment within 14 days of delivery',
  header: [{ id: 'h1', label: 'Account No.', value: 'Q-7788' }],
  additionalFields: [{ id: 'a1', label: 'Delivery site', value: 'Lekki yard' }],
  extraCharges: [
    { label: 'Mobilisation', value: 25000, withTax: true },
  ],
  chargeLabels: { transportation: 'Haulage' },
  calculationInputs: {
    vatPercent: 15,
    discountValue: 20000,
    discountType: 'fixed',
    discountTiming: 'before_tax',
    whtValue: 2.5,
    whtType: 'percent',
  },
  columnConfig: [
    { key: 'description', visibilityMode: 'show' },
    { key: 'quantity', visibilityMode: 'show' },
    { key: 'vat_rate', visibilityMode: 'hide_full' },
    { key: 'discount_rate', visibilityMode: 'hide_full' },
  ],
  mergeQtyUnit: true,
  notesTitle: 'Remarks',
  termsTitle: 'Contract terms',
  pdfOutput: { showBankDetails: true, showFooter: true },
  signatoryId: SIG_ID,
  attachments: [{ label: 'BoQ ref', url: 'https://example.test/boq.pdf' }],
  groupMeta: { gq1: { name: 'Section A', showSubtotal: true } },
  created_via: 'quotation_form',
}

const SEED_QUOTATION = {
  id: QUOTATION_ID,
  quotation_number: 'QTN-000777',
  quotation_title: 'Tank farm renovation',
  po_number: 'Q-PO-19',
  client_id: '99999999-8888-7777-6666-555555555555',
  client_name: 'Sasol Nigeria Ltd',
  project_id: PROJECT_ID,
  issue_date: '2026-10-11',
  valid_until: '2026-12-31',
  status: 'open',
  notes: 'Schedule around outage',
  terms: 'Original quotation T&C.',
  workmanship: 40000,
  transportation: 15000,
  shipping: 5000,
  discount: 20000,
  vat: 95000,
  wht: 26000,
  subtotal: 600000,
  install_rate_total: 10000,
  total: 685000,
  amount_in_words: 'Six Hundred and Eighty Five Thousand Naira Only',
  custom_fields: CF_QUOTATION,
  archived_at: null,
  updated_at: '2026-10-11T00:00:00.000Z',
  created_at: '2026-10-11T00:00:00.000Z',
}

const SEED_QUOTATION_ITEMS = [
  {
    id: 'item-quotation-1',
    quotation_id: QUOTATION_ID,
    description: 'Corrosion inhibitor package',
    sub_description: 'TCI-5000L',
    make: 'ChemField',
    quantity: 10,
    unit: 'drum',
    unit_price: 60000,
    amount: 600000,
    vat_rate: 0,
    install_rate: 10000,
    install_rate_taxable: false,
    show_install_rate: true,
    sort_order: 0,
    formula: '',
    row_type: 'standard',
    group_name: 'Section A',
    image_url: 'https://cdn.example.test/items/inhibitor.jpg',
    custom_data: JSON.stringify({ partNo: 'TCI-5000L', condition: 'new', vendor_ref: 'CH-41' }),
    discount_rate: 0,
    install_rate_override: true,
    group_id: 'gq1',
    item_id: CATALOG_ID,
    source_cps_id: LIO(6),
    source_cps_row_id: LIO(7),
    source_quotation_id: null,
    source_quotation_item_id: null,
  },
]

const SEED_CATALOG = [
  {
    id: CATALOG_ID,
    name: 'Reactor vessel body',
    normalized_name: 'reactor vessel body',
    standard_price: 650000,
    is_active: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'cafecafe-cafe-4afe-8afe-cafecafecafe',
    name: 'Retired part',
    normalized_name: 'retired part',
    standard_price: 5000,
    is_active: false,
    created_at: '2020-01-01T00:00:00.000Z',
    updated_at: '2020-01-01T00:00:00.000Z',
  },
  {
    id: CAT_A,
    name: 'Salt bulk',
    normalized_name: 'salt bulk',
    standard_price: 15000,
    is_active: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: CAT_B,
    name: 'Salt bulk',
    normalized_name: 'salt bulk',
    standard_price: 15000,
    is_active: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: CAT_X,
    name: 'Salt bulk',
    normalized_name: 'salt bulk',
    standard_price: 15000,
    is_active: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  },
]

function seedStore() {
  return {
    invoices: [asJson(SEED_INVOICE)],
    invoice_items: SEED_INVOICE_ITEMS.map(asJson),
    quotations: [asJson(SEED_QUOTATION)],
    quotation_items: SEED_QUOTATION_ITEMS.map(asJson),
    item_catalog: SEED_CATALOG.map(asJson),
  }
}

const safeJson = (s) => {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s ?? {}
  } catch {
    return {}
  }
}

function createHarness(store, { failInvoiceRpc = false, failQuoteRpc = false, failInvoiceItemsInsertOnce = false } = {}) {
  let invoiceItemsInsertFailures = failInvoiceItemsInsertOnce ? 1 : 0
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

  function makeTable(tableName) {
    return {
      select() {
        const builder = {
          _filters: [],
          _order: null,
          eq(col, val) { builder._filters.push((r) => r[col] === val); return builder },
          is(col, val) { builder._filters.push((r) => r[col] === val); return builder },
          in(col, vals) { builder._filters.push((r) => vals.includes(r[col])); return builder },
          order(col, opts) { builder._order = { col, ascending: !opts || opts.ascending !== false }; return builder },
          single: async () => {
            const rows = apply()
            return rows[0] ? { data: clone(rows[0]), error: null } : { data: null, error: { message: 'Not found' } }
          },
          maybeSingle: async () => {
            const rows = apply()
            return { data: rows[0] ? clone(rows[0]) : null, error: null }
          },
          then(resolve) { resolve({ data: apply().map(clone), error: null }) },
        }
        function apply() {
          let rows = store[tableName].filter((r) => builder._filters.every((f) => f(r)))
          if (builder._order) {
            const { col, ascending } = builder._order
            rows = [...rows].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (ascending ? 1 : -1))
          }
          return rows
        }
        return builder
      },
      insert(rows) {
        return {
          select() {
            return {
              single: async () => {
                const list = Array.isArray(rows) ? rows : [rows]
                const inserted = list.map((r) => ({ id: r.id ?? `${tableName}-${store[tableName].length + 1}`, ...clone(r) }))
                store[tableName].push(...inserted)
                return { data: clone(inserted[0]), error: null }
              },
            }
          },
          then(resolve) {
            const list = Array.isArray(rows) ? rows : [rows]
            if (invoiceItemsInsertFailures > 0 && tableName === 'invoice_items') {
              invoiceItemsInsertFailures -= 1
              resolve({ data: null, error: { message: 'simulated items insert failure' } })
              return
            }
            const inserted = list.map((r) => ({ id: r.id ?? `${tableName}-${store[tableName].length + 1}`, ...clone(r) }))
            store[tableName].push(...inserted)
            resolve({ data: clone(inserted), error: null })
          },
        }
      },
      update(updates) {
        return {
          eq(col, val) {
            return Promise.resolve().then(() => {
              const idx = store[tableName].findIndex((r) => r[col] === val)
              if (idx === -1) return { data: null, error: { message: 'Not found' } }
              store[tableName][idx] = { ...store[tableName][idx], ...clone(updates) }
              return { data: clone(store[tableName][idx]), error: null }
            })
          },
        }
      },
      delete() {
        return {
          eq(col, val) {
            return Promise.resolve().then(() => {
              store[tableName] = store[tableName].filter((r) => r[col] !== val)
              return { data: null, error: null }
            })
          },
        }
      },
    }
  }

  // STRICT PostgreSQL semantics for the item insert, applied BEFORE any write:
  // malformed input aborts the whole operation exactly like PostgreSQL, it
  // does not land a partial batch.
  function validateItemsForInsert(pItems, itemsTable) {
    const list = Array.isArray(pItems) ? pItems : []
    const isUuid = (v) =>
      typeof v === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim())
    const isNumeric = (v) =>
      v !== undefined && v !== null && !Number.isNaN(Number(String(v).trim())) && String(v).trim() !== ''
    const isInteger = (v) => isNumeric(v) && Number.isInteger(Number(String(v).trim()))
    const asString = (v) => (typeof v === 'string' ? v : v == null ? null : String(v))

    const castOrNull = (v) => (v === undefined ? null : v) // absent key → SQL NULL

    for (const [idx, v] of list.entries()) {
      const at = `item ${idx + 1}`

      // description: invoice_items.description is NOT NULL (quotation_items.description is nullable).
      if (itemsTable === 'invoice_items') {
        const d = asString(v.description)
        if (d === undefined || d === null) {
          return { error: { code: '23502', message: `null value in column "description" of relation "invoice_items" violates not-null constraint (${at})` } }
        }
      }

      // quantity / unit_price / amount / row_type / sort_order: quotation_items
      // declares these NOT NULL; the RPC inserts explicit NULLs when absent,
      // which violates the constraint regardless of column DEFAULT.
      if (itemsTable === 'quotation_items') {
        for (const [col, chk] of [['quantity', isNumeric], ['unit_price', isNumeric], ['amount', isNumeric], ['sort_order', isInteger]]) {
          if (v[col] === undefined || v[col] === null) {
            return { error: { code: '23502', message: `null value in column "${col}" of relation "quotation_items" violates not-null constraint (${at})` } }
          }
          if (!chk(v[col])) {
            return { error: { code: '22P02', message: `invalid input syntax for type ${col === 'sort_order' ? 'integer' : 'numeric'}: "${v[col]}" (${at})` } }
          }
        }
        if (v.row_type === undefined || v.row_type === null) {
          return { error: { code: '23502', message: `null value in column "row_type" of relation "quotation_items" violates not-null constraint (${at})` } }
        }
      } else {
        // invoice_items: quantity/unit_price/amount are numeric but nullable;
        // castable or absent.
        for (const [col, chk] of [['quantity', isNumeric], ['unit_price', isNumeric], ['amount', isNumeric], ['vat_rate', isNumeric], ['install_rate', isNumeric], ['discount_rate', isNumeric], ['sort_order', isInteger]]) {
          if (v[col] === undefined || v[col] === null) continue
          if (!chk(v[col])) {
            return { error: { code: '22P02', message: `invalid input syntax for type ${col === 'sort_order' ? 'integer' : 'numeric'}: "${v[col]}" (${at})` } }
          }
        }
      }

      // UUID casts: absent/empty → NULL (NULLIF semantics); invalid non-empty → error.
      for (const col of ['item_id', 'source_cps_id', 'source_cps_row_id', 'source_quotation_id', 'source_quotation_item_id']) {
        const raw = v[col]
        if (raw === undefined || raw === null) continue
        const s = String(raw).trim()
        if (s === '') continue // NULLIF(s, '') → NULL
        if (!isUuid(s)) {
          return { error: { code: '22P02', message: `invalid input syntax for type uuid: "${s}" (${at})` } }
        }
      }

      // FK: item_id must reference an existing catalog row (FK enforcement
      // requires existence; the archive policy is is_active and NOT enforced
      // by the FK itself).
      if (v.item_id) {
        const s = String(v.item_id).trim()
        if (s !== '' && !store.item_catalog.some((row) => String(row.id).toLowerCase() === s.toLowerCase())) {
          return { error: { code: '23503', message: `insert or update on table "${itemsTable}" violates foreign key constraint (${at})` } }
        }
      }
    }
    return { ok: true }
  }

  // STRICT custom_data semantics: malformed JSON fails the whole RPC before
  // any write, exactly like PostgreSQL evaluating the cast in the composite
  // RPC body. Nothing is stored on failure.
  function parseItemsCustomData(pItems) {
    const list = Array.isArray(pItems) ? pItems : []
    const parsed = []
    for (const v of list) {
      const raw = v.custom_data
      let customData
      if (raw === undefined || raw === null) {
        customData = null // SQL: NULL::jsonb
      } else if (typeof raw === 'string') {
        try {
          customData = JSON.parse(raw)
        } catch {
          return { error: { message: 'invalid input syntax for type json' } }
        }
      } else {
        customData = raw
      }
      parsed.push({ ...v, custom_data: customData })
    }
    return { items: parsed }
  }

  function updateBranch(family, p, pItems) {
    const t = family === 'invoice' ? 'invoices' : 'quotations'
    const itemsTable = family === 'invoice' ? 'invoice_items' : 'quotation_items'
    const fk = family === 'invoice' ? 'invoice_id' : 'quotation_id'
    const idx = store[t].findIndex((r) => r.id === p.id)
    if (idx === -1) return { data: null, error: { message: 'Not found' } }
    const cur = store[t][idx]

    // quotation UPDATE branch: custom_fields =
    // COALESCE(NULLIF(p->>'custom_fields', ''), '{}')::jsonb —
    // absent/empty → '{}'; malformed JSON text aborts before any write,
    // exactly like PostgreSQL evaluating the cast.
    if (family === 'quotation') {
      const cf = p.custom_fields
      if (typeof cf === 'string' && cf !== '') {
        try {
          JSON.parse(cf)
        } catch {
          return { data: null, error: { code: '22P02', message: 'invalid input syntax for type json' } }
        }
      }
    }

    // Validate EVERY item before any write; a single bad row aborts the RPC.
    const validation = validateItemsForInsert(pItems, itemsTable)
    if (validation.error) {
      return { data: null, error: validation.error }
    }

    // Mirrors the tenant RPC update branch semantics exactly:
    // absent keys → NULL (or the documented COALESCE default), never → keep.
    const set = family === 'invoice'
      ? {
          po_number: p.po_number ?? null,
          invoice_title: p.invoice_title ?? null,
          client_name: p.client_name,
          project_id: NUL(p.project_id),
          issue_date: p.issue_date ?? null,
          due_date: p.due_date ?? null,
          status: p.status ?? 'unpaid',
          payment_terms: p.payment_terms ?? null,
          notes: p.notes ?? null,
          terms: p.terms ?? null,
          workmanship: num(p.workmanship, 0),
          transportation: num(p.transportation, 0),
          shipping: num(p.shipping, 0),
          discount: num(p.discount, 0),
          vat: num(p.vat, 0),
          wht: num(p.wht, 0),
          custom_fields: p.custom_fields === undefined ? null : p.custom_fields,
          work_duration: p.work_duration ?? null,
          subtotal: num(p.subtotal, 0),
          install_rate_total: num(p.install_rate_total, 0),
          total: num(p.total, 0),
          amount_in_words: p.amount_in_words ?? null,
        }
      : {
          po_number: p.po_number ?? null,
          quotation_title: p.quotation_title ?? null,
          client_name: p.client_name,
          project_id: NUL(p.project_id),
          issue_date: p.issue_date ?? null,
          valid_until: p.valid_until ?? null,
          status: p.status ?? 'open',
          notes: p.notes ?? null,
          terms: p.terms ?? null,
          workmanship: num(p.workmanship, 0),
          transportation: num(p.transportation, 0),
          shipping: num(p.shipping, 0),
          discount: num(p.discount, 0),
          vat: num(p.vat, 0),
          wht: num(p.wht, 0),
          subtotal: num(p.subtotal, 0),
          install_rate_total: num(p.install_rate_total, 0),
          total: num(p.total, 0),
          amount_in_words: p.amount_in_words ?? null,
          custom_fields:
            p.custom_fields === undefined || p.custom_fields === '' ? {} : p.custom_fields,
        }
    // Validate every item's custom_data BEFORE any write, mirroring the RPC's
    // implicit transaction: a cast failure aborts the whole thing, it does not
    // land a partial batch.
    const parsed = parseItemsCustomData(pItems)
    if (parsed.error) {
      return { data: null, error: parsed.error }
    }

    store[t][idx] = { ...cur, ...set }
    store[itemsTable] = store[itemsTable].filter((r) => r[fk] !== cur.id)
    const inserted = parsed.items.map((v, i) => ({
      description: v.description,
      sub_description: v.sub_description ?? null,
      make: v.make ?? null,
      quantity: num(v.quantity, 0),
      unit: v.unit ?? null,
      unit_price: num(v.unit_price, 0),
      amount: num(v.amount, 0),
      vat_rate: v.vat_rate === undefined ? null : v.vat_rate,
      install_rate: v.install_rate === undefined ? null : v.install_rate,
      install_rate_taxable: v.install_rate_taxable === undefined ? null : v.install_rate_taxable,
      show_install_rate: v.show_install_rate === undefined ? null : v.show_install_rate,
      sort_order: num(v.sort_order, i),
      formula: v.formula ?? null,
      row_type: v.row_type ?? 'standard',
      group_name: v.group_name ?? null,
      image_url: v.image_url ?? null,
      custom_data: v.custom_data,
      discount_rate: v.discount_rate === undefined ? null : v.discount_rate,
      install_rate_override: v.install_rate_override ?? false,
      group_id: v.group_id ?? null,
      item_id: NUL(v.item_id),
      source_cps_id: NUL(v.source_cps_id),
      source_cps_row_id: NUL(v.source_cps_row_id),
      source_quotation_id: NUL(v.source_quotation_id),
      source_quotation_item_id: NUL(v.source_quotation_item_id),
      [fk]: cur.id,
    }))
    store[itemsTable].push(...inserted)
    return { data: { id: cur.id, [family === 'invoice' ? 'invoice' : 'quotation']: store[t][idx] }, error: null }
  }

  return {
    isReady: true,
    schemaName: 'entity_test',
    store,
    from: (table) => makeTable(table),
    rpc: async (name, params) => {
      if (name === 'save_invoice_with_items_transaction') {
        if (failInvoiceRpc && params.p_mode === 'update') return { data: null, error: { message: 'simulated RPC failure' } }
        return updateBranch('invoice', params.p_invoice_payload, params.p_items)
      }
      if (name === 'save_quotation_with_items_transaction') {
        if (failQuoteRpc && params.p_mode === 'update') return { data: null, error: { message: 'simulated RPC failure' } }
        return updateBranch('quotation', params.p_quotation_payload, params.p_items)
      }
      if (name === 'record_audit_log') return { data: null, error: null }
      return { data: null, error: null }
    },
  }
}

function validatedModifyPayload({ documentId, documentNumber, field, oldValue, newValue, items, documentFamily }) {
  const raw = {
    documentId,
    documentFamily,
    field,
    oldValue,
    newValue,
    items,
  }
  const validated = validateInvoiceModifyInput(raw)
  assert.equal(validated.valid, true, `modify input must validate: ${validated.errors.join('; ')}`)
  return buildInvoiceModifyProposal({
    targetDocumentId: documentId,
    targetDocumentNumber: documentNumber,
    documentFamily: documentFamily ?? 'invoice',
    field: validated.data.field,
    oldValue: validated.data.oldValue,
    newValue: validated.data.newValue,
    itemsChange: validated.data.items
      ? { oldItems: [], newItems: validated.data.items }
      : undefined,
  })
}

function approve(proposal) {
  proposal.status = 'approved_pending_save'
  return proposal
}

const canWrite = () => true
const canRead = () => true

// ─────────────────────────────────────────────────────────────────────────────

test('1. Invoice due_date-only modification preserves all unrelated data (fallback path, no items)', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.invoices[0])
  const beforeItems = asJson(store.invoice_items)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    field: 'due_date',
    oldValue: '2026-11-30',
    newValue: '2026-12-15',
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, true, result.error)
  assert.equal(result.documentNumber, 'INV-000042')

  const after = store.invoices[0]
  assert.equal(after.due_date, '2026-12-15')
  // Everything else must be byte-identical at the column level we can compare.
  assert.equal(after.po_number, before.po_number)
  assert.equal(after.invoice_title, before.invoice_title)
  assert.equal(after.project_id, before.project_id)
  assert.equal(after.payment_terms, before.payment_terms)
  assert.equal(after.terms, before.terms)
  assert.equal(after.notes, before.notes)
  assert.equal(after.status, 'paid')
  assert.equal(after.workmanship, before.workmanship)
  assert.equal(after.transportation, before.transportation)
  assert.equal(after.shipping, before.shipping)
  assert.equal(after.discount, before.discount)
  assert.equal(after.vat, before.vat)
  assert.equal(after.wht, before.wht)
  assert.equal(after.subtotal, before.subtotal)
  assert.equal(after.install_rate_total, before.install_rate_total)
  assert.equal(after.total, before.total)
  assert.equal(after.amount_in_words, before.amount_in_words)
  assert.equal(after.work_duration, before.work_duration)
  semanticJsonEqual(after.custom_fields, before.custom_fields)
  assert.deepEqual(store.invoice_items, beforeItems)
})

test('2. Invoice items modification preserves header, charges, custom_fields (incl. advance), lineage (RPC path)', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.invoices[0])

  // Model returns the complete item list with the requested change only.
  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Reactor vessel body', quantity: 2, unit_price: 650000, unit: 'unit' },
      { description: 'Mounting rig', quantity: 2, unit_price: 40000, unit: 'set' },
      { description: 'Lifting lugs', quantity: 4, unit_price: 15000, unit: 'pcs' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  if (!result.success) throw new Error('MODIFY FAILED: ' + JSON.stringify(result))

  const after = store.invoices[0]
  // Identity / commercial data preserved
  assert.equal(after.po_number, 'PO-7788')
  assert.equal(after.invoice_title, 'Reactor maintenance — Q3')
  assert.equal(after.project_id, PROJECT_ID)
  assert.equal(after.payment_terms, 'Net 14')
  assert.equal(after.terms, before.terms)
  assert.equal(after.notes, before.notes)
  assert.equal(after.status, 'paid')
  assert.equal(after.work_duration, before.work_duration)
  assert.equal(after.workmanship, before.workmanship)
  assert.equal(after.transportation, before.transportation)
  assert.equal(after.shipping, before.shipping)
  semanticJsonEqual(after.custom_fields, before.custom_fields)
  // Item metadata preserved for rows the model only touched superficially.
  const vessel = store.invoice_items.find((r) => r.description === 'Reactor vessel body')
  assert.equal(vessel.quantity, 2)
  assert.equal(vessel.sub_description, 'Grade 316L, 12 m³')
  assert.equal(vessel.make, 'SasolFab')
  assert.equal(vessel.vat_rate, 15)
  assert.equal(vessel.discount_rate, 5)
  assert.equal(vessel.install_rate, 25000)
  assert.equal(vessel.install_rate_taxable, true)
  assert.equal(vessel.install_rate_override, true)
  assert.equal(vessel.image_url, 'https://cdn.example.test/items/reactor.jpg')
  assert.equal(vessel.item_id, CATALOG_ID)
  assert.equal(vessel.source_cps_id, LIO(1))
  assert.equal(vessel.source_cps_row_id, LIO(2))
  assert.equal(vessel.source_quotation_id, LIO(3))
  assert.equal(vessel.source_quotation_item_id, LIO(4))
  semanticJsonEqual(vessel.custom_data, { partNo: 'RV-12-316L', condition: 'refurbished', vendor_ref: 'VND-99' })
  // Group header downgraded? Must survive.
  const rig = store.invoice_items.find((r) => r.description === 'Mounting rig')
  assert.equal(rig.row_type, 'group_header')
  assert.equal(rig.group_id, 'g1')
  assert.equal(rig.group_name, 'Phase 1')
  // Persisted totals must match the canonical engine's output for the same
  // persisted inputs — never stale model/seed totals, never defaults.
  const cfAfter = typeof after.custom_fields === 'string' ? JSON.parse(after.custom_fields) : after.custom_fields
  const expected = computeDocument({
    items: store.invoice_items.map((r) => ({
      description: r.description,
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      unit: r.unit ?? '',
      row_type: r.row_type,
      group_id: r.group_id ?? null,
      group_name: r.group_name ?? null,
      item_id: r.item_id ?? undefined,
      install_rate: r.install_rate == null ? null : Number(r.install_rate),
      install_rate_taxable: r.install_rate_taxable ?? false,
      vat_rate: r.vat_rate == null ? null : Number(r.vat_rate),
      discount_rate: r.discount_rate == null ? null : Number(r.discount_rate),
    })),
    document: after,
    cf: cfAfter,
    columns: Array.isArray(cfAfter.columnConfig) ? cfAfter.columnConfig : [],
  })
  assert.equal(Number(after.subtotal), expected.subtotal)
  assert.equal(Number(after.vat), expected.vat)
  assert.equal(Number(after.wht), expected.wht)
  assert.equal(Number(after.discount), expected.discount)
  assert.equal(Number(after.total), expected.totalPayable)
  assert.equal(Number(after.install_rate_total), expected.installRateTotal)
  // The seeded persisted inputs (vatPercent 10, %10 discount, 5% WHT) are
  // used, not boilerplate defaults — proven by exact equality with the engine.
  assert.ok(expected.vat > 0)
  assert.equal(Number(after.install_rate_total) > 0, true)
})

test('3. Explicit null clears a row VAT override; omitted row fields keep persisted values', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Reactor vessel body', quantity: 1, unit_price: 650000, unit: 'unit', vat_rate: null },
      { description: 'Mounting rig', quantity: 2, unit_price: 40000, unit: 'set' },
      { description: 'Lifting lugs', quantity: 4, unit_price: 15000, unit: 'pcs' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)

  const vessel = store.invoice_items.find((r) => r.description === 'Reactor vessel body')
  assert.equal(vessel.vat_rate, null)
  assert.equal(vessel.discount_rate, 5) // omitted → persisted value kept
  const lugs = store.invoice_items.find((r) => r.description === 'Lifting lugs')
  assert.equal(lugs.discount_rate, 0)
  assert.equal(lugs.custom_data.vendor_ref, 'VND-101')
})

test('4. Explicit item removal removes exactly that row; others survive', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Reactor vessel body', quantity: 1, unit_price: 650000, unit: 'unit' },
      { description: 'Lifting lugs', quantity: 4, unit_price: 15000, unit: 'pcs' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(store.invoice_items.some((r) => r.description === 'Mounting rig'), false)
  assert.equal(store.invoice_items.length, 2)
  assert.equal(
    store.invoice_items.some((r) => r.description === 'Lifting lugs' && r.custom_data.vendor_ref === 'VND-101'),
    true,
  )
})

test('5. Explicitly added item is inserted; existing rows untouched', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before2 = asJson(store.invoice_items[1])

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Reactor vessel body', quantity: 1, unit_price: 650000, unit: 'unit' },
      { description: 'Mounting rig', quantity: 2, unit_price: 40000, unit: 'set' },
      { description: 'Lifting lugs', quantity: 4, unit_price: 15000, unit: 'pcs' },
      { description: 'Commissioning support', quantity: 1, unit_price: 80000, unit: 'day' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(store.invoice_items.length, 4)
  const added = store.invoice_items.find((r) => r.description === 'Commissioning support')
  assert.equal(Number(added.amount), 80000)
  assert.equal(added.row_type, 'standard')
  const rig = store.invoice_items.find((r) => r.description === 'Mounting rig')
  assert.equal(rig.group_id, 'g1')
  assert.equal(rig.group_name, 'Phase 1')
  assert.equal(rig.row_type, 'group_header')
  assert.equal(rig.quantity, before2.quantity)
  assert.equal(rig.unit_price, before2.unit_price)
  semanticJsonEqual(rig.custom_data, safeJson(before2.custom_data))
})

test('6. Stale field modification is rejected before any write', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    field: 'notes',
    oldValue: 'someone else changed the notes',
    newValue: 'whatever',
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, false)
  assert.match(result.error, /stale/i)
  assert.deepEqual(asJson(store), before)
})

test('7. RPC failure in items modification leaves the document untouched', async () => {
  const store = seedStore()
  const harness = createHarness(store, { failInvoiceRpc: true })
  const before = asJson(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Reactor vessel body', quantity: 2, unit_price: 650000, unit: 'unit' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, false)
  assert.match(result.error, /Transactional update failed/i)
  assert.deepEqual(asJson(store), before)
})

test('8. No-op invoice modification reports success without destroying anything', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    field: 'due_date',
    oldValue: '2026-11-30',
    newValue: '2026-11-30',
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, true, result.error)
  const after = asJson(store)
  assert.equal(after.invoices[0].due_date, before.invoices[0].due_date)
  assert.equal(after.invoices[0].status, 'paid')
  semanticJsonEqual(after.invoices[0].custom_fields, before.invoices[0].custom_fields)
  assert.equal(after.invoice_items.length, before.invoice_items.length)
})

test('9. Quotation valid_until-only modification preserves everything (field path, no items)', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.quotations[0])

  const proposal = approve(validatedModifyPayload({
    documentId: QUOTATION_ID,
    documentNumber: 'QTN-000777',
    documentFamily: 'quotation',
    field: 'due_date',
    oldValue: '2026-12-31',
    newValue: '2027-01-31',
  }))

  const result = await persistQuotationModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, true, result.error)
  const after = store.quotations[0]
  assert.equal(after.valid_until, '2027-01-31')
  assert.equal(after.quotation_title, before.quotation_title)
  assert.equal(after.po_number, before.po_number)
  assert.equal(after.project_id, before.project_id)
  assert.equal(after.status, 'open')
  assert.equal(after.terms, before.terms)
  assert.equal(after.workmanship, before.workmanship)
  assert.equal(after.transportation, before.transportation)
  assert.equal(after.shipping, before.shipping)
  semanticJsonEqual(after.custom_fields, before.custom_fields)
  assert.deepEqual(asJson(store.quotation_items), SEED_QUOTATION_ITEMS)
})

test('10. Quotation items modification preserves header, charges, jsonb custom_fields, lineage, zeroes-by-design VAT', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.quotations[0])

  const proposal = approve(validatedModifyPayload({
    documentId: QUOTATION_ID,
    documentNumber: 'QTN-000777',
    documentFamily: 'quotation',
    items: [{ description: 'Corrosion inhibitor package', quantity: 20, unit_price: 60000, unit: 'drum' }],
  }))

  const result = await persistQuotationModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  const after = store.quotations[0]
  assert.equal(after.quotation_title, 'Tank farm renovation')
  assert.equal(after.po_number, 'Q-PO-19')
  assert.equal(after.project_id, PROJECT_ID)
  assert.equal(after.status, 'open')
  assert.equal(after.workmanship, before.workmanship)
  assert.equal(after.transportation, before.transportation)
  assert.equal(after.shipping, before.shipping)
  semanticJsonEqual(after.custom_fields, before.custom_fields)
  const item = store.quotation_items[0]
  assert.equal(item.quantity, 20)
  assert.equal(item.sub_description, 'TCI-5000L')
  assert.equal(item.make, 'ChemField')
  assert.equal(item.vat_rate, 0) // explicit exempt persists (not null)
  assert.equal(item.install_rate, 10000)
  assert.equal(item.install_rate_override, true)
  assert.equal(item.image_url, 'https://cdn.example.test/items/inhibitor.jpg')
  assert.equal(item.source_cps_id, LIO(6))
  assert.equal(item.source_cps_row_id, LIO(7))
  assert.equal(item.item_id, CATALOG_ID)
  semanticJsonEqual(item.custom_data, { partNo: 'TCI-5000L', condition: 'new', vendor_ref: 'CH-41' })
  // Recomputed: 20 drums × 60000 = 1,200,000 before charges; VAT rule: rows with vat_rate=0 and hide_full VAT column → hidden globally (hide_full forces 0 everywhere incl. extras).
  assert.equal(Number(after.subtotal), 20 * 60000)
  assert.equal(Number(after.install_rate_total), 10000)
})

test('11. Quotation payment_terms modification writes custom_fields.payment_terms and leaves terms untouched', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.quotations[0])

  const proposal = approve(validatedModifyPayload({
    documentId: QUOTATION_ID,
    documentNumber: 'QTN-000777',
    documentFamily: 'quotation',
    field: 'payment_terms',
    oldValue: 'Payment within 14 days of delivery',
    newValue: 'Payment within 30 days, with 10% retention',
  }))

  const result = await persistQuotationModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, true, result.error)
  const after = store.quotations[0]
  assert.equal(after.terms, before.terms)
  const cf = typeof after.custom_fields === 'string' ? JSON.parse(after.custom_fields) : after.custom_fields
  assert.equal(cf.payment_terms, 'Payment within 30 days, with 10% retention')
  semanticJsonEqual({ ...cf, payment_terms: before.custom_fields.payment_terms }, before.custom_fields)
})

test('12. Invoice payment_terms modification writes the payment_terms column, not terms', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.invoices[0])

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    field: 'payment_terms',
    oldValue: 'Net 14',
    newValue: 'Net 30',
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, true, result.error)
  const after = store.invoices[0]
  assert.equal(after.payment_terms, 'Net 30')
  assert.equal(after.terms, before.terms)
})

test('13. Concurrent field modification (oldValue mismatch against quotation cf) is rejected before any write', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const proposal = approve(validatedModifyPayload({
    documentId: QUOTATION_ID,
    documentNumber: 'QTN-000777',
    documentFamily: 'quotation',
    field: 'payment_terms',
    oldValue: 'completely different value',
    newValue: 'x',
  }))

  const result = await persistQuotationModification(harness, proposal, canWrite, canRead, undefined)
  assert.equal(result.success, false)
  assert.match(result.error, /stale/i)
  assert.deepEqual(asJson(store), before)
})

test('14. Fallback items-insert failure restores the previous items (no partial document)', async () => {
  const store = seedStore()
  const harness = createHarness(store, { failInvoiceItemsInsertOnce: true })
  const before = asJson(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [{ description: 'Reactor vessel body', quantity: 2, unit_price: 650000, unit: 'unit' }],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, null)
  assert.equal(result.success, false)
  assert.match(result.error, /restored/i)
  assert.equal(store.invoice_items.length, before.invoice_items.length)
  const vessel = store.invoice_items.find((r) => r.description === 'Reactor vessel body')
  assert.equal(vessel.quantity, 1) // original qty restored, not 2
  assert.equal(vessel.vat_rate, 15)
})

test('15. Validation failures throw before any persistence attempt', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const raw = { documentId: INVOICE_ID, items: [{ description: '', quantity: 0, unit_price: -1 }] }
  const validated = validateInvoiceModifyInput(raw)
  assert.equal(validated.valid, false)
  assert.ok(validated.errors.length > 0)
  assert.deepEqual(asJson(store), before)
})

test('16. Explicit part_number/condition edits override custom_data keys; unrelated keys survive', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Reactor vessel body', quantity: 1, unit_price: 650000, unit: 'unit', part_number: 'RV-99-NEW', condition: 'new' },
      { description: 'Mounting rig', quantity: 2, unit_price: 40000, unit: 'set' },
      { description: 'Lifting lugs', quantity: 4, unit_price: 15000, unit: 'pcs' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  const vessel = store.invoice_items.find((r) => r.description === 'Reactor vessel body')
  semanticJsonEqual(vessel.custom_data, { partNo: 'RV-99-NEW', condition: 'new', vendor_ref: 'VND-99' })
  const lugs = store.invoice_items.find((r) => r.description === 'Lifting lugs')
  semanticJsonEqual(lugs.custom_data, { partNo: 'LL-4', condition: 'new', vendor_ref: 'VND-101' })
})

// =============================================================================
// Stage 0.1 — Adversarial item-identity and JSONB-cast coverage
// =============================================================================

function dupSeedStore() {
  const saltRow = (id, partNo, itemId, overrides = {}) => ({
    id,
    invoice_id: INVOICE_ID,
    description: 'Salt',
    sub_description: null,
    make: null,
    quantity: 1,
    unit: 'unit',
    unit_price: 15000,
    amount: 15000,
    vat_rate: null,
    install_rate: null,
    install_rate_taxable: false,
    show_install_rate: true,
    sort_order: id === 'dup-1' ? 0 : 1,
    formula: '',
    row_type: 'standard',
    group_name: null,
    image_url: overrides.image_url ?? null,
    custom_data: JSON.stringify({ partNo }),
    discount_rate: null,
    install_rate_override: false,
    group_id: null,
    item_id: itemId,
    source_cps_id: overrides.source_cps_id ?? null,
    source_cps_row_id: null,
    source_quotation_id: null,
    source_quotation_item_id: null,
  })

  return {
    invoices: [asJson(SEED_INVOICE)],
    invoice_items: [
      saltRow('dup-1', 'SALT-A', CAT_A, { image_url: 'https://cdn.example.test/items/salt-a.jpg', source_cps_id: LIO(11) }),
      saltRow('dup-2', 'SALT-B', CAT_B, { image_url: 'https://cdn.example.test/items/salt-b.jpg', source_cps_id: LIO(12) }),
    ],
    quotations: [asJson(SEED_QUOTATION)],
    quotation_items: SEED_QUOTATION_ITEMS.map(asJson),
    item_catalog: SEED_CATALOG.map(asJson),
  }
}

test('A. Reordered duplicate items abstain rather than swap metadata', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Salt', quantity: 1, unit_price: 15000, unit: 'unit' },
      { description: 'Salt', quantity: 1, unit_price: 15000, unit: 'unit' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.ok(result.warnings.length >= 1, 'ambiguity warning expected')
  assert.match(result.warnings.join(' '), /tie|ambig|uniquely/i)

  const rows = store.invoice_items
  assert.equal(rows.length, 2)
  for (const r of rows) {
    assert.equal(r.item_id, null)
    assert.equal(r.image_url, null)
    assert.equal(r.source_cps_id, null)
    assert.equal(r.source_cps_row_id, null)
    assert.equal(r.source_quotation_id, null)
    assert.equal(r.source_quotation_item_id, null)
    assert.equal(r.install_rate_override, false)
    assert.deepEqual(r.custom_data, {}) // no A/B partNo leaked
  }
})

test('B. Weak-signal rows never inherit identity metadata (floor rejects score <= 4)', async () => {
  const store = seedStore()
  // Unrelated persisted row sharing only unit + unit price (score = 3).
  store.invoice_items = [
    {
      ...store.invoice_items[0],
      id: 'weak-1',
      description: 'Cement',
      quantity: 1,
      unit: 'unit',
      unit_price: 50000,
      image_url: 'https://cdn.example.test/items/cement.jpg',
      item_id: CATALOG_ID,
      custom_data: JSON.stringify({ partNo: 'CEMENT-50', vendor_ref: 'V-77' }),
      source_cps_id: LIO(13),
      group_id: 'g-weak',
      group_name: 'Weak group',
    },
  ]
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Charcoal', quantity: 4, unit_price: 50000, unit: 'unit' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.match(result.warnings.join(' '), /recreated fresh|may have been lost|safely/i)

  const charcoal = store.invoice_items.find((r) => r.description === 'Charcoal')
  assert.ok(charcoal)
  assert.equal(charcoal.item_id, null)
  assert.equal(charcoal.image_url, null)
  assert.equal(charcoal.source_cps_id, null)
  assert.equal(charcoal.group_id, null)
  assert.equal(charcoal.group_name, null)
  semanticJsonEqual(charcoal.custom_data, {})
  assert.equal(store.invoice_items.some((r) => r.description === 'Cement'), false)
})

test('C. Complete description rewrite recreates the row fresh, with a warning', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store.invoice_items)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Charcoal briquettes, 20kg bag', quantity: 4, unit_price: 9000, unit: 'bag' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.match(result.warnings.join(' '), /recreated fresh|identity|lineage|may have been lost/i)

  const after = store.invoice_items
  assert.equal(after.length, 1)
  assert.equal(after[0].description, 'Charcoal briquettes, 20kg bag')
  assert.equal(after[0].item_id, null)
  assert.equal(after[0].image_url, null)
  assert.equal(after[0].source_cps_id, null)
  semanticJsonEqual(after[0].custom_data, {})
  assert.notDeepEqual(asJson(after), before)
})

test('D. Identical description-and-price tie abstains deterministically on both candidates', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Salt', quantity: 1, unit_price: 15000, unit: 'unit' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.match(result.warnings.join(' '), /tie|ambig|safely/i)

  assert.equal(store.invoice_items.length, 1)
  const row = store.invoice_items[0]
  assert.equal(row.item_id, null)
  assert.equal(row.image_url, null)
  assert.equal(row.source_cps_id, null)
  assert.deepEqual(row.custom_data, {})
})

test('E1. Unique explicit item_id matches the correct persisted row out of order', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Salt', quantity: 2, unit_price: 15000, unit: 'unit', item_id: CAT_B },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(result.warnings, undefined)

  const rows = store.invoice_items
  assert.equal(rows.length, 1)
  assert.equal(rows[0].item_id, CAT_B)
  assert.equal(rows[0].image_url, 'https://cdn.example.test/items/salt-b.jpg')
  assert.equal(rows[0].custom_data.partNo, 'SALT-B')
  assert.equal(rows[0].source_cps_id, LIO(12))
  assert.equal(rows[0].quantity, 2)
})

test('E2. Duplicated explicit item_id abstains; no arbitrary metadata transfer', async () => {
  const store = dupSeedStore()
  // Both persisted rows link the same catalog item.
  store.invoice_items[0].item_id = CAT_X
  store.invoice_items[1].item_id = CAT_X
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'Salt', quantity: 1, unit_price: 15000, unit: 'unit', item_id: CAT_X },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.match(result.warnings.join(' '), /uniquely resolved/i)

  const rows = store.invoice_items
  assert.equal(rows.length, 1)
  // The explicitly requested identity survives on the recreated row because it
  // is positively verified against the seeded active catalog; nothing else is
  // borrowed from either unresolved candidate.
  assert.equal(rows[0].item_id, CAT_X)
  assert.equal(rows[0].image_url, null)
  assert.equal(rows[0].source_cps_id, null)
  semanticJsonEqual(rows[0].custom_data, {})
})

test('E3-A. Verified active catalog UUID is retained on an unmatched (fresh) row, with zero warnings', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      // CATALOG_ID is a valid, active catalog row (seeded).
      { description: 'New line', quantity: 3, unit_price: 10000, unit: 'pcs', item_id: CATALOG_ID },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(result.warnings, undefined)

  const rows = store.invoice_items
  assert.equal(rows.length, 1)
  assert.equal(rows[0].item_id, CATALOG_ID)
  assert.equal(rows[0].image_url, null)
  assert.equal(rows[0].source_cps_id, null)
  semanticJsonEqual(rows[0].custom_data, {})
})

test('E3-B. Well-formed UUID absent from the tenant catalog is discarded with a warning', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'New line', quantity: 3, unit_price: 10000, unit: 'pcs', item_id: CAT_UNKNOWN },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.match(result.warnings.join(' '), /not an active item_catalog|could not be verified|discarded/i)

  const rows = store.invoice_items
  assert.equal(rows.length, 1)
  assert.equal(rows[0].item_id, null)
  assert.equal(rows[0].image_url, null)
  assert.equal(rows[0].source_cps_id, null)
  assert.equal(rows[0].source_quotation_item_id, null)
})

test('E3-C. Malformed catalog identity is discarded with a warning; the row persists cleanly', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'New line', quantity: 3, unit_price: 10000, unit: 'pcs', item_id: 'CAT-999' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.equal(Array.isArray(result.warnings), true)
  assert.match(result.warnings.join(' '), /not a well-formed UUID/i)

  const rows = store.invoice_items
  assert.equal(rows.length, 1)
  assert.equal(rows[0].item_id, null)
  assert.equal(rows[0].image_url, null)
  assert.equal(rows[0].source_cps_id, null)
})

test('E3-D. Inactive catalog UUID is discarded even though the FK would admit it', async () => {
  const store = dupSeedStore()
  const harness = createHarness(store)

  const proposal = approve(validatedModifyPayload({
    documentId: INVOICE_ID,
    documentNumber: 'INV-000042',
    items: [
      { description: 'New line', quantity: 3, unit_price: 10000, unit: 'pcs', item_id: 'cafecafe-cafe-4afe-8afe-cafecafecafe' },
    ],
  }))

  const result = await persistInvoiceModification(harness, proposal, canWrite, canRead, ENTITY_ID)
  assert.equal(result.success, true, result.error)
  assert.match(result.warnings.join(' '), /not an active item_catalog|discarded/i)
  assert.equal(store.invoice_items.find((r) => r.description === 'New line').item_id, null)
})

test('EX-Direct. Malformed UUID reaching the RPC is rejected (uuid cast equivalent)', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_invoice_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_invoice_payload: { ...store.invoices[0], id: INVOICE_ID },
    p_items: [
      { description: 'Bad uuid row', quantity: 1, unit_price: 10, unit: 'pcs', amount: 10, row_type: 'standard', sort_order: 0, item_id: 'CAT-999' },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error, 'RPC must report an error for non-uuid item_id')
  assert.match(String(res.error.message), /invalid input syntax for type uuid/i)
  assert.equal(res.error.code, '22P02')
  assert.deepEqual(asJson(store), before)
})

test('EX-FK. Well-formed but non-existent catalog UUID is rejected (FK violation)', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_invoice_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_invoice_payload: { ...store.invoices[0], id: INVOICE_ID },
    p_items: [
      { description: 'Dangling ref row', quantity: 1, unit_price: 10, unit: 'pcs', amount: 10, row_type: 'standard', sort_order: 0, item_id: 'dddd4444-4444-4444-8444-dddddddddddd' },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error, 'RPC must report an FK-equivalent error for unknown catalog item_id')
  assert.equal(res.error.code, '23503')
  assert.deepEqual(asJson(store), before)
})

test('EX-Atomic. A batch with one invalid row leaves the entire document unchanged', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_quotation_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_quotation_payload: { ...store.quotations[0], id: QUOTATION_ID },
    p_items: [
      { description: 'Valid row', quantity: 1, unit_price: 100, unit: 'pcs', amount: 100, row_type: 'standard', sort_order: 0 },
      { description: 'Invalid uuid row', quantity: 1, unit_price: 100, unit: 'pcs', amount: 100, row_type: 'standard', sort_order: 1, item_id: 'not-a-uuid' },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error, 'the batch must fail as a unit')
  assert.equal(res.error.code, '22P02')
  assert.deepEqual(asJson(store), before)
})

test('EX-NotNull. Invoice item without description is rejected', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_invoice_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_invoice_payload: { ...store.invoices[0], id: INVOICE_ID },
    p_items: [
      { quantity: 1, unit_price: 10, unit: 'pcs', amount: 10, row_type: 'standard', sort_order: 0 },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error)
  assert.equal(res.error.code, '23502')
  assert.deepEqual(asJson(store), before)
})

test('EX-NotNull2. Quotation item without quantity is rejected', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_quotation_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_quotation_payload: { ...store.quotations[0], id: QUOTATION_ID },
    p_items: [
      { description: 'No qty', unit_price: 10, unit: 'pcs', amount: 10, row_type: 'standard', sort_order: 0 },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error)
  assert.equal(res.error.code, '23502')
  assert.deepEqual(asJson(store), before)
})

test('EX-CfJson. Quotation with malformed custom_fields JSON fails atomically', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_quotation_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_quotation_payload: { ...store.quotations[0], id: QUOTATION_ID, custom_fields: '{not-json' },
    p_items: [
      { description: 'Ln', quantity: 1, unit_price: 10, unit: 'pcs', amount: 10, row_type: 'standard', sort_order: 0 },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error)
  assert.equal(res.error.code, '22P02')
  assert.deepEqual(asJson(store), before)
})

test('F1. Malformed custom_data JSON fails the RPC instead of coercing to {}', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const before = asJson(store)

  const res = await harness.rpc('save_invoice_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_invoice_payload: { ...store.invoices[0], id: INVOICE_ID },
    p_items: [
      {
        description: 'Smoke test item',
        quantity: 1,
        unit_price: 1000,
        unit: 'pcs',
        amount: 1000,
        row_type: 'standard',
        sort_order: 0,
        custom_data: 'this-is-not-json{',
      },
    ],
    p_mode: 'update',
  })

  assert.ok(res.error, 'RPC must report an error, not silently coerce')
  assert.match(String(res.error.message), /invalid input syntax|json/i)
  assert.deepEqual(asJson(store), before) // nothing persisted, no partial batch
})

test('F2. Valid custom_data JSON continues to persist through the RPC', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const res = await harness.rpc('save_invoice_with_items_transaction', {
    p_entity_id: ENTITY_ID,
    p_invoice_payload: { ...store.invoices[0], id: INVOICE_ID },
    p_items: [
      {
        description: 'Valid item',
        quantity: 1,
        unit_price: 1000,
        unit: 'pcs',
        amount: 1000,
        row_type: 'standard',
        sort_order: 0,
        custom_data: JSON.stringify({ partNo: 'VALID-1' }),
      },
    ],
    p_mode: 'update',
  })

  assert.equal(res.error, null)
  const items = store.invoice_items
  assert.equal(items.length, 1)
  const stored = safeJson(typeof items[0].custom_data === 'string' ? items[0].custom_data : JSON.stringify(items[0].custom_data))
  assert.deepEqual(stored, { partNo: 'VALID-1' })
})
