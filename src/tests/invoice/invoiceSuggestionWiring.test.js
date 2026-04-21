import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const lineItemsComponentPath = path.resolve('src/components/document/FormLineItems.tsx')
const liveMobileItemCardPath = path.resolve('src/components/invoice/MobileItemCard.jsx')

test('shared document line items wire suggestion behavior into the real mobile row component', () => {
  const formSource = fs.readFileSync(lineItemsComponentPath, 'utf8')
  const rowSource = fs.readFileSync(liveMobileItemCardPath, 'utf8')

  assert.match(formSource, /import MobileItemCard from ['"](@\/components\/invoice\/MobileItemCard|\.\.\/invoice\/MobileItemCard)['"]/)
  assert.match(formSource, /enableItemSuggestions=\{true\}/)
  assert.match(rowSource, /useItemSuggestions/)
  assert.match(rowSource, /getInvoiceSuggestionSelection/)
  assert.match(rowSource, /getInvoiceSuggestionPriceContextText/)
  assert.match(rowSource, /showSuggestions && \(suggestionsLoading \|\| \(suggestions && suggestions\.length > 0\)\)/)
})
