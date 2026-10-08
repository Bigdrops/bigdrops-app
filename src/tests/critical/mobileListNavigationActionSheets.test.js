import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { getInvoiceListActionDefs, getInvoiceListDeleteActionDef } from '../../domain/invoice/actions.js'
import { getQuotationListActionDefs } from '../../domain/quotation/listActions.ts'

// This suite drives the real action-def builders (behavior) and asserts the
// presentation/navigation wiring (source text) for the three approved changes:
//   1. Top-level Mobile×Fold list headers lead with the production sidebar toggle.
//   2. Quotation list sheet: Convert to Invoice replaces View (six tiles / two rows).
//   3. Invoice list sheet: View removed, nine actions reflow to three rows of three.

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8')

const moduleShellPath = 'src/components/layout/ModuleShell.tsx'
const mobileHeaderPath = 'src/components/layout/MobilePageHeader.tsx'
const invoiceListPath = 'src/pages/Invoices.tsx'
const quotationListPath = 'src/components/quotation/QuotationList.tsx'
const unifiedActionSheetPath = 'src/components/actions/UnifiedActionSheet.tsx'
const invoiceListActionSheetPath = 'src/components/invoice/InvoiceListActionSheet.tsx'

// ── Objective 3: Invoice list action sheet ─────────────────────────────────

const invoiceBaseArgs = {
  projectActionLabel: 'Link to Project',
  hasProject: false,
  documentActionLabel: 'Linked Documents',
  hasLinkedDocuments: false,
  isPaid: false,
  isStandalone: false,
}

test('invoice list sheet removes View and keeps nine actions in the approved order', () => {
  const defs = getInvoiceListActionDefs(invoiceBaseArgs)

  assert.equal(defs.length, 9, 'baseline invoice sheet exposes exactly nine tiles')
  assert.deepEqual(
    defs.map((def) => def.key),
    ['edit', 'project', 'documents', 'payment', 'clone', 'quote', 'csr', 'waybill', 'archive'],
  )
  assert.ok(!defs.some((def) => def.key === 'view'), 'View must no longer be a sheet action')
})

test('invoice list keeps its conditional visibility rules after removing View', () => {
  const paid = getInvoiceListActionDefs({ ...invoiceBaseArgs, isPaid: true })
  assert.ok(!paid.some((def) => def.key === 'payment'), 'paid invoices hide Payment')

  const standalone = getInvoiceListActionDefs({ ...invoiceBaseArgs, isStandalone: true })
  assert.ok(standalone.some((def) => def.key === 'advance'), 'standalone invoices offer Advance')
})

test('invoice delete stays a separate destructive action at the bottom', () => {
  const deleteDef = getInvoiceListDeleteActionDef()
  assert.equal(deleteDef.key, 'delete')
  assert.equal(deleteDef.label, 'Delete Invoice')

  const listKeys = getInvoiceListActionDefs(invoiceBaseArgs).map((def) => def.key)
  assert.ok(!listKeys.includes('delete'), 'delete is never part of the tiled actions')
})

// ── Objective 2: Quotation list action sheet ───────────────────────────────

test('quotation list sheet removes View and puts Convert to Invoice in its position', () => {
  const defs = getQuotationListActionDefs({
    projectActionLabel: 'Link to Project',
    hasProject: false,
    documentActionLabel: 'Link Documents',
    hasLinkedDocuments: false,
  })

  assert.equal(defs.length, 6, 'quotation sheet must stay exactly six tiles')
  assert.deepEqual(
    defs.map((def) => def.key),
    ['convert', 'edit', 'project', 'documents', 'clone', 'archive'],
  )
  assert.equal(defs[0].key, 'convert', 'Convert to Invoice occupies the former View slot')
  assert.ok(!defs.some((def) => def.key === 'view'), 'View must no longer be a sheet action')
})

// ── Action-sheet grid composition ──────────────────────────────────────────

test('unified action sheet renders both six and nine tiles as three-column grids', () => {
  const source = read(unifiedActionSheetPath)
  assert.match(source, /grid grid-cols-3 gap-2/, 'nine/ six tiles share the three-column grid')
  assert.match(source, /grid grid-cols-2 gap-2/, 'the four-tile special case is preserved')
})

test('quotation sheet derives its tiles from the shared defs with a separate delete action', () => {
  const sheetSource = read(invoiceListActionSheetPath)
  assert.match(sheetSource, /layout="grid"/)

  const quotationSource = read(quotationListPath)
  // Tiles come from the shared builder; delete stays a separate bottom action.
  assert.match(quotationSource, /getQuotationListActionDefs\(/)
  assert.match(quotationSource, /deleteAction=\{activeQuotation \? \{/)
})

// ── Objective 1: shared Mobile×Fold sidebar toggle ─────────────────────────

test('every ModuleShell list surface leads with the production sidebar toggle', () => {
  const shell = read(moduleShellPath)

  assert.match(shell, /onMenuClick=\{mobileChrome\.openSidebar\}/)
  assert.match(shell, /\bisHome\b/, 'ModuleShell marks its header as a home/list surface')
  assert.doesNotMatch(
    shell,
    /isHome=\{mobileChrome\.dashboard\}/,
    'list surfaces must not fall back to history Back',
  )
})

test('shared mobile header keeps the sidebar toggle and the Back fallback', () => {
  const header = read(mobileHeaderPath)

  assert.match(header, /aria-label="Open navigation menu"/, 'home/list surfaces expose the drawer toggle')
  assert.match(header, /SidebarToggleIcon/)
  assert.match(header, /onClick=\{onMenuClick\}/)
  assert.match(header, /aria-label="Go back"/, 'nested surfaces keep the Back control')
  assert.match(header, /navigate\(-1\)/, 'Back falls back to history navigation')
})

test('invoice and quotation list pages render the shared list shell', () => {
  assert.match(read(invoiceListPath), /from ["']@\/components\/layout\/ModuleShell["']/)
  assert.match(read(quotationListPath), /from ["']@\/components\/layout\/ModuleShell["']/)
})

test('new and edit form pages keep their own Back behavior (no list shell)', () => {
  for (const formPath of [
    'src/pages/NewInvoice.tsx',
    'src/pages/EditInvoice.tsx',
    'src/pages/NewQuotation.tsx',
    'src/pages/EditQuotation.tsx',
    'src/pages/QuotationFormPage.tsx',
    'src/pages/InvoiceFormPage.tsx',
  ]) {
    assert.doesNotMatch(read(formPath), /ModuleShell/, `${formPath} must not use the list shell header`)
  }
})

// ── View preservation and conversion wiring ────────────────────────────────

test('invoice list card tap still opens the invoice view', () => {
  const source = read(invoiceListPath)
  assert.match(source, /onClick=\{\(\) => navigate\(`\/invoices\/\$\{invoice\.id\}`\)\}/)
  assert.doesNotMatch(source, /handleView/, 'the removed View handler is gone')
  assert.doesNotMatch(source, /eye:/, 'no orphaned View icon mapping remains')
})

test('quotation list card tap still opens the quotation view', () => {
  const source = read(quotationListPath)
  assert.match(source, /onClick=\{\(\) => navigate\(`\/quotations\/\$\{quotation\.id\}`\)\}/)
})

test('quotation conversion reuses the production entry point on the selected id', () => {
  const source = read(quotationListPath)

  assert.match(source, /import \{ convertQuotationToInvoice \} from '@\/pages\/view-quotation-actions'/)
  assert.match(source, /convert: \(\) => setConvertId\(activeQuotation\.id\)/)
  assert.match(source, /if \(convertId\) void handleConvert\(convertId\)/)
  assert.match(source, /await convertQuotationToInvoice\(/)
  // Must not spin up a parallel conversion engine or a view-bound hook.
  assert.doesNotMatch(source, /from '@\/hooks\/useQuotationActions'/)
})

test('non-View invoice and quotation actions remain wired', () => {
  const invoiceSource = read(invoiceListPath)
  for (const key of ['edit', 'project', 'documents', 'payment', 'clone', 'quote', 'csr', 'waybill', 'archive']) {
    assert.match(invoiceSource, new RegExp(`\\b${key}:`), `invoice handler for ${key} is still present`)
  }

  const quotationSource = read(quotationListPath)
  for (const key of ['convert', 'edit', 'project', 'documents', 'clone', 'archive']) {
    assert.match(quotationSource, new RegExp(`\\b${key}:`), `quotation handler for ${key} is still present`)
  }
})
