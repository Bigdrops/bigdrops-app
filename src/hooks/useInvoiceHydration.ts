import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { useEntity } from '@/lib/tenant/contexts'
import { resolveFinancialColumns } from '@/domain/financial/resolveFinancialColumns'
import type {
  DiscountTiming,
  DiscountType,
  ExtraCharge,
  InvoiceAttachment,
  InvoiceCustomFields,
  InvoiceFieldEntry,
  InvoiceItem,
  InvoicePdfOutput,
  WhtType,
} from '@/domain/invoice'
import {
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  healLegacyCalculationOverrides,
  inferLegacyCalculationState,
  makeEmptyItem,
  mapDbInvoiceItem,
  normalizeAdditionalFieldEntries,
  normalizeExtraCharges,
  normalizeFieldEntries,
  parseCustomFields,
} from '@/domain/invoice'

export interface HydrationTargets {
  setInvoice: (invoice: any) => void
  setItems: (items: InvoiceItem[]) => void
  setGroups: (groups: any[]) => void
  setCustomFields: (fields: InvoiceFieldEntry[]) => void
  setAdditionalFields: (fields: InvoiceFieldEntry[]) => void
  setExtraCharges: (charges: ExtraCharge[]) => void
  setChargeLabels: (labels: Record<string, string>) => void
  setNotesTitle: (title: string) => void
  setTermsTitle: (title: string) => void
  setMergeQtyUnit: (value: boolean) => void
  setInvoiceTitle: (title: string) => void
  setAttachments: (attachments: InvoiceAttachment[]) => void
  setSignatoryId: (id: string | null) => void
  setPdfOutput: (output: InvoicePdfOutput) => void
  setDiscountType: (type: DiscountType) => void
  setDiscountTiming: (timing: DiscountTiming) => void
  setWhtType: (type: WhtType) => void
  setColumns: (columns: any[]) => void
}

export function useInvoiceHydration(
  { id, isEdit }: { id: string | undefined; isEdit: boolean },
  targets: HydrationTargets,
  onNotFound: () => void,
) {
  const { tenantClient } = useEntity()
  const [loading, setLoading] = useState(isEdit)
  const [initialInvoiceSnapshot, setInitialInvoiceSnapshot] = useState<any>(null)
  const [baseCustomFields, setBaseCustomFields] = useState<InvoiceCustomFields | Record<string, never>>({})

  const targetsRef = useRef(targets)
  targetsRef.current = targets

  const onNotFoundRef = useRef(onNotFound)
  onNotFoundRef.current = onNotFound

  useEffect(() => {
    if (!isEdit || !id) return

    const load = async () => {
      const invoiceResult = await tenantClient.from('invoices').select('*').eq('id', id).single()
      const data = invoiceResult.data

      if (!data) {
        onNotFoundRef.current()
        return
      }

      let savedGroupMeta: Record<string, any> = {}
      let parsedCustomFields: any = null

      try {
        const parsed = parseCustomFields(data.custom_fields)
        parsedCustomFields = parsed
        setBaseCustomFields(parsed)
        targetsRef.current.setSignatoryId(getInvoiceSignatoryId(parsed))
        targetsRef.current.setPdfOutput(getInvoicePdfOutput(parsed))
        if (parsed && !Array.isArray(parsed)) {
          targetsRef.current.setCustomFields(normalizeFieldEntries(parsed.header, 'value'))
          targetsRef.current.setAdditionalFields(normalizeAdditionalFieldEntries(parsed.additionalFields, parsed.bottom))
          targetsRef.current.setExtraCharges(normalizeExtraCharges(parsed.extraCharges))
          if (parsed.chargeLabels) targetsRef.current.setChargeLabels(parsed.chargeLabels as any)
          targetsRef.current.setColumns(resolveFinancialColumns(parsed.columnConfig as any[]))
          if (parsed.notesTitle) targetsRef.current.setNotesTitle(parsed.notesTitle as any)
          if (parsed.termsTitle) targetsRef.current.setTermsTitle(parsed.termsTitle as any)
          if (parsed.attachments) targetsRef.current.setAttachments(parsed.attachments as any)
          if (typeof parsed.mergeQtyUnit === 'boolean') targetsRef.current.setMergeQtyUnit(parsed.mergeQtyUnit as any)
          if (parsed.discountType) targetsRef.current.setDiscountType(parsed.discountType)
          if (parsed.discountTiming) targetsRef.current.setDiscountTiming(parsed.discountTiming)
          if (parsed.whtType) targetsRef.current.setWhtType(parsed.whtType)
          if (parsed.groupMeta) savedGroupMeta = parsed.groupMeta
        } else if (Array.isArray(parsed)) {
          targetsRef.current.setCustomFields(normalizeFieldEntries(parsed, 'value'))
        }
      } catch (err) {
        console.error('Failed to parse custom fields:', err)
      }

      if (data.invoice_title) targetsRef.current.setInvoiceTitle(data.invoice_title)

      const { data: itemRows } = await tenantClient.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
      // Mirrors the quotation hydration (buildQuotationFormState). Rows stored
      // as 0 are healed to null so they inherit the global discount:
      // 1. Legacy documents without persisted calculation inputs heal both
      //    vat_rate and discount_rate.
      // 2. Documents with persisted calculation inputs heal discount_rate 0
      //    rows written by the Aug 2026 save RPC COALESCE. The heal does not
      //    depend on the persisted global discount value: the global discount
      //    field must work independently of row-level values, and a user may
      //    type a discount in Edit on an invoice that was saved without one.
      const hasSavedCalculationInputs = Boolean(
        parsedCustomFields && !Array.isArray(parsedCustomFields) && parsedCustomFields.calculationInputs,
      )
      const loadedItems = (itemRows && itemRows.length > 0 ? itemRows : [makeEmptyItem()]).map((item) =>
        healLegacyCalculationOverrides(mapDbInvoiceItem(item), hasSavedCalculationInputs),
      )
      const legacyCalculationState = inferLegacyCalculationState({
        invoice: data,
        items: loadedItems,
        customFields: parsedCustomFields && !Array.isArray(parsedCustomFields) ? parsedCustomFields : {},
      })

      targetsRef.current.setItems(loadedItems)
      setInitialInvoiceSnapshot(data)
      targetsRef.current.setInvoice({
        ...data,
        vat: legacyCalculationState.editableInputs.vatRate,
        discount: legacyCalculationState.editableInputs.discountValue,
        wht: legacyCalculationState.calculationInputs.whtValue,
      })
      targetsRef.current.setDiscountType(legacyCalculationState.calculationInputs.discountType as DiscountType)
      targetsRef.current.setDiscountTiming(legacyCalculationState.calculationInputs.discountTiming as DiscountTiming)
      targetsRef.current.setWhtType(legacyCalculationState.calculationInputs.whtType as WhtType)

      const seenGroupIds = new Set()
      const discoveredGroups = loadedItems
        .filter((item) => item.row_type === 'group_header')
        .map((item, index) => {
          const groupId = item.group_id || `group_${index}`
          if (seenGroupIds.has(groupId)) return null
          seenGroupIds.add(groupId)
          const meta = savedGroupMeta[groupId] || savedGroupMeta[item.group_name || ''] || {}
          return {
            id: groupId,
            name: item.group_name || `Group ${index + 1}`,
            showSubtotal: !!meta.showSubtotal,
          }
        })
        .filter(Boolean) as any[]

      targetsRef.current.setGroups(discoveredGroups)
      setLoading(false)
    }

    void load()
  }, [isEdit, id, tenantClient])

  return { loading, initialInvoiceSnapshot, baseCustomFields }
}
