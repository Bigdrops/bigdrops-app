import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { styles } from './CrestStyles'
import { safeText } from '../core/safeText'

export default function Crest({ data }: { data: CommercialDocumentData }) {
  const accent = data.design.accentColor || '#1e3a5f'
  const documentLabel = data.customTitle || data.title || 'Document'
  const message =
    'Crest is currently a placeholder PDF template. Your document content remains intact while this layout is being prepared.'

  return (
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={styles.page}>
      <View style={[styles.heroBand, { backgroundColor: accent }]} />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Crest</Text>
        <Text style={styles.title}>{safeText(documentLabel)}</Text>
        <Text style={styles.meta}>{safeText(data.documentNumberLabel)}: {safeText(data.documentNumber)}</Text>
        {data.issueDate ? <Text style={styles.meta}>{safeText(data.issueDateLabel)}: {safeText(data.issueDate)}</Text> : null}
        <Text style={styles.message}>{safeText(message)}</Text>
      </View>

      <View fixed style={styles.footer}>
        <Text style={styles.footerText}>{safeText(data.footer.documentNumber || data.documentNumber)}</Text>
        <Text style={styles.footerText}>{safeText(data.footer.companyName || data.company?.name || '')}</Text>
      </View>
    </Page>
  )
}
