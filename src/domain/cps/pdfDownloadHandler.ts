import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import { normalizeCpsColumns } from '@/domain/cps/columns'
import type { Cps } from '@/domain/cps/types'
import { feedback } from '@/lib/feedback'
import {
  CPS_CAPABILITIES,
  CPS_POLICY,
  CPS_TEMPLATE_DEFAULTS,
} from '@/domain/pdf/customization/cps'
import { loadSettings } from '@/domain/pdf/customization/hooks'
import { resolveFull } from '@/domain/pdf/customization/resolver'
import { readCpsPdfDisplayPreferences, type CpsPdfOrientation } from '@/domain/cps/pdfPreferences'
import { adaptCommercialDocumentData, type CommercialDocumentData } from '@/components/pdf/industryAdapter'
import { prepareCpsCommercialDocument } from '@/domain/pdf/resolver/commercial'
import { resolveCommercialPdfRoute, type CommercialPdfRoute } from '@/components/pdf'
import type { PdfDocumentModel } from '@/components/pdf/types'

type CpsPdfPipelineStage = 'prepare' | 'customization' | 'font' | 'template'
type ErrorWithCause = Error & { cause?: unknown }

class CpsPdfPipelineError extends Error {
  readonly stage: CpsPdfPipelineStage

  constructor(stage: CpsPdfPipelineStage, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(`CPS PDF ${stage} failed: ${causeMessage}`)
    this.name = 'CpsPdfPipelineError'
    this.stage = stage
    ;(this as ErrorWithCause).cause = cause
  }
}

async function cpsStage<T>(stage: CpsPdfPipelineStage, operation: () => Promise<T> | T): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new CpsPdfPipelineError(stage, error)
  }
}

export function resolveCpsPdfColumns(columnConfig: unknown) {
  const NEVER_AUTO_HIDE = new Set(['description', 'quantity', 'sp'])
  const columns = normalizeCpsColumns(columnConfig as Array<{ key: string; visibilityMode?: string }>)

  const isColumnShown = (key: string) => {
    if (NEVER_AUTO_HIDE.has(key)) return true
    const column = columns.find((entry) => entry.key === key)
    if (!column) return key === 'make_brand' || key === 'unit'
    return (column.visibilityMode || 'show') === 'show'
  }

  const descriptionShown = isColumnShown('description')
  return {
    showMake: isColumnShown('make_brand'),
    showUnit: isColumnShown('unit'),
    showCp: isColumnShown('cp'),
    showSpec: descriptionShown,
  }
}

async function toDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    const buffer = await blob.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index])
    }
    return `data:${blob.type};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/^_|_$/g, '')
}

const TEMPLATE_IMPORTERS: Record<CommercialPdfRoute, () => Promise<any>> = {
  'industrial-forme': () => import('@/components/pdf/forme/IndustrialFormeDocument'),
  'industry-forme': () => import('@/components/pdf/forme/IndustryFormeDocument'),
  'minimal-forme': () => import('@/components/pdf/forme/MinimalFormeDocument'),
  'landscape-forme': () => import('@/components/pdf/forme/LandscapeFormeDocument'),
  'evergreen-forme': () => import('@/components/pdf/forme/EvergreenFormeDocument'),
  'architectural-forme': () => import('@/components/pdf/forme/ArchitecturalFormeDocument'),
  'executive-forme': () => import('@/components/pdf/forme/ExecutiveFormeDocument'),
  'heritage-forme': () => import('@/components/pdf/forme/HeritageHouseFormeDocument'),
  'mosaic-forme': () => import('@/components/pdf/forme/MosaicFormeDocument'),
}

const TEMPLATE_COMPONENTS: Record<CommercialPdfRoute, (mod: any) => React.ComponentType<{ data: CommercialDocumentData; compact?: boolean }>> = {
  'industrial-forme': (m) => m.IndustrialFormeDocument,
  'industry-forme': (m) => m.IndustryFormeDocument,
  'minimal-forme': (m) => m.MinimalFormeDocument,
  'landscape-forme': (m) => m.LandscapeFormeDocument,
  'evergreen-forme': (m) => m.EvergreenFormeDocument,
  'architectural-forme': (m) => m.ArchitecturalFormeDocument,
  'executive-forme': (m) => m.ExecutiveFormeDocument,
  'heritage-forme': (m) => m.HeritageHouseFormeDocument,
  'mosaic-forme': (m) => m.MosaicFormeDocument,
}

async function loadCpsTemplateElement(
  route: CommercialPdfRoute,
  dataConfig: { model: PdfDocumentModel; compact?: boolean },
) {
  const React = await import('react')
  const mod = await cpsStage('template', () => TEMPLATE_IMPORTERS[route]())
  const Component = TEMPLATE_COMPONENTS[route](mod)
  const adapted = adaptCommercialDocumentData(dataConfig.model)
  return React.createElement(Component, { data: adapted, compact: dataConfig.compact })
}

export function buildCpsCommercialModel(input: {
  cps: Cps
  settings: Record<string, unknown>
  logoDataUri?: string | null
  photoDataUris?: Record<string, string>
  orientation?: CpsPdfOrientation
  columnVisibility?: { showMake: boolean; showUnit: boolean; showCp: boolean; showSpec: boolean }
}) {
  const { cps, settings, photoDataUris } = input
  const visibility = input.columnVisibility || resolveCpsPdfColumns(cps.custom_fields?.columnConfig)
  const orientation: CpsPdfOrientation = input.orientation || 'portrait'
  const logoDataUri = input.logoDataUri ?? null

  const model = prepareCpsCommercialDocument(cps, {
    settings,
    columnVisibility: visibility,
    orientation,
    logoDataUri,
    photoDataUris,
  })

  return model
}

export async function getCpsPdfBlob(input: {
  cps: Cps
  settings: Record<string, unknown>
}): Promise<{ blob: Blob; filename: string }> {
  const { cps, settings } = input
  const { generateCpsCommercialPdfBlob } = await cpsStage('prepare', () => import('@/components/pdf'))
  const { ensureFormeFontFamily } = await cpsStage('prepare', () => import('@/components/pdf/forme/fonts'))

  const prefs = await cpsStage('customization', () => readCpsPdfDisplayPreferences())
  const { customization } = await cpsStage('customization', () => resolveFull(CPS_TEMPLATE_DEFAULTS, CPS_CAPABILITIES, CPS_POLICY, loadSettings('cps_sheets')))
  await cpsStage('font', () =>
    Promise.all([
      ensureFormeFontFamily(customization.documentFont),
      ensureFormeFontFamily('Noto Sans'),
    ]),
  )

  const visibility = resolveCpsPdfColumns(cps.custom_fields?.columnConfig)
  const logoUrl = resolveCanonicalLogoUrl(settings)
  const logoDataUri = logoUrl && logoUrl.startsWith('data:') ? logoUrl : logoUrl ? await toDataUri(logoUrl) : null

  const photoDataUris: Record<string, string> = {}
  for (const row of cps.table_rows || []) {
    if (row.row_type !== 'item' || !row.image_url) continue
    const key = row.id || row._uiKey || ''
    if (!key) continue
    if (row.image_url.startsWith('data:')) {
      photoDataUris[key] = row.image_url
      continue
    }
    const dataUri = await toDataUri(row.image_url)
    if (dataUri) photoDataUris[key] = dataUri
  }

  const model = await cpsStage('template', () =>
    buildCpsCommercialModel({
      cps,
      settings,
      logoDataUri,
      photoDataUris,
      orientation: prefs.orientation,
      columnVisibility: visibility,
    }),
  )

  const rawName = `${model.identity.number} ${model.identity.title}`.trim() || 'cps'
  const filename = `${sanitizeFilename(rawName)}.pdf`
  const route = resolveCommercialPdfRoute(prefs.templateId)
  const element = await loadCpsTemplateElement(route, { model })
  return generateCpsCommercialPdfBlob({
    element,
    filename,
  })
}

export async function handleDownloadCpsPdf(input: {
  cps: Cps
  settings: Record<string, unknown>
  setDownloading: (v: boolean) => void
}): Promise<void> {
  const { cps, settings, setDownloading } = input

  setDownloading(true)
  try {
    const { generateCpsCommercialPdf } = await cpsStage('prepare', () => import('@/components/pdf'))
    const { ensureFormeFontFamily } = await cpsStage('prepare', () => import('@/components/pdf/forme/fonts'))

    const prefs = await cpsStage('customization', () => readCpsPdfDisplayPreferences())
    const { customization } = await cpsStage('customization', () => resolveFull(CPS_TEMPLATE_DEFAULTS, CPS_CAPABILITIES, CPS_POLICY, loadSettings('cps_sheets')))
    await cpsStage('font', () =>
      Promise.all([
        ensureFormeFontFamily(customization.documentFont),
        ensureFormeFontFamily('Noto Sans'),
      ]),
    )

    const visibility = resolveCpsPdfColumns(cps.custom_fields?.columnConfig)
    const logoUrl = resolveCanonicalLogoUrl(settings)
    const logoDataUri = logoUrl && logoUrl.startsWith('data:') ? logoUrl : logoUrl ? await toDataUri(logoUrl) : null

    const photoDataUris: Record<string, string> = {}
    for (const row of cps.table_rows || []) {
      if (row.row_type !== 'item' || !row.image_url) continue
      const key = row.id || row._uiKey || ''
      if (!key) continue
      if (row.image_url.startsWith('data:')) {
        photoDataUris[key] = row.image_url
        continue
      }
      const dataUri = await toDataUri(row.image_url)
      if (dataUri) photoDataUris[key] = dataUri
    }

    const model = await cpsStage('template', () =>
      buildCpsCommercialModel({
        cps,
        settings,
        logoDataUri,
        photoDataUris,
        orientation: prefs.orientation,
        columnVisibility: visibility,
      }),
    )

    const rawName = `${model.identity.number} ${model.identity.title}`.trim() || 'cps'
    const filename = `${sanitizeFilename(rawName)}.pdf`
    const route = resolveCommercialPdfRoute(prefs.templateId)
    const element = await loadCpsTemplateElement(route, { model })
    await generateCpsCommercialPdf({
      element,
      filename,
    })
    feedback.success('Download ready', { description: `${filename} saved.` })
  } catch (error) {
    const downloadError = new Error('Download failed') as ErrorWithCause
    downloadError.cause = error
    feedback.error(downloadError, {
      description: 'Could not generate the CPS PDF.',
    })
    throw error
  } finally {
    setDownloading(false)
  }
}
