import { View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { PdfCurrencyText } from '../pdfCurrency'
import { groupFooterStyles } from './CommercialGroupFooterRow.styles'

export type CommercialGroupFooterRowProps = {
  row: CommercialDocumentData['table']['rows'][number]
  rowIdx: number
  ruleColor?: string | null
  surfaceColor?: string | null
  textColor?: string | null
  bodyFontFamily?: string
}

export function CommercialGroupFooterRow({
  row,
  rowIdx,
  ruleColor,
  surfaceColor,
  textColor,
  bodyFontFamily,
}: CommercialGroupFooterRowProps) {
  return (
    <View
      key={`group-f-${rowIdx}`}
      style={[
        groupFooterStyles.tableGroupFooter,
        ruleColor ? { borderBottomColor: ruleColor } : null,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
      ]}
    >
      {row.showSubtotal ? (
        <View style={groupFooterStyles.groupSubtotalRow}>
          <PdfCurrencyText
            value={row.groupSubtotalValue}
            style={[
              groupFooterStyles.groupSubtotalValue,
              textColor ? { color: textColor } : null,
              bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
            ]}
          />
        </View>
      ) : null}
    </View>
  )
}