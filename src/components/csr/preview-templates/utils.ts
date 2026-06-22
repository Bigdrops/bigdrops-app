import { CSR_READING_FIELDS } from '../CSRPreviewContent'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
} from '../../../lib/pdfDesignPreset'
import { safeText } from './layoutModel'
import type { CsrRenderModel } from '../../../domain/csr/csrRenderModel'

export const safe = (value: any) => safeText(value)
export const hasText = (value: any) => !!safe(value)

export function shouldRender(enabled: any, value: any) {
  if (!enabled) return false
  if (Array.isArray(value)) return value.length > 0
  return hasText(value)
}

export function getBranding(branding: any = {}) {
  return {
    companyName: safe(branding?.companyName),
    companyTagline: safe(branding?.companyTagline),
    contactLine: safe(branding?.contactLine),
    footerText: safe(branding?.footerText),
    logoUrl: safe(branding?.logoUrl),
  }
}

export function getStatusValue(csr: CsrRenderModel) {
  return safe(csr?.status)
}

export function getServiceWindow(csr: CsrRenderModel) {
  return {
    startDate: safe(csr?.start_date),
    startTime: safe(csr?.start_time),
    endDate: safe(csr?.end_date),
    endTime: safe(csr?.end_time),
  }
}

export function buildReadingRows(csr: CsrRenderModel) {
  return CSR_READING_FIELDS.map(({ key, label }: any) => ({
    key,
    label,
    value: safe(csr?.[key]),
  }))
}

export function getPopulatedReadingRows(csr: CsrRenderModel) {
  return buildReadingRows(csr).filter((row: any) => hasText(row.value))
}

export function hasOperationalReadings(csr: CsrRenderModel) {
  return !!csr?.showOperationalReadings && getPopulatedReadingRows(csr).length > 0
}

export function getMaterialsRows(csr: CsrRenderModel) {
  if (Array.isArray(csr?.materialsRows)) {
    const populated = csr.materialsRows.filter((row: any) => row?.item || row?.quantity || row?.unit)
    if (populated.length > 0) return populated
  }
  return hasText(csr?.materialsText) ? [{ item: csr?.materialsText || ' ', quantity: '', unit: '' }] : []
}

export function hasMaterials(csr: CsrRenderModel) {
  return getMaterialsRows(csr).length > 0
}

export function getTechnicianName(csr: CsrRenderModel) {
  return safe(csr?.technicianSignatory?.name || csr?.technicianName)
}

export function getTechnicianRole(csr: CsrRenderModel) {
  return safe(csr?.technicianSignatory?.role)
}

export function getTechnicianSignatureUrl(csr: CsrRenderModel) {
  return safe(csr?.technicianSignatory?.signatureUrl)
}

export function getLayoutDensity(csr: CsrRenderModel) {
  return csr?.layoutDensity || 'comfortable'
}

export function getFillablePdfTheme(designPreset: any) {
  const preset = designPreset || getDefaultPdfDesignPreset('csr')
  const fillableChoice = getEffectiveFillableFont(preset)
  return {
    fillableColor: preset.fillableColor || '#0f172a',
    fillableRegular: resolvePdfFontFamily(fillableChoice, 'regular'),
    fillableBold: resolvePdfFontFamily(fillableChoice, 'bold'),
  }
}
