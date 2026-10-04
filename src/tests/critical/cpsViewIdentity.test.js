import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Final CPS View identity pass: the tile is tenant branding (configured
// logo, else company initials, else the neutral module mark), never client
// initials. The client renders as its own hierarchy from saved document
// state. Edit and Download converge on the soft reference treatment with
// unchanged behavior.
const viewSource = readFileSync(
  new URL('../../components/cps/CostPricingSheetViewPresentations.tsx', import.meta.url),
  'utf8',
)

test('identity tile no longer derives from the client name', () => {
  assert.ok(
    !viewSource.includes('monogram(document.client_name)'),
    'client initials must not stand in for company branding',
  )
})

test('brand mark consumes the canonical tenant logo authority', () => {
  assert.ok(
    viewSource.includes('resolveCanonicalLogoUrl'),
    'logo must resolve through the canonical tenant branding authority',
  )
  assert.ok(
    viewSource.includes('BrandMark'),
    'identity area must render the brand mark component',
  )
  assert.ok(
    viewSource.includes('company_name'),
    'company fallback must derive from the tenant company name',
  )
})

test('client hierarchy reads saved snapshot first, then display name', () => {
  assert.ok(viewSource.includes('client_snapshot'), 'snapshot must feed the client line')
  assert.ok(viewSource.includes('contact_person'), 'saved contact may feed the context line')
  assert.ok(viewSource.includes("'No client'"), 'established empty-client fallback stays')
})

test('absent site renders nothing instead of placeholder noise', () => {
  assert.ok(
    !viewSource.includes("'No site'"),
    'missing site must be omitted, not announced',
  )
})

test('Edit and Download use the soft reference treatment', () => {
  assert.ok(
    viewSource.includes('cps-view-btn soft'),
    'Edit and Download must carry the soft treatment class',
  )
  assert.ok(
    viewSource.includes('onClick={onEdit}') || viewSource.includes('onClick={props.onEdit}'),
    'Edit must keep navigating to the CPS Edit workflow',
  )
})

test('view introduces no financial arithmetic', () => {
  for (const forbidden of [
    'calculateCpsTotals',
    'instant-markup',
    'Decimal',
    'parseFloat',
  ]) {
    assert.ok(
      !viewSource.includes(forbidden),
      `view presentations must not contain ${forbidden}; economics arrive via view data`,
    )
  }
})
