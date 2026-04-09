import { Document, Page, Text } from '@react-pdf/renderer'
import { HeaderSection, FooterSection, ItemsTableSection, PartiesSection, SupportSection, TotalsSection } from './RefrensPdfSections'
import { createTemplateStyles } from './templateStyles'
import type { RefrensPdfModel } from './types'

type RefrensPdfDocumentProps = {
  model: RefrensPdfModel
}

export default function RefrensPdfDocument({ model }: RefrensPdfDocumentProps) {
  const styles = createTemplateStyles(model.templateId)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderSection model={model} styles={styles} />
        {model.title ? <Text style={styles.title}>{model.title}</Text> : null}
        <PartiesSection model={model} styles={styles} />
        <ItemsTableSection model={model} styles={styles} />
        <TotalsSection model={model} styles={styles} />
        <SupportSection model={model} styles={styles} />
        <FooterSection model={model} styles={styles} />
      </Page>
    </Document>
  )
}
