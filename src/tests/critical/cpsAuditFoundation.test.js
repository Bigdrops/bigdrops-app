import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  CPS_AUDIT_META_KEY,
  CPS_AUDIT_SOURCE,
  buildCpsAuditMeta,
  buildCpsEditMeta,
  cpsAuditActionForEvent,
  cpsRowIdentity,
  diffCpsDocuments,
} from '@/domain/cps/auditDiff'
import {
  buildAuditTrailItems,
  buildCpsChangeGroups,
  extractCpsAuditMeta,
} from '@/domain/audit/auditFormatters'

function row(overrides) {
  return {
    row_type: 'item',
    sort_order: 0,
    section_title: '',
    description: '',
    specification: '',
    quantity: 1,
    unit: 'pcs',
    notes: '',
    make_brand: '',
    cp: '0',
    sp: '0',
    image_url: null,
    group_id: null,
    ...overrides,
  }
}

function cps(overrides = {}) {
  return {
    id: 'cps-1',
    cps_number: 'CPS-000001',
    template_id: 'bordered_schedule',
    title: 'Sheet',
    client_name: 'Acme Ltd',
    project_name: 'Site A',
    issue_date: '2026-01-01',
    show_vendor_identity: false,
    show_brand_name: false,
    brand_name_override: '',
    background_color: '',
    text_color: '',
    border_color: '',
    accent_color: '',
    preset_name: 'Clean Slate',
    notes: '',
    table_rows: [],
    table_columns: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const baseItem = row({ _uiKey: 'row-1', description: 'Fuel Filter', cp: '20000', sp: '22000' })

test('CPS direct edit diff produces document and item level before/after changes', () => {
  const prev = cps({ table_rows: [baseItem] })
  const next = cps({
    title: 'Sheet Revised',
    table_rows: [row({ ...baseItem, sp: '24000', description: 'Perkins Primary Fuel Filter' })],
  })

  const changes = diffCpsDocuments(prev, next)

  const title = changes.find((c) => c.field === 'title')
  assert.ok(title, 'expected a title change')
  assert.equal(title.scope, 'document')
  assert.equal(title.old, 'Sheet')
  assert.equal(title.new, 'Sheet Revised')

  const sp = changes.find((c) => c.field === 'sp')
  assert.ok(sp, 'expected an SP change')
  assert.equal(sp.kind, 'money')
  assert.equal(sp.old, '22000')
  assert.equal(sp.new, '24000')
  assert.equal(sp.rowId, 'row-1')
  assert.equal(sp.rowLabel, 'Perkins Primary Fuel Filter')

  const description = changes.find((c) => c.field === 'description')
  assert.ok(description, 'expected a description change')
  assert.equal(description.old, 'Fuel Filter')
  assert.equal(description.new, 'Perkins Primary Fuel Filter')
})

test('CP changes are auditable as a direct CPS edit', () => {
  const prev = cps({ table_rows: [baseItem] })
  const next = cps({ table_rows: [row({ ...baseItem, cp: '21500' })] })

  const cp = diffCpsDocuments(prev, next).find((c) => c.field === 'cp')
  assert.ok(cp)
  assert.equal(cp.kind, 'money')
  assert.equal(cp.old, '20000')
  assert.equal(cp.new, '21500')
})

test('derived totals are never recorded as audited fields', () => {
  const prev = cps({ table_rows: [baseItem] })
  const next = cps({ table_rows: [row({ ...baseItem, quantity: 4 })] })

  const changes = diffCpsDocuments(prev, next)
  assert.equal(changes.length, 1)
  assert.equal(changes[0].field, 'quantity')

  const forbidden = ['total', 'cost', 'profit', 'margin', 'margin_percent', 'total_cost', 'selling']
  for (const change of changes) {
    assert.ok(!forbidden.includes(change.field), `unexpected derived field ${change.field}`)
  }
})

test('added and removed items are auditable and use stable row ids', () => {
  const prev = cps({ table_rows: [baseItem] })
  const added = row({ _uiKey: 'row-2', description: 'Oil Seal', cp: '500', sp: '900' })
  const next = cps({ table_rows: [baseItem, added] })

  const addChanges = diffCpsDocuments(prev, next)
  const added1 = addChanges.find((c) => c.field === 'item_added')
  assert.ok(added1, 'expected an item_added change')
  assert.equal(added1.rowId, 'row-2')
  assert.equal(added1.new, 'Oil Seal')

  const removeChanges = diffCpsDocuments(next, prev)
  const removed = removeChanges.find((c) => c.field === 'item_removed')
  assert.ok(removed, 'expected an item_removed change')
  assert.equal(removed.rowId, 'row-2')
  assert.equal(removed.old, 'Oil Seal')
})

test('row reordering does not create false changes (no positional matching)', () => {
  const a = row({ _uiKey: 'row-a', description: 'A', sort_order: 0 })
  const b = row({ _uiKey: 'row-b', description: 'B', sort_order: 1 })
  const prev = cps({ table_rows: [a, b] })
  const next = cps({ table_rows: [{ ...b, sort_order: 0 }, { ...a, sort_order: 1 }] })

  assert.deepEqual(diffCpsDocuments(prev, next), [])
})

test('group lifecycle changes are auditable', () => {
  const section = { row_type: 'section', _uiKey: 'sec-1', group_id: 'sec-1', section_title: 'Group A', sort_order: 0 }
  const grouped = row({ ...baseItem, group_id: 'sec-1' })

  // Group added.
  const addGroup = diffCpsDocuments(cps({ table_rows: [grouped] }), cps({ table_rows: [section, grouped] }))
  assert.ok(addGroup.some((c) => c.field === 'group_added'))

  // Group removed.
  const removeGroup = diffCpsDocuments(cps({ table_rows: [section, grouped] }), cps({ table_rows: [row({ ...baseItem, group_id: null })] }))
  assert.ok(removeGroup.some((c) => c.field === 'group_removed'))

  // Membership change (moved to another group / ungrouped).
  const moved = diffCpsDocuments(cps({ table_rows: [grouped] }), cps({ table_rows: [row({ ...baseItem, group_id: null })] }))
  const membership = moved.find((c) => c.field === 'group_id')
  assert.ok(membership, 'expected a group membership change')
  assert.equal(membership.old, 'Group') // no matching section in prev table
  assert.equal(membership.new, 'Ungrouped')
})

test('group membership change resolves the group name when present', () => {
  const section = { row_type: 'section', _uiKey: 'sec-1', group_id: 'sec-1', section_title: 'Group A', sort_order: 0 }
  const prev = cps({ table_rows: [section, row({ ...baseItem, group_id: null })] })
  const next = cps({ table_rows: [section, row({ ...baseItem, group_id: 'sec-1' })] })

  const membership = diffCpsDocuments(prev, next).find((c) => c.field === 'group_id')
  assert.ok(membership)
  assert.equal(membership.old, 'Ungrouped')
  assert.equal(membership.new, 'Group A')
})

test('a no-op save produces no audit event', () => {
  const prev = cps({ table_rows: [baseItem] })
  const same = cps({ table_rows: [row({ ...baseItem })] })
  assert.equal(buildCpsEditMeta(prev, same, CPS_AUDIT_SOURCE.form), null)
})

test('grouped change blocks collapse several field changes on one row', () => {
  const prev = cps({ table_rows: [baseItem] })
  const next = cps({
    title: 'Sheet Revised',
    table_rows: [row({ ...baseItem, sp: '24000', description: 'Filter', unit: 'set', image_url: 'https://img/new.png' })],
  })

  const changes = diffCpsDocuments(prev, next)
  const groups = buildCpsChangeGroups(changes)

  const documentGroup = groups.find((g) => g.scope === 'document')
  assert.ok(documentGroup)
  assert.equal(documentGroup.label, 'Document')
  assert.equal(documentGroup.changes.length, 1)

  const rowGroup = groups.find((g) => g.scope === 'row')
  assert.ok(rowGroup)
  assert.equal(rowGroup.key, 'row:row-1')
  assert.equal(rowGroup.label, 'Filter')
  assert.equal(rowGroup.changes.length, 4)
})

test('image changes are represented semantically, not as a raw URL', () => {
  const prev = cps({ table_rows: [baseItem] })
  const next = cps({ table_rows: [row({ ...baseItem, image_url: 'https://res.cloudinary.com/very/long/url.png' })] })

  const changes = diffCpsDocuments(prev, next)
  const image = changes.find((c) => c.field === 'image_url')
  assert.ok(image)
  assert.equal(image.kind, 'image')

  const groups = buildCpsChangeGroups([image])
  const rendered = groups[0].changes[0]
  assert.equal(rendered.kind, 'image')
  assert.equal(rendered.oldValue, null)
  assert.equal(rendered.newValue, 'New image')
  assert.equal(rendered.newImageUrl, 'https://res.cloudinary.com/very/long/url.png')
  assert.notEqual(rendered.newValue, rendered.newImageUrl)
})

test('row identity prefers the persisted row id over the UI key', () => {
  assert.equal(cpsRowIdentity({ id: 'db-1', _uiKey: 'ui-1' }), 'db-1')
  assert.equal(cpsRowIdentity({ id: undefined, _uiKey: 'ui-1' }), 'ui-1')
  assert.equal(cpsRowIdentity({}), '')
})

test('lifecycle metadata carries event, root, parent, related, and actor context', () => {
  const meta = buildCpsAuditMeta({
    event: 'CONVERTED_TO_QUOTATION',
    rootId: 'cps-1',
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'quotation', id: 'q-1', number: 'QTN-000432' },
    summary: 'Converted to QTN-000432',
  })

  assert.equal(meta.event, 'CONVERTED_TO_QUOTATION')
  assert.equal(meta.rootId, 'cps-1')
  assert.equal(meta.parentEventId, null)
  assert.equal(meta.actorType, 'user')
  assert.deepEqual(meta.related, { type: 'quotation', id: 'q-1', number: 'QTN-000432' })
  assert.equal(cpsAuditActionForEvent('CONVERTED_TO_QUOTATION'), 'CONVERT')
  assert.equal(cpsAuditActionForEvent('DUPLICATED'), 'DUPLICATE')
  assert.equal(cpsAuditActionForEvent('CREATED'), 'CREATE')
})

test('formatter renders a CPS audit record into a timeline entry with grouped changes', () => {
  const meta = buildCpsAuditMeta({
    event: 'UPDATED',
    rootId: 'cps-1',
    sourceContext: CPS_AUDIT_SOURCE.form,
    summary: 'Updated 2 fields',
    changes: [
      { rowId: 'row-1', rowLabel: 'Fuel Filter', scope: 'row', field: 'sp', label: 'SP', old: '22000', new: '24000', kind: 'money' },
      { rowId: 'row-1', rowLabel: 'Fuel Filter', scope: 'row', field: 'description', label: 'Description', old: 'Fuel Filter', new: 'Perkins', kind: 'default' },
    ],
  })

  const record = {
    id: 'log-1',
    entity_type: 'cps_sheets',
    entity_id: 'cps-1',
    entity_label: 'CPS-000001',
    action: 'UPDATE',
    actor_label: 'amina@bigdrops.com',
    created_at: '2026-10-05T10:00:00Z',
    changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: meta }],
    reason: null,
  }

  const extracted = extractCpsAuditMeta(record)
  assert.ok(extracted)
  assert.equal(extracted.event, 'UPDATED')
  assert.equal(extracted.rootId, 'cps-1')

  const [entry] = buildAuditTrailItems([record])
  assert.equal(entry.actionLabel, 'Updated 2 fields')
  assert.equal(entry.actorLabel, 'amina@bigdrops.com')
  assert.equal(entry.actorType, 'user')
  assert.equal(entry.rootId, 'cps-1')
  assert.equal(entry.changeGroups.length, 1)
  assert.equal(entry.changeGroups[0].label, 'Fuel Filter')
  const sp = entry.changes.find((c) => c.field === 'sp')
  assert.match(sp.oldValue, /22,000/)
  assert.match(sp.newValue, /24,000/)
})

test('formatter keeps related document numbers readable on a conversion event', () => {
  const meta = buildCpsAuditMeta({
    event: 'CONVERTED_TO_QUOTATION',
    rootId: 'cps-1',
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'quotation', id: 'q-1', number: 'QTN-000432' },
    summary: 'Converted to QTN-000432',
  })

  const [entry] = buildAuditTrailItems([
    { id: 'log-9', entity_type: 'cps_sheets', entity_id: 'cps-1', action: 'CONVERT', actor_label: 'john@bigdrops.com', created_at: '2026-10-05T10:00:00Z', changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: meta }] },
  ])

  assert.equal(entry.eventType, 'CONVERTED_TO_QUOTATION')
  assert.equal(entry.relatedDocument.number, 'QTN-000432')
  assert.equal(entry.actionLabel, 'Converted to QTN-000432')
})

test('formatter ignores non-CPS records and falls back without throwing', () => {
  assert.equal(extractCpsAuditMeta({ entity_type: 'invoice', entity_id: 'i-1', changes: [] }), null)
  assert.equal(extractCpsAuditMeta({ entity_type: 'cps_sheets', entity_id: 'cps-1', changes: null }), null)

  const [entry] = buildAuditTrailItems([
    { id: 'inv-1', entity_type: 'invoice', entity_id: 'i-1', action: 'UPDATE', actor_label: 'x', created_at: '2026-10-05T10:00:00Z', changes: [{ field: 'total', old: 1, new: 2 }] },
  ])
  assert.equal(entry.actionLabel, 'updated this invoice')
})

// ── Wiring and boundary checks (source inspection) ─────────────────────────

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')

test('CPS save flow uses the real pre-edit snapshot for a field-level diff', () => {
  const source = read('src/hooks/useCpsSave.ts')
  const normalized = source.replace(/\s+/g, ' ')
  assert.match(normalized, /buildCpsEditMeta\(input\.initialSnapshot, cps/)
  assert.match(normalized, /recordCpsAuditEvent\(/)
  assert.match(normalized, /event: 'CREATED'/)
  // The coarse custom_fields-only tracked-fields audit must be gone.
  assert.doesNotMatch(normalized, /trackedFields: \['cps_number', 'title'/)
})

test('actor attribution reuses the shared authenticated-actor authority', () => {
  const libAudit = read('src/lib/audit.ts')
  assert.match(libAudit, /export async function resolveAuditActor/)
  assert.match(libAudit, /supabase\.auth\.getUser/)

  const cpsAudit = read('src/domain/cps/audit.ts')
  assert.match(cpsAudit, /resolveAuditActor\(\)/)
  assert.match(cpsAudit, /actorType: 'system'/)
})

test('lifecycle events are recorded for status, archive, duplicate, and conversion', () => {
  const source = read('src/pages/view-cps-actions.ts')
  for (const event of ['STATUS_CHANGED', 'ARCHIVED', 'DELETED', 'DUPLICATED', 'CONVERTED_TO_QUOTATION']) {
    assert.match(source, new RegExp(`event: '${event}'`), `expected ${event} audit coverage`)
  }
  assert.match(source, /CPS_AUDIT_SOURCE\.view/)
  assert.match(source, /related: \{ type: 'quotation'/)
  assert.match(source, /related: \{ type: 'cps'/)
})

test('CPS View exposes an Activity History surface via the shared audit hook', () => {
  const componentPath = 'src/components/cps/CpsActivityHistory.tsx'
  assert.ok(fs.existsSync(path.resolve(root, componentPath)), 'activity history component must exist')
  const source = read(componentPath)
  assert.match(source, /useAuditTrail\(/)
  assert.match(source, /entityType: 'cps_sheets'/)
  assert.match(source, /No activity recorded yet/)
  assert.match(source, /refetch\(\)/)
  assert.match(source, /role="alert"/)

  const view = read('src/components/cps/CostPricingSheetViewPresentations.tsx')
  assert.equal((view.match(/<CpsActivityHistory/g) || []).length, 2, 'expected desktop and mobile mounts')
  // Primary action hierarchy must be preserved.
  assert.match(view, /Convert to Quote/)
  assert.match(view, /cps-view-btn soft[\s\S]*Edit/)
})

test('CPS audit is append-only and adds no delete-history control', () => {
  const source = read('src/components/cps/CpsActivityHistory.tsx')
  assert.doesNotMatch(source, /onDelete|deleteHistory|clearHistory|removeHistory/i)
  assert.doesNotMatch(source, /\.delete\(|\.update\(|\.insert\(/)
})

test('no Phase 2 row lineage or Phase 3 feedback is introduced', () => {
  const files = [
    'src/domain/cps/audit.ts',
    'src/domain/cps/auditDiff.ts',
    'src/pages/view-cps-actions.ts',
    'src/hooks/useCpsSave.ts',
    'src/components/cps/CpsActivityHistory.tsx',
  ]
  for (const file of files) {
    const source = read(file)
    assert.doesNotMatch(source, /source_cps_row_id/, `${file} must not introduce Phase 2 row lineage`)
    assert.doesNotMatch(
      source,
      /updateCpsFromInvoice|updateCpsFromQuotation|syncToCps|applyDownstreamFeedback/,
      `${file} must not introduce Phase 3 feedback`,
    )
  }
})

test('migration relaxes the audit constraints for cps_sheets without new tables', () => {
  const migration = read('supabase/migrations/20261005120000_cps_audit_entity_support.sql')
  assert.match(migration, /cps_sheets/)
  assert.match(migration, /audit_logs_entity_type_check/)
  assert.match(migration, /audit_logs_action_check/)
  assert.doesNotMatch(migration, /create table/i)
})
