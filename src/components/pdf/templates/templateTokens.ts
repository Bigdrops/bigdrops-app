import type { RefrensTemplateId } from './types'

export type TemplateTokens = {
  accent: string
  headerBackground: string
  headerText: string
  headerMuted: string
  pageBackground: string
  cardBackground: string
  bodyText: string
  mutedText: string
  tableHeaderBackground: string
  tableHeaderText: string
  tableBorder: string
  subtleBorder: string
  grandTotalColor: string
  footerBorder: string
  amountWordsBackground: string
  amountWordsBorder: string
  headerBand: string
  pagePaddingTop: number
  pagePaddingRight: number
  pagePaddingBottom: number
  pagePaddingLeft: number
  headerPaddingTop: number
  headerPaddingRight: number
  headerPaddingBottom: number
  headerPaddingLeft: number
  headerMarginTop: number
  headerMarginRight: number
  headerMarginLeft: number
  headerMarginBottom: number
  headerBorderBottomWidth: number
  partyCardPadding: number
  partyCardBorderWidth: number
  tableHeaderBorderBottomWidth: number
  tableHeaderBorderTopWidth: number
  tableRowBorderBottomWidth: number
  tableCellPaddingVertical: number
  tableCellPaddingHorizontal: number
  totalsBoxWidth: number
  grandRowMarginTop: number
  grandRowPaddingTop: number
  grandRowBorderTopWidth: number
  amountWordsMarginTop: number
  amountWordsPadding: number
  amountWordsBorderWidth: number
  supportWrapMarginTop: number
  supportBlockMarginBottom: number
  supportTitleMarginBottom: number
  supportTitleBorderBottomWidth: number
  supportTitlePaddingBottom: number
  signatureImageWidth: number
  signatureImageHeight: number
  footerBorderTopWidth: number
  footerPaddingTop: number
  footerBottom: number
  footerInsetLeft: number
  footerInsetRight: number
}

const MINIMAL_TEMPLATE_TOKENS: TemplateTokens = {
  accent: '#374151',
  headerBackground: '#ffffff',
  headerText: '#1f2937',
  headerMuted: '#6b7280',
  pageBackground: '#ffffff',
  cardBackground: '#ffffff',
  bodyText: '#374151',
  mutedText: '#6b7280',
  tableHeaderBackground: '#ffffff',
  tableHeaderText: '#374151',
  tableBorder: '#e5e7eb',
  subtleBorder: '#f3f4f6',
  grandTotalColor: '#111827',
  footerBorder: '#f3f4f6',
  amountWordsBackground: '#f9fafb',
  amountWordsBorder: '#e5e7eb',
  headerBand: '#e5e7eb',
  pagePaddingTop: 32,
  pagePaddingRight: 32,
  pagePaddingBottom: 32,
  pagePaddingLeft: 32,
  headerPaddingTop: 0,
  headerPaddingRight: 0,
  headerPaddingBottom: 24,
  headerPaddingLeft: 0,
  headerMarginTop: 0,
  headerMarginRight: 0,
  headerMarginLeft: 0,
  headerMarginBottom: 20,
  headerBorderBottomWidth: 1,
  partyCardPadding: 12,
  partyCardBorderWidth: 1,
  tableHeaderBorderBottomWidth: 1,
  tableHeaderBorderTopWidth: 1,
  tableRowBorderBottomWidth: 1,
  tableCellPaddingVertical: 8,
  tableCellPaddingHorizontal: 6,
  totalsBoxWidth: 220,
  grandRowMarginTop: 8,
  grandRowPaddingTop: 8,
  grandRowBorderTopWidth: 2,
  amountWordsMarginTop: 20,
  amountWordsPadding: 12,
  amountWordsBorderWidth: 1,
  supportWrapMarginTop: 24,
  supportBlockMarginBottom: 16,
  supportTitleMarginBottom: 6,
  supportTitleBorderBottomWidth: 1,
  supportTitlePaddingBottom: 2,
  signatureImageWidth: 120,
  signatureImageHeight: 48,
  footerBorderTopWidth: 1,
  footerPaddingTop: 10,
  footerBottom: 32,
  footerInsetLeft: 32,
  footerInsetRight: 32,
}

function withTemplateOverrides(overrides: Partial<TemplateTokens>): TemplateTokens {
  return {
    ...MINIMAL_TEMPLATE_TOKENS,
    ...overrides,
  }
}

export const TEMPLATE_TOKENS: Record<RefrensTemplateId, TemplateTokens> = {
  minimal: withTemplateOverrides({}),
  elegant: withTemplateOverrides({
    accent: '#d97706',
    headerBackground: '#fffdf4',
    headerText: '#1f2937',
    headerMuted: '#92400e',
    pageBackground: '#fffdf4',
    cardBackground: '#ffffff',
    bodyText: '#451a03',
    mutedText: '#b45309',
    tableHeaderBackground: '#fef3c7',
    tableHeaderText: '#92400e',
    tableBorder: '#fbbf24',
    subtleBorder: '#fef3c7',
    grandTotalColor: '#92400e',
    footerBorder: '#fef3c7',
    amountWordsBackground: '#fffbeb',
    amountWordsBorder: '#fde68a',
    headerBand: '#d97706',
    headerBorderBottomWidth: 2,
    partyCardBorderWidth: 0,
    tableHeaderBorderTopWidth: 0,
  }),
}
