import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { IndustryTemplateData } from '../industryAdapter'
import { styles } from './ApexStyles'

export default function Apex({ data }: { data: IndustryTemplateData }) {
  const accent = data.design.accentColor || '#111827'
  const documentLabel = data.customTitle || data.title || 'Document'
  const message =
    'Apex is currently a placeholder PDF template. Your document content remains intact while this layout is being prepared.'

  return (
    <Page size="A4" style={styles.page}>
      <View style={[styles.heroBand, { backgroundColor: accent }]} />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Apex</Text>
        <Text style={styles.title}>{documentLabel}</Text>
        <Text style={styles.meta}>{data.documentNumberLabel}: {data.documentNumber}</Text>
        {data.issueDate ? <Text style={styles.meta}>{data.issueDateLabel}: {data.issueDate}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>

      <View fixed style={styles.footer}>
        <Text style={styles.footerText}>{data.footer.documentNumber || data.documentNumber}</Text>
        <Text style={styles.footerText}>{data.footer.companyName || data.company?.name || ''}</Text>
      </View>
    </Page>
  )
}
