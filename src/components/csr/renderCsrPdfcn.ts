import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { resolvePdfcnDocument } from '@/components/pdf/pdfcn'
import { renderPdfcnToBlob, generatePdfcnPdf } from '@/components/pdf/pdfcn/adapter'
import { generateCsrPdfcnPdf } from '@/components/pdf'

export interface CsrRenderInput {
  templateId: string
  rawDocument: Record<string, any>
  branding: { companyName?: string; companyTagline?: string; addressLine?: string; phoneEmailLine?: string; logoUrl?: string }
  designPreset: PdfDesignPreset | null
  layoutDensity: 'comfortable' | 'compact' | 'tight'
  showOperationalReadings: boolean
  filename: string
}

/**
 * Single render path for every CSR PDF consumer (preview, download, share).
 * Options are threaded through the envelope: pageConfig.density drives layout
 * density; metadata carries the font/ink customization and the operational
 * readings visibility toggle.
 */
export function getCsrPdfcnOptions({ branding, designPreset, layoutDensity, showOperationalReadings }: Omit<CsrRenderInput, 'templateId' | 'rawDocument' | 'filename'>) {
  return {
    serviceProvider: {
      name: branding.companyName || undefined,
      subtitle: branding.companyTagline || undefined,
      address: branding.addressLine || undefined,
      contact: branding.phoneEmailLine || undefined,
      logoUrl: branding.logoUrl || undefined,
    },
    pageConfig: { density: layoutDensity },
    metadata: { designPreset, showOperationalReadings },
  }
}

export async function renderCsrPdfcnBlob({
  templateId,
  rawDocument,
  branding,
  designPreset,
  layoutDensity,
  showOperationalReadings,
}: Omit<CsrRenderInput, 'filename'>): Promise<Blob> {
  const resolution = resolvePdfcnDocument({
    documentType: 'csr',
    templateId,
    rawDocument,
    options: getCsrPdfcnOptions({ branding, designPreset, layoutDensity, showOperationalReadings }),
  })
  if (!resolution.success || !resolution.element) {
    throw new Error(resolution.error || 'Could not prepare the CSR PDF.')
  }
  return renderPdfcnToBlob(resolution.element)
}

export async function generateCsrPdfcnPdfDownload({
  templateId,
  rawDocument,
  branding,
  designPreset,
  layoutDensity,
  showOperationalReadings,
  filename,
}: CsrRenderInput) {
  return generateCsrPdfcnPdf({
    rawDocument,
    templateId,
    filename,
    deliver: true,
    options: getCsrPdfcnOptions({ branding, designPreset, layoutDensity, showOperationalReadings }),
  })
}

export { generatePdfcnPdf, renderPdfcnToBlob }
