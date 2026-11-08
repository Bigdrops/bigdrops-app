import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('database migration creates document_shares table and storage bucket architecture', () => {
  const baseMigrationPath = path.resolve('supabase/migrations/20261107140000_document_sharing_platform.sql')
  assert.ok(fs.existsSync(baseMigrationPath), 'Base migration file must exist')
  const baseSql = fs.readFileSync(baseMigrationPath, 'utf8')

  assert.match(baseSql, /CREATE TABLE IF NOT EXISTS public\.document_shares/, 'Must create public.document_shares')
  assert.match(baseSql, /token TEXT NOT NULL UNIQUE/, 'Must define unique token')
  assert.match(baseSql, /document_type TEXT NOT NULL/, 'Must define document_type')
  assert.match(baseSql, /document_id TEXT NOT NULL/, 'Must define document_id')
  assert.match(baseSql, /pdf_path TEXT NOT NULL/, 'Must define pdf_path')
  assert.match(baseSql, /is_revoked BOOLEAN NOT NULL DEFAULT false/, 'Must define is_revoked')
  assert.match(baseSql, /expires_at TIMESTAMPTZ/, 'Must define expires_at')
  assert.match(baseSql, /ENABLE ROW LEVEL SECURITY/, 'Must enable RLS')
  assert.match(baseSql, /INSERT INTO storage\.buckets/, 'Must create document-shares storage bucket')

  // Verify that forward-only hardening migration removes public storage and anonymous select
  const hardeningMigrationPath = path.resolve('supabase/migrations/20261107150000_document_sharing_security_hardening.sql')
  assert.ok(fs.existsSync(hardeningMigrationPath), 'Hardening migration must exist')
  const hardeningSql = fs.readFileSync(hardeningMigrationPath, 'utf8')
  assert.match(hardeningSql, /REVOKE SELECT ON public\.document_shares FROM anon;/, 'Must revoke anonymous select')
  assert.match(hardeningSql, /UPDATE storage\.buckets[\s\S]*?SET public = false/, 'Must enforce private bucket')
})

test('documentShare types and service define canonical share architecture', () => {
  const typesPath = path.resolve('src/domain/documentShare/types.ts')
  assert.ok(fs.existsSync(typesPath), 'types.ts must exist')
  const typesSource = fs.readFileSync(typesPath, 'utf8')
  assert.match(typesSource, /export type DocumentShareRecord/)
  assert.match(typesSource, /export type DocumentShareMetadata/)
  assert.match(typesSource, /export type DocumentSharePayload/)
  assert.match(typesSource, /export type ShareChannel/)

  const servicePath = path.resolve('src/domain/documentShare/documentShareService.ts')
  assert.ok(fs.existsSync(servicePath), 'documentShareService.ts must exist')
  const serviceSource = fs.readFileSync(servicePath, 'utf8')
  assert.match(serviceSource, /export async function createOrGetDocumentShare/)
  assert.match(serviceSource, /export async function fetchPublicDocumentShare/)
  assert.match(serviceSource, /export async function shareViaWhatsApp/)
  assert.match(serviceSource, /export async function shareViaEmail/)
})

test('public route /shared/:token is mounted outside authentication barrier in App.tsx', () => {
  const appPath = path.resolve('src/App.tsx')
  const appSource = fs.readFileSync(appPath, 'utf8')
  assert.match(appSource, /path="\/shared\/:token"/, 'Must define route /shared/:token')
  assert.match(appSource, /<Route path="\/shared\/:token" element=\{withBoundary\(<PublicDocumentViewer \/>\)\} \/>/)
  assert.match(appSource, /<Route\s+path="\/\*"\s+element=\{[\s\S]*?!session/)
})

test('PublicDocumentViewer renders executive responsive viewer with in-browser PDF display', () => {
  const viewerPath = path.resolve('src/pages/PublicDocumentViewer.tsx')
  assert.ok(fs.existsSync(viewerPath), 'PublicDocumentViewer.tsx must exist')
  const viewerSource = fs.readFileSync(viewerPath, 'utf8')
  assert.match(viewerSource, /fetchPublicDocumentShare\(token\)/)
  assert.match(viewerSource, /type="application\/pdf"/, 'Must render responsive PDF object')
  assert.match(viewerSource, /Download/)
  assert.match(viewerSource, /BOUXRE/)
  assert.match(viewerSource, /Document Unavailable/)
})

test('DocumentEmailTemplate renders executive branded email with React Email', async () => {
  const templatePath = path.resolve('src/components/email/DocumentEmailTemplate.tsx')
  assert.ok(fs.existsSync(templatePath), 'DocumentEmailTemplate.tsx must exist')
  const templateSource = fs.readFileSync(templatePath, 'utf8')
  assert.match(templateSource, /@react-email\/components/)
  assert.match(templateSource, /@react-email\/render/)
  assert.match(templateSource, /DocumentEmailTemplate/)
  assert.match(templateSource, /export async function renderDocumentEmailHtml/)
  assert.match(templateSource, /View Document Online/)
  assert.match(templateSource, /BOUXRE/)
})

test('DocumentShareSheet provides the 3 channels: Direct Link, WhatsApp, and Email with layout preview', () => {
  const sheetPath = path.resolve('src/components/document-view/shared/DocumentShareSheet.tsx')
  assert.ok(fs.existsSync(sheetPath), 'DocumentShareSheet.tsx must exist')
  const sheetSource = fs.readFileSync(sheetPath, 'utf8')
  assert.match(sheetSource, /Direct Link/)
  assert.match(sheetSource, /WhatsApp/)
  assert.match(sheetSource, /Email/)
  assert.match(sheetSource, /createOrGetDocumentShare/)
  assert.match(sheetSource, /shareViaWhatsApp/)
  assert.match(sheetSource, /shareViaEmail/)
  assert.match(sheetSource, /Preview Layout/)
})

test('all commercial and operational document view pages wire DocumentShareSheet to authoritative PDF generator', () => {
  // 1. Invoice
  const invoiceOverlays = fs.readFileSync(path.resolve('src/components/document-view/invoice/InvoiceOverlays.tsx'), 'utf8')
  assert.ok(invoiceOverlays.includes('DocumentShareSheet'), 'InvoiceOverlays must import DocumentShareSheet')
  assert.match(invoiceOverlays, /const SHEET_SHARE = "share-document"/)
  assert.match(invoiceOverlays, /getInvoicePdfBlob/)
  assert.match(invoiceOverlays, /<DocumentShareSheet/)

  // 2. Quotation
  const viewQuotation = fs.readFileSync(path.resolve('src/pages/ViewQuotation.tsx'), 'utf8')
  assert.ok(viewQuotation.includes('DocumentShareSheet'), 'ViewQuotation must import DocumentShareSheet')
  assert.match(viewQuotation, /getQuotationPdfBlob/)
  assert.match(viewQuotation, /<DocumentShareSheet/)
  assert.match(viewQuotation, /onShare=\{\(\) => setShareOpen\(true\)\}/)

  // 3. CSR
  const viewCsr = fs.readFileSync(path.resolve('src/pages/ViewCSR.tsx'), 'utf8')
  assert.ok(viewCsr.includes('DocumentShareSheet'), 'ViewCSR must import DocumentShareSheet')
  assert.match(viewCsr, /<DocumentShareSheet/)
  assert.match(viewCsr, /onShare=\{\(\) => setShareOpen\(true\)\}/)

  // 4. Waybill
  const viewWaybill = fs.readFileSync(path.resolve('src/pages/ViewWaybill.tsx'), 'utf8')
  assert.ok(viewWaybill.includes('DocumentShareSheet'), 'ViewWaybill must import DocumentShareSheet')
  assert.match(viewWaybill, /<DocumentShareSheet/)
  assert.match(viewWaybill, /onShare=\{\(\) => setShareOpen\(true\)\}/)

  // 5. RFQ
  const viewRfq = fs.readFileSync(path.resolve('src/pages/ViewRfq.tsx'), 'utf8')
  assert.ok(viewRfq.includes('DocumentShareSheet'), 'ViewRfq must import DocumentShareSheet')
  assert.match(viewRfq, /<DocumentShareSheet/)
  assert.match(viewRfq, /onShare=\{\(\) => setShareOpen\(true\)\}/)

  // 6. Receipt
  const viewReceipt = fs.readFileSync(path.resolve('src/pages/ViewReceipt.tsx'), 'utf8')
  assert.ok(viewReceipt.includes('DocumentShareSheet'), 'ViewReceipt must import DocumentShareSheet')
  assert.match(viewReceipt, /<DocumentShareSheet/)
  assert.match(viewReceipt, /onShare=\{\(\) => setShareOpen\(true\)\}/)

  // 7. Cost & Pricing Sheet
  const viewCps = fs.readFileSync(path.resolve('src/pages/ViewCps.tsx'), 'utf8')
  assert.ok(viewCps.includes('DocumentShareSheet'), 'ViewCps must import DocumentShareSheet')
  assert.match(viewCps, /getCpsPdfBlob/)
  assert.match(viewCps, /<DocumentShareSheet/)
  assert.match(viewCps, /onShare: \(\) => setShareOpen\(true\)/)

  const cpsPresentations = fs.readFileSync(path.resolve('src/components/cps/CostPricingSheetViewPresentations.tsx'), 'utf8')
  assert.match(cpsPresentations, /aria-label="Share" onClick=\{props\.onShare\}/)
})
