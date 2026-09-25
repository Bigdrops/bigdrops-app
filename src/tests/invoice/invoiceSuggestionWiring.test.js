import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const lineItemsComponentPath = path.resolve('src/components/document/FormLineItems.tsx')
const liveMobileItemCardPath = path.resolve('src/components/invoice/MobileItemCard.tsx')

test('shared document line items wire suggestion behavior into the real mobile row component', () => {
  const formSource = fs.readFileSync(lineItemsComponentPath, 'utf8')
  const rowSource = fs.readFileSync(liveMobileItemCardPath, 'utf8')

  assert.match(formSource, /import MobileItemCard from ['"](@\/components\/invoice\/MobileItemCard|\.\.\/invoice\/MobileItemCard)['"]/)
  assert.match(formSource, /enableItemSuggestions=\{ctx !== 'waybill'\}/)
  assert.match(rowSource, /useItemSuggestionEngine/)
  assert.match(rowSource, /handleSuggestionSelect/)
  assert.match(rowSource, /Client last/)
  assert.match(rowSource, /Last used/)
  assert.match(rowSource, /Standard/)
  assert.match(rowSource, /hasSuggestionPanel/)
  assert.match(rowSource, /role="listbox"/)
})
