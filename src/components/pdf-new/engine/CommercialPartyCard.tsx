import { Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { partyCardStyles } from './CommercialPartyCard.styles'

export type CommercialPartyCardProps = {
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

export function CommercialPartyCard({
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
}: CommercialPartyCardProps) {
  const customInfo = 'customInfo' in party ? party.customInfo : []

  return (
    <View
      style={[
        partyCardStyles.partyBox,
        isLast ? partyCardStyles.partyBoxLast : null,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
        borderColor ? { borderColor } : null,
      ]}
    >
      <Text
        style={[
          partyCardStyles.partyTitle,
          accentColor ? { color: accentColor } : textColor ? { color: textColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {title}
      </Text>
      {party.name ? <Text style={[partyCardStyles.partyName, textColor ? { color: textColor } : null]}>{party.name}</Text> : null}
      {party.address ? <Text style={[partyCardStyles.partyLine, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.address}</Text> : null}
      {party.cityState ? <Text style={[partyCardStyles.partyLine, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.cityState}</Text> : null}
      {party.phone ? <Text style={[partyCardStyles.partyLine, mutedColor ? { color: mutedColor } : null, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.phone}</Text> : null}
      {party.email ? <Text style={[partyCardStyles.partyLine, mutedColor ? { color: mutedColor } : null, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.email}</Text> : null}
      {'website' in party && party.website ? <Text style={[partyCardStyles.partyLine, mutedColor ? { color: mutedColor } : null, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{party.website}</Text> : null}
      {customInfo.length > 0
        ? customInfo.map((entry, idx) => (
            <Text key={`company-extra-${idx}`} style={[partyCardStyles.partyLine, mutedColor ? { color: mutedColor } : null, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>{entry.label}: {entry.value}</Text>
          ))
        : null}
    </View>
  )
}