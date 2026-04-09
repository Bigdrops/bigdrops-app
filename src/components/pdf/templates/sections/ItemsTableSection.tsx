import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { getPdfCellValue, getPdfColumns } from '@/domain/invoice'
import type { RefrensPdfModel } from '../types'
import type { createTemplateStyles } from '../templateStyles'

type Props = {
  model: RefrensPdfModel
  styles: ReturnType<typeof createTemplateStyles>
}

export function ItemsTableSection({ model, styles }: Props) {
  const columns = getPdfColumns(model.columnConfig).filter((column) => {
    if (column.key === 'install_rate') {
      return Number(model.computedResult.installRateTotal || 0) > 0
    }
    return true
  })

  // Group items by their calculated types
  const items = model.computedResult.items || []
  let displayCounter = 0

  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader} fixed>
        {columns.map((col) => (
          <View key={col.key} style={{ flex: col.pdfFlex }}>
            <Text style={[styles.thText, { textAlign: col.align }]}>{col.label}</Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      {model.items.map((rawItem, index) => {
        const computed = items[index]
        if (!computed || computed.row_type !== 'standard') return null

        displayCounter++
        const isAlt = displayCounter % 2 === 0
        const rowStyle = isAlt ? styles.tableRowAlt : styles.tableRow

        return (
          <View key={rawItem.id || index} style={rowStyle} wrap={false}>
            {columns.map((col) => (
              <View key={col.key} style={{ flex: col.pdfFlex }}>
                {col.key === 'num' ? (
                  <Text style={[styles.tdText, { textAlign: col.align }]}>{displayCounter}</Text>
                ) : col.key === 'description' ? (
                  <View style={styles.tdText}>
                    <Text style={styles.descText}>{rawItem.description}</Text>
                    {rawItem.sub_description ? <Text style={styles.subDescText}>{rawItem.sub_description}</Text> : null}
                    {model.descriptionExtras(rawItem).map((extra, i) => (
                      <Text key={i} style={styles.subDescText}>{extra}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.tdText, { textAlign: col.align }]}>
                    {getPdfCellValue(col, rawItem, {
                      amount: computed.line_subtotal,
                      installValue: computed.line_install,
                    })}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}
