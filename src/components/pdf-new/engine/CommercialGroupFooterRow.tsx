import { View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { PdfCurrencyText } from '../pdfCurrency'
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

export function CommercialGroupFooterRow({
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
          <PdfCurrencyText
            value={row.groupSubtotalValue}
            style={[
              styles.groupSubtotalValue,
              textColor ? { color: textColor } : null,
              bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
            ]}
          />
        </View>
      ) : null}
    </View>
  )
}
