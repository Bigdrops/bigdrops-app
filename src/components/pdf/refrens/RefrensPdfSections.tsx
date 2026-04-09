import { Image, Link, Text, View } from '@react-pdf/renderer'
import { renderItemsTable } from '@/components/pdf/base/renderItems'
import { getPdfColumns } from '@/domain/invoice'
import type { RefrensPdfModel } from './types'

type SectionProps = {
  model: RefrensPdfModel
  styles: ReturnType<typeof import('./templateStyles').createTemplateStyles>
}

export function HeaderSection({ model, styles }: SectionProps) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerBusiness}>
        <Text style={styles.businessName}>{model.companyName}</Text>
        {model.companyTagline ? <Text style={styles.businessTagline}>{model.companyTagline}</Text> : null}
        {model.rightParty.lines.map((line, index) => (
          <Text key={`business_line_${index}`} style={styles.businessLine}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.headerMeta}>
        {model.logoUrl ? <Image src={model.logoUrl} style={styles.logo} /> : null}
        <Text style={styles.documentLabel}>{model.documentLabel}</Text>
        <Text style={styles.documentNumber}>{model.documentNumber}</Text>
        {model.metaEntries.map((entry) => (
          <View key={`${entry.label}_${entry.value}`} style={styles.metaRow}>
            <Text style={styles.metaLabel}>{entry.label}:</Text>
            <Text style={styles.metaValue}>{entry.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function PartiesSection({ model, styles }: SectionProps) {
  return (
    <View style={styles.partiesWrap}>
      {[model.leftParty, model.rightParty].map((party) => (
        <View key={party.label} style={styles.partyCard}>
          <Text style={styles.partyLabel}>{party.label}</Text>
          <Text style={styles.partyName}>{party.name}</Text>
          {party.lines.map((line, index) => (
            <Text key={`${party.label}_${index}`} style={styles.partyLine}>
              {line}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

export function ItemsTableSection({ model, styles }: SectionProps) {
  const columns = getPdfColumns(model.columnConfig).filter((column) => {
    if (column.key === 'install_rate') {
      return Number(model.computedResult.installRateTotal || 0) > 0
    }
    return true
  })

  return renderItemsTable({
    rawItems: model.items,
    computedItems: model.computedResult.items || [],
    groups: model.computedResult.groups || [],
    columns,
    columnConfig: model.columnConfig,
    styles,
    getDescriptionExtras: model.descriptionExtras,
    getColumnStyle: (column, extra = {}) => ({
      flex: column.pdfFlex,
      textAlign: column.align,
      ...extra,
    }),
  })
}

export function TotalsSection({ model, styles }: SectionProps) {
  const result = model.computedResult
  const grandTotal = Number(result.grandTotal ?? result.totalPayable ?? 0)
  const balanceDue = Number(result.balanceDue ?? grandTotal)
  const rows = [
    { label: 'Subtotal', value: Number(result.subtotal || 0), type: 'normal' as const },
    ...(Number(result.installRateTotal || 0) > 0 ? [{ label: 'Install Rate', value: Number(result.installRateTotal || 0), type: 'normal' as const }] : []),
    ...(Number(result.extraChargesTotal || 0) > 0 ? [{ label: 'Additional Charges', value: Number(result.extraChargesTotal || 0), type: 'normal' as const }] : []),
    ...(Number(result.discount || 0) > 0
      ? [{ label: model.summaryLabels.discount, value: Number(result.discount || 0), type: 'negative' as const }]
      : []),
    ...(Number(result.vat || 0) > 0 ? [{ label: model.summaryLabels.vat, value: Number(result.vat || 0), type: 'normal' as const }] : []),
  ]

  return (
    <View>
      <View style={styles.totalsWrap} wrap={false}>
        <View style={styles.totalsBox}>
          {rows.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{row.label}</Text>
              <Text style={styles.totalValue}>
                {row.type === 'negative' ? '- ' : ''}
                NGN {row.value.toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>NGN {grandTotal.toLocaleString()}</Text>
          </View>

          {Number(result.wht || 0) > 0 ? (
            <View style={[styles.totalRow, styles.totalDivider]}>
              <Text style={styles.totalLabel}>{model.summaryLabels.wht}</Text>
              <Text style={styles.totalValue}>- NGN {Number(result.wht || 0).toLocaleString()}</Text>
            </View>
          ) : null}

          {model.showBalanceDue ? (
            <View style={styles.totalRow}>
              <Text style={styles.balanceLabel}>{model.totalLabel}</Text>
              <Text style={styles.balanceValue}>NGN {balanceDue.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {model.amountInWords ? (
        <View style={styles.amountWordsBox} wrap={false}>
          <Text style={styles.amountWordsLead}>Amount in Words</Text>
          <Text style={styles.amountWordsText}>{model.amountInWords}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function SupportSection({ model, styles }: SectionProps) {
  const nonSignatureBlocks = model.supportBlocks.filter((block) => block.type !== 'signature')
  const signatureBlock = model.supportBlocks.find((block) => block.type === 'signature')

  if (!nonSignatureBlocks.length && !signatureBlock) return null

  return (
    <View style={styles.supportWrap}>
      {nonSignatureBlocks.length ? (
        <View style={styles.supportColumn}>
          {nonSignatureBlocks.map((block, index) => {
            if (block.type === 'bank') {
              return (
                <View key={`bank_${index}`} wrap={false}>
                  <Text style={styles.supportTitle}>{block.title}</Text>
                  <View style={styles.supportBox}>
                    {block.rows.map((row) => (
                      <View key={row.label} style={styles.supportRow}>
                        <Text style={styles.supportLabel}>{row.label}</Text>
                        <Text style={styles.supportValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            }

            if (block.type === 'links') {
              return (
                <View key={`links_${index}`} wrap={false}>
                  <Text style={styles.supportTitle}>{block.title}</Text>
                  <View style={styles.supportBox}>
                    {block.links.map((link) => (
                      <Link key={link.url} src={link.url} style={styles.linkText}>
                        {link.label}
                      </Link>
                    ))}
                  </View>
                </View>
              )
            }

            return (
              <View key={`text_${index}`} wrap={false}>
                <Text style={styles.supportTitle}>{block.title}</Text>
                <View style={styles.supportBox}>
                  <Text style={styles.supportText}>{block.text}</Text>
                </View>
              </View>
            )
          })}
        </View>
      ) : null}

      {signatureBlock?.type === 'signature' && signatureBlock.signatureUrl ? (
        <View style={styles.signatureColumn}>
          <View style={styles.signatureBlock}>
            <Image src={signatureBlock.signatureUrl} style={styles.signatureImage} />
            {signatureBlock.name ? <Text style={styles.signatureName}>For {signatureBlock.name}</Text> : null}
            {signatureBlock.role ? <Text style={styles.signatureRole}>{signatureBlock.role}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}

export function FooterSection({ model, styles }: SectionProps) {
  const footerLines = [model.footerText].filter(Boolean)

  if (!footerLines.length) return null

  return (
    <View style={styles.footerNote} wrap={false}>
      {footerLines.map((line, index) => (
        <Text key={`footer_${index}`}>{line}</Text>
      ))}
    </View>
  )
}
