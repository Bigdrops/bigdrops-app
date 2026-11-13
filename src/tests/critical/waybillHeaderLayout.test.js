import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const templatePath = path.resolve('src/components/pdf/forme/waybill/BlankWaybillFormeDocument.tsx')

function normalizedSource(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\s+/g, ' ')
}

test('minimal waybill renders document identifier in the same header grid as brand details', () => {
  const template = normalizedSource(templatePath)

  assert.match(template, /headerGrid:\s*\{\s*flexDirection:\s*'row'[^}]*alignItems:\s*'flex-start'/)
  assert.match(template, /brandInfo:\s*\{\s*flex:\s*3\s*,?\s*}/)
  assert.match(template, /identifierColumn:\s*\{\s*flex:\s*1\s*,\s*alignSelf:\s*'flex-start'/)
  assert.match(template, /identifierBlock:\s*\{\s*marginTop:\s*0\s*,?\s*}/)
  assert.equal(template.includes("alignItems: 'stretch'"), false)
  assert.match(template, /<View style=\{minimalStyles\.headerGrid\}>/)
  assert.match(template, /<View style=\{minimalStyles\.brandInfo\}>/)
  assert.match(template, /<View style=\{minimalStyles\.identifierColumn\}>/)
  assert.match(template, /<View style=\{minimalStyles\.identifierBlock\}>/)
  assert.equal(template.includes('<View style={minimalStyles.metaPillCol}>'), false)
  assert.equal(template.includes('<View style={minimalStyles.metaPillRow}>'), false)
})
