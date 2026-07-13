import React from 'react'
import { getCsrTemplateVariant } from '../CSRPreviewContent'
import { getBranding } from './utils'
import { ZincTemplate } from './Zinc'
import { MinimalTemplate } from './Minimal'
import { IndustryCsrTemplate } from './IndustryCsr'
import { registerPdfFillableFonts } from '../../../lib/pdfFontRegistry'
import type { CsrPdfProps } from './types'

// Ensure fonts are registered once
registerPdfFillableFonts()

export function Template3({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <ZincTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template6({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <MinimalTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template8({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <IndustryCsrTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function getCsrPdfDocument({ csr, comments, branding = {}, template = '3', designPreset }: CsrPdfProps) {
  const variant = getCsrTemplateVariant(template)

  if (variant === 'zinc') return <Template3 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  if (variant === 'minimal') return <Template6 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  if (variant === 'industry') return <Template8 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  return <Template3 csr={csr} comments={comments} branding={branding} designPreset={designPreset} /> // zinc default
}
