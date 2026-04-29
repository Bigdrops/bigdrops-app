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
  assert.doesNotMatch(stylesSource, /\bgap:\s*/)
})

test('Obsidian receipt keeps its title and header accent on template-owned identity colors', () => {
  const templateSource = fs.readFileSync(obsidianTemplatePath, 'utf8')

  assert.match(templateSource, /const OBSIDIAN_HEADER_ACCENT = '#2f7f7c';/)
  assert.match(templateSource, /styles\.invoiceTitle,\s*\{\s*color:\s*OBSIDIAN_HEADER_ACCENT\s*\}/)
  assert.match(templateSource, /styles\.header,\s*\{\s*borderBottomColor:\s*OBSIDIAN_HEADER_ACCENT\s*\}/)
  assert.doesNotMatch(templateSource, /styles\.invoiceTitle,\s*\{\s*color:\s*accent\s*\}/)
  assert.doesNotMatch(templateSource, /styles\.header,\s*\{\s*borderBottomColor:\s*accent\s*\}/)
})
