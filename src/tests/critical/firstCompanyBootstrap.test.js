import test from 'node:test'
import assert from 'node:assert/strict'

import { buildInitialCompanyInput, slugify } from '../../domain/tenant/tenantGate.ts'

test('initial company input derives a deterministic name and slug from the workspace', () => {
  assert.deepEqual(buildInitialCompanyInput('Tunde and Sons Limited'), {
    displayName: 'Tunde and Sons Limited Company',
    slug: 'tunde-and-sons-limited-company',
  })
})

test('initial company input falls back when the workspace name is blank', () => {
  assert.deepEqual(buildInitialCompanyInput(''), {
    displayName: 'My Company',
    slug: 'my-company',
  })
  assert.deepEqual(buildInitialCompanyInput(null), {
    displayName: 'My Company',
    slug: 'my-company',
  })
  assert.deepEqual(buildInitialCompanyInput(undefined), {
    displayName: 'My Company',
    slug: 'my-company',
  })
})

test('initial company slug is stable and url-safe for repeated bootstrap calls', () => {
  const first = buildInitialCompanyInput('  Café & Co.  ')
  const second = buildInitialCompanyInput('  Café & Co.  ')
  assert.equal(first.slug, second.slug)
  assert.equal(first.slug, slugify(first.displayName))
  assert.match(first.slug, /^[a-z0-9-]+$/)
})
