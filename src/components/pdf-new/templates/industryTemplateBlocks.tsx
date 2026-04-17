import { Link, Text, View } from '@react-pdf/renderer'
import type { IndustryTemplateData } from '../industryAdapter'
import { styles } from './industryStyles'

type PartyCardProps = {
  title: string
  party: NonNullable<IndustryTemplateData['company']> | NonNullable<IndustryTemplateData['client']>
  isLast?: boolean
  surfaceColor?: string | null
  borderColor?: string | null
  textColor?: string | null
  headerFontFamily?: string
}

type GroupRowProps = {
  row: IndustryTemplateData['table']['rows'][number]
  rowIdx: number
  accentColor?: string | null
  accentTint: string
  headerFontFamily?: string
  bodyFontFamily?: string
}

export function renderOptionalList(items: IndustryTemplateData['attachments']) {
  return items.map((item, idx) => {
    if (typeof item === 'string') return <Text key={`attach-${idx}`} style={styles.attachmentItem}>- {item}</Text>
    if (item?.url && item?.label) return <Link key={`attach-${idx}`} src={item.url} style={styles.attachmentLink}>{item.label}</Link>
    if (item?.label) return <Text key={`attach-${idx}`} style={styles.attachmentItem}>- {item.label}</Text>
    if (item?.url) return <Link key={`attach-${idx}`} src={item.url} style={styles.attachmentLink}>{item.url}</Link>
    return null
  })
}

export function getAccentTint(accentColor: string | null, fallback: string) {
  if (!accentColor) return fallback
  if (/^#[\da-f]{6}$/i.test(accentColor)) return `${accentColor}1A`
  return fallback
}

export function IndustryPartyCard({
  title,
  party,
  isLast = false,
  surfaceColor,
  borderColor,
  textColor,
  headerFontFamily,
}: PartyCardProps) {
  const customInfo = 'customInfo' in party ? party.customInfo : []

  return (
    <View
      style={[
        styles.partyBox,
        isLast ? styles.partyBoxLast : null,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
        borderColor ? { borderColor } : null,
      ]}
    >
      <Text
        style={[
          styles.partyTitle,
          textColor ? { color: textColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {title}
      </Text>
      {party.name ? <Text style={styles.partyName}>{party.name}</Text> : null}
      {party.address ? <Text style={styles.partyLine}>{party.address}</Text> : null}
      {party.cityState ? <Text style={styles.partyLine}>{party.cityState}</Text> : null}
      {party.phone ? <Text style={styles.partyLine}>{party.phone}</Text> : null}
      {party.email ? <Text style={styles.partyLine}>{party.email}</Text> : null}
      {customInfo.length > 0 ? (
        <View style={styles.customInfoWrap}>
          {customInfo.map((entry, idx) => (
            <View key={`company-extra-${idx}`} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{entry.label}</Text>
              <Text style={styles.metaValue}>{entry.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function IndustryGroupRow({
  row,
  rowIdx,
  accentColor,
  accentTint,
  headerFontFamily,
  bodyFontFamily,
}: GroupRowProps) {
  return (
    <View
      key={`group-${rowIdx}`}
      style={[
        styles.tableGroupRow,
        accentColor ? { borderLeftColor: accentColor, backgroundColor: accentTint } : null,
      ]}
    >
      <Text
        style={[
          styles.groupCell,
          accentColor ? { color: accentColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {row.groupName || row.groupLabel || ''}
      </Text>
      {row.showSubtotal && row.groupSubtotalValue ? (
        <View style={[styles.groupSubtotalRow, accentColor ? { borderTopColor: accentColor } : null]}>
          <Text style={[styles.groupSubtotalLabel, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>
            {row.groupSubtotalLabel || 'Group Subtotal'}
          </Text>
          <Text
            style={[
              styles.groupSubtotalValue,
              accentColor ? { color: accentColor } : null,
              bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
            ]}
          >
            {row.groupSubtotalValue}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
