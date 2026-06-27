import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { styles } from '../../components/pdf-new/presentation/industry/industryStyles.ts'
import { adaptCommercialDocumentData } from '../../components/pdf-new/industryAdapter.ts'

const industryTemplatePath = path.resolve('src/components/pdf-new/presentation/industry/IndustryTemplate.tsx')

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
  assert.match(source, /<Text style=\{styles\.descriptionMain\}>\{getDescriptionMain\(cell\)\}<\/Text>[\s\S]*<Text style=\{styles\.descriptionSub\}>\{getDescriptionSub\(cell\)\}<\/Text>[\s\S]*<Image src=\{row\.imageUrl\} style=\{styles\.imageThumb\} \/>/)
  assert.match(source, /Link\s+src=\{row\.imageUrl\}/)
  assert.match(source, /Open image/)
})

test('Industry template applies the custom accent color to template identity surfaces beyond balance due', () => {
  const source = fs.readFileSync(industryTemplatePath, 'utf8')

  assert.match(source, /styles\.tableHeaderRow,[\s\S]*accentColor \? \{ backgroundColor: accentColor \} : null/)
  assert.match(source, /styles\.totalFinal,[\s\S]*accentColor \? \{ borderTopColor: accentColor \} : null/)
  assert.match(source, /const panelSurfaceColor = /)
  assert.match(source, /const subtleSurfaceColor = /)
  assert.match(source, /surfaceColor=\{panelSurfaceColor\}/)
  assert.match(source, /panelSurfaceColor \? \{ backgroundColor: panelSurfaceColor \} : null/)
  assert.match(source, /subtleSurfaceColor \? \{ backgroundColor: subtleSurfaceColor \} : null/)
})

test('Industry group rows use spreadsheet-style rendering with thin rules', () => {
  assert.equal(styles.groupHeaderRow.borderTopWidth, 1)
  assert.equal(styles.groupHeaderRow.borderBottomWidth, 1)
  assert.equal(styles.groupFooterRow.borderBottomWidth, 2)
})

test('Industry group footer renders subtotal label and value', () => {
  const source = fs.readFileSync(industryTemplatePath, 'utf8')
  assert.match(source, /shouldShowGroupSubtotal/)
  assert.match(source, /getGroupSubtotal/)
  assert.match(source, /Subtotal/)
})

test('Industry PDF receives merged qty-unit as a visible fixed-width token', () => {
  const data = adaptCommercialDocumentData({
    identity: { id: 'inv-1', kind: 'invoice', number: 'INV-1', title: 'Invoice', issueDate: '', dueDate: '', poNumber: '', status: '', currency: 'NGN' },
    issuer: { label: 'From', name: 'Bigdrops', addressLines: [], phone: '', email: '', taxId: '' },
    recipient: { label: 'To', name: 'Client', addressLines: [], phone: '', email: '' },
    headerFields: [],
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 20, pdfFlex: 0.45 },
      { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 0, pdfFlex: 2.9 },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 72, pdfFlex: 0 },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 54, pdfFlex: 1.2 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 62, pdfFlex: 1.35 },
    ],
    mergeQtyUnit: true,
    items: [{
      id: 'line-1',
      rowType: 'line',
      description: 'Long description that should yield space before starving quantity',
      subDescription: '',
      quantity: 3500,
      unit: 'm',
      unitPrice: 10,
      amount: 35000,
      cells: { num: '1', description: 'Long description', quantity: '3500m', unit_price: '10', amount: '35000' },
      customData: {},
    }],
    totals: { mode: 'standard', rows: [], amountInWords: '', balanceDue: null, advanceSummary: null },
    bankDetails: null,
    notes: null,
    terms: null,
    additionalSections: [],
    referenceLinks: [],
    attachments: [],
    signature: null,
    logo: null,
    footerText: '',
    tagline: '',
    metaFooter: { companyName: 'Bigdrops' },
    template: {},
  })

  assert.equal(data.table.rows[0].cells?.quantity, '3500m')
  assert.equal(data.table.columns.find((column) => column.key === 'quantity')?.key, 'quantity')
  assert.equal(data.table.columns.find((column) => column.key === 'quantity')?.label, 'Qty')
  assert.equal(data.table.columns.find((column) => column.key === 'quantity')?.width, 72)
  assert.equal(data.table.columns.find((column) => column.key === 'quantity')?.flex, 0)
  const source = fs.readFileSync(industryTemplatePath, 'utf8')
  assert.match(source, /styles\.quantityCellFixed/)
  assert.match(source, /hyphenationCallback=\{keepWholePdfWord\}/)
  assert.match(source, /wrap=\{false\}/)
  assert.match(source, /function resolveFinalIndustryColumnStyle/)
  assert.match(source, /styles\.tableHeaderCell,[\s\S]*\.\.\.finalColumnStyle/)
  assert.match(source, /styles\.tableCell,[\s\S]*\.\.\.finalColumnStyle/)
})
