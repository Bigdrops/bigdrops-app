import React from 'react'
import { Document, Fixed, Page, Text, View } from '@formepdf/react'
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
import { safeText } from '../core/safeText'
import { glyphRuns } from './glyphs'

export interface ProjectDocumentFormeDocumentProps {
  document: ProjectDocumentRecord
  projectName?: string
  settings?: Record<string, unknown> | null
}

function formatColumnLabel(column: string): string {
  return column
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function ProjectDocumentFormeDocument({ document, projectName, settings = null }: ProjectDocumentFormeDocumentProps): React.JSX.Element {
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
  // Equal-width columns, matching the source's percentage rule per column count.
  const cellWidth = { flex: 1 } as const

  // Helvetica is a Forme base-14 family; dynamic strings still route through
  // glyphRuns for the ₦ coverage font.
  const BASE_FONT = 'Helvetica'
  const BOLD_FONT = 'Helvetica'

  return (
    <Document title={`Project Document — ${mainLabel}`} style={{ fontFamily: BASE_FONT, fontSize: 9, color: '#0f172a' }}>
      <Page
        size="A4"
        margin={{ top: 34, right: 34, bottom: 36, left: 34 }}
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Header — company identity, document type, main label, origin line */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 12, marginBottom: 16 }}>
          {companyName ? <Text style={{ fontSize: 11, fontWeight: 700, fontFamily: BOLD_FONT, marginBottom: 3 }}>{glyphRuns(safeText(companyName), BASE_FONT)}</Text> : null}
          {companyAddress ? <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>{glyphRuns(safeText(companyAddress), BASE_FONT)}</Text> : null}
          {companyPhone ? <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>{glyphRuns(safeText(companyPhone), BASE_FONT)}</Text> : null}
          {companyEmail ? <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>{glyphRuns(safeText(companyEmail), BASE_FONT)}</Text> : null}

          <Text style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 8, marginBottom: 4 }}>{safeText(meta.label)}</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, fontFamily: BOLD_FONT, marginBottom: 4 }}>{glyphRuns(safeText(mainLabel), BASE_FONT)}</Text>
          <Text style={{ fontSize: 8.5, color: '#475569' }}>
            {projectName ? `Project: ${projectName}` : 'Internal project record'}
            {documentDate ? `  |  Date: ${documentDate}` : ''}
          </Text>
        </View>

        {/* Details — key/value grid, two per row */}
        {keyFields.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, fontFamily: BOLD_FONT, textTransform: 'uppercase', letterSpacing: 1, color: '#475569', marginBottom: 6 }}>Details</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {keyFields.map((field, index) => (
                <View key={`${field.label}-${field.value}-${index}`} style={{ width: '50%', paddingLeft: 4, paddingRight: 4, marginBottom: 8 }}>
                  <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, backgroundColor: '#f8fafc', padding: 8 }}>
                    <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 3 }}>{glyphRuns(safeText(field.label), BASE_FONT)}</Text>
                    <Text style={{ fontSize: 9, color: '#0f172a', lineHeight: 1.35 }}>{glyphRuns(safeText(field.value), BASE_FONT)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Items — bordered rows, proportional columns */}
        {itemsTable ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, fontFamily: BOLD_FONT, textTransform: 'uppercase', letterSpacing: 1, color: '#475569', marginBottom: 6 }}>Items</Text>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingVertical: 6 }}>
              {itemsTable.columns.map((column) => (
                <View key={column} style={{ ...cellWidth, paddingRight: 8, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, fontFamily: BOLD_FONT, color: '#475569', textTransform: 'uppercase' }}>
                    {glyphRuns(formatColumnLabel(column), BASE_FONT)}
                  </Text>
                </View>
              ))}
            </View>
            {itemsTable.rows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 6 }}
              >
                {itemsTable.columns.map((column) => (
                  <View key={`${rowIndex}-${column}`} style={{ ...cellWidth, paddingRight: 8, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 8, color: '#0f172a', lineHeight: 1.35 }}>
                      {glyphRuns(safeText(row[column] ?? ''), BASE_FONT)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Notes */}
        {notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, fontFamily: BOLD_FONT, textTransform: 'uppercase', letterSpacing: 1, color: '#475569', marginBottom: 6 }}>Notes</Text>
            <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, backgroundColor: '#f8fafc', padding: 10 }}>
              <Text style={{ fontSize: 9, color: '#0f172a', lineHeight: 1.45 }}>{glyphRuns(safeText(notes), BASE_FONT)}</Text>
            </View>
          </View>
        ) : null}

        {/* Footer — repeats on every page */}
        <Fixed position="footer" style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 5, fontSize: 7, color: '#94a3b8' }}>
          <Text>{glyphRuns(safeText(companyName || 'Bigdrops'), BASE_FONT)}</Text>
          <Text>{glyphRuns(safeText(meta.label), BASE_FONT)}</Text>
          <Text>Internal Use</Text>
        </Fixed>
      </Page>
    </Document>
  )
}
