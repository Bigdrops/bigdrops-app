import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('document confirm primitives keep explicit token pairings for primary, destructive, secondary, and disabled states', () => {
  const confirmSource = read('src/components/document-view/shared/DocumentConfirmDialog.tsx')
  const modalSource = read('src/components/document-view/shared/DocumentModal.tsx')

  assert.match(confirmSource, /--bd-button-primary-bg/)
  assert.match(confirmSource, /--bd-button-primary-text/)
  assert.match(confirmSource, /--bd-status-danger-bg/)
  assert.match(confirmSource, /--bd-status-danger-text/)
  assert.match(confirmSource, /disabled:[^'"]*--bd-text-muted|disabled:[^'"]*--bd-surface-muted/)
  assert.match(confirmSource, /--bd-border/)
  assert.match(modalSource, /--bd-card-bg/)
})

test('advance invoice delete confirmation uses the shared document confirm dialog', () => {
  const advanceSource = read('src/components/invoice/view/InvoiceAdvanceSheet.tsx')

  assert.match(advanceSource, /DocumentConfirmDialog/)
  assert.doesNotMatch(advanceSource, /ConfirmActionDialog/)
})
