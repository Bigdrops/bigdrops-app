import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const obsidianTemplatePath = path.resolve('src/components/pdf-new/templates/ObsidianReceipt.tsx')
const obsidianStylesPath = path.resolve('src/components/pdf-new/templates/ObsidianReceiptStyles.ts')
const pdfIndexPath = path.resolve('src/components/pdf-new/index.ts')

test('Obsidian receipt is wired into the PDF generator and avoids null-render fallbacks', () => {
  const templateSource = fs.readFileSync(obsidianTemplatePath, 'utf8')
  const stylesSource = fs.readFileSync(obsidianStylesPath, 'utf8')
  const indexSource = fs.readFileSync(pdfIndexPath, 'utf8')

  assert.match(indexSource, /import\('\.\/templates\/ObsidianReceipt'\)/)
  assert.match(indexSource, /case 'obsidian-receipt':/)
  assert.doesNotMatch(templateSource, /if \(!data\) return null;/)
  assert.doesNotMatch(templateSource, /: null[);]?/)
  assert.doesNotMatch(stylesSource, /\bgap:\s*/)
})
