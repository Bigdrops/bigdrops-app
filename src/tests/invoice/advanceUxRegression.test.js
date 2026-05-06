import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')
const source = fs.readFileSync(viewInvoicePath, 'utf8')

assert.match(source, /const openSavedAdvanceActions = useCallback\(/)
assert.match(source, /openAdvanceDetails\(advanceInvoice, 'view'\)/)
assert.match(source, /const didOpenActions = openSavedAdvanceActions\(savedAdvanceInvoice\)/)
assert.match(source, /Advance invoice created\. You can download, edit, or delete it below\./)
assert.match(source, /Advance invoice updated\./)
assert.match(source, /if \(!didOpenActions\) \{/)

console.log('advanceUxRegression.test.js: pass')
