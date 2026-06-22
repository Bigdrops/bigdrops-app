export interface CsrPdfBranding {
  companyName?: string;
  companyTagline?: string;
  contactLine?: string;
  footerText?: string;
  logoUrl?: string;
}

import type { CsrRenderModel } from '../../../domain/csr/csrRenderModel'

export interface CsrPdfProps {
  csr: CsrRenderModel;
  branding?: any;
  designPreset?: any;
  template?: string;
}

export interface CsrPdfStyles {
  [key: string]: any;
}
