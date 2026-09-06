import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { styles } from '../../components/pdf/templates/LedgerStyles.ts'

const ledgerTemplatePath = path.resolve('src/components/pdf/templates/Ledger.tsx')

test('Ledger page shell stays white and continuation pages do not inherit top inset padding from the table wrapper', () => {
  assert.equal(styles.page.backgroundColor, '#ffffff')
  assert.equal(styles.page.padding, 0)
  assert.equal(styles.tableSection.paddingTop, 0)
  assert.equal(styles.metaSection.marginBottom, 24)
})

test('Ledger bottom section does not use table flex filler before payment and totals', () => {
  assert.equal(styles.tableSection.flexGrow, undefined)
  assert.equal(styles.bottomSection.paddingTop, 12)
})

test('Ledger keeps only the payment-and-totals row protected while notes, terms, and attachments stay flowable', () => {
  const source = fs.readFileSync(ledgerTemplatePath, 'utf8')

  assert.match(source, /<View style=\{styles\.bottomPrimaryRow\} wrap=\{false\}>/)
  assert.match(source, /<View style=\{styles\.totalsWrap\} wrap=\{false\}>/)
  assert.doesNotMatch(source, /\{notes\?\.content &&\s*\(\s*<View wrap=\{false\}>/)
  assert.doesNotMatch(source, /\{terms\?\.content &&\s*\(\s*<View wrap=\{false\}>/)
  assert.doesNotMatch(source, /<View style=\{styles\.footerMetaGrid\} wrap=\{false\}>/)
})
