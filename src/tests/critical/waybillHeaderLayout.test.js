import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const templatePath = path.resolve('src/components/waybill/blankWaybillTemplate.tsx')
const stylesPath = path.resolve('src/components/waybill/waybillMinimalStyles.ts')

function normalizedSource(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\s+/g, ' ')
}

test('minimal waybill renders document identifier in the same header grid as brand details', () => {
  const template = normalizedSource(templatePath)
  const styles = normalizedSource(stylesPath)

  assert.match(styles, /headerGrid:\s*\{\s*flexDirection:\s*'row',\s*alignItems:\s*'flex-start'/)
  assert.match(styles, /brandInfo:\s*\{\s*flex:\s*3\s*,\s*}/)
  assert.match(styles, /identifierColumn:\s*\{\s*flex:\s*1\s*,\s*alignSelf:\s*'flex-start'\s*,\s*}/)
  assert.match(styles, /identifierBlock:\s*\{\s*marginTop:\s*0\s*,\s*}/)
  assert.equal(styles.includes("alignItems: 'stretch'"), false)
  assert.match(template, /<View style=\{minimalStyles\.headerGrid\}>/)
  assert.match(template, /<View style=\{minimalStyles\.brandInfo\}>/)
  assert.match(template, /<View style=\{minimalStyles\.identifierColumn\}>/)
  assert.match(template, /<View style=\{minimalStyles\.identifierBlock\}>/)
  assert.equal(template.includes('<View style={minimalStyles.metaPillCol}>'), false)
  assert.equal(template.includes('<View style={minimalStyles.metaPillRow}>'), false)
})
