import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const normalizePath = path.resolve('src/domain/rfq/normalize.ts')

test('denormalizeToDbRfq strips editor-only RFQ fields from the top-level payload', () => {
  const source = fs.readFileSync(normalizePath, 'utf8')

  assert.match(source, /const\s*\{\s*[\s\S]*template_id[\s\S]*table_rows[\s\S]*table_columns[\s\S]*\}\s*=\s*rfq/i)
  assert.match(source, /custom_fields\s*=\s*\{[\s\S]*template_id:\s*template_id\s*\|\|/i)
  assert.match(source, /table_rows:\s*table_rows\s*\|\|\s*\[\]/i)
  assert.match(source, /table_columns:\s*table_columns\s*\|\|\s*getDefaultColumnsForDocument\('rfq'\)/i)
})
