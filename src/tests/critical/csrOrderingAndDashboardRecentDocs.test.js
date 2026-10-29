import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getCsrEffectiveTimestamp, sortCsrRows } from '../../config/moduleAdapters'

const read = (path) => readFileSync(resolve(path), 'utf8')

// ── REPRODUCTION FIXTURE (Exact rows from the reported screenshot) ──
const SCREENSHOT_FIXTURE = [
  { id: '13', csr_number: 'SASICSR-013', date: '2026-07-11', created_at: null, client_name: 'Tecno Power Solutions' },
  { id: '12', csr_number: 'SASICSR-012', date: '2026-07-11', created_at: null, client_name: 'Tecno Power Solutions' },
  { id: '11', csr_number: 'SASICSR-011', date: '2026-07-10', created_at: null, client_name: 'Lorem Ipsum' },
  { id: '10', csr_number: 'SASICSR-010', date: '2026-07-09', created_at: null, client_name: 'Lorem Ipsum' },
  { id: '9',  csr_number: 'SASICSR-009', date: '2026-07-09', created_at: null, client_name: 'Lorem Ipsum' },
  { id: '8',  csr_number: 'SASICSR-008', date: '2026-07-04', created_at: null, client_name: 'Lorem Ipsum' },
  { id: '7',  csr_number: 'SASICSR-007', date: '2026-06-22', created_at: null, client_name: 'TATA International, Nigeria' },
  { id: '6',  csr_number: 'SASICSR-006', date: '2026-06-20', created_at: null, client_name: 'Lorem Ipsum' },
  { id: '5',  csr_number: 'SASICSR-005', date: '2026-06-16', created_at: null, client_name: 'Lorem Ipsum' },
  { id: '4',  csr_number: 'SASICSR-004', date: '2026-05-21', created_at: null, client_name: 'Tecno Power Solutions' },
  { id: '3',  csr_number: 'SASICSR-003', date: '2026-05-19', created_at: null, client_name: 'Tecno Power Solutions' },
  { id: '2',  csr_number: 'SASICSR-002', date: '2026-04-28', created_at: null, client_name: 'Inspire Sports Academy' },
  { id: '1',  csr_number: 'SASICSR-000004', date: '2026-10-26', created_at: null, client_name: 'TATA International, Nigeria' },
]

// ── 1. CSR LIST NEWEST-FIRST SORTING TESTS ──

test('SASICSR-000004 (26 Oct 2026) sorts to the very top under default created_at desc sort', () => {
  const sorted = sortCsrRows(SCREENSHOT_FIXTURE, 'created_at', 'desc')
  
  // Under the defect, SASICSR-000004 appeared at index 12 (bottom).
  // With the fix, it must be index 0 (top).
  assert.equal(sorted[0].csr_number, 'SASICSR-000004')
  assert.equal(sorted[0].date, '2026-10-26')
  
  // Followed by July 11 down to April 28
  assert.equal(sorted[1].csr_number, 'SASICSR-013')
  assert.equal(sorted[sorted.length - 1].csr_number, 'SASICSR-002')
})

test('SASICSR-000004 sorts first even when older records have created_at and newer has null', () => {
  // Legacy rows have created_at timestamps from July, while newly saved record only has date: 2026-10-26
  const mixedFixture = SCREENSHOT_FIXTURE.map((row) => ({
    ...row,
    created_at: row.csr_number === 'SASICSR-000004' ? null : `2026-07-11T12:00:00.000Z`,
  }))

  const sorted = sortCsrRows(mixedFixture, 'created_at', 'desc')
  assert.equal(sorted[0].csr_number, 'SASICSR-000004')
  assert.equal(sorted[0].date, '2026-10-26')
})

test('SASICSR-000004 sorts first when it has authoritative created_at and legacy have null', () => {
  const mixedFixture = SCREENSHOT_FIXTURE.map((row) => ({
    ...row,
    created_at: row.csr_number === 'SASICSR-000004' ? '2026-10-26T15:30:00.000Z' : null,
  }))

  const sorted = sortCsrRows(mixedFixture, 'created_at', 'desc')
  assert.equal(sorted[0].csr_number, 'SASICSR-000004')
})

test('records with null/empty dates and timestamps sort to the bottom and never displace valid records', () => {
  const fixtureWithCorrupt = [
    ...SCREENSHOT_FIXTURE,
    { id: 'corrupt-1', csr_number: 'CORRUPT-1', date: null, created_at: null },
    { id: 'corrupt-2', csr_number: 'CORRUPT-2', date: '', created_at: undefined },
  ]

  const sorted = sortCsrRows(fixtureWithCorrupt, 'created_at', 'desc')
  assert.equal(sorted[0].csr_number, 'SASICSR-000004')
  const bottomTwoNumbers = [sorted[sorted.length - 2].csr_number, sorted[sorted.length - 1].csr_number]
  assert.ok(bottomTwoNumbers.includes('CORRUPT-1'))
  assert.ok(bottomTwoNumbers.includes('CORRUPT-2'))
})

test('effective timestamp helper extracts created_at or falls back to date', () => {
  assert.equal(
    getCsrEffectiveTimestamp({ created_at: '2026-10-26T12:00:00.000Z', date: '2026-10-25' }),
    new Date('2026-10-26T12:00:00.000Z').getTime()
  )
  assert.equal(
    getCsrEffectiveTimestamp({ created_at: null, date: '2026-10-26' }),
    new Date('2026-10-26T00:00:00.000Z').getTime()
  )
  assert.equal(getCsrEffectiveTimestamp({ created_at: null, date: null }), 0)
  assert.equal(getCsrEffectiveTimestamp({}), 0)
})

test('deterministic tie-breaking uses natural numeric compare for csr_number', () => {
  const tiedDates = [
    { csr_number: 'SASICSR-002', date: '2026-07-11', created_at: null },
    { csr_number: 'SASICSR-013', date: '2026-07-11', created_at: null },
    { csr_number: 'SASICSR-009', date: '2026-07-11', created_at: null },
  ]

  const sorted = sortCsrRows(tiedDates, 'created_at', 'desc')
  assert.equal(sorted[0].csr_number, 'SASICSR-013')
  assert.equal(sorted[1].csr_number, 'SASICSR-009')
  assert.equal(sorted[2].csr_number, 'SASICSR-002')
})

// ── 2. DASHBOARD RECENT DOCUMENTS LOGIC TESTS ──

test('CSR with date: 2026-10-26 is included in Recent Documents ahead of older records', () => {
  // Simulate the mergeRecentDocs algorithm used in useDashboardData
  const mockCsr = {
    id: 'csr-001',
    type: 'CSR',
    number: 'SASICSR-000004',
    client: 'TATA International, Nigeria',
    date: '2026-10-26', // falls back to doc.date when created_at is null
    status: 'Completed',
    amount: null,
    path: '/csr/csr-001',
  }

  const mockOlderDocs = [
    { id: 'inv-1', type: 'Invoice', number: 'INV-001', client: 'Acme', date: '2026-07-11', status: 'paid', amount: 50000, path: '/invoices/inv-1' },
    { id: 'inv-2', type: 'Invoice', number: 'INV-002', client: 'Beta', date: '2026-07-10', status: 'paid', amount: 30000, path: '/invoices/inv-2' },
    { id: 'quo-1', type: 'Quotation', number: 'Q-001', client: 'Gamma', date: '2026-06-20', status: 'approved', amount: 20000, path: '/quotations/quo-1' },
    { id: 'way-1', type: 'Waybill', number: 'WAY-001', client: 'Delta', date: '2026-05-19', status: 'delivered', amount: null, path: '/waybills/way-1' },
  ]

  const allDocs = [mockCsr, ...mockOlderDocs]
  const recentDocs = allDocs
    .filter((d) => d.date && !Number.isNaN(new Date(d.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  assert.equal(recentDocs.length, 5)
  assert.equal(recentDocs[0].type, 'CSR')
  assert.equal(recentDocs[0].number, 'SASICSR-000004')
  assert.equal(recentDocs[0].path, '/csr/csr-001')
})

// ── 3. SOURCE CONTRACT VERIFICATION ──

test('moduleAdapters.ts implements multi-column ordering and client-side effective timestamp sorting for CSRs', () => {
  const adapterSource = read('src/config/moduleAdapters.ts')
  assert.match(adapterSource, /\.order\("created_at", \{ ascending: query\.sortDirection === "asc", nullsFirst: false \}\)/)
  assert.match(adapterSource, /\.order\("date", \{ ascending: query\.sortDirection === "asc", nullsFirst: false \}\)/)
  assert.match(adapterSource, /\.order\("csr_number", \{ ascending: query\.sortDirection === "asc", nullsFirst: false \}\)/)
  assert.match(adapterSource, /rows = sortCsrRows\(rows, query\.sortBy, query\.sortDirection\)/)
})

test('useDashboardData.ts queries CSRs with created_at, date, csr_number ordering and sufficient limit', () => {
  const dashboardSource = read('src/hooks/useDashboardData.ts')
  assert.match(dashboardSource, /\.order\('created_at', \{ ascending: false, nullsFirst: false \}\)/)
  assert.match(dashboardSource, /\.order\('date', \{ ascending: false, nullsFirst: false \}\)/)
  assert.match(dashboardSource, /\.order\('csr_number', \{ ascending: false, nullsFirst: false \}\)/)
  assert.match(dashboardSource, /\.limit\(16\)/)
})

test('view-csr-actions.ts assigns created_at and invalidates caches on CSR duplicate, archive, and delete', () => {
  const actionsSource = read('src/pages/view-csr-actions.ts')
  assert.match(actionsSource, /created_at: new Date\(\)\.toISOString\(\)/)
  assert.match(actionsSource, /invalidateListCache\('bd:list:csr:v1:all'\)/)
  assert.match(actionsSource, /invalidateAllDashboardCaches\(\)/)
})

test('csrSync.ts assigns created_at on offline sync', () => {
  const syncSource = read('src/lib/native/csrSync.ts')
  assert.match(syncSource, /created_at: new Date\(\)\.toISOString\(\)/)
})
