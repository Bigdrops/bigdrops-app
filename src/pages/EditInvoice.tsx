import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  invoiceImportAdapter,
  filterPopulatedAdditionalFields,
  mapDbInvoiceItem,
  normalizeAdditionalFieldEntries,
  parseCustomFields,
} from '@/domain/invoice'
import type { 
  InvoiceItem, 
  InvoiceAttachment, 
  InvoiceFieldEntry, 
  ExtraCharge, 
  InvoicePdfOutput,
  DiscountType,
  DiscountTiming,
  WhtType,
  InvoiceCustomFields,
} from '@/domain/invoice'
import {
  BUILTIN_COLUMNS,
  buildCalculationInputs,
  inferLegacyCalculationState,
  mergeColumnConfigs,
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeExtraCharges,
  normalizeFieldEntries,
  normalizeQuantity,
  toDbItem,
  useInvoiceColumns,
} from '../components/useInvoiceColumns'
import { computeDocument } from '../lib/Calculations'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { numberToWords } from '../hooks/useInvoiceForm'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { feedback } from '@/lib/feedback'
import { createSaveTimer, getJsonSizeBytes } from '@/lib/saveTiming'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'

interface InvoiceFormFields {
  invoice_number: string
  po_number: string
  project_id: string
  client_id: string
  client_name: string
  issue_date: string
  due_date: string
  status: string
  document_type: string
  payment_terms: string
  custom_payment_terms: string
  notes: string
  terms: string
  workmanship: number
  transportation: number
  shipping: number
  discount: number
  vat: number
  wht: number
  work_duration: string
  amount_in_words: string
  [key: string]: any
}

interface InvoiceGroup {
  id?: string
  name?: string
  showSubtotal?: boolean
}

export default function EditInvoice() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { isMobile } = useLayoutMode()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>('percent')
  const [discountTiming, setDiscountTiming] = useState<DiscountTiming>('before')
  const [whtType, setWhtType] = useState<WhtType>('percent')
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([])
  const [signatories, setSignatories] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [settingsData, setSettingsData] = useState<any>(null)
  const [customFields, setCustomFields] = useState<InvoiceFieldEntry[]>([])
  const [signatoryId, setSignatoryId] = useState<string | null>(null)
  const [pdfOutput, setPdfOutput] = useState<InvoicePdfOutput>(DEFAULT_INVOICE_PDF_OUTPUT)
  const [additionalFields, setAdditionalFields] = useState<InvoiceFieldEntry[]>([])
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])
  const [chargeLabels, setChargeLabels] = useState<Record<string, string>>({
    workmanship: 'Workmanship',
    transportation: 'Transportation',
    shipping: 'Shipping',
  })
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(true)
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoice, setInvoice] = useState<InvoiceFormFields | null>(null)
  const [initialInvoiceSnapshot, setInitialInvoiceSnapshot] = useState<any>(null)
  const [baseCustomFields, setBaseCustomFields] = useState<any>({})
  const [items, setItems] = useState<InvoiceItem[]>([{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' } as InvoiceItem])
  const [groups, setGroups] = useState<InvoiceGroup[]>([])
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  const {
    columns,
    setColumns,
    isVisible,
    getColumn,
    toggleVisible,
    toggleDisabled,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns()

  useEffect(() => {
    const load = async () => {
      const [signatoryRows, bankAccountRows, settingsRows, invoiceResult] = await Promise.all([
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
        supabase.from('invoices').select('*').eq('id', id).single(),
      ])
      setSignatories(signatoryRows.data || [])
      setBankAccounts(bankAccountRows.data || [])
      setSettingsData(settingsRows.data || null)

      const data = invoiceResult.data
      if (!data) {
        navigate('/invoices')
        return
      }

      let savedGroupMeta: Record<string, any> = {}
      let parsedCustomFields: any = null

      try {
        const parsed = parseCustomFields(data.custom_fields)
        parsedCustomFields = parsed
        setBaseCustomFields(parsed)
        setSignatoryId(getInvoiceSignatoryId(parsed))
        setPdfOutput(getInvoicePdfOutput(parsed))
        if (parsed && !Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed.header, 'value'))
          setAdditionalFields(normalizeAdditionalFieldEntries(parsed.additionalFields, parsed.bottom))
          setExtraCharges(normalizeExtraCharges(parsed.extraCharges))
          if (parsed.chargeLabels) setChargeLabels(parsed.chargeLabels as any)
          if (parsed.columnConfig) setColumns(mergeColumnConfigs(parsed.columnConfig as any[]))
          if (parsed.notesTitle) setNotesTitle(parsed.notesTitle as any)
          if (parsed.termsTitle) setTermsTitle(parsed.termsTitle as any)
          if (parsed.attachments) setAttachments(parsed.attachments as any)
        if (typeof parsed.mergeQtyUnit === 'boolean') setMergeQtyUnit(parsed.mergeQtyUnit as any)
          if (parsed.discountType) setDiscountType(parsed.discountType)
          if (parsed.discountTiming) setDiscountTiming(parsed.discountTiming)
          if (parsed.whtType) setWhtType(parsed.whtType)
          if (parsed.groupMeta) savedGroupMeta = parsed.groupMeta
        } else if (Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed, 'value'))
        }
      } catch (err) {
        console.error('Failed to parse custom fields:', err)
      }

      if (data.invoice_title) setInvoiceTitle(data.invoice_title)

      const { data: itemRows } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
      const legacyCalculationState = inferLegacyCalculationState({
        invoice: data,
        items: itemRows || [],
        customFields: parsedCustomFields && !Array.isArray(parsedCustomFields) ? parsedCustomFields : {},
      })

      const loadedItems = (itemRows && itemRows.length > 0 ? itemRows : [makeEmptyItem()]).map((item) => mapDbInvoiceItem(item))

      setItems(loadedItems)
      setInitialInvoiceSnapshot(data)
      setInvoice({
        ...data,
        vat: legacyCalculationState.editableInputs.vatRate,
        discount: legacyCalculationState.editableInputs.discountValue,
        wht: legacyCalculationState.calculationInputs.whtValue,
      })
      setDiscountType(legacyCalculationState.calculationInputs.discountType as DiscountType)
      setDiscountTiming(legacyCalculationState.calculationInputs.discountTiming as DiscountTiming)
      setWhtType(legacyCalculationState.calculationInputs.whtType as WhtType)

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
        .filter(Boolean) as InvoiceGroup[]

      setGroups(discoveredGroups)
      setLoading(false)
    }

    void load()
  }, [id, navigate, setColumns])

  const updateInvoice = (field: string, value: any) => setInvoice((current) => {
    if (!current) return null
    if (current[field] === value) return current
    return { ...current, [field]: value }
  })

  const updateItem = (index: number, field: string, value: any) =>
    setItems((current) => {
      const target = current[index]
      if (!target) return current
      if (field === '__install_rate_override' && value && typeof value === 'object') {
        const keys = Object.keys(value) as string[]
        if (keys.length > 0 && keys.every((k) => target[k] === value[k])) return current
        return current.map((item, itemIndex) => itemIndex !== index ? item : { ...item, ...value })
      }
      const resolved = field === 'quantity' ? normalizeQuantity(value, 1) : value
      if (target[field] === resolved) return current
      return current.map((item, itemIndex) => itemIndex !== index ? item : { ...item, [field]: resolved })
    })

  const resetItemOverrides = (fields: { vat?: boolean; discount?: boolean; install?: boolean }) =>
    setItems((current) =>
      current.map((item) => {
        if (item.row_type !== 'standard') return item
        const patch: Partial<InvoiceItem> = {}
        if (fields.vat)      patch.vat_rate = null
        if (fields.discount) patch.discount_rate = null
        if (fields.install)  {
          patch.install_rate = null
          // @ts-ignore - install_rate_override is a UI-only field often used in this codebase
          patch.install_rate_override = false
        }
        return { ...item, ...patch }
      }),
    )

  const addUngroupedItem = (insertAt: number | null = null, groupId: string | null = null, groupName = '') => {
    setItems((current) => {
      const newItem: InvoiceItem = { ...makeEmptyItem(), row_type: 'standard', group_id: groupId, group_name: groupName }
      if (insertAt === null || insertAt >= current.length) {
        return [...current, { ...newItem, sort_order: current.length }]
      }
      const before = current.slice(0, insertAt)
      const inserted = { ...newItem, sort_order: insertAt }
      const after = current.slice(insertAt).map((item, i) => ({ ...item, sort_order: insertAt + 1 + i }))
      return [...before, inserted, ...after]
    })
  }

  const addItem = () => addUngroupedItem()
  const removeItem = (index: number) =>
    setItems((current) => {
      if (index < 0 || index >= current.length) return current
      const before = current.slice(0, index)
      const after = current.slice(index + 1).map((item, i) => ({ ...item, sort_order: before.length + i }))
      return [...before, ...after]
    })
  const insertItemAfter = (index: number) => {
    const item = itemsRef.current[index]
    addUngroupedItem(index + 1, item?.group_id || null, item?.group_name || '')
  }
  const moveItem = (index: number, direction: number) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    setItems((current) => {
      const rows = [...current]
      const moving = rows[index]
      const anchor = rows[nextIndex]
      if (!moving || !anchor) return current

      if (moving.row_type === 'group_header') {
        const blockEnd = (() => {
          let end = index
          for (let cursor = index + 1; cursor < rows.length; cursor += 1) {
            if (rows[cursor].row_type === 'group_header') break
            if (rows[cursor].group_id === moving.group_id) end = cursor
          }
          return end
        })()
        const block = rows.splice(index, blockEnd - index + 1)
        const insertAt = direction < 0
          ? (() => {
              if (rows.length === 0) return 0
              for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
                if (rows[cursor].row_type === 'group_header') {
                  let prevEnd = cursor
                  for (let sub = cursor + 1; sub < rows.length; sub += 1) {
                    if (rows[sub].row_type === 'group_header') break
                    if (rows[sub].group_id === rows[cursor].group_id) prevEnd = sub
                  }
                  return prevEnd + 1
                }
              }
              return 0
            })()
          : (() => {
              for (let cursor = index; cursor < rows.length; cursor += 1) {
                if (rows[cursor].row_type === 'group_header') {
                  let end = cursor
                  for (let sub = cursor + 1; sub < rows.length; sub += 1) {
                    if (rows[sub].row_type === 'group_header') break
                    if (rows[sub].group_id === rows[cursor].group_id) end = sub
                  }
                  return end + 1
                }
              }
              return rows.length
            })()
        rows.splice(insertAt, 0, ...block)
        return rows.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
      }

      if (moving.row_type === 'standard') {
        const remainder = rows.filter((_, i) => i !== index)
        const targetGroupId =
          direction < 0
            ? anchor.row_type === 'group_header'
              ? anchor.group_id
              : anchor.group_id
            : anchor.row_type === 'group_header'
              ? null
              : anchor.group_id
        const targetGroupName = targetGroupId
          ? groups.find((g) => g.id === targetGroupId)?.name || ''
          : ''
        const insertPos =
          direction < 0 && anchor.row_type === 'group_header'
            ? remainder.findIndex((r) => r === anchor) + 1
            : remainder.findIndex((r) => r === anchor)

        const moved = {
          ...moving,
          group_id: targetGroupId || null,
          group_name: targetGroupName,
        }
        remainder.splice(insertPos, 0, moved)
        return remainder.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
      }

      return current
    })
  }

  const addGroup = () => {
    const baseGroup = makeEmptyGroup()
    const group: InvoiceGroup = {
      ...baseGroup,
      name: baseGroup.name || `Group ${groups.length + 1}`,
      showSubtotal: !!baseGroup.showSubtotal,
    }

    setGroups((current) => [...current, group])
    setItems((current) => [
      ...current,
      {
        ...makeEmptyItem(),
        row_type: 'group_header',
        group_id: group.id,
        group_name: group.name,
        sort_order: current.length,
      } as InvoiceItem,
    ])
  }

  const updateGroupName = (groupId: string, name: string) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, name } : group)))
    setItems((current) => {
      if (!current.some((item) => item.group_id === groupId)) return current
      return current.map((item) => (item.group_id === groupId ? { ...item, group_name: name } : item))
    })
  }

  const toggleGroupSubtotal = (groupId: string) =>
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group)))

  const deleteGroup = (groupId: string) => {
    setGroups((current) => current.filter((group) => group.id !== groupId))
    setItems((current) =>
      current
        .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
        .map((item, itemIndex) =>
          item.group_id === groupId
            ? { ...item, group_id: null, group_name: '', sort_order: itemIndex }
            : { ...item, sort_order: itemIndex },
        ),
    )
  }

  const addItemToGroup = (groupId: string) => {
    const group = groups.find((entry) => entry.id === groupId)
    if (!group) return

    setItems((current) => {
      let insertAt = current.findIndex((item) => item.row_type === 'group_header' && item.group_id === groupId)
      if (insertAt === -1) insertAt = current.length - 1

      for (let index = insertAt + 1; index < current.length; index += 1) {
        if (current[index].row_type === 'group_header') break
        if (current[index].group_id === groupId) insertAt = index
      }

      const newItem: InvoiceItem = {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: groupId,
        group_name: group.name,
      }

      const next = [...current]
      next.splice(insertAt + 1, 0, newItem)
      return next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
    })
  }

  const handleImportApply = (result: any) => {
    invoiceImportAdapter.applyResult({
      result,
      setColumns,
      setItems,
      updateTopLevelField: (field: string, value: any) => {
        if (field === 'title') setInvoiceTitle(value)
        else updateInvoice(field, value)
      },
      setExtraCharges,
      setGroups,
    })
  }

  const handleClearAll = () => {
    setItems([{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' } as InvoiceItem])
    setGroups([])
  }

  const calculationInputs = useMemo(
    () => buildCalculationInputs({ invoice, discountType, discountTiming, whtType }),
    [invoice?.vat, invoice?.discount, invoice?.wht, discountType, discountTiming, whtType],
  )
  const documentTotals = useMemo(() => {
    return computeDocument({
      items,
      columns,
      document: {
        ...invoice,
        workmanship: Number(invoice.workmanship || 0),
        transportation: Number(invoice.transportation || 0),
        shipping: Number(invoice.shipping || 0),
      },
      cf: {
        extraCharges,
        calculationInputs,
      },
    })
  }, [items, columns, extraCharges, calculationInputs, invoice])

  if (loading || !invoice) {
    return (
      <Layout title="Edit Invoice" hidePageHeader>
        <div className="w-full px-4 py-6 pb-24 text-sm text-muted-foreground sm:px-6 md:mx-auto md:max-w-2xl md:pb-12 lg:px-8">
          Loading invoice...
        </div>
      </Layout>
    )
  }

  const handleSave = async (status: string) => {
    if (!invoice.client_id) {
      feedback.error('Validation Error', { description: 'Pick a client before saving' })
      return
    }

    const standardItems = items.filter((item) => item.row_type === 'standard')
    const hasMeaningfulItem = standardItems.some((item) => item.description?.trim())

    if (!hasMeaningfulItem) {
      feedback.error('Validation Error', { description: 'Add at least one item before saving' })
      return
    }

    if (standardItems.some((item) => !item.description?.trim())) {
      feedback.error('Validation Error', { description: 'Each item needs a description' })
      return
    }

    setSaving(true)
    const timer = createSaveTimer('invoice-save-total', { mode: 'edit', status, invoiceId: id || null })

    const buildCustomFieldsStart = timer.phaseStart('build-custom-fields')
    const groupMeta: Record<string, { name?: string; showSubtotal?: boolean }> = {}
    groups.forEach((group) => {
      if (group.id) {
        groupMeta[group.id] = { name: group.name, showSubtotal: group.showSubtotal }
      }
    })
    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms
    const sanitizedBaseCustomFields = { ...baseCustomFields }
    delete sanitizedBaseCustomFields.bottom

    const customFieldsData: InvoiceCustomFields = {
      ...sanitizedBaseCustomFields,
      header: customFields.filter((field) => field.label && field.value) as any[],
      additionalFields: filterPopulatedAdditionalFields(additionalFields),
      extraCharges: extraCharges.filter((charge) => charge.label),
      chargeLabels,
      columnConfig: columns,
      notesTitle,
      termsTitle,
      attachments,
      mergeQtyUnit,
      showItemImages: items.some((item) => item.row_type === 'standard' && item.image_url),
      discountType,
      discountTiming,
      whtType,
      calculationInputs,
      groupMeta,
      signatoryId,
      pdfOutput,
    }
    const customFieldsJson = JSON.stringify(customFieldsData)
    timer.phaseEnd('build-custom-fields', buildCustomFieldsStart, {
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      attachmentsCount: attachments.length,
      headerFieldCount: customFields.length,
      additionalFieldCount: additionalFields.length,
      extraChargeCount: extraCharges.length,
      columnCount: columns.length,
      groupCount: groups.length,
      pdfOutputBytes: getJsonSizeBytes(pdfOutput),
    })

    const buildPayloadStart = timer.phaseStart('build-payload')
    const notesChanged = invoice.notes !== initialInvoiceSnapshot?.notes
    const termsChanged = invoice.terms !== initialInvoiceSnapshot?.terms
    const normalizedNotes = notesChanged ? normalizeRichTextHtml(invoice.notes) : (initialInvoiceSnapshot?.notes ?? invoice.notes)
    const normalizedTerms = termsChanged ? normalizeRichTextHtml(invoice.terms) : (initialInvoiceSnapshot?.terms ?? invoice.terms)
    const updatedInvoice = {
      ...invoice,
      notes: normalizedNotes,
      terms: normalizedTerms,
      subtotal: documentTotals.subtotal,
      install_rate_total: documentTotals.installRateTotal,
      total: documentTotals.totalPayable,
    }
    const updatePayload: any = {
      po_number: String(invoice.po_number || '').trim() || null,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || null,
      status,
      payment_terms: paymentTermsValue,
      notes: normalizedNotes,
      terms: normalizedTerms,
      workmanship: Number(invoice.workmanship || 0),
      transportation: Number(invoice.transportation || 0),
      shipping: Number(invoice.shipping || 0),
      discount: documentTotals.discount,
      vat: documentTotals.vat,
      wht: documentTotals.wht,
      custom_fields: customFieldsJson,
      work_duration: invoice.work_duration,
      subtotal: documentTotals.subtotal,
      install_rate_total: documentTotals.installRateTotal,
      total: documentTotals.totalPayable,
      amount_in_words: numberToWords(documentTotals.totalPayable),
    }
    timer.phaseEnd('build-payload', buildPayloadStart, {
      documentTable: 'invoices',
      payloadBytes: getJsonSizeBytes(updatePayload),
      notesBytes: getJsonSizeBytes(normalizedNotes),
      termsBytes: getJsonSizeBytes(normalizedTerms),
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      notesNormalized: notesChanged,
      termsNormalized: termsChanged,
    })

    const saveDocumentRowStart = timer.phaseStart('save-document-row')
    const { error } = await (supabase
      .from('invoices') as any)
      .update(updatePayload)
      .eq('id', id)
    timer.phaseEnd('save-document-row', saveDocumentRowStart, {
      table: 'invoices',
      operation: 'update',
      supabaseCalls: 1,
    })

    if (error) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const itemsToSave = items
      .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
      .map((item, index) => toDbItem(item, id, index))

    const deleteExistingItemsStart = timer.phaseStart('delete-existing-items')
    const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
    timer.phaseEnd('delete-existing-items', deleteExistingItemsStart, {
      table: 'invoice_items',
      operation: 'delete-by-invoice_id',
      supabaseCalls: 1,
    })
    if (deleteError) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    if (itemsToSave.length > 0) {
      const insertItemsStart = timer.phaseStart('insert-items')
      const { error: insertError } = await supabase.from('invoice_items').insert(itemsToSave)
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'invoice_items',
        rowCount: itemsToSave.length,
        payloadBytes: getJsonSizeBytes(itemsToSave),
        supabaseCalls: 1,
      })
      if (insertError) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(insertError, { action: 'save' }),
        })
        setSaving(false)
        return
      }
    } else {
      const insertItemsStart = timer.phaseStart('insert-items')
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'invoice_items',
        rowCount: 0,
        skipped: true,
        supabaseCalls: 0,
      })
    }

    const saveAuditLogStart = timer.phaseStart('save-audit-log')
    try {
      const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import('@/lib/audit')
      timer.phaseEnd('post-save-refetch', null, { skipped: true, reason: 'no refetch — use merged snapshot' })
      await recordAuditLog({
        entityType: 'invoice',
        recordId: id || '',
        entityLabel: initialInvoiceSnapshot?.invoice_number || null,
        action: 'UPDATE',
        oldData: initialInvoiceSnapshot,
        newData: updatedInvoice,
        trackedFields: INVOICE_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
    timer.phaseEnd('save-audit-log', saveAuditLogStart, {
      tables: ['audit_logs'],
      rpcCalls: 1,
      includesAuthLookup: true,
    })

    setSaving(false)
    const navigationAfterSaveStart = timer.phaseStart('navigation-after-save')
    navigate('/invoices/' + id)
    timer.phaseEnd('navigation-after-save', navigationAfterSaveStart, {
      target: '/invoices/' + id,
    })
    timer.finish({
      supabaseCalls: itemsToSave.length > 0 ? 5 : 4,
      itemRowCount: itemsToSave.length,
    })
  }

  return (
    <Layout title="Edit Invoice" hidePageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        <SharedDocumentForm
          title="Edit Invoice"
          modeLabel="Edit Invoice"
          invoice={invoice}
          invoiceTitle={invoiceTitle}
          setInvoiceTitle={setInvoiceTitle}
          updateInvoice={updateInvoice}
          items={items}
          groups={groups}
          customFields={customFields}
          additionalFields={additionalFields}
          extraCharges={extraCharges}
          chargeLabels={chargeLabels}
          notesTitle={notesTitle}
          setNotesTitle={setNotesTitle}
          termsTitle={termsTitle}
          setTermsTitle={setTermsTitle}
          attachments={attachments}
          setAttachments={setAttachments}
          signatories={signatories}
          signatoryId={signatoryId}
          onSignatoryChange={setSignatoryId}
          mergeQtyUnit={mergeQtyUnit}
          setMergeQtyUnit={setMergeQtyUnit}
          columns={columns}
          isVisible={isVisible}
          getColumn={getColumn}
          toggleVisible={toggleVisible}
          toggleDisabled={toggleDisabled}
          updateColumn={updateColumn}
          addCustomColumn={addCustomColumn}
          removeCustomColumn={removeCustomColumn}
          resetColumns={resetColumns}
          moveColumn={moveColumn}
          customColumns={customColumns}
          computedItems={documentTotals.items}
          computedGroups={documentTotals.groups}
          rawSubtotal={documentTotals.subtotal}
          installRateTotal={documentTotals.installRateTotal}
          vatAmount={documentTotals.vat}
          discountAmount={documentTotals.discount}
          grandTotal={documentTotals.grandTotal}
          whtAmount={documentTotals.wht}
          totalPayable={documentTotals.totalPayable}
          amountInWords={numberToWords(documentTotals.totalPayable)}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountTiming={discountTiming}
          setDiscountTiming={setDiscountTiming}
          whtType={whtType}
          setWhtType={setWhtType}
          saving={saving}
          primaryLabel="Save Changes"
          onSaveSent={() => handleSave('unpaid')}
          onSaveDraft={() => handleSave('unpaid')}
          onFloatingSave={() => handleSave('unpaid')}
          onCancel={() => navigate('/invoices/' + id)}
          onApplyImport={handleImportApply}
          importAdapter={invoiceImportAdapter}
          onAddItem={addItem}
          onAddGroup={addGroup}
          onAddItemToGroup={addItemToGroup}
          onUpdateItem={updateItem}
          onResetItemOverrides={resetItemOverrides}
          onRemoveItem={removeItem}
          onMoveItem={moveItem}
          onInsertItemAfter={insertItemAfter}
          onUpdateGroupName={updateGroupName}
          onToggleGroupSubtotal={toggleGroupSubtotal}
          onDeleteGroup={deleteGroup}
          onAddHeaderField={() => setCustomFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
          onUpdateHeaderField={(fieldId, field, value) =>
            setCustomFields((current) => current.map((entry) => (entry.id === fieldId ? { ...entry, [field]: value } : entry)))
          }
          onRemoveHeaderField={(fieldId) => setCustomFields((current) => current.filter((entry) => entry.id !== fieldId))}
          onAddAdditionalField={() => setAdditionalFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
          onUpdateAdditionalField={(fieldId, field, value) =>
            setAdditionalFields((current) =>
              current.map((entry) => (entry.id === fieldId ? { ...entry, [field]: value } : entry)),
            )
          }
          onRemoveAdditionalField={(fieldId) => setAdditionalFields((current) => current.filter((entry) => entry.id !== fieldId))}
          onChargeLabelChange={(key, value) => setChargeLabels((current) => ({ ...current, [key]: value }))}
          onAddExtraCharge={(withTax) => setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
          onUpdateExtraCharge={(chargeId, field, value) =>
            setExtraCharges((current) => current.map((charge) => (charge.id === chargeId ? { ...charge, [field]: value } : charge)))
          }
          onRemoveExtraCharge={(chargeId) => setExtraCharges((current) => current.filter((charge) => charge.id !== chargeId))}
          onClearAll={handleClearAll}
          showColumnManager={showColumnManager}
          setShowColumnManager={setShowColumnManager}
          isMobile={isMobile}
        />

        <div className="mx-auto w-full max-w-4xl px-0 pb-6 sm:px-2">
          <PdfOutputSettings
            value={pdfOutput}
            onChange={setPdfOutput}
            bankAccounts={bankAccounts.map((account) => ({
              id: account.id,
              bankName: account.bank_name || '',
              accountName: account.account_name || '',
              accountNumber: account.account_number || '',
              sortCode: account.sort_code || '',
              isDefault: !!account.is_default,
            }))}
            companyTagline={settingsData?.company_tagline || ''}
            footerText={settingsData?.footer_text || ''}
            showBalanceDueOption
          />
        </div>
      </div>
    </Layout>
  )
}
