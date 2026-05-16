import test from 'node:test'
import assert from 'node:assert/strict'

import { formatDisplayDate } from '../../lib/formatters/date.ts'
import { formatNaira } from '../../lib/formatters/money.ts'

test('formatDisplayDate returns explicit fallbacks for empty and invalid preview dates', () => {
  assert.equal(formatDisplayDate(null, { fallback: 'No date' }), 'No date')
  assert.equal(
    formatDisplayDate('not-a-date', {
      fallback: 'No date',
      invalidFallback: 'Invalid date',
    }),
    'Invalid date',
  )
})

test('formatNaira formats document amounts with stable Nigerian grouping', () => {
  assert.equal(formatNaira(1250000), '₦1,250,000')
  assert.equal(formatNaira('₦42,500.75', { preserveFraction: true }), '₦42,500.75')
  assert.equal(formatNaira(null), '₦0')
})
