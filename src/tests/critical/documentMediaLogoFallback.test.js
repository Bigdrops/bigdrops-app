import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCanonicalLogoUrl } from '../../domain/documentMedia.ts'

test('resolveCanonicalLogoUrl prefers saved company logo fields in canonical order', () => {
  assert.equal(
    resolveCanonicalLogoUrl({
      company_logo_url: 'https://cdn.example.com/company-logo.png',
      companyLogoUrl: 'https://cdn.example.com/react-prop-logo.png',
      logo_url: 'https://cdn.example.com/legacy-logo.png',
    }),
    'https://cdn.example.com/company-logo.png',
  )

  assert.equal(
    resolveCanonicalLogoUrl({
      companyLogoUrl: 'https://cdn.example.com/react-prop-logo.png',
      logo_url: 'https://cdn.example.com/legacy-logo.png',
    }),
    'https://cdn.example.com/react-prop-logo.png',
  )
})

test('resolveCanonicalLogoUrl rejects temporary local preview urls', () => {
  assert.equal(
    resolveCanonicalLogoUrl({
      company_logo_url: 'blob:http://localhost:3000/logo-preview',
      companyLogoUrl: 'file:///tmp/logo.png',
      imageUrl: 'content://media/logo.png',
    }),
    null,
  )
})
