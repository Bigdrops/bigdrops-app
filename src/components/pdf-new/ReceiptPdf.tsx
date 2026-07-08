import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { ReceiptPreviewModel } from '@/domain/receipt/previewModel'
import { PdfCurrencyText } from './pdfCurrency'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    color: '#111827',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 4,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 120,
    color: '#6b7280',
  },
  detailValue: {
    flex: 1,
    color: '#111827',
  },
  notesSection: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 10,
    color: '#374151',
  },
  footer: {
    marginTop: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerCompany: {
    fontSize: 9,
    color: '#6b7280',
  },
})

export default function ReceiptPdf({ model }: { model: ReceiptPreviewModel }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Payment Receipt</Text>
            <Text style={styles.subtitle}>Acknowledgement of Payment</Text>
          </View>
          {model.logoUrl ? (
            <Image src={model.logoUrl} style={styles.logo} />
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Receipt No.</Text>
            <Text style={styles.metaValue}>{model.receiptNumber}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Invoice No.</Text>
            <Text style={styles.metaValue}>{model.invoiceNumber}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{model.paymentDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount Received</Text>
          <PdfCurrencyText
            amount={model.amount}
            currency={model.currencyCode}
            style={styles.amountValue}
          />
        </View>

        <View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Received From</Text>
            <Text style={styles.detailValue}>{model.clientName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{model.paymentMethod}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Reference</Text>
            <Text style={styles.detailValue}>{model.paymentRef}</Text>
          </View>
        </View>

        {model.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{model.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerCompany}>{model.companyName}</Text>
          {model.companyAddress ? (
            <Text style={styles.footerCompany}>{model.companyAddress}</Text>
          ) : null}
          {model.companyPhone ? (
            <Text style={styles.footerCompany}>{model.companyPhone}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
