import React from 'react'
import { Text } from '@react-pdf/renderer'
import { isPdfCurrencyString, PDF_CURRENCY_SYMBOL } from '@/lib/formatters/pdfCurrency'
import { PDF_CURRENCY_FONT_FAMILY } from '@/lib/pdfSharedFonts'

type PdfCurrencyTextProps = {
  value: unknown
  style?: any
}

export { PDF_CURRENCY_FONT_FAMILY }

export function PdfCurrencyText({ value, style }: PdfCurrencyTextProps) {
  const text = value === null || value === undefined ? '' : String(value)

  if (!isPdfCurrencyString(text)) {
    return <Text style={style}>{text}</Text>
  }

  const trimmed = text.trimStart()
  const amount = trimmed.slice(PDF_CURRENCY_SYMBOL.length).trimStart()

  return (
    <Text style={style}>
      <Text style={{ fontFamily: PDF_CURRENCY_FONT_FAMILY }}>{PDF_CURRENCY_SYMBOL}</Text>
      {amount ? ` ${amount}` : ''}
    </Text>
  )
}
