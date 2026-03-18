import React from '@react-pdf/renderer'
import type { DocumentResult } from '@/lib/Calculations'

type RenderTotalsArgs = {
  result: DocumentResult
  chargeLabels?: Record<string, string>
  cf?: Record<string, unknown>
  styles: Record<string, any>
  showInstallRate?: boolean
  amountInWords?: string | null
  totalLabel?: string
  includeGrandTotal?: boolean
}

export function renderTotals({
  result,
  styles,
  showInstallRate = false,
  amountInWords,
  totalLabel = 'Total Payable',
  includeGrandTotal = true,
}: RenderTotalsArgs) {
  const grandTotal = Number((result as DocumentResult & { grandTotal?: number }).grandTotal ?? result.totalPayable)

  return (
    <>
      <React.View style={[styles.totalsSection, { marginTop: 10 }]} wrap={false}>
        <React.View style={styles.totalsBox}>
          <React.View style={styles.totalRow}>
            <React.Text style={styles.totalLabel}>Subtotal</React.Text>
            <React.Text style={styles.totalValue}>NGN {Number(result.subtotal || 0).toLocaleString()}</React.Text>
          </React.View>
          {showInstallRate && result.installRateTotal > 0 ? (
            <React.View style={styles.totalRow}>
              <React.Text style={styles.totalLabel}>Install Rate</React.Text>
              <React.Text style={styles.totalValue}>NGN {Number(result.installRateTotal || 0).toLocaleString()}</React.Text>
            </React.View>
          ) : null}
          {result.extraChargesTotal > 0 ? (
            <React.View style={styles.totalRow}>
              <React.Text style={styles.totalLabel}>Extra Charges</React.Text>
              <React.Text style={styles.totalValue}>NGN {Number(result.extraChargesTotal || 0).toLocaleString()}</React.Text>
            </React.View>
          ) : null}
          {result.vat > 0 ? (
            <React.View style={styles.totalRow}>
              <React.Text style={styles.totalLabel}>VAT</React.Text>
              <React.Text style={styles.totalValue}>NGN {Number(result.vat || 0).toLocaleString()}</React.Text>
            </React.View>
          ) : null}
          {result.discount > 0 ? (
            <React.View style={styles.totalRow}>
              <React.Text style={styles.totalLabel}>Discount</React.Text>
              <React.Text style={[styles.totalValue, { color: '#CC0000' }]}>- NGN {Number(result.discount || 0).toLocaleString()}</React.Text>
            </React.View>
          ) : null}
          {includeGrandTotal ? (
            <React.View style={styles.grandTotalRow}>
              <React.Text style={styles.grandLabel}>Grand Total</React.Text>
              <React.Text style={styles.grandValue}>NGN {grandTotal.toLocaleString()}</React.Text>
            </React.View>
          ) : null}
          {result.wht > 0 ? (
            <>
              <React.View style={styles.whtRow}>
                <React.Text style={[styles.totalLabel, { color: '#CC0000' }]}>Less: WHT</React.Text>
                <React.Text style={[styles.totalValue, { color: '#CC0000' }]}>- NGN {Number(result.wht || 0).toLocaleString()}</React.Text>
              </React.View>
              <React.View style={styles.payableRow || styles.totalRowStrong}>
                <React.Text style={styles.payableLabel || styles.totalLabelStrong}>{totalLabel}</React.Text>
                <React.Text style={styles.payableValue || styles.totalValueStrong}>NGN {Number(result.totalPayable || 0).toLocaleString()}</React.Text>
              </React.View>
            </>
          ) : (
            <React.View style={styles.payableRow || styles.totalRowStrong}>
              <React.Text style={styles.payableLabel || styles.totalLabelStrong}>{totalLabel}</React.Text>
              <React.Text style={styles.payableValue || styles.totalValueStrong}>NGN {Number(result.totalPayable || 0).toLocaleString()}</React.Text>
            </React.View>
          )}
        </React.View>
      </React.View>

      {amountInWords ? (
        <React.View style={styles.amountWords} wrap={false}>
          <React.Text style={styles.amountWordsText}>{amountInWords}</React.Text>
        </React.View>
      ) : null}
    </>
  )
}
