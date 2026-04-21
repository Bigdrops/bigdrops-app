import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatMergedQtyUnit,
  resolveCanonicalItemImageUrl,
  resolveCanonicalLogoUrl,
} from '../domain/documentMedia.js'

test('resolveCanonicalItemImageUrl falls back to the canonical image url when thumbnail fields are missing or temporary', () => {
  assert.equal(
    resolveCanonicalItemImageUrl({
      thumbnail_url: 'blob:http://localhost:3000/preview',
      image_url: 'https://cdn.example.com/items/panel.png',
    }),
    'https://cdn.example.com/items/panel.png',
  )

  assert.equal(
    resolveCanonicalItemImageUrl({
      thumbnailUrl: '',
      imageUrl: 'https://cdn.example.com/items/battery.png',
    }),
    'https://cdn.example.com/items/battery.png',
  )
})

test('resolveCanonicalItemImageUrl never treats temporary local preview urls as the saved truth path', () => {
  assert.equal(
    resolveCanonicalItemImageUrl({
      image_url: 'blob:http://localhost:3000/object-preview',
    }),
    null,
  )

  assert.equal(
    resolveCanonicalItemImageUrl({
      imageUrl: 'file:///Users/example/item.png',
    }),
    null,
  )
})

test('resolveCanonicalLogoUrl uses the normalized company logo path and legacy fallback, but rejects temporary urls', () => {
  assert.equal(
    resolveCanonicalLogoUrl({
      company_logo_url: 'https://cdn.example.com/logo.png',
      logo_url: 'https://cdn.example.com/legacy-logo.png',
    }),
    'https://cdn.example.com/logo.png',
  )

  assert.equal(
    resolveCanonicalLogoUrl({
      logo_url: 'https://cdn.example.com/legacy-logo.png',
    }),
    'https://cdn.example.com/legacy-logo.png',
  )

  assert.equal(
    resolveCanonicalLogoUrl({
      company_logo_url: 'blob:http://localhost:3000/logo-preview',
    }),
    null,
  )
})

test('formatMergedQtyUnit keeps quantity and unit as one inline token', () => {
  assert.equal(formatMergedQtyUnit(12, 'pcs'), '12\u00A0pcs')
  assert.equal(formatMergedQtyUnit('4', ''), '4')
})
