import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const mobileItemCardPath = path.resolve('src/components/invoice/MobileItemCard.jsx')

test('mobile item card treats row duplication as optional in shared form flows', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /onDuplicate\s*=\s*undefined/)
  assert.match(source, /\{onDuplicate\s*\?\s*\(/)
})
