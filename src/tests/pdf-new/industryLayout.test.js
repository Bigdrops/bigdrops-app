import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { styles } from '../../components/pdf-new/templates/industryStyles.ts'

const industryTemplatePath = path.resolve('src/components/pdf-new/templates/Industry.tsx')
const industryBlocksPath = path.resolve('src/components/pdf-new/templates/industryTemplateBlocks.tsx')

test('Industry pdf layout keeps the footer reserve compact instead of leaving a large dead zone', () => {
  assert.equal(styles.page.paddingBottom, 64)
  assert.equal(styles.footerZone.bottom, 14)
  assert.equal(styles.documentFooter.paddingTop, 8)
})

test('Industry signature block keeps the signature image and signer text tight to the line', () => {
  assert.equal(styles.signatureWrap.marginTop, 18)
  assert.equal(styles.signatureImage.marginBottom, 2)
  assert.equal(styles.signatureLine.marginBottom, 6)
})

test('Industry item images render larger and expose a clickable image link label', () => {
  const source = fs.readFileSync(industryTemplatePath, 'utf8')

  assert.equal(styles.imageThumb.width, 58)
  assert.equal(styles.imageThumb.height, 58)
  assert.match(source, /Link\s+src=\{row\.imageUrl\}/)
  assert.match(source, /Open image/)
})

test('Industry template applies the custom accent color to template identity surfaces beyond balance due', () => {
  const source = fs.readFileSync(industryTemplatePath, 'utf8')
  const blocksSource = fs.readFileSync(industryBlocksPath, 'utf8')

  assert.match(source, /styles\.tableHeaderRow,[\s\S]*accentColor \? \{ backgroundColor: accentColor \} : null/)
  assert.match(source, /styles\.totalFinal,[\s\S]*accentColor \? \{ borderTopColor: accentColor \} : null/)
  assert.match(blocksSource, /styles\.tableGroupRow,[\s\S]*accentColor \? \{ borderLeftColor: accentColor, backgroundColor: accentTint \} : null/)
})
