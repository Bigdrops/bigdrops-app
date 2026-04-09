import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import type { RefrensPdfModel } from '../types'
import type { createTemplateStyles } from '../templateStyles'

type Props = {
  model: RefrensPdfModel
  styles: ReturnType<typeof createTemplateStyles>
}

export function TotalsSection({ model, styles }: Props) {
  const result = model.computedResult
  const grandTotal = Number(result.grandTotal ?? result.totalPayable ?? 0)
  const balanceDue = Number(result.balanceDue ?? grandTotal)
  
  const rows = [
    { label: 'Subtotal', value: Number(result.subtotal || 0) },
    ...(Number(result.installRateTotal || 0) > 0 ? [{ label: 'Install Rate', value: Number(result.installRateTotal || 0) }] : []),
    ...(Number(result.extraChargesTotal || 0) > 0 ? [{ label: 'Additional Charges', value: Number(result.extraChargesTotal || 0) }] : []),
    ...(Number(result.discount || 0) > 0 ? [{ label: model.summaryLabels.discount, value: -Number(result.discount || 0) }] : []),
    ...(Number(result.vat || 0) > 0 ? [{ label: model.summaryLabels.vat, value: Number(result.vat || 0) }] : []),
    ...(Number(result.wht || 0) > 0 ? [{ label: model.summaryLabels.wht, value: -Number(result.wht || 0) }] : []),
  ]

  return (
    <View wrap={false}>
      <View style={styles.totalsSection}>
        <View style={styles.totalsBox}>
          {rows.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{row.label}</Text>
              <Text style={styles.totalValue}>NGN {row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
          ))}

          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>NGN {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>

          {model.showBalanceDue && (
            <View style={styles.totalRow}>
              <Text style={[styles.grandLabel, { fontSize: 10 }]}>{model.totalLabel}</Text>
              <Text style={[styles.grandValue, { fontSize: 10 }]}>NGN {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
          )}
        </View>
      </View>

      {model.amountInWords && (
        <View style={styles.amountWordsBox}>
          <Text style={styles.amountWordsLead}>Amount in Words</Text>
          <Text style={styles.amountWordsText}>{model.amountInWords}</Text>
        </View>
      )}
    </View>
  )
}
