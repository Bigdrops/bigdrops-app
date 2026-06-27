import { Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../../industryAdapter'
import { styles } from './industryStyles'
import { getGroupLabel } from '../../engine/group'

type GroupHeaderRowProps = {
  row: CommercialDocumentData['table']['rows'][number]
  rowIdx: number
  ruleColor?: string | null
  textColor?: string | null
  headerFontFamily?: string
}

export function GroupHeaderRow({
  row,
  rowIdx,
  ruleColor,
  textColor,
  headerFontFamily,
}: GroupHeaderRowProps) {
  const label = getGroupLabel(row)

  return (
    <View
      key={`group-h-${rowIdx}`}
      style={[
        styles.groupHeaderRow,
        ruleColor ? { borderTopColor: ruleColor, borderBottomColor: ruleColor } : null,
      ]}
      wrap={false}
    >
      <Text
        style={[
          styles.groupHeaderText,
          textColor ? { color: textColor } : null,
          headerFontFamily ? { fontFamily: headerFontFamily } : null,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}
