import { describe, it, expect } from 'bun:test'
import {
  buildDefaultEmailSubject,
  buildDefaultEmailMessage,
  buildDocumentEmailHtml,
} from '@/domain/documentShare/documentEmailHtml'
import { copyToClipboard } from '@/lib/clipboard'

describe('Document Share Email Content Prefilling & Clipboard Verification', () => {
  it('buildDefaultEmailSubject formats subject accurately without double labels', () => {
    const subject = buildDefaultEmailSubject({
      documentType: 'invoice',
      documentNumber: 'SASINV-000130',
      documentTitle: 'For Generator Repairs and Replacement of Parts',
      issuerName: 'Sun & Shield Power Solutions',
    })

    expect(subject).toBe(
      'Invoice SASINV-000130 for For Generator Repairs and Replacement of Parts from Sun & Shield Power Solutions'
    )
  })

  it('buildDefaultEmailSubject handles default document types cleanly', () => {
    const subject = buildDefaultEmailSubject({
      documentType: 'quotation',
      documentNumber: 'QUO-009',
      documentTitle: 'Quotation',
      issuerName: 'BOUXRE',
    })

    expect(subject).toBe('Quotation QUO-009 from BOUXRE')
  })

  it('buildDefaultEmailMessage builds structured message with verified invoice details', () => {
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

    expect(msg).toContain('Hi Tecno Power Solutions,')
    expect(msg).toContain('Please find attached invoice SASINV-000130 for Generator Repairs.')
    expect(msg).toContain('Document No: SASINV-000130')
    expect(msg).toContain('Date: 05/11/2026')
    expect(msg).toContain('Billed To: Tecno Power Solutions (26 Ademola street, Ikoyi, Lagos)')
    expect(msg).toContain('Amount Due: ₦980,400.00')
    expect(msg).toContain('Payment Status: UNPAID')
    expect(msg).toContain('Equipment: Diesel Engine, 40kVA (S/N: R7100LN0073)')
    expect(msg).toContain('Bank: U.B.A')
    expect(msg).toContain('Account Name: Sun and shield power solutions')
    expect(msg).toContain('Account Number: 1024829598')
    expect(msg).toContain('Sun & Shield Power Solutions')
    expect(msg).toContain('+234-8033695304')
    // Must NOT contain YORC
    expect(msg).not.toContain('YORC')
  })

  it('buildDefaultEmailMessage omits bank details when not provided', () => {
    const msg = buildDefaultEmailMessage({
      documentType: 'receipt',
      documentNumber: 'REC-001',
      recipientName: 'Acme Corp',
      totalFormatted: '₦50,000.00',
      issuerName: 'Alpha Logistics',
    })

    expect(msg).toContain('Hi Acme Corp,')
    expect(msg).not.toContain('Bank:')
    expect(msg).not.toContain('Payment Details:')
  })

  it('buildDocumentEmailHtml renders payment status pill when provided', () => {
    const html = buildDocumentEmailHtml({
      documentType: 'invoice',
      documentNumber: 'SASINV-000130',
      shareUrl: 'https://bouxre.com/shared/test-token',
      paymentStatus: 'UNPAID',
    })

    expect(html).toContain('UNPAID')
    expect(html).toContain('Status:')
  })

  it('copyToClipboard returns false safely when no text is provided', async () => {
    const result = await copyToClipboard('')
    expect(result).toBe(false)
  })
})
