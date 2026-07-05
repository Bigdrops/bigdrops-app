import type { CompanySettings, BrandingBlock } from '../types'
import { normalizeBlank } from '../normalizeBlank'

export function resolveBranding(company: CompanySettings): BrandingBlock {
  return {
    name: company.name || "",
    tagline: normalizeBlank(company.tagline),
    logo: normalizeBlank(company.logo),
    address: normalizeBlank(company.address),
    phone: normalizeBlank(company.phone),
    email: normalizeBlank(company.email),
    website: normalizeBlank(company.website),
    customInfo: company.customInfo || null,
  }
}
