import type { RefrensTemplateId } from './types'

export type TemplateTokens = {
  pageBackground: string
  pageBorder: string
  accent: string
  headerBackground: string
  headerText: string
  headerMuted: string
  headerBand: string
  tableHeaderBackground: string
  tableHeaderText: string
  tableBorder: string
  subtleBorder: string
  mutedText: string
  bodyText: string
  cardBackground: string
  amountWordsBackground: string
  amountWordsBorder: string
  grandTotalColor: string
  footerBorder: string
}

export const TEMPLATE_TOKENS: Record<RefrensTemplateId, TemplateTokens> = {
  classic: {
    pageBackground: '#ffffff',
    pageBorder: '#ffffff',
    accent: '#7c3aed',
    headerBackground: '#ffffff',
    headerText: '#111827',
    headerMuted: '#6b7280',
    headerBand: '#7c3aed',
    tableHeaderBackground: '#f3ebff',
    tableHeaderText: '#7c3aed',
    tableBorder: '#e5e7eb',
    subtleBorder: '#e5e7eb',
    mutedText: '#6b7280',
    bodyText: '#374151',
    cardBackground: '#ffffff',
    amountWordsBackground: '#f7f1ff',
    amountWordsBorder: '#d8b4fe',
    grandTotalColor: '#7c3aed',
    footerBorder: '#f3f4f6',
  },
  minimal: {
    pageBackground: '#ffffff',
    pageBorder: '#ffffff',
    accent: '#111827',
    headerBackground: '#ffffff',
    headerText: '#111827',
    headerMuted: '#6b7280',
    headerBand: '#e5e7eb',
    tableHeaderBackground: '#f9fafb',
    tableHeaderText: '#6b7280',
    tableBorder: '#e5e7eb',
    subtleBorder: '#e5e7eb',
    mutedText: '#6b7280',
    bodyText: '#374151',
    cardBackground: '#ffffff',
    amountWordsBackground: '#ffffff',
    amountWordsBorder: '#e5e7eb',
    grandTotalColor: '#111827',
    footerBorder: '#f3f4f6',
  },
  modern: {
    pageBackground: '#ffffff',
    pageBorder: '#ffffff',
    accent: '#7c3aed',
    headerBackground: '#7c3aed',
    headerText: '#ffffff',
    headerMuted: 'rgba(255,255,255,0.76)',
    headerBand: '#7c3aed',
    tableHeaderBackground: '#7c3aed',
    tableHeaderText: '#ffffff',
    tableBorder: '#e5e7eb',
    subtleBorder: '#e5e7eb',
    mutedText: '#6b7280',
    bodyText: '#374151',
    cardBackground: '#ffffff',
    amountWordsBackground: '#f6f0ff',
    amountWordsBorder: '#c4b5fd',
    grandTotalColor: '#7c3aed',
    footerBorder: '#f3f4f6',
  },
  elegant: {
    pageBackground: '#fffdf4',
    pageBorder: '#fffdf4',
    accent: '#d97706',
    headerBackground: '#fffdf4',
    headerText: '#111827',
    headerMuted: '#78716c',
    headerBand: '#d97706',
    tableHeaderBackground: '#f5ede0',
    tableHeaderText: '#b45309',
    tableBorder: '#e7dccd',
    subtleBorder: '#eadfcf',
    mutedText: '#78716c',
    bodyText: '#44403c',
    cardBackground: '#fffaf0',
    amountWordsBackground: '#fff7e8',
    amountWordsBorder: '#fdba74',
    grandTotalColor: '#b45309',
    footerBorder: '#f1eadb',
  },
  bold: {
    pageBackground: '#ffffff',
    pageBorder: '#ffffff',
    accent: '#1f2937',
    headerBackground: '#1f2937',
    headerText: '#ffffff',
    headerMuted: 'rgba(255,255,255,0.72)',
    headerBand: '#1f2937',
    tableHeaderBackground: '#1f2937',
    tableHeaderText: '#ffffff',
    tableBorder: '#e5e7eb',
    subtleBorder: '#e5e7eb',
    mutedText: '#6b7280',
    bodyText: '#374151',
    cardBackground: '#ffffff',
    amountWordsBackground: '#f9fafb',
    amountWordsBorder: '#d1d5db',
    grandTotalColor: '#1f2937',
    footerBorder: '#f3f4f6',
  },
}
