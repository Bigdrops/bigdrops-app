import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const panelPath = path.resolve('src/components/audit/AuditTrailPanel.tsx')
const itemPath = path.resolve('src/components/audit/AuditTrailItem.tsx')
const hookPath = path.resolve('src/hooks/useAuditTrail.ts')
const formatterPath = path.resolve('src/domain/audit/auditFormatters.ts')
const typePath = path.resolve('src/domain/audit/auditTypes.ts')
const invoicePagePath = path.resolve('src/pages/ViewInvoice.tsx')

test('invoice audit trail UI is split into dedicated reusable files and mounted from the invoice page', () => {
  for (const filePath of [panelPath, itemPath, hookPath, formatterPath, typePath]) {
    assert.ok(fs.existsSync(filePath), `expected ${path.relative(process.cwd(), filePath)} to exist`)
  }

  const invoicePageSource = fs.readFileSync(invoicePagePath, 'utf8')

  assert.match(invoicePageSource, /import AuditTrailPanel from ['"]@\/components\/audit\/AuditTrailPanel['"]/)
  assert.match(invoicePageSource, /<AuditTrailPanel[\s\S]*entityType="invoice"/)
})

test('audit trail hook fetches invoice history from audit logs with timeline-ready fields', () => {
  const hookSource = fs.readFileSync(hookPath, 'utf8')
  const normalized = hookSource.replace(/\s+/g, ' ')

  assert.match(normalized, /\.from\('audit_logs'\)/)
  assert.match(normalized, /\.eq\('entity_type', entityType\)/)
  assert.match(normalized, /\.eq\('entity_id', entityId\)/)
  assert.match(normalized, /buildAuditTrailItems\(/)
})

test('audit formatters centralize readable labels and hide empty no-op changes', () => {
  const formatterSource = fs.readFileSync(formatterPath, 'utf8')

  assert.match(formatterSource, /invoice_number:\s*'Invoice Number'/)
  assert.match(formatterSource, /client_name:\s*'Client'/)
  assert.match(formatterSource, /po_number:\s*'PO Number'/)
  assert.match(formatterSource, /status:\s*'Status'/)
  assert.match(formatterSource, /null\s*→\s*null|isMeaningfulAuditChange|hasMeaningfulAuditValue/)
  assert.match(formatterSource, /formatNaira|formatCurrency/)
  assert.match(formatterSource, /formatDisplayDate/)
})

