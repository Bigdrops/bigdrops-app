export interface CsrPdfBranding {
  companyName?: string;
  companyTagline?: string;
  contactLine?: string;
  footerText?: string;
  logoUrl?: string;
}

export interface CsrPdfProps {
  csr: any;
  branding?: any;
  designPreset?: any;
}

export interface CsrPdfStyles {
  [key: string]: any;
}
