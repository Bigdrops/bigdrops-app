import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  INVOICE_DESCRIPTOR,
  QUOTATION_DESCRIPTOR,
  resolveDocumentDescriptor,
} from '../../components/document/documentDescriptor.ts'

// This suite guards PHASE B — the shared document form's move from a binary
// `isQuotation` boolean to a typed document-family descriptor.
//
// The behaviours it protects:
//   - every Invoice and Quotation label renders exactly the wording it rendered
//     before the refactor;
//   - family classification still resolves from the same inputs;
//   - the shared form no longer makes any document-family decision from a
//     boolean, and owns no client-specific column name;
//   - the party picker is an injectable slot, so a future Supplier PO can supply
//     `supplier_id` / `supplier_name` without editing the shared form again;
//   - protected business-rule branches (edit-mode party lock, totals ordering,
//     save wiring) survive untouched.
//
// Label data and the resolver are exercised directly. Component wiring and
// placement are asserted against source text, because these components rely on
// runtime providers that are out of scope for the critical harness.

const read = (relative) => fs.readFileSync(path.resolve(relative), 'utf8')

const sharedFormPath = 'src/components/document/SharedDocumentForm.tsx'
const formHeaderPath = 'src/components/document/FormHeader.tsx'
const formCommercialTermsPath = 'src/components/document/FormCommercialTerms.tsx'
const formLineItemsPath = 'src/components/document/FormLineItems.tsx'
const descriptorPath = 'src/components/document/documentDescriptor.ts'
const clientPartySelectorPath = 'src/components/document/ClientPartySelector.tsx'
const waybillFormPath = 'src/components/waybill/WaybillForm.tsx'
const clientSelectorPath = 'src/components/ClientSelector.tsx'

// ── Objective 1: existing labels are byte-identical ────────────────────────

test('the invoice descriptor preserves every historical Invoice label', () => {
  assert.equal(INVOICE_DESCRIPTOR.family, 'invoice')
  assert.equal(INVOICE_DESCRIPTOR.title, 'Invoice')
  assert.equal(INVOICE_DESCRIPTOR.unsavedMeta, 'New invoice')
  assert.equal(INVOICE_DESCRIPTOR.titleFieldLabel, 'Invoice Title')
  assert.equal(INVOICE_DESCRIPTOR.titleFieldPlaceholder, 'e.g. Monthly Maintenance')
  assert.equal(INVOICE_DESCRIPTOR.numberLabel, 'Invoice No.')
  assert.equal(INVOICE_DESCRIPTOR.issueDateLabel, 'Issue Date')
  assert.equal(INVOICE_DESCRIPTOR.dueDateLabel, 'Due Date')
  assert.equal(INVOICE_DESCRIPTOR.paymentHeadline, 'When this invoice is due')
  assert.equal(INVOICE_DESCRIPTOR.paymentNotePlaceholder, 'e.g. Due in 14 days')
})

test('the quotation descriptor preserves every historical Quotation label', () => {
  assert.equal(QUOTATION_DESCRIPTOR.family, 'quotation')
  assert.equal(QUOTATION_DESCRIPTOR.title, 'Quotation')
  assert.equal(QUOTATION_DESCRIPTOR.unsavedMeta, 'New quotation')
  assert.equal(QUOTATION_DESCRIPTOR.titleFieldLabel, 'Quotation Title')
  assert.equal(QUOTATION_DESCRIPTOR.titleFieldPlaceholder, 'e.g. Website Overhaul')
  assert.equal(QUOTATION_DESCRIPTOR.numberLabel, 'Quotation No.')
  assert.equal(QUOTATION_DESCRIPTOR.issueDateLabel, 'Quotation Date')
  assert.equal(QUOTATION_DESCRIPTOR.dueDateLabel, 'Valid Until')
  assert.equal(QUOTATION_DESCRIPTOR.paymentHeadline, 'When this quotation is due')
  assert.equal(QUOTATION_DESCRIPTOR.paymentNotePlaceholder, 'e.g. 14 days validity')
})

test('both sales families keep identical client party terminology', () => {
  for (const descriptor of [INVOICE_DESCRIPTOR, QUOTATION_DESCRIPTOR]) {
    assert.equal(descriptor.party.term, 'Client')
    assert.equal(descriptor.party.roleHint, 'Bill to · Client')
    assert.equal(descriptor.party.emptyLabel, 'Select a client')
    assert.equal(descriptor.party.noneLabel, 'No client selected')
    assert.equal(descriptor.party.selectedAriaPrefix, 'Client')
    assert.equal(descriptor.party.clearAriaLabel, 'Clear client')
    assert.equal(descriptor.party.idField, 'client_id')
    assert.equal(descriptor.party.nameField, 'client_name')
  }
})

// ── Objective 2: classification parity with the retired boolean ────────────

test('descriptor resolution matches the retired binary rule exactly', () => {
  // document_type wins when present.
  assert.equal(resolveDocumentDescriptor({ documentType: 'quotation' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ documentType: 'QUOTATION' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ documentType: 'quotation_draft' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ documentType: 'invoice' }).family, 'invoice')

  // Title is the first fallback.
  assert.equal(resolveDocumentDescriptor({ title: 'New Quotation' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ title: 'Edit Quotation' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ title: 'New Invoice' }).family, 'invoice')

  // Mode label is the second fallback.
  assert.equal(resolveDocumentDescriptor({ modeLabel: 'Quotation sent' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ modeLabel: 'Draft' }).family, 'invoice')

  // No signal at all stays an invoice, exactly as the old default branch.
  assert.equal(resolveDocumentDescriptor({}).family, 'invoice')
  assert.equal(
    resolveDocumentDescriptor({ documentType: null, title: undefined, modeLabel: '' }).family,
    'invoice',
  )
})

// ── Objective 3: the binary is gone from the shared form family ────────────

test('no shared-form file branches on a binary document flag any more', () => {
  for (const file of [sharedFormPath, formHeaderPath, formCommercialTermsPath, formLineItemsPath]) {
    assert.doesNotMatch(read(file), /isQuotation/, `${file} must be descriptor-driven`)
  }
})

test('each section reads its labels from the descriptor instead of literals', () => {
  const header = read(formHeaderPath)
  assert.match(header, /import type \{ DocumentDescriptor \} from '\.\/documentDescriptor'/)
  for (const field of [
    'unsavedMeta',
    'titleFieldLabel',
    'titleFieldPlaceholder',
    'numberLabel',
    'issueDateLabel',
    'dueDateLabel',
  ]) {
    assert.match(header, new RegExp(`descriptor\\.${field}`), `FormHeader must use descriptor.${field}`)
  }
  for (const field of [
    'term',
    'roleHint',
    'emptyLabel',
    'selectedAriaPrefix',
    'clearAriaLabel',
    'idField',
    'nameField',
  ]) {
    assert.match(header, new RegExp(`descriptor\\.party\\.${field}`), `FormHeader must use party.${field}`)
  }
  // Clearing the party writes through the descriptor-bound keys.
  assert.match(header, /updateInvoice\(descriptor\.party\.idField, ''\)/)
  assert.match(header, /updateInvoice\(descriptor\.party\.nameField, ''\)/)

  const terms = read(formCommercialTermsPath)
  assert.match(terms, /import type \{ DocumentDescriptor \} from '\.\/documentDescriptor'/)
  assert.match(terms, /descriptor\.paymentHeadline/)
  assert.match(terms, /descriptor\.paymentNotePlaceholder/)
})

// ── Objective 4: party selector extension point ───────────────────────────

test('the party picker is an injectable slot and the form names no client column', () => {
  const shared = read(sharedFormPath)

  // The picker is injected, defaulting to the ClientSelector-backed adapter.
  assert.match(shared, /import ClientPartySelector from '\.\/ClientPartySelector'/)
  assert.match(shared, /props\.partySelector \|\| ClientPartySelector/)
  assert.match(shared, /const PartySelector: PartySelectorComponent/)
  assert.match(shared, /<PartySelector/)

  // The shared form no longer reaches for ClientSelector itself.
  assert.doesNotMatch(shared, /from '@\/components\/ClientSelector'/)

  // Party persistence keys are read from the descriptor, never hardcoded.
  assert.match(shared, /updateInvoice\(descriptor\.party\.idField, id\)/)
  assert.match(shared, /updateInvoice\(descriptor\.party\.nameField, name\)/)
  assert.match(shared, /partyId=\{invoice\[descriptor\.party\.idField\] \|\| null\}/)
  assert.match(shared, /partyName=\{invoice\[descriptor\.party\.nameField\] \|\| ''\}/)
  assert.doesNotMatch(shared, /updateInvoice\('client_id'/)
  assert.doesNotMatch(shared, /updateInvoice\('client_name'/)
  assert.doesNotMatch(shared, /invoice\.client_id/)
  assert.doesNotMatch(shared, /invoice\.client_name/)

  // The whole descriptor can be overridden, so a future family needs no edit.
  assert.match(shared, /props\.descriptor \|\|/)
  assert.match(shared, /resolveDocumentDescriptor\(\{ documentType: invoice\.document_type, title, modeLabel \}\)/)
})

test('the desktop rail renders the party from the descriptor too', () => {
  const shared = read(sharedFormPath)

  assert.match(shared, /party: DocumentPartyDescriptor/)
  assert.match(shared, /const partyName = String\(invoice\[descriptor\.party\.nameField\] \|\| ''\)/)
  assert.match(shared, /party=\{descriptor\.party\}/)
  assert.match(shared, /partyName=\{partyName\}/)
  assert.match(shared, /\{partyName \|\| party\.noneLabel\}/)
  // The rail no longer mutates a client-named prop or literal.
  assert.doesNotMatch(shared, /clientName=\{clientName\}/)
})

test('the default party slot adapts client props onto the neutral contract', () => {
  const slot = read(clientPartySelectorPath)

  assert.match(slot, /import ClientSelector from '@\/components\/ClientSelector'/)
  assert.match(slot, /import type \{ PartySelectorSlotProps \} from '\.\/documentDescriptor'/)
  assert.match(slot, /partyId,/)
  assert.match(slot, /partyName,/)
  assert.match(slot, /onPartyChange,/)
  assert.match(slot, /clientId=\{partyId\}/)
  assert.match(slot, /clientName=\{partyName\}/)
  assert.match(slot, /onClientChange=\{\(id, name\) => onPartyChange\(id, name\)\}/)
})

test('the client selector contract is unchanged by this refactor', () => {
  const clientSelector = read(clientSelectorPath)

  assert.match(clientSelector, /clientId\?: string \| null/)
  assert.match(clientSelector, /clientName\?: string \| null/)
  assert.match(clientSelector, /onClientChange: \(clientId: string, clientName: string/)
})

test('the descriptor module stays a pure, JSX-free data module', () => {
  const source = read(descriptorPath)

  // No app-module imports and no rendered output: the critical harness loads
  // this module directly under Node, which does not transpile JSX.
  assert.doesNotMatch(source, /from '@\//)
  assert.doesNotMatch(source, /className=/)
  assert.doesNotMatch(source, /\.tsx/)
  assert.match(source, /import type \{ ComponentType \} from 'react'/)
  assert.match(source, /export const INVOICE_DESCRIPTOR: DocumentDescriptor/)
  assert.match(source, /export const QUOTATION_DESCRIPTOR: DocumentDescriptor/)
})

// ── Objective 5: protected business-rule branches survive ──────────────────

test('protected business-rule branches survive the extraction', () => {
  const shared = read(sharedFormPath)

  // Party identity stays immutable in edit mode: a lifecycle rule, not a family rule.
  assert.match(shared, /const handlePartyChange = useCallback/)
  assert.match(shared, /if \(props\.mode === 'edit'\) return/)
  assert.match(shared, /props\.mode === 'edit' \? false : showClientPicker/)
  assert.match(shared, /props\.mode === 'edit' \? \(\) => \{\} : setShowClientPicker/)

  // Financial inputs and totals ordering are still the same single source.
  assert.match(shared, /const summaryRows = \[/)
  assert.match(shared, /rawSubtotal/)
  assert.match(shared, /whtAmount/)
  assert.match(shared, /totalPayable=\{totalPayable\}/)
  assert.match(shared, /finalLabel="Grand Total"/)

  // Top bar and rail both take their title from the descriptor.
  assert.equal((shared.match(/title=\{descriptor\.title\}/g) || []).length, 2)

  const header = read(formHeaderPath)
  // Field locking in edit mode is preserved.
  assert.match(header, /onClick=\{isEdit \? \(\) => onLockedFieldClick\?\.\('client'\) : onOpenClientPicker\}/)
  assert.match(header, /onLockedFieldClick\?\.\('invoice_number'\)/)
  // The shared persistence contract for numbers and dates is untouched.
  assert.match(header, /value=\{invoice\.issue_date \|\| ''\}/)
  assert.match(header, /value=\{invoice\.due_date \|\| ''\}/)
  assert.match(header, /updateInvoice\('issue_date', next\)/)
  assert.match(header, /updateInvoice\('due_date', next\)/)
})

test('the dead binary prop is gone from the line-item section and its call sites', () => {
  assert.doesNotMatch(read(formLineItemsPath), /isQuotation/)
  assert.doesNotMatch(read(waybillFormPath), /isQuotation/)
})

test('no purchase-order implementation is introduced by this phase', () => {
  const descriptors = [INVOICE_DESCRIPTOR, QUOTATION_DESCRIPTOR]
  for (const descriptor of descriptors) {
    assert.notEqual(descriptor.family, 'purchase_order')
  }

  const sources = [sharedFormPath, formHeaderPath, formCommercialTermsPath, formLineItemsPath]
    .map(read)
    .join('\n')
  assert.doesNotMatch(sources, /supplier_id/)
  assert.doesNotMatch(sources, /purchase_?order/i)
  assert.doesNotMatch(sources, /SupplierSelector/)
})
