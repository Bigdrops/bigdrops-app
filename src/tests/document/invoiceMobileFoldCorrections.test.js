import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { makeEmptyGroup, makeEmptyItem } from '../../domain/invoice/factories.ts'
import { syncGroupsFromItems } from '../../domain/invoice/normalize.ts'

const hookPath = path.resolve('src/hooks/useInvoiceEditableState.ts')
const totalsPath = path.resolve('src/components/document/FormTotals.tsx')
const itemCardPath = path.resolve('src/components/invoice/MobileItemCard.tsx')

// Builds the exact row pair invoice addGroup appends: one header plus one
// member sharing a single group id.
function buildGroupedPair() {
  const group = { ...makeEmptyGroup(), name: 'Group 1' }
  const header = {
    ...makeEmptyItem(),
    row_type: 'group_header',
    group_id: group.id,
    group_name: group.name,
  }
  const member = {
    ...makeEmptyItem(),
    row_type: 'standard',
    group_id: group.id,
    group_name: group.name,
  }
  return { group, header, member }
}

test('invoice groups carry one stable id shared by header and member rows', () => {
  const { group, header, member } = buildGroupedPair()

  assert.ok(typeof group.id === 'string' && group.id.length > 0)
  assert.equal(header.group_id, group.id)
  assert.equal(member.group_id, group.id)
})

test('invoice group deletion drops the header and detaches members', () => {
  const { group, header, member } = buildGroupedPair()
  const groupId = group.id

  // Mirrors the deleteGroup contract in useInvoiceEditableState: the header
  // row is removed and surviving members are detached (group_id null) so
  // they continue as ordinary ungrouped line items.
  const nextItems = [header, member]
    .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
    .map((item, itemIndex) =>
      item.group_id === groupId
        ? { ...item, group_id: null, group_name: '', sort_order: itemIndex }
        : { ...item, sort_order: itemIndex },
    )

  assert.ok(nextItems.every((item) => item.row_type !== 'group_header'))
  assert.ok(nextItems.every((item) => item.group_id !== groupId))
  assert.equal(nextItems.length, 1)

  // The groups array re-syncs from items, so the removed group converges to
  // gone instead of resurrecting on the next render.
  assert.deepEqual(syncGroupsFromItems(nextItems, [group]), [])
})

test('invoice addGroup performs sibling state updates (StrictMode purity)', () => {
  const source = fs.readFileSync(hookPath, 'utf8')
  const start = source.indexOf('const addGroup = useCallback')
  const end = source.indexOf('const updateGroupName', start)
  assert.ok(start !== -1 && end !== -1 && end > start)
  const body = source.slice(start, end)

  // A state setter nested inside another setter's updater runs twice under
  // React StrictMode double-invocation: addGroup would append two
  // header/member pairs for one click, rendering duplicate group cards under
  // the same group key so deletion can no longer reconcile cleanly.
  // Quotation's ref-based commits never nest; invoice must match that shape.
  assert.doesNotMatch(body, /setGroups\(\(current\) => \{/)
  assert.match(body, /setGroups\(\(current\) =>/)
  assert.match(body, /setItems\(\(prev\) =>/)
})

test('invoice totals reports VAT instead of editing it', () => {
  const source = fs.readFileSync(totalsPath, 'utf8')

  // Commercial Terms owns VAT configuration. Totals must not carry a second
  // editor for the same invoice.vat state.
  assert.doesNotMatch(source, /updateInvoice\('vat'/)
  assert.doesNotMatch(source, /showVatAdjust/)
  assert.match(source, /cps-sumline/)
  assert.match(source, /cps-sumtotal/)
})

test('invoice line-item subtotal renders as a calculated result', () => {
  const source = fs.readFileSync(itemCardPath, 'utf8')

  // Subtotal is computed, never typed: it must not look like an input.
  assert.match(source, /cps-fcell tsp bd-result/)
  assert.match(source, />Subtotal</)
  assert.doesNotMatch(source, /Subtotal<\/span>\s*<div className="cps-field mono"/)
})
