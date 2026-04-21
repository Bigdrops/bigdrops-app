import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const lineItemsComponentPath = path.resolve('src/components/document/FormLineItems.tsx')
const liveMobileItemCardPath = path.resolve('src/components/invoice/MobileItemCard.jsx')

test('live invoice form wires suggestions into the real invoice mobile row component', () => {
  const formSource = fs.readFileSync(lineItemsComponentPath, 'utf8')
  const rowSource = fs.readFileSync(liveMobileItemCardPath, 'utf8')

  assert.match(formSource, /import MobileItemCard from ['"](@\/components\/invoice\/MobileItemCard|\.\.\/invoice\/MobileItemCard)['"]/)
  assert.match(formSource, /enableItemSuggestions=\{!isQuotation\}/)
  assert.match(rowSource, /useItemSuggestions/)
  assert.match(rowSource, /getInvoiceSuggestionSelection/)
  assert.match(rowSource, /showSuggestions && \(suggestionsLoading \|\| \(suggestions && suggestions\.length > 0\)\)/)
})
