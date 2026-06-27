import { Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../../industryAdapter'
import { PdfCurrencyText } from '../../pdfCurrency'
import { styles } from './industryStyles'
import { shouldShowGroupSubtotal, getGroupSubtotal } from '../../engine/group'

type GroupFooterRowProps = {
  row: CommercialDocumentData['table']['rows'][number]
  rowIdx: number
  ruleColor?: string | null
  textColor?: string | null
  bodyFontFamily?: string
}

export function GroupFooterRow({
  row,
  rowIdx,
  ruleColor,
  textColor,
  bodyFontFamily,
}: GroupFooterRowProps) {
  const showSubtotal = shouldShowGroupSubtotal(row)
  const subtotalValue = getGroupSubtotal(row)

  return (
    <View
      key={`group-f-${rowIdx}`}
      style={[
        styles.groupFooterRow,
        ruleColor ? { borderBottomColor: ruleColor } : null,
      ]}
      wrap={false}
    >
      {showSubtotal && subtotalValue ? (
        <>
          <Text
            style={[
              styles.groupSubtotalLabel,
              textColor ? { color: textColor } : null,
              bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
            ]}
          >
            Subtotal
          </Text>
          <PdfCurrencyText
            value={subtotalValue}
            style={[
              styles.groupSubtotalValue,
              textColor ? { color: textColor } : null,
              bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
            ]}
          />
        </>
      ) : null}
    </View>
  )
}
