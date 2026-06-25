import React from 'react'
import { getCsrTemplateVariant } from '../CSRPreviewContent'
import { getBranding } from './utils'
import { SignalBandsTemplate } from './SignalBands'
import { ZincTemplate } from './Zinc'
import { CrimsonTemplate } from './Crimson'
import { IndustryCSRTemplate } from './IndustryCSR'
import { MinimalTemplate } from './Minimal'
import { registerPdfFillableFonts } from '../../../lib/pdfFontRegistry'
import type { CsrPdfProps } from './types'

// Ensure fonts are registered once
registerPdfFillableFonts()

export function Template2({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <SignalBandsTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template3({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <ZincTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template4({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <CrimsonTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template5({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <IndustryCSRTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template6({ csr, comments, branding = {}, designPreset }: CsrPdfProps) {
  return <MinimalTemplate csr={csr} comments={comments} branding={getBranding(branding)} designPreset={designPreset} />
}

export function getCsrPdfDocument({ csr, comments, branding = {}, template = '4', designPreset }: CsrPdfProps) {
  const variant = getCsrTemplateVariant(template)

  if (variant === 'signalbands') return <Template2 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  if (variant === 'zinc') return <Template3 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  if (variant === 'minimal') return <Template6 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  if (variant === 'industry') return <Template5 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
  return <Template4 csr={csr} comments={comments} branding={branding} designPreset={designPreset} />
}
