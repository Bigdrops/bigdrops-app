import type { WaybillRenderInput, WaybillRenderModel } from './types'
import { resolveBranding } from './resolvers/branding'
import { resolveHeader } from './resolvers/header'
import { resolveParties } from './resolvers/parties'
import { resolveLogistics } from './resolvers/logistics'
import { resolveNotes } from './resolvers/notes'
import { resolveSignatures } from './resolvers/signatures'
import { resolveColumns, buildRows } from './resolvers/table'
import { splitAddressLines } from '@/components/pdf-new/industryAdapter'
import { normalizeCompanyCustomInfo } from '@/domain/invoice/normalize'
import { buildCompanyPreviewLines, buildClientPreviewLines } from '@/domain/invoice/projections/partyProjection'

export function buildWaybillRenderModel(input: WaybillRenderInput): WaybillRenderModel {
  const { waybill, columns, company } = input

  // Create SettingsLike for shared company preview
  const settingsForCompany = {
    company_address: company.address,
    company_city: company.city,
    company_state: company.state,
    company_phone: company.phone,
    company_email: company.email,
    company_website: company.website,
    custom_info: company.customInfo ? JSON.stringify(company.customInfo) : null,
  }

  // Build company preview lines using shared infrastructure
  const companyPreview = buildCompanyPreviewLines(settingsForCompany)
  const companyAddressSplit = splitAddressLines(companyPreview.addressLines)

  // Create company party data for PartyCard
  const companyPartyData = {
    companyLogoUrl: company.logo || '',
    name: company.name || '',
    tagline: company.tagline || '',
    address: companyAddressSplit.address,
    cityState: companyAddressSplit.cityState,
    phone: company.phone || '',
    email: company.email || '',
    website: companyPreview.website || '',
    customInfo: companyPreview.customInfo,
  }

  // Create client preview lines using shared infrastructure
  const parties = resolveParties(waybill)
  const clientCityState = parties.clientCityState || ''
  const [clientCity, clientState] = clientCityState.split(',').map(s => s.trim())
  
  const clientForPreview = {
    address: parties.clientAddress || '',
    city: clientCity || '',
    state: clientState || '',
    phone: parties.clientPhone || '',
    email: parties.clientEmail || '',
  }
  const clientAddressLines = buildClientPreviewLines(clientForPreview)
  const clientAddressSplit = splitAddressLines(clientAddressLines)

  // Create client party data for PartyCard
  const clientPartyData = {
    name: parties.clientName || '',
    address: clientAddressSplit.address,
    cityState: clientAddressSplit.cityState,
    phone: parties.clientPhone || '',
    email: parties.clientEmail || '',
  }

  return {
    branding: resolveBranding(company),
    header: resolveHeader(waybill),
    parties: parties,
    logistics: resolveLogistics(waybill),
    notes: resolveNotes(waybill.notes),
    signatures: resolveSignatures(waybill),
    table: {
      columns: resolveColumns(columns),
      rows: buildRows(waybill.items, columns),
    },
    footer: {
      waybillNumber: waybill.waybill_number,
      companyName: company.name,
    },
    pagination: {
      repeatTableHeader: true,
      keepSignatureTogether: true,
      keepNotesTogether: true,
    },
    company: companyPartyData,
    client: clientPartyData,
  }
}
