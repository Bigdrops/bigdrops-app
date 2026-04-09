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
}

export const TEMPLATE_TOKENS: Record<RefrensTemplateId, TemplateTokens> = {
  classic: {
    accent: '#7c3aed',
    headerBackground: '#ffffff',
    headerText: '#1f2937',
    headerMuted: '#6b7280',
    pageBackground: '#ffffff',
    cardBackground: '#ffffff',
    bodyText: '#374151',
    mutedText: '#6b7280',
    tableHeaderBackground: '#f9fafb',
    tableHeaderText: '#4b5563',
    tableBorder: '#e5e7eb',
    subtleBorder: '#f3f4f6',
    grandTotalColor: '#111827',
    footerBorder: '#e5e7eb',
    amountWordsBackground: '#f5f3ff',
    amountWordsBorder: '#ddd6fe',
    headerBand: '#7c3aed',
  },
  minimal: {
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
  },
  modern: {
    accent: '#7c3aed',
    headerBackground: '#7c3aed',
    headerText: '#ffffff',
    headerMuted: 'rgba(255, 255, 255, 0.8)',
    pageBackground: '#ffffff',
    cardBackground: '#ffffff',
    bodyText: '#374151',
    mutedText: '#6b7280',
    tableHeaderBackground: '#f5f3ff',
    tableHeaderText: '#7c3aed',
    tableBorder: '#ddd6fe',
    subtleBorder: '#f5f3ff',
    grandTotalColor: '#7c3aed',
    footerBorder: '#f5f3ff',
    amountWordsBackground: '#f5f3ff',
    amountWordsBorder: '#ddd6fe',
    headerBand: '#7c3aed',
  },
  elegant: {
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
  },
  bold: {
    accent: '#1f2937',
    headerBackground: '#1f2937',
    headerText: '#ffffff',
    headerMuted: 'rgba(255, 255, 255, 0.7)',
    pageBackground: '#ffffff',
    cardBackground: '#ffffff',
    bodyText: '#111827',
    mutedText: '#4b5563',
    tableHeaderBackground: '#f3f4f6',
    tableHeaderText: '#111827',
    tableBorder: '#d1d5db',
    subtleBorder: '#f3f4f6',
    grandTotalColor: '#000000',
    footerBorder: '#e5e7eb',
    amountWordsBackground: '#f9fafb',
    amountWordsBorder: '#e5e7eb',
    headerBand: '#111827',
  },
}
