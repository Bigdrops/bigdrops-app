import { Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { styles } from '../templates/industryStyles'

export type GroupRowProps = {
  row: CommercialDocumentData['table']['rows'][number]
  rowIdx: number
  ruleColor?: string | null
  surfaceColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
  headerFontFamily?: string
  bodyFontFamily?: string
}

export function CommercialGroupHeaderRow({
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
