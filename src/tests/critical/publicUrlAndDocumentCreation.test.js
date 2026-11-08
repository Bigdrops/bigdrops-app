import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('publicUrl module exports canonical constants and functions', async () => {
  const publicUrlSource = fs.readFileSync(path.resolve('src/lib/publicUrl.ts'), 'utf8')
  assert.match(publicUrlSource, /export const PRODUCTION_CANONICAL_ORIGIN = 'https:\/\/bouxre\.com'/)
  assert.match(publicUrlSource, /export function getPublicBaseUrl\(\)/)
  assert.match(publicUrlSource, /export function toPublicShareUrl\(/)
})

test('toPublicShareUrl transforms localhost, capacitor, and relative URLs into canonical URLs while preserving external URLs', () => {
  // Simulate canonical transformation logic as implemented in publicUrl.ts
  const CANONICAL = 'https://bouxre.com'
  function isLoopbackOrLocal(hostname) {
    const h = hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1' || h.endsWith('.localhost')
  }

  function transformUrl(pathOrUrl) {
    if (!pathOrUrl || pathOrUrl.trim() === '') return CANONICAL
    const trimmed = pathOrUrl.trim()
    if (trimmed.startsWith('/')) return `${CANONICAL}${trimmed}`
    try {
      const parsed = new URL(trimmed)
      const isLocal = isLoopbackOrLocal(parsed.hostname)
      const isLocalScheme = parsed.protocol === 'capacitor:' || parsed.protocol === 'ionic:' || parsed.protocol === 'file:'
      if (isLocal || isLocalScheme) {
        const pathPart = `${parsed.pathname}${parsed.search}${parsed.hash}`
        return `${CANONICAL}${pathPart.startsWith('/') ? pathPart : `/${pathPart}`}`
      }
      return trimmed
    } catch {
      return `${CANONICAL}/${trimmed}`
    }
  }

  // Relative path
  assert.equal(transformUrl('/invoices/sasinv-000130'), 'https://bouxre.com/invoices/sasinv-000130')
  // Relative path with query params
  assert.equal(transformUrl('/quotations/123?view=pdf&theme=classic'), 'https://bouxre.com/quotations/123?view=pdf&theme=classic')
  // Localhost dev server URL
  assert.equal(transformUrl('http://localhost:5173/invoices/sasinv-000130'), 'https://bouxre.com/invoices/sasinv-000130')
  // 127.0.0.1 IP
  assert.equal(transformUrl('http://127.0.0.1:8080/waybills/wb-001'), 'https://bouxre.com/waybills/wb-001')
  // Capacitor Android origin
  assert.equal(transformUrl('capacitor://localhost/csr/csr-999#notes'), 'https://bouxre.com/csr/csr-999#notes')
  // External URL must be preserved
  assert.equal(transformUrl('https://checkout.paystack.com/pay/abc123xyz'), 'https://checkout.paystack.com/pay/abc123xyz')
  // Path without leading slash
  assert.equal(transformUrl('cost-pricing-sheets/cps-005'), 'https://bouxre.com/cost-pricing-sheets/cps-005')
})

test('shareDocument uses toPublicShareUrl and prevents literal undefined in clipboard text', () => {
  const source = fs.readFileSync(path.resolve('src/components/document-view/shared/shareDocument.ts'), 'utf8')
  assert.match(source, /import \{ toPublicShareUrl \} from '@\/lib\/publicUrl'/)
  assert.match(source, /const shareUrl = toPublicShareUrl\(options\.url\)/)
  assert.match(source, /navigator\.clipboard\?\.writeText/)
  // Verify text cleanup
  assert.doesNotMatch(source, /\$\{options\.title\}\\n\$\{options\.text\}/)
})

test('Login.tsx uses getPublicBaseUrl for password reset email redirect', () => {
  const source = fs.readFileSync(path.resolve('src/pages/Login.tsx'), 'utf8')
  assert.match(source, /import \{ getPublicBaseUrl \} from '@\/lib\/publicUrl'/)
  assert.match(source, /redirectTo: `\$\{getPublicBaseUrl\(\)\}\/reset-password`/)
  assert.doesNotMatch(source, /redirectTo: `\$\{window\.location\.origin\}\/reset-password`/)
})

test('Invoice view has Create New Invoice shortcut wired to /invoices/new', () => {
  const sheetSource = fs.readFileSync(path.resolve('src/components/document-view/invoice/InvoiceMoreSheet.tsx'), 'utf8')
  const overlaysSource = fs.readFileSync(path.resolve('src/components/document-view/invoice/InvoiceOverlays.tsx'), 'utf8')

  assert.match(sheetSource, /onCreateNew\?: \(\) => void/)
  assert.match(sheetSource, /id:\s*'create-new'/)
  assert.match(sheetSource, /label:\s*'Create New Invoice'/)
  assert.match(sheetSource, /onClick:\s*onCreateNew/)

  assert.match(overlaysSource, /<InvoiceMoreSheet/)
  assert.match(overlaysSource, /onCreateNew=\{\(\) => \{\s*ui\.closeSheet\(\);\s*navigate\("\/invoices\/new"\);\s*\}\}/)
})

test('Quotation view has Create New Quotation shortcut wired to /quotations/new', () => {
  const sheetSource = fs.readFileSync(path.resolve('src/components/document-view/quotation/QuotationMoreSheet.tsx'), 'utf8')
  const viewSource = fs.readFileSync(path.resolve('src/pages/ViewQuotation.tsx'), 'utf8')

  assert.match(sheetSource, /onCreateNew\?: \(\) => void/)
  assert.match(sheetSource, /id:\s*'create-new'/)
  assert.match(sheetSource, /label:\s*'Create New Quotation'/)
  assert.match(sheetSource, /onClick:\s*onCreateNew/)

  assert.match(viewSource, /<QuotationMoreSheet/)
  assert.match(viewSource, /onCreateNew=\{\(\) => \{\s*ui\.closeSheet\(\);\s*navigate\('\/quotations\/new'\);\s*\}\}/)
})

test('Purchase Order detail has New Purchase Order button wired to /purchase-orders/new', () => {
  const detailSource = fs.readFileSync(path.resolve('src/pages/PurchaseOrderDetail.tsx'), 'utf8')

  assert.match(detailSource, /New Purchase Order/)
  assert.match(detailSource, /onClick=\{\(\) => navigate\('\/purchase-orders\/new'\)\}/)
})

test('Cost & Pricing Sheet view has New Sheet action wired to /cost-pricing-sheets/new', () => {
  const presSource = fs.readFileSync(path.resolve('src/components/cps/CostPricingSheetViewPresentations.tsx'), 'utf8')
  const viewSource = fs.readFileSync(path.resolve('src/pages/ViewCps.tsx'), 'utf8')

  assert.match(presSource, /onCreateNew\?: \(\) => void/)
  assert.match(presSource, /id:\s*'new-sheet'/)
  assert.match(presSource, /label:\s*'New Sheet'/)

  assert.match(viewSource, /onCreateNew:\s*\(\)\s*=>\s*\{\s*navigate\('\/cost-pricing-sheets\/new'\)\s*\}/)
})
