import React from 'react'
import { getCsrTemplateVariant } from '../CSRPreviewContent'
import { getBranding } from './utils'
import { PulseFrameTemplate } from './PulseFrame'
import { SignalBandsTemplate } from './SignalBands'
import { ZincTemplate } from './Zinc'
import { CrimsonTemplate } from './Crimson'
import { registerPdfFillableFonts } from '../../../lib/pdfFontRegistry'
import type { CsrPdfProps } from './types'

// Ensure fonts are registered once
registerPdfFillableFonts()

export function Template1({ csr, branding = {}, designPreset }: CsrPdfProps) {
  return <PulseFrameTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template2({ csr, branding = {}, designPreset }: CsrPdfProps) {
  return <SignalBandsTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template3({ csr, branding = {}, designPreset }: CsrPdfProps) {
  return <ZincTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template4({ csr, branding = {}, designPreset }: CsrPdfProps) {
  return <CrimsonTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function getCsrPdfDocument({ csr, branding = {}, template = '4', designPreset }: CsrPdfProps) {
  const variant = getCsrTemplateVariant(template)

  if (variant === 'pulseframe') return <Template1 csr={csr} branding={branding} designPreset={designPreset} />
  if (variant === 'signalbands') return <Template2 csr={csr} branding={branding} designPreset={designPreset} />
  if (variant === 'zinc') return <Template3 csr={csr} branding={branding} designPreset={designPreset} />
  return <Template4 csr={csr} branding={branding} designPreset={designPreset} />
}
