import React, { useMemo } from 'react'
import { Document, Page, Text } from '@react-pdf/renderer'
import { createTemplateStyles } from './templateStyles'
import { HeaderSection } from './sections/HeaderSection'
import { PartiesSection } from './sections/PartiesSection'
import { ItemsTableSection } from './sections/ItemsTableSection'
import { TotalsSection } from './sections/TotalsSection'
import { SupportSection } from './sections/SupportSection'
import { FooterSection } from './sections/FooterSection'
import type { RefrensPdfModel } from './types'
import { registerPdfFonts } from '@/lib/pdfFontRegistry'

registerPdfFonts()

type Props = {
  model: RefrensPdfModel
}

export default function TemplatePdfLayout({ model }: Props) {
  const styles = useMemo(() => createTemplateStyles(model.templateId, model.designPreset), [model.templateId, model.designPreset])
  const hasTitle = typeof model.title === 'string' && model.title.trim().length > 0

  return (
    <Document title={`${model.documentLabel} ${model.documentNumber}`}>
      <Page size="A4" style={styles.page}>
        <HeaderSection model={model} styles={styles} />
        {hasTitle ? <Text style={styles.title}>{model.title}</Text> : null}
        <PartiesSection model={model} styles={styles} />
        <ItemsTableSection model={model} styles={styles} />
        <TotalsSection model={model} styles={styles} />
        <SupportSection model={model} styles={styles} />
        <FooterSection model={model} styles={styles} />
      </Page>
    </Document>
  )
}
