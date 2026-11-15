import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDefaultEmailSubject,
  buildDefaultEmailMessage,
  buildDocumentEmailHtml,
} from '@/domain/documentShare/documentEmailHtml'
import { copyToClipboard } from '@/lib/clipboard'

test('buildDefaultEmailSubject formats subject accurately without double labels', () => {
  const subject = buildDefaultEmailSubject({
    documentType: 'invoice',
    documentNumber: 'SASINV-000130',
    documentTitle: 'For Generator Repairs and Replacement of Parts',
    issuerName: 'Sun & Shield Power Solutions',
  })

  assert.equal(
    subject,
    'Invoice SASINV-000130 for For Generator Repairs and Replacement of Parts from Sun & Shield Power Solutions',
  )
})

test('buildDefaultEmailSubject handles default document types cleanly', () => {
  const subject = buildDefaultEmailSubject({
    documentType: 'quotation',
    documentNumber: 'QUO-009',
    documentTitle: 'Quotation',
    issuerName: 'BOUXRE',
  })

  assert.equal(subject, 'Quotation QUO-009 from BOUXRE')
})

test('buildDefaultEmailMessage builds structured message with verified invoice details', () => {
  const msg = buildDefaultEmailMessage({
    documentType: 'invoice',
    documentNumber: 'SASINV-000130',
    documentTitle: 'Generator Repairs',
    recipientName: 'Tecno Power Solutions',
    recipientAddress: '26 Ademola street, Ikoyi, Lagos',
    issueDate: '05/11/2026',
    totalFormatted: '₦980,400.00',
    paymentStatus: 'UNPAID',
    equipment: 'Diesel Engine, 40kVA (S/N: R7100LN0073)',
    bankName: 'U.B.A',
    bankAccountName: 'Sun and shield power solutions',
    bankAccountNumber: '1024829598',
    issuerName: 'Sun & Shield Power Solutions',
    issuerAddress: '43 Oshola street, Ifako-Ijaiye, Lagos',
    issuerPhone: '+234-8033695304',
  })

  assert.ok(msg.includes('Hi Tecno Power Solutions,'))
  assert.ok(msg.includes('Please find attached invoice SASINV-000130 for Generator Repairs.'))
  assert.ok(msg.includes('Document No: SASINV-000130'))
  assert.ok(msg.includes('Date: 05/11/2026'))
  assert.ok(msg.includes('Billed To: Tecno Power Solutions (26 Ademola street, Ikoyi, Lagos)'))
  assert.ok(msg.includes('Amount Due: ₦980,400.00'))
  assert.ok(msg.includes('Payment Status: UNPAID'))
  assert.ok(msg.includes('Equipment: Diesel Engine, 40kVA (S/N: R7100LN0073)'))
  assert.ok(msg.includes('Bank: U.B.A'))
  assert.ok(msg.includes('Account Name: Sun and shield power solutions'))
  assert.ok(msg.includes('Account Number: 1024829598'))
  assert.ok(msg.includes('Sun & Shield Power Solutions'))
  assert.ok(msg.includes('+234-8033695304'))
  // Must NOT contain YORC
  assert.ok(!msg.includes('YORC'))
})

test('buildDefaultEmailMessage omits bank details when not provided', () => {
  const msg = buildDefaultEmailMessage({
    documentType: 'receipt',
    documentNumber: 'REC-001',
    recipientName: 'Acme Corp',
    totalFormatted: '₦50,000.00',
    issuerName: 'Alpha Logistics',
  })

  assert.ok(msg.includes('Hi Acme Corp,'))
  assert.ok(!msg.includes('Bank:'))
  assert.ok(!msg.includes('Payment Details:'))
})

test('buildDocumentEmailHtml renders payment status pill when provided', () => {
  const html = buildDocumentEmailHtml({
    documentType: 'invoice',
    documentNumber: 'SASINV-000130',
    shareUrl: 'https://bouxre.com/shared/test-token',
    paymentStatus: 'UNPAID',
  })

  assert.ok(html.includes('UNPAID'))
  assert.ok(html.includes('Status:'))
})

test('copyToClipboard returns false safely when no text is provided', async () => {
  const result = await copyToClipboard('')
  assert.equal(result, false)
})
