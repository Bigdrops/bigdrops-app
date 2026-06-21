import type { WaybillRenderInput, WaybillRenderModel } from './types'
import { resolveBranding } from './resolvers/branding'
import { resolveHeader } from './resolvers/header'
import { resolveParties } from './resolvers/parties'
import { resolveLogistics } from './resolvers/logistics'
import { resolveNotes } from './resolvers/notes'
import { resolveSignatures } from './resolvers/signatures'
import { resolveColumns, buildRows } from './resolvers/table'

export function buildWaybillRenderModel(input: WaybillRenderInput): WaybillRenderModel {
  const { waybill, columns, company } = input

  return {
    branding: resolveBranding(company),
    header: resolveHeader(waybill),
    parties: resolveParties(waybill),
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
  }
}
