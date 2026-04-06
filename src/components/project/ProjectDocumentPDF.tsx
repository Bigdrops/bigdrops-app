import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import {
  formatProjectDocumentDate,
  getProjectDocumentDate,
  getProjectDocumentItemsTable,
  getProjectDocumentKeyFields,
  getProjectDocumentMainLabel,
  getProjectDocumentNotes,
  getProjectDocumentTypeMeta,
  type ProjectDocumentRecord,
} from '@/domain/projectDocuments'

type ProjectDocumentPDFProps = {
  document: ProjectDocumentRecord
  projectName?: string
  settings?: Record<string, unknown> | null
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 36,
    paddingLeft: 34,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 12,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  mutedLine: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  docType: {
    fontSize: 8,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 8,
    marginBottom: 4,
  },
  docLabel: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 8.5,
    color: '#475569',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#475569',
    marginBottom: 6,
  },
  keyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -4,
    marginRight: -4,
  },
  keyCard: {
    width: '50%',
    paddingLeft: 4,
    paddingRight: 4,
    marginBottom: 8,
  },
  keyCardInner: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    backgroundColor: '#f8fafc',
    padding: 8,
  },
  keyLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  keyValue: {
    fontSize: 9,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#0f172a',
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableCell: {
    flex: 1,
    paddingRight: 8,
    fontSize: 8,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  notesBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  notesText: {
    fontSize: 9,
    color: '#0f172a',
    lineHeight: 1.45,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 34,
    right: 34,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
})

function getColumnWidth(columnCount: number) {
  if (columnCount <= 2) return 50
  if (columnCount === 3) return 33.33
  if (columnCount === 4) return 25
  return 20
}

function formatColumnLabel(column: string) {
  return column
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ProjectDocumentPDF({ document, projectName, settings = null }: ProjectDocumentPDFProps) {
  const meta = getProjectDocumentTypeMeta(document)
  const mainLabel = getProjectDocumentMainLabel(document)
  const keyFields = getProjectDocumentKeyFields(document)
  const itemsTable = getProjectDocumentItemsTable(document)
  const notes = getProjectDocumentNotes(document)
  const companyName = String(settings?.company_name || '')
  const companyAddress = String(settings?.company_address || '')
  const companyPhone = String(settings?.company_phone || '')
  const companyEmail = String(settings?.company_email || '')
  const documentDate = formatProjectDocumentDate(getProjectDocumentDate(document))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {companyName ? <Text style={styles.companyName}>{companyName}</Text> : null}
          {companyAddress ? <Text style={styles.mutedLine}>{companyAddress}</Text> : null}
          {companyPhone ? <Text style={styles.mutedLine}>{companyPhone}</Text> : null}
          {companyEmail ? <Text style={styles.mutedLine}>{companyEmail}</Text> : null}

          <Text style={styles.docType}>{meta.label}</Text>
          <Text style={styles.docLabel}>{mainLabel}</Text>
          <Text style={styles.docMeta}>
            {projectName ? `Project: ${projectName}` : 'Internal project record'}
            {documentDate ? `  |  Date: ${documentDate}` : ''}
          </Text>
        </View>

        {keyFields.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.keyGrid}>
              {keyFields.map((field) => (
                <View key={`${field.label}-${field.value}`} style={styles.keyCard}>
                  <View style={styles.keyCardInner}>
                    <Text style={styles.keyLabel}>{field.label}</Text>
                    <Text style={styles.keyValue}>{field.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {itemsTable ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.tableHeader}>
              {itemsTable.columns.map((column) => (
                <Text
                  key={column}
                  style={[
                    styles.tableHeaderText,
                    styles.tableCell,
                    { width: `${getColumnWidth(itemsTable.columns.length)}%` },
                  ]}
                >
                  {formatColumnLabel(column)}
                </Text>
              ))}
            </View>

            {itemsTable.rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.tableRow}>
                {itemsTable.columns.map((column) => (
                  <Text
                    key={`${rowIndex}-${column}`}
                    style={[
                      styles.tableCell,
                      { width: `${getColumnWidth(itemsTable.columns.length)}%` },
                    ]}
                  >
                    {row[column] || ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{companyName || 'Bigdrops'}</Text>
          <Text style={styles.footerText}>{meta.label}</Text>
          <Text style={styles.footerText}>Internal Use</Text>
        </View>
      </Page>
    </Document>
  )
}
