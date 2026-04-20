import { Link, Text, View } from '@react-pdf/renderer'
import type { IndustryTemplateData } from '../industryAdapter'
import { styles } from './industryStyles'

type PartyCardProps = {
  title: string
  party: NonNullable<IndustryTemplateData['company']> | NonNullable<IndustryTemplateData['client']>
  isLast?: boolean
  surfaceColor?: string | null
  borderColor?: string | null
  accentColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
  headerFontFamily?: string
  bodyFontFamily?: string
}

type GroupRowProps = {
  row: IndustryTemplateData['table']['rows'][number]
  rowIdx: number
  ruleColor?: string | null
  surfaceColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
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
  accentColor,
  textColor,
  mutedColor,
  headerFontFamily,
  bodyFontFamily,
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
          accentColor ? { color: accentColor } : textColor ? { color: textColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {title}
      </Text>
      {party.name ? <Text style={[styles.partyName, textColor ? { color: textColor } : null]}>{party.name}</Text> : null}
      {party.address ? <Text style={[styles.partyLine, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.address}</Text> : null}
      {party.cityState ? <Text style={[styles.partyLine, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.cityState}</Text> : null}
      {party.phone ? <Text style={[styles.partyLine, mutedColor ? { color: mutedColor } : null, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.phone}</Text> : null}
      {party.email ? <Text style={[styles.partyLine, mutedColor ? { color: mutedColor } : null, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.email}</Text> : null}
      {customInfo.length > 0 ? (
        <View style={styles.customInfoWrap}>
          {customInfo.map((entry, idx) => (
            <View key={`company-extra-${idx}`} style={styles.metaRow}>
              <Text style={[styles.metaLabel, mutedColor ? { color: mutedColor } : null]}>{entry.label}</Text>
              <Text style={[styles.metaValue, textColor ? { color: textColor } : null]}>{entry.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function IndustryGroupHeaderRow({
  row,
  rowIdx,
  ruleColor,
  surfaceColor,
  textColor,
  headerFontFamily,
}: GroupRowProps) {
  return (
    <View
      key={`group-h-${rowIdx}`}
      style={[
        styles.tableGroupHeader,
        ruleColor ? { borderTopColor: ruleColor } : null,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
      ]}
    >
      <Text
        style={[
          styles.groupTitleCell,
          textColor ? { color: textColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {row.groupName || row.groupLabel || ''}
      </Text>
    </View>
  )
}

export function IndustryGroupFooterRow({
  row,
  rowIdx,
  ruleColor,
  surfaceColor,
  textColor,
  bodyFontFamily,
}: GroupRowProps) {
  return (
    <View
      key={`group-f-${rowIdx}`}
      style={[
        styles.tableGroupFooter,
        ruleColor ? { borderBottomColor: ruleColor } : null,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
      ]}
    >
      {row.showSubtotal ? (
        <View style={styles.groupSubtotalRow}>
          <Text
            style={[
              styles.groupSubtotalValue,
              textColor ? { color: textColor } : null,
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
