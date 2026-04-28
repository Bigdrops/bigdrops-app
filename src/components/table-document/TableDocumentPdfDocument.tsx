import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { PdfCurrencyText } from '@/components/pdf-new/pdfCurrency'

import type { TableDocumentColumn, TableDocumentRow, TableDocumentType, TableTemplateId } from '@/domain/table-document/types'

type DocumentLike = {
  title?: string
  notes?: string
  issue_date?: string
  rfq_number?: string
  boq_number?: string
  vendor_name?: string
  vendor_contact?: string
  show_vendor_identity?: boolean
  show_brand_name?: boolean
  brand_name_override?: string
  background_color?: string
  text_color?: string
  border_color?: string
  accent_color?: string
}

type Props = {
  documentType: TableDocumentType
  templateId: TableTemplateId
  document: DocumentLike
  rows: TableDocumentRow[]
  columns: TableDocumentColumn[]
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  number: { fontSize: 9, marginTop: 4 },
  table: { width: '100%' },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 1, padding: 6, fontSize: 9 },
  sectionCell: { borderWidth: 1, padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', backgroundColor: '#f1f5f9' },
})

function numberFor(documentType: TableDocumentType, document: DocumentLike) {
  return documentType === 'boq' ? document.boq_number || 'BOQ' : document.rfq_number || 'RFQ'
}

function titleFor(documentType: TableDocumentType, document: DocumentLike) {
  return document.title || (documentType === 'boq' ? 'BILL OF QUANTITIES' : 'REQUEST FOR QUOTE')
}

const widthsByKey: Record<string, number> = {
  s_no: 8,
  description: 34,
  specification: 18,
  quantity: 10,
  unit: 10,
  make_brand: 12,
  cp: 8,
  sp: 8,
}

export function TableDocumentPdfDocument({ documentType, templateId, document, rows, columns }: Props) {
  const visibleColumns = columns.filter((column) => column.visible)
  const displayRows = rows.filter((row) => row.row_type === 'section' ? row.section_title.trim() : row.description.trim() || row.specification.trim() || row.notes.trim())
  const backgroundColor = templateId === 'modern' ? (document.background_color || '#ffffff') : '#ffffff'
  const textColor = templateId === 'modern' ? (document.text_color || '#1F2937') : '#111827'
  const borderColor = templateId === 'modern' ? (document.border_color || '#D1D5DB') : '#64748b'
  const accentColor = document.accent_color || '#1D4ED8'

  return (
    <Document>
      <Page size="A4" style={[styles.page, { backgroundColor, color: textColor }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View>
            {templateId === 'modern' && document.show_brand_name ? (
              <Text style={{ fontSize: 14, color: accentColor, marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>
                {document.brand_name_override || 'BIGDROPS'}
              </Text>
            ) : null}
            <Text style={styles.title}>{titleFor(documentType, document)}</Text>
            <Text style={styles.number}>{numberFor(documentType, document)}</Text>
          </View>
          <View>
            <Text>{document.vendor_name || '-'}</Text>
            <Text>{document.issue_date || '-'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cell, { width: `${widthsByKey.s_no}%`, borderColor }]}>S/No</Text>
            {visibleColumns.map((column) => (
              <Text key={column.key} style={[styles.cell, { width: `${widthsByKey[column.key] || 12}%`, borderColor }]}>
                {column.label}
              </Text>
            ))}
          </View>

          {displayRows.map((row, index) => (
            row.row_type === 'section' ? (
              <View key={row.id || row._uiKey || `section-${index}`} style={styles.row}>
                <Text style={[styles.sectionCell, { width: '100%', borderColor }]}>
                  {row.section_title || `Section ${index + 1}`}
                </Text>
              </View>
            ) : (
              <View key={row.id || row._uiKey || `row-${index}`} style={styles.row}>
                <Text style={[styles.cell, { width: `${widthsByKey.s_no}%`, borderColor }]}>{index + 1}</Text>
                {visibleColumns.map((column) => (
                  <PdfCurrencyText
                    key={column.key}
                    value={String((row[column.key] as string | number) || '-')}
                    style={[styles.cell, { width: `${widthsByKey[column.key] || 12}%`, borderColor }]}
                  />
                ))}
              </View>
            )
          ))}
        </View>
      </Page>
    </Document>
  )
}
