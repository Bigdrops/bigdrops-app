import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('shared document overlays and advance sheet avoid hardcoded prototype colors', () => {
  const files = [
    'src/components/document-view/shared/DocumentModal.tsx',
    'src/components/document-view/shared/DocumentConfirmDialog.tsx',
    'src/components/document-view/shared/DocumentSheet.tsx',
    'src/components/document-view/shared/DocumentMoreSheet.module.css',
    'src/components/document-view/shared/DocumentActionSheet.tsx',
    'src/components/document-view/shared/FloatingDownloadButton.module.css',
    'src/components/invoice/view/InvoiceAdvanceSheet.tsx',
  ]

  const source = files.map(read).join('\n')

  assert.doesNotMatch(source, /#fff\b/i)
  assert.doesNotMatch(source, /#ffffff\b/i)
  assert.doesNotMatch(source, /#e7e5e4\b/i)
  assert.doesNotMatch(source, /#f9fafb\b/i)
  assert.doesNotMatch(source, /rgba\(15,\s*23,\s*42/i)
  assert.doesNotMatch(source, /text-slate-|bg-slate-|border-slate-|text-red-|bg-red-|border-red-/i)
})

test('shared document overlays are anchored to BigDrops token surfaces', () => {
  const modalSource = read('src/components/document-view/shared/DocumentModal.tsx')
  const confirmSource = read('src/components/document-view/shared/DocumentConfirmDialog.tsx')
  const sheetSource = read('src/components/document-view/shared/DocumentSheet.tsx')
  const fabSource = read('src/components/document-view/shared/FloatingDownloadButton.module.css')

  assert.match(modalSource, /--bd-card-bg|--bd-overlay/i)
  assert.match(confirmSource, /--bd-button-primary-bg|--bd-status-danger-bg/i)
  assert.match(sheetSource, /--bd-card-bg|--bd-surface|--bd-border/i)
  assert.match(fabSource, /--bd-button-primary-bg|--bd-fab-bg/i)
})
