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

  return (
    <Text style={[style, { fontFamily: PDF_CURRENCY_FONT_FAMILY }]}>
      {text}
    </Text>
  )
}
