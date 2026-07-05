import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../../industryAdapter'
import { styles } from './industryStyles'
import { buildPartyLines } from '../../engine/party'

type PartyCardProps = {
  title: string
  party: NonNullable<CommercialDocumentData['company']> | NonNullable<CommercialDocumentData['client']>
  isLast?: boolean
  surfaceColor?: string | null
  borderColor?: string | null
  accentColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
  headerFontFamily?: string
  bodyFontFamily?: string
  compact?: boolean
}

export function PartyCard({
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
  compact = false,
}: PartyCardProps) {
  const lines = buildPartyLines(party)

  return (
    <View
      style={[
        styles.partyBox,
        compact ? compactStyles.partyBox : null,
        isLast ? styles.partyBoxLast : null,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
        borderColor ? { borderColor } : null,
      ]}
    >
      <Text
        style={[
          styles.partyTitle,
          compact ? compactStyles.partyTitle : null,
          accentColor ? { color: accentColor } : textColor ? { color: textColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {title}
      </Text>
      {lines.map((line) => (
        <Text
          key={line.key}
          style={[
            line.type === 'name'
              ? compact ? compactStyles.partyName : styles.partyName
              : compact ? compactStyles.partyLine : styles.partyLine,
            line.type === 'phone' || line.type === 'email' || line.type === 'website' || line.type === 'custom'
              ? (textColor ? { color: textColor } : null)
              : null,
            bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
          ]}
        >
          {line.value}
        </Text>
      ))}
    </View>
  )
}

const compactStyles = StyleSheet.create({
  partyBox: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    marginRight: 0,
    borderRadius: 2,
  },
  partyTitle: {
    fontSize: 11,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 10.5,
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  partyLine: {
    fontSize: 9,
    marginBottom: 1,
    lineHeight: 1.25,
  },
})
