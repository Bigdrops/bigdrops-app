import React from 'react'
import { Document, Image, Page, Text, View } from '@formepdf/react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { ReceiptPreviewData } from '@/domain/receipt/previewModel'
import { formatCurrency } from '@/lib/formatters/money'
import { safeText } from '../core/safeText'
import { isFormeSupportedFamily } from './fonts'
import { glyphRuns } from './glyphs'

/**
 * Forme port of the legacy React-PDF Receipt renderer.
 * Layout, palette, copy and field order mirror src/components/pdf/ReceiptPdf.tsx.
 * Kept in sync with DEFAULT_PRESETS.receipt in src/lib/pdfDesignPreset.ts —
 * that module cannot be imported here because it pulls in .woff asset imports
 * that only exist under Vite. The page always passes a resolved preset.
 */
const DEFAULT_RECEIPT_PRESET: Pick<
  PdfDesignPreset,
  'accentColor' | 'textColor' | 'mutedColor' | 'borderColor' | 'surfaceColor' | 'headerFont' | 'bodyFont'
> = {
  accentColor: '#0f172a',
  textColor: '#0f172a',
  mutedColor: '#475569',
  borderColor: '#cbd5e1',
  surfaceColor: '#f8fafc',
  headerFont: 'Inter',
  bodyFont: 'Inter',
}

const TERMS = [
  'This receipt acknowledges payment received as detailed above.',
  'This is a computer-generated receipt and does not require a physical signature.',
  'For any queries, please contact us at the details provided above.',
  'Payment terms are subject to the original invoice terms and conditions.',
] as const

// Former hardcoded Helvetica-Bold maps to a weighted variant of the resolved header family.
function strongFamily(choice: PdfDesignPreset['headerFont'] | PdfDesignPreset['bodyFont']): string {
  return choice && isFormeSupportedFamily(choice) ? choice : 'Inter'
}

export interface ReceiptFormeDocumentProps {
  model: ReceiptPreviewData
  designPreset?: PdfDesignPreset | null
}

export function ReceiptFormeDocument({ model, designPreset }: ReceiptFormeDocumentProps): React.JSX.Element {
  const preset = designPreset ?? DEFAULT_RECEIPT_PRESET
  const headerFont = strongFamily(preset.headerFont)
  const bodyFont = strongFamily(preset.bodyFont)

  const mutedColor = preset.mutedColor
  const bold = { fontFamily: headerFont, fontWeight: 700 as const }

  return (
    <Document title={`Payment Receipt ${safeText(model.receiptNumber)}`.trim()} style={{ fontFamily: bodyFont, fontSize: 10, color: preset.textColor, lineHeight: 1.0 }}>
      <Page size="A4" margin={30}>
        {/* Header: Company info + Logo */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...bold, fontSize: 14, marginBottom: 2 }}>{glyphRuns(safeText(model.companyName), headerFont)}</Text>
            {model.companyAddress ? <Text style={{ fontSize: 8, color: mutedColor, marginBottom: 1 }}>{glyphRuns(safeText(model.companyAddress), bodyFont)}</Text> : null}
            {model.companyPhone ? <Text style={{ fontSize: 8, marginBottom: 1 }}>{glyphRuns(safeText(model.companyPhone), bodyFont)}</Text> : null}
            {model.companyEmail ? <Text style={{ fontSize: 8, marginBottom: 1 }}>{glyphRuns(safeText(model.companyEmail), bodyFont)}</Text> : null}
          </View>
          {model.companyLogoUrl ? <Image src={model.companyLogoUrl} alt="Company logo" style={{ width: 60, height: 60 }} /> : null}
        </View>

        {/* Title */}
        <Text style={{ ...bold, fontSize: 20, textAlign: 'center', color: preset.accentColor, marginVertical: 8 }}>PAYMENT RECEIPT</Text>

        {/* Receipt meta: number, date, status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Receipt No.</Text>
            <Text style={{ fontSize: 11 }}>{glyphRuns(safeText(model.receiptNumber), bodyFont)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Date</Text>
            <Text style={{ fontSize: 11 }}>{glyphRuns(safeText(model.paymentDate), bodyFont)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Status</Text>
            <Text style={{ fontSize: 11 }}>{model.status === 'voided' ? 'VOIDED' : 'Active'}</Text>
          </View>
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: preset.borderColor, marginBottom: 10 }} />

        {/* Client Block */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ ...bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Client Details</Text>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ width: 130, fontSize: 9 }}>Name</Text>
            <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.clientName), bodyFont)}</Text>
          </View>
          {model.clientAddress ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Address</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.clientAddress), bodyFont)}</Text>
            </View>
          ) : null}
          {model.clientCity || model.clientState ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>City/State</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText([model.clientCity, model.clientState].filter(Boolean).join(', ')), bodyFont)}</Text>
            </View>
          ) : null}
          {model.clientPhone ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Phone</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.clientPhone), bodyFont)}</Text>
            </View>
          ) : null}
          {model.clientEmail ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Email</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.clientEmail), bodyFont)}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: preset.borderColor, marginBottom: 10 }} />

        {/* Payment Details */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ ...bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Payment Details</Text>
          <View style={{ padding: 12, borderRadius: 4, marginBottom: 10, backgroundColor: preset.surfaceColor, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 10 }}>Amount Received</Text>
              <Text style={{ ...bold, fontSize: 18 }}>{glyphRuns(formatCurrency(model.paymentAmount), headerFont)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10 }}>Method</Text>
              <Text style={{ fontSize: 11 }}>{glyphRuns(safeText(model.paymentMethod), bodyFont)}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 9, fontStyle: 'italic', marginTop: 2 }}>In words: {glyphRuns(safeText(model.amountInWords), bodyFont)}</Text>
          {model.paymentReference !== '—' ? (
            <View style={{ flexDirection: 'row', marginBottom: 4, marginTop: 8 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Reference</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.paymentReference), bodyFont)}</Text>
            </View>
          ) : null}
          {model.cashAmount > 0 ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Cash Amount</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.cashAmount.toLocaleString(), bodyFont)}</Text>
            </View>
          ) : null}
          {model.whtAmount > 0 ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>WHT Amount</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.whtAmount.toLocaleString(), bodyFont)}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: preset.borderColor, marginBottom: 10 }} />

        {/* Invoice Reference */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ ...bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Invoice Reference</Text>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ width: 130, fontSize: 9 }}>Invoice Number</Text>
            <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.invoiceNumber), bodyFont)}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ width: 130, fontSize: 9 }}>Invoice Total</Text>
            <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.invoiceTotal.toLocaleString(), bodyFont)}</Text>
          </View>
          {model.invoiceSubtotal > 0 ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Subtotal</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.invoiceSubtotal.toLocaleString(), bodyFont)}</Text>
            </View>
          ) : null}
          {model.invoiceVat > 0 ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>VAT</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.invoiceVat.toLocaleString(), bodyFont)}</Text>
            </View>
          ) : null}
          {model.invoiceWht > 0 ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>WHT</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.invoiceWht.toLocaleString(), bodyFont)}</Text>
            </View>
          ) : null}
          {model.invoiceDiscount > 0 ? (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Discount</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(model.invoiceDiscount.toLocaleString(), bodyFont)}</Text>
            </View>
          ) : null}
        </View>

        {/* Project Reference (if present) */}
        {model.projectName ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ ...bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Project Reference</Text>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Project Name</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.projectName), bodyFont)}</Text>
            </View>
            {model.projectCode ? (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ width: 130, fontSize: 9 }}>Project Code</Text>
                <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.projectCode), bodyFont)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Bank Details */}
        {model.bankName ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ ...bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Bank Details</Text>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 130, fontSize: 9 }}>Bank Name</Text>
              <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.bankName), bodyFont)}</Text>
            </View>
            {model.bankAccountNumber ? (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ width: 130, fontSize: 9 }}>Account Number</Text>
                <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.bankAccountNumber), bodyFont)}</Text>
              </View>
            ) : null}
            {model.bankAccountName ? (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ width: 130, fontSize: 9 }}>Account Name</Text>
                <Text style={{ flex: 1, fontSize: 9 }}>{glyphRuns(safeText(model.bankAccountName), bodyFont)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Voided receipt notice */}
        {model.status === 'voided' ? (
          <View style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
            <Text style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Note</Text>
            <Text style={{ fontSize: 9 }}>This receipt has been voided.</Text>
          </View>
        ) : null}

        {/* Terms */}
        <View style={{ marginBottom: 6 }}>
          <Text style={{ ...bold, fontSize: 9, marginBottom: 2 }}>Terms &amp; Conditions</Text>
          {TERMS.map((term, i) => (
            <Text key={i} style={{ fontSize: 8, lineHeight: 1.2 }}>{i + 1}. {term}</Text>
          ))}
        </View>

        {/* Signature — kept together; an orphaned signature line must not break across pages */}
        <View wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 2 }}>
          <View style={{ width: '45%' }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: preset.borderColor, marginBottom: 4, marginTop: 10 }} />
            <Text style={{ fontSize: 8 }}>Authorized Signature</Text>
            {model.signatoryName ? <Text style={{ fontSize: 9, marginTop: 2 }}>{glyphRuns(safeText(model.signatoryName), bodyFont)}</Text> : null}
            {model.signatoryRole ? <Text style={{ fontSize: 9, marginTop: 2 }}>{glyphRuns(safeText(model.signatoryRole), bodyFont)}</Text> : null}
          </View>
          <View style={{ width: '45%' }}>
            {model.signatorySignatureUrl ? <Image src={model.signatorySignatureUrl} alt="Authorized signature" style={{ width: 120, height: 40, marginTop: 4 }} /> : null}
          </View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 2, paddingTop: 6, borderTopWidth: 1, borderTopColor: preset.borderColor, alignItems: 'center' }}>
          <Text style={{ fontSize: 8 }}>This is a computer-generated receipt. No signature required.</Text>
          <Text style={{ fontSize: 8 }}>{glyphRuns(safeText(model.companyName), bodyFont)}</Text>
        </View>
      </Page>
    </Document>
  )
}
