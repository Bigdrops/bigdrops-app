import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { ReceiptPreviewData } from '@/domain/receipt/previewModel'
import { PdfCurrencyText } from './pdfCurrency'
import { formatCurrency } from '@/lib/formatters/money'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLeft: { flex: 1 },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  companyDetail: { fontSize: 8, color: '#6b7280', marginBottom: 1 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'center', marginVertical: 16 },
  receiptMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 16 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 11, color: '#111827' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { width: 130, color: '#6b7280', fontSize: 9 },
  detailValue: { flex: 1, color: '#111827', fontSize: 9 },
  amountBox: { backgroundColor: '#f9fafb', padding: 14, borderRadius: 4, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 10, color: '#6b7280' },
  amountValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827' },
  amountWords: { fontSize: 9, color: '#374151', fontStyle: 'italic', marginTop: 4 },
  section: { marginBottom: 16 },
  notesBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, marginBottom: 16 },
  notesLabel: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  notesText: { fontSize: 9, color: '#374151' },
  termsBox: { marginBottom: 20 },
  termsTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 4 },
  termsText: { fontSize: 8, color: '#6b7280', lineHeight: 1.4 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, marginBottom: 20 },
  signatureBlock: { width: '45%' },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: '#d1d5db', marginBottom: 4, marginTop: 20 },
  signatureLabel: { fontSize: 8, color: '#9ca3af' },
  signatureValue: { fontSize: 9, color: '#111827', marginTop: 2 },
  signatureImage: { width: 120, height: 40, objectFit: 'contain', marginTop: 4 },
  footer: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'center' },
  footerText: { fontSize: 8, color: '#9ca3af' },
})

const TERMS = [
  'This receipt acknowledges payment received as detailed above.',
  'This is a computer-generated receipt and does not require a physical signature.',
  'For any queries, please contact us at the details provided above.',
  'Payment terms are subject to the original invoice terms and conditions.',
]

export default function ReceiptPdf({ model }: { model: ReceiptPreviewData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Company info + Logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{model.companyName}</Text>
            {model.companyAddress ? <Text style={styles.companyDetail}>{model.companyAddress}</Text> : null}
            {model.companyPhone ? <Text style={styles.companyDetail}>{model.companyPhone}</Text> : null}
            {model.companyEmail ? <Text style={styles.companyDetail}>{model.companyEmail}</Text> : null}
          </View>
          {model.companyLogoUrl ? <Image src={model.companyLogoUrl} style={styles.logo} /> : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>PAYMENT RECEIPT</Text>

        {/* Receipt meta: number, date, status */}
        <View style={styles.receiptMeta}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Receipt No.</Text>
            <Text style={styles.metaValue}>{model.receiptNumber}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{model.paymentDate}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{model.status === 'voided' ? 'VOIDED' : 'Active'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client Block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{model.clientName}</Text>
          </View>
          {model.clientAddress ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{model.clientAddress}</Text>
            </View>
          ) : null}
          {model.clientCity || model.clientState ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>City/State</Text>
              <Text style={styles.detailValue}>{[model.clientCity, model.clientState].filter(Boolean).join(', ')}</Text>
            </View>
          ) : null}
          {model.clientPhone ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{model.clientPhone}</Text>
            </View>
          ) : null}
          {model.clientEmail ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{model.clientEmail}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.amountBox}>
            <View>
              <Text style={styles.amountLabel}>Amount Received</Text>
              <PdfCurrencyText value={formatCurrency(model.paymentAmount)} style={styles.amountValue} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amountLabel}>Method</Text>
              <Text style={styles.metaValue}>{model.paymentMethod}</Text>
            </View>
          </View>
          <Text style={styles.amountWords}>In words: {model.amountInWords}</Text>
          {model.paymentReference !== '—' ? (
            <View style={[styles.detailRow, { marginTop: 8 }]}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.detailValue}>{model.paymentReference}</Text>
            </View>
          ) : null}
          {model.cashAmount > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cash Amount</Text>
              <Text style={styles.detailValue}>{model.cashAmount.toLocaleString()}</Text>
            </View>
          ) : null}
          {model.whtAmount > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>WHT Amount</Text>
              <Text style={styles.detailValue}>{model.whtAmount.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Invoice Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Reference</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Number</Text>
            <Text style={styles.detailValue}>{model.invoiceNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Total</Text>
            <Text style={styles.detailValue}>{model.invoiceTotal.toLocaleString()}</Text>
          </View>
          {model.invoiceSubtotal > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subtotal</Text>
              <Text style={styles.detailValue}>{model.invoiceSubtotal.toLocaleString()}</Text>
            </View>
          ) : null}
          {model.invoiceVat > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VAT</Text>
              <Text style={styles.detailValue}>{model.invoiceVat.toLocaleString()}</Text>
            </View>
          ) : null}
          {model.invoiceWht > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>WHT</Text>
              <Text style={styles.detailValue}>{model.invoiceWht.toLocaleString()}</Text>
            </View>
          ) : null}
          {model.invoiceDiscount > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Discount</Text>
              <Text style={styles.detailValue}>{model.invoiceDiscount.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {/* Project Reference (if present) */}
        {model.projectName ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Reference</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Project Name</Text>
              <Text style={styles.detailValue}>{model.projectName}</Text>
            </View>
            {model.projectCode ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Project Code</Text>
                <Text style={styles.detailValue}>{model.projectCode}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Bank Details */}
        {model.bankName ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank Name</Text>
              <Text style={styles.detailValue}>{model.bankName}</Text>
            </View>
            {model.bankAccountNumber ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Number</Text>
                <Text style={styles.detailValue}>{model.bankAccountNumber}</Text>
              </View>
            ) : null}
            {model.bankAccountName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Name</Text>
                <Text style={styles.detailValue}>{model.bankAccountName}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {model.status === 'voided' ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Note</Text>
            <Text style={styles.notesText}>This receipt has been voided.</Text>
          </View>
        ) : null}

        {/* Terms */}
        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          {TERMS.map((term, i) => (
            <Text key={i} style={styles.termsText}>{i + 1}. {term}</Text>
          ))}
        </View>

        {/* Signature */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorized Signature</Text>
            {model.signatoryName ? <Text style={styles.signatureValue}>{model.signatoryName}</Text> : null}
            {model.signatoryRole ? <Text style={styles.signatureValue}>{model.signatoryRole}</Text> : null}
          </View>
          <View style={styles.signatureBlock}>
            {model.signatorySignatureUrl ? (
              <Image src={model.signatorySignatureUrl} style={styles.signatureImage} />
            ) : null}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This is a computer-generated receipt. No signature required.</Text>
          <Text style={styles.footerText}>{model.companyName}</Text>
        </View>
      </Page>
    </Document>
  )
}
