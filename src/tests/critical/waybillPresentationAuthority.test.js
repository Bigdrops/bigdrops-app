import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const waybillFormPath = path.resolve('src/components/waybill/WaybillForm.tsx')
const signaturesPath = path.resolve('src/components/waybill/WaybillSignatures.tsx')
const bridgePath = path.resolve('src/components/document/document-cps-overrides.css')

test('waybill form uses active document presentation authority', () => {
  const source = fs.readFileSync(waybillFormPath, 'utf8')

  assert.doesNotMatch(source, /cost-pricing-sheet-form\.css/)
  assert.doesNotMatch(source, /className="cps-form\b/)
  assert.match(source, /className="bd-document-form bd-waybill-form bd-form-shell/)
  assert.match(source, /document-cps-overrides\.css/)
})

test('waybill acknowledgement summary is derived from signature state', () => {
  const source = fs.readFileSync(waybillFormPath, 'utf8')
  const signatures = fs.readFileSync(signaturesPath, 'utf8')

  assert.match(signatures, /export function countCapturedWaybillSignatures/)
  assert.match(signatures, /signatureHasEvidence\(signatures\?\.sender\)/)
  assert.match(signatures, /signatureHasEvidence\(signatures\?\.receiver\)/)
  assert.match(source, /countCapturedWaybillSignatures\(customFields\.signatures\)/)
  assert.match(source, /meta=\{`\$\{capturedSignatureCount\} of 2 captured`\}/)
})

test('waybill acknowledgement keeps supported signature actions and handlers wired', () => {
  const source = fs.readFileSync(signaturesPath, 'utf8')

  assert.match(source, /function SignatureSurface/)
  assert.match(source, /bd-waybill-signature-surface/)
  assert.match(source, /bd-waybill-signature-eye/)
  assert.match(source, /aria-pressed=\{shown\}/)
  assert.match(source, /No signature captured/)
  assert.match(source, /openMode\('upload'\)/)
  assert.match(source, /openMode\('draw'\)/)
  assert.match(source, /showPickButton &&/)
  assert.match(source, /openMode\('pick'\)/)
  assert.match(source, /bd-waybill-signature-action primary/)
  assert.match(source, /handleUpload/)
  assert.match(source, /processSignature\(file\)/)
  assert.match(source, /supabase\.storage\.from\('signatures'\)\.upload/)
  assert.match(source, /<DrawPad/)
  assert.match(source, /<PickSignatorySheet/)
  assert.match(source, /updateCustomFields\(\{ signatures: \{ \.\.\.customFields\.signatures, sender: next \} \}\)/)
  assert.match(source, /updateCustomFields\(\{ signatures: \{ \.\.\.customFields\.signatures, receiver: next \} \}\)/)
})

test('waybill acknowledgement has no capture dropdown or expand toggle', () => {
  const source = fs.readFileSync(signaturesPath, 'utf8')

  assert.doesNotMatch(source, /setExpanded/)
  assert.doesNotMatch(source, /aria-expanded/)
  assert.doesNotMatch(source, /bd-waybill-signature-expand/)
  assert.doesNotMatch(source, /bd-waybill-signature-detail/)
  assert.doesNotMatch(source, /['"]Capture['"]/)
  assert.doesNotMatch(source, /['"]Manage['"]/)
})

test('waybill item card composes quantity beside a compact camera action', () => {
  const cardPath = path.resolve('src/components/invoice/MobileItemCard.tsx')
  const source = fs.readFileSync(cardPath, 'utf8')

  assert.match(source, /ctx === 'waybill'/)
  assert.match(source, /bd-waybill-qtyrow/)
  assert.match(source, /Quantity for item/)
})

test('waybill form keeps the client picker out of the page flow', () => {
  const source = fs.readFileSync(waybillFormPath, 'utf8')

  assert.match(source, /hideTrigger/)
  assert.match(source, /hideHeader/)
})

test('waybill item grid and add action fill the available width', () => {
  const css = fs.readFileSync(bridgePath, 'utf8')

  assert.match(css, /\.bd-waybill-form \.cps-createpair \{[^}]*grid-template-columns: 1fr/)
  assert.match(css, /\.bd-waybill-form \.waybill-item \.bd-waybill-qtyrow/)
  assert.match(css, /\.bd-waybill-form \.bd-waybill-logistics-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
})

test('waybill acknowledgement styles are scoped, token-based, and responsive', () => {
  const source = fs.readFileSync(bridgePath, 'utf8')

  assert.match(source, /\.bd-waybill-form \.bd-waybill-signatures/)
  assert.match(source, /\.bd-waybill-form \.bd-waybill-signature-surface/)
  assert.match(source, /border: 1px solid var\(--line\)/)
  assert.match(source, /background: var\(--card\)/)
  assert.match(source, /color: var\(--green\)/)
  assert.match(source, /@media \(min-width: 600px\)[\s\S]*\.bd-waybill-form \.bd-waybill-signatures[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
})
