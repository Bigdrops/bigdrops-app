import test from 'node:test'
import assert from 'node:assert/strict'

import {
  notificationOwnerTable,
  isEntityBound,
  isNotificationVisibleInTenant,
  groupNotificationIdsByTable,
} from '../../domain/notifications/notificationScope.ts'

test('owner table mapping covers routed entity types', () => {
  assert.equal(notificationOwnerTable('invoice'), 'invoices')
  assert.equal(notificationOwnerTable('payment'), 'invoices')
  assert.equal(notificationOwnerTable('quotation'), 'quotations')
  assert.equal(notificationOwnerTable('quote'), 'quotations')
  assert.equal(notificationOwnerTable('csr'), 'csrs')
  assert.equal(notificationOwnerTable('rfq'), 'rfqs')
  assert.equal(notificationOwnerTable('waybill'), 'waybills')
  assert.equal(notificationOwnerTable('letter'), 'letters')
  assert.equal(notificationOwnerTable('project'), 'projects')
  assert.equal(notificationOwnerTable('client'), 'clients')
  assert.equal(notificationOwnerTable('INVOICE'), 'invoices')
  assert.equal(notificationOwnerTable('mystery'), null)
  assert.equal(notificationOwnerTable(null), null)
})

test('genuinely global rows (no entity reference) stay visible', () => {
  assert.equal(isNotificationVisibleInTenant({ entity_type: null, entity_id: null }, {}), true)
  assert.equal(
    isNotificationVisibleInTenant({ entity_type: 'invoice', entity_id: null }, {}),
    true,
  )
})

test('Main invoice notification is hidden under another entity', () => {
  const row = { entity_type: 'invoice', entity_id: 'inv-main-1' }
  const mainTenant = { invoices: new Set(['inv-main-1']) }
  const otherTenant = { invoices: new Set(['inv-other-9']) }
  assert.equal(isNotificationVisibleInTenant(row, mainTenant), true)
  assert.equal(isNotificationVisibleInTenant(row, otherTenant), false)
  assert.equal(isNotificationVisibleInTenant(row, {}), false)
})

test('unknown entity types fail closed', () => {
  assert.equal(
    isNotificationVisibleInTenant(
      { entity_type: 'mystery', entity_id: 'x-1' },
      { invoices: new Set(['x-1']) },
    ),
    false,
  )
})

test('grouping collects ids per table without duplicates', () => {
  const groups = groupNotificationIdsByTable([
    { entity_type: 'invoice', entity_id: 'a' },
    { entity_type: 'invoice', entity_id: 'a' },
    { entity_type: 'invoice', entity_id: 'b' },
    { entity_type: 'quotation', entity_id: 'q1' },
    { entity_type: null, entity_id: null },
    { entity_type: 'mystery', entity_id: 'z' },
  ])
  assert.deepEqual(groups, { invoices: ['a', 'b'], quotations: ['q1'] })
})

test('entity binding detection', () => {
  assert.equal(isEntityBound({ entity_type: 'invoice', entity_id: 'a' }), true)
  assert.equal(isEntityBound({ entity_type: 'invoice', entity_id: null }), false)
  assert.equal(isEntityBound({ entity_type: null, entity_id: null }), false)
})
