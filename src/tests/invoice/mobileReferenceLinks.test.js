import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const mobileReferenceLinksPath = path.resolve('src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx')

test('mobile reference links section imports the real Input component and shared field class', () => {
  const source = fs.readFileSync(mobileReferenceLinksPath, 'utf8')

  assert.match(source, /import\s+\{\s*Input\s*\}\s+from\s+'@\/components\/ui\/input'/)
  assert.match(source, /fieldCls/)
  assert.match(source, /import\s*\{[\s\S]*fieldCls[\s\S]*\}\s*from\s*'\.\/mobileFormPrimitives'/)
})
