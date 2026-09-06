import { Text, View } from '@react-pdf/renderer'
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
}: PartyCardProps) {
  const lines = buildPartyLines(party)

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
      {lines.map((line) => (
        <Text
          key={line.key}
          style={[
            line.type === 'name' ? styles.partyName : styles.partyLine,
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
