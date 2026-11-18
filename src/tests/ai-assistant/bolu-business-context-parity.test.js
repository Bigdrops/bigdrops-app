import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDocumentCreateProposal,
  buildInvoiceModifyProposal,
  computeAuthoritativeTotals,
  validateBoluExtraCharges,
  validateInvoiceCreateInput,
  withClarificationAnswer,
  withClientResolution,
  withProposalClient,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  matchBoluIntent,
  matchBoluWriteContext,
} from '../../lib/ai-assistant/bolu-capabilities.ts'
import { persistQuotationModification } from '../../lib/ai-assistant/bolu-document-service.ts'

const PARITY_ITEMS = [{ description: 'Cable', quantity: 1, unit_price: 100000 }]

// ── Context discovery on write intents ─────────────────────────────────────

test('write intent keeps context discovery separate from intent classification', () => {
  // Read-intent classification still refuses to hijack a write.
  assert.equal(matchBoluIntent('create an invoice for Solwood Ventures'), null)

  const create = matchBoluWriteContext('create an invoice for Solwood Ventures with 10 cables')
  assert.equal(create.targetFamily, 'invoice')
  assert.equal(create.clientHint, 'Solwood Ventures')

  const edit = matchBoluWriteContext('edit the quotation for Mike')
  assert.equal(edit.targetFamily, 'quotation')
  assert.equal(edit.clientHint, 'Mike')
})

// ── Custom charges and financial correctness ───────────────────────────────

test('custom charges keep their tax treatment in the authoritative calculation', () => {
  const base = computeAuthoritativeTotals(PARITY_ITEMS)
  const taxed = computeAuthoritativeTotals(PARITY_ITEMS, {
    extraCharges: [{ label: 'Installation fee', value: 10000, vatApplicable: true }],
  })
  const untaxed = computeAuthoritativeTotals(PARITY_ITEMS, {
    extraCharges: [{ label: 'Transport', value: 10000, vatApplicable: false }],
  })

  assert.equal(base.vat, 7500)
  assert.equal(base.totalPayable, 107500)

  // A taxable custom charge grows the VAT base; a non-taxable one does not.
  assert.equal(taxed.vat, 8250)
  assert.equal(taxed.extraChargesTotal, 10000)
  assert.equal(taxed.totalPayable, 118250)

  assert.equal(untaxed.vat, 7500)
  assert.equal(untaxed.extraChargesTotal, 10000)
  assert.equal(untaxed.totalPayable, 117500)
})

test('fixed commercial charges stay separate from custom charges and are not taxed', () => {
  const base = computeAuthoritativeTotals(PARITY_ITEMS)
  const fixed = computeAuthoritativeTotals(PARITY_ITEMS, {
    fixedCharges: { workmanship: 5000, transportation: 10000, shipping: 2500 },
  })

  assert.equal(fixed.extraChargesTotal, 17500)
  assert.equal(fixed.vat, base.vat)
  assert.equal(fixed.totalPayable, base.totalPayable + 17500)
})

test('extra charges survive validation and proposal construction with their tax flags', () => {
  const validation = validateInvoiceCreateInput({
    client_name: 'Tecno Power',
    items: PARITY_ITEMS,
    extra_charges: [
      { name: 'Transport', amount: 5670, withTax: false },
      { name: 'Installation fee', amount: 1000, withTax: true },
    ],
  })
  assert.equal(validation.valid, true)
  assert.equal(validation.data.extra_charges.length, 2)
  assert.equal(validation.data.extra_charges[0].vatApplicable, false)
  assert.equal(validation.data.extra_charges[1].vatApplicable, true)

  const proposal = buildDocumentCreateProposal('invoice', validation.data)
  assert.equal(proposal.payload.extra_charges[0].label, 'Transport')
  assert.equal(proposal.payload.extra_charges[1].vatApplicable, true)
  assert.equal(proposal.computedTotals.extraChargesTotal, 6670)
  // A charge is never converted into an ordinary taxable line item.
  assert.equal(proposal.payload.items.length, 1)
})

test('extra charge aliases keep the canonical shape and reject invalid entries', () => {
  const canonical = validateBoluExtraCharges([{ name: 'Transport', amount: 5670, withTax: false }])
  assert.equal(canonical.valid, true)
  assert.deepEqual(canonical.data[0], { label: 'Transport', value: 5670, vatApplicable: false })

  const alias = validateBoluExtraCharges([{ label: 'Fee', value: 100, vatApplicable: true }])
  assert.equal(alias.valid, true)
  assert.equal(alias.data[0].vatApplicable, true)

  const invalid = validateBoluExtraCharges([{ name: '', amount: -5 }])
  assert.equal(invalid.valid, false)
  assert.equal(invalid.data.length, 0)
})

// ── Invoice and quotation field parity ─────────────────────────────────────

test('invoice and quotation proposals keep separate identities and verified fields', () => {
  const payload = {
    client_name: 'Tecno Power',
    items: PARITY_ITEMS,
    title: 'Installation of 100KVA transformer',
    po_number: 'PO-77',
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    work_duration: '2 weeks',
    workmanship: 5000,
    transportation: 5670,
    shipping: 1000,
    discount: 500,
    discount_type: 'fixed',
    wht: 2,
    wht_type: 'percent',
  }

  const invoice = buildDocumentCreateProposal('invoice', payload)
  const quotation = buildDocumentCreateProposal('quotation', payload)

  assert.equal(invoice.documentFamily, 'invoice')
  assert.equal(invoice.candidateNumber, 'INV-DRAFT')
  assert.equal(invoice.requiredPermission.resource, 'invoice')

  assert.equal(quotation.documentFamily, 'quotation')
  assert.equal(quotation.candidateNumber, 'QTN-DRAFT')
  assert.equal(quotation.requiredPermission.resource, 'quotation')

  for (const proposal of [invoice, quotation]) {
    assert.equal(proposal.payload.title, payload.title)
    assert.equal(proposal.payload.po_number, payload.po_number)
    assert.equal(proposal.payload.project_id, payload.project_id)
    assert.equal(proposal.payload.work_duration, payload.work_duration)
    assert.equal(proposal.payload.workmanship, 5000)
    assert.equal(proposal.payload.transportation, 5670)
    assert.equal(proposal.payload.shipping, 1000)
    assert.equal(proposal.payload.discount, 500)
    assert.equal(proposal.payload.discount_type, 'fixed')
    assert.equal(proposal.payload.wht_type, 'percent')
  }
})

test('line-item fields survive validation and proposal construction', () => {
  const validation = validateInvoiceCreateInput({
    client_name: 'Tecno Power',
    items: [
      {
        description: 'Cable',
        quantity: 2,
        unit_price: 700,
        unit: 'rolls',
        sub_description: '2.5mm copper',
        make: 'Nexans',
        discount_rate: 5,
        install_rate: 100,
        install_rate_taxable: true,
        item_id: '223e4567-e89b-12d3-a456-426614174000',
        group_name: 'Cabling',
      },
    ],
  })
  assert.equal(validation.valid, true)

  const item = validation.data.items[0]
  assert.equal(item.unit, 'rolls')
  assert.equal(item.sub_description, '2.5mm copper')
  assert.equal(item.make, 'Nexans')
  assert.equal(item.discount_rate, 5)
  assert.equal(item.install_rate, 100)
  assert.equal(item.install_rate_taxable, true)
  assert.equal(item.item_id, '223e4567-e89b-12d3-a456-426614174000')
  assert.equal(item.group_name, 'Cabling')

  const proposal = buildDocumentCreateProposal('quotation', validation.data)
  assert.equal(proposal.payload.items[0].make, 'Nexans')
  assert.equal(proposal.payload.items[0].sub_description, '2.5mm copper')
})

// ── Client resolution and contextual clarification ─────────────────────────

test('verified client selection preserves the pending draft and its other questions', () => {
  const proposal = buildDocumentCreateProposal(
    'quotation',
    {
      client_name: 'Mike',
      items: PARITY_ITEMS,
      title: 'Site cabling',
      extra_charges: [{ label: 'Transport', value: 5670, vatApplicable: false }],
    },
    'QTN-DRAFT',
    {
      status: 'ambiguous',
      query: 'Mike',
      matches: [
        { id: 'c-1', name: 'Michael Okonjo' },
        { id: 'c-2', name: 'Mike Adeyemi' },
      ],
    },
  )
  proposal.clarification = {
    id: 'clarify-test',
    reason: 'Multiple clients match "Mike".',
    questions: [
      { id: 'client', prompt: 'Which client?', options: [], allowFreeText: true },
      { id: 'date', prompt: 'Which date?', options: [{ id: 'today', label: 'Today' }], allowFreeText: false },
    ],
  }

  const updated = withProposalClient(proposal, { id: 'c-1', name: 'Michael Okonjo' })

  assert.equal(updated.opId, proposal.opId)
  assert.equal(updated.status, 'pending_approval')
  assert.equal(updated.payload.client_id, 'c-1')
  assert.equal(updated.payload.client_name, 'Michael Okonjo')
  assert.equal(updated.payload.title, 'Site cabling')
  assert.equal(updated.payload.extra_charges[0].value, 5670)
  assert.equal(updated.payload.items.length, 1)
  assert.equal(updated.computedTotals.total, proposal.computedTotals.total)
  assert.equal(updated.clientResolution.status, 'resolved')
  assert.deepEqual(updated.clarification.questions.map((question) => question.id), ['date'])
})

test('a clarification answer updates the draft and never authorizes the save', () => {
  const proposal = buildDocumentCreateProposal('invoice', {
    client_name: 'Tecno Power',
    items: PARITY_ITEMS,
  })
  proposal.clarification = {
    id: 'clarify-date',
    reason: 'The document date is ambiguous.',
    questions: [
      { id: 'date', prompt: 'Which issue date?', options: [{ id: 'today', label: 'Today' }], allowFreeText: true },
    ],
  }

  const answered = withClarificationAnswer(proposal, 'date', 'Today')
  assert.equal(answered.status, 'pending_approval')
  assert.equal(answered.clarificationAnswers.date, 'Today')
  assert.equal(answered.clarification, undefined)

  // A stale answer for a question that is no longer present changes nothing.
  const stale = withClarificationAnswer(answered, 'date', 'Tomorrow')
  assert.equal(stale, answered)
})

test('unresolved client outcomes keep the proposal and offer a way forward', () => {
  const proposal = buildDocumentCreateProposal('invoice', {
    client_name: 'Mike',
    items: PARITY_ITEMS,
  })

  const ambiguous = withClientResolution(proposal, {
    status: 'ambiguous',
    query: 'Mike',
    matches: [
      { id: 'c-1', name: 'Michael Okonjo' },
      { id: 'c-2', name: 'Mike Adeyemi' },
    ],
  })
  assert.equal(ambiguous.status, 'pending_approval')
  assert.equal(ambiguous.payload.items.length, 1)
  assert.equal(ambiguous.clarification.questions[0].options.length, 2)

  const notFound = withClientResolution(proposal, { status: 'not_found', query: 'Mike' })
  assert.equal(notFound.clarification.questions[0].allowFreeText, true)
  assert.equal(notFound.payload.items.length, 1)

  const failed = withClientResolution(proposal, {
    status: 'search_error',
    query: 'Mike',
    error: 'timeout',
  })
  assert.equal(failed.clientResolution.status, 'search_error')
  assert.equal(failed.payload.items.length, 1)
  assert.equal(failed.status, 'pending_approval')
})

// ── Quotation modification keeps both gates ────────────────────────────────

test('quotation modification fails closed before Gate 2 approval', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'tenant_test',
    from() { throw new Error('must not query before approval') },
    rpc() { throw new Error('must not write before approval') },
  }
  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: '123e4567-e89b-12d3-a456-426614174000',
    targetDocumentNumber: 'QTN-0042',
    documentFamily: 'quotation',
    field: 'notes',
    oldValue: 'old',
    newValue: 'new',
  })

  const result = await persistQuotationModification(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
  )
  assert.equal(result.success, false)
  assert.match(result.error, /Gate 1/i)
})
