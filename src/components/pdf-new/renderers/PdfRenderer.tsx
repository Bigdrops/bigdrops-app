import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { getPdfTableLayoutPlan } from '../table'
import { MinimalPdfTemplate } from '../templates/minimal'
import type { PdfDocumentModel } from '../types'

type PdfRendererProps = {
  model: PdfDocumentModel
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 54,
    fontSize: 10,
    lineHeight: 1.35,
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 20,
    paddingTop: 6,
    borderTopWidth: 0.8,
    borderTopColor: '#d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8.5,
    color: '#475569',
  },
  footerCenter: {
    textAlign: 'center',
    flex: 1,
  },
})

export function PdfRenderer({ model }: PdfRendererProps) {
  const companyName = String(model.metaFooter?.companyName || model.issuer?.name || '').trim() || '-'
  const number = String(model.identity.number || '').trim() || '-'
  const tablePlan = getPdfTableLayoutPlan(model.columns || [], { mergeQtyUnit: model.mergeQtyUnit === true })
  const isLandscape = tablePlan.orientation === 'landscape'

  return (
    <Document>
      <Page size="A4" orientation={isLandscape ? 'landscape' : 'portrait'} style={styles.page}>
        <MinimalPdfTemplate model={model} />

        <View fixed style={styles.footer}>
          <Text>{companyName}</Text>
          <Text style={styles.footerCenter}>{number}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
