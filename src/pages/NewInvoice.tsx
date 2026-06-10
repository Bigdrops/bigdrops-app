import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  normalizeAdditionalFieldEntries,
  invoiceImportAdapter,
  parseCustomFields,
  filterPopulatedAdditionalFields,
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
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeQuantity,
  toDbItem,
  useInvoiceColumns,
  buildCalculationInputs,
  ensureUiKey,
} from '../components/useInvoiceColumns'
import { computeDocument } from '../lib/Calculations'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { numberToWords } from '../hooks/useInvoiceForm'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { feedback } from '@/lib/feedback'
import { validateProjectAssignment } from '@/domain/projects'
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

interface LocationState {
  prefill?: any
  prefillItems?: any[]
  projectId?: string | number
  clientId?: string | number
  clientName?: string
}

export default function NewInvoice() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state as LocationState) || {}
  const prefill = routeState.prefill
  const prefillItems = routeState.prefillItems
  const { isMobile } = useLayoutMode()
  
  const projectPrefill = {
    projectId: String(routeState.projectId || prefill?.project_id || ''),
    clientId: String(routeState.clientId || prefill?.client_id || ''),
    clientName: String(routeState.clientName || prefill?.client_name || ''),
  }

  const [saving, setSaving] = useState(false)
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
  const [invoiceTitle, setInvoiceTitle] = useState(prefill?.invoice_title || '')

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

  const [invoice, setInvoice] = useState<InvoiceFormFields>(
    prefill
      ? { ...prefill }
      : {
          invoice_number: '',
          po_number: '',
          project_id: projectPrefill.projectId,
          client_id: '',
          client_name: '',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: '',
          status: 'unpaid',
          document_type: 'INVOICE',
          payment_terms: 'Custom',
          custom_payment_terms: '',
          notes: '',
          terms: '',
          workmanship: 0,
          transportation: 0,
          shipping: 0,
          discount: 0,
          vat: 7.5,
          wht: 0,
          work_duration: '',
          amount_in_words: '',
        },
  )

  const [items, setItems] = useState<InvoiceItem[]>(
    prefillItems
      ? prefillItems.map((item: any) => ({
          ...ensureUiKey(item),
          quantity: normalizeQuantity(item.quantity, 1),
          row_type: item.row_type || 'standard',
          group_id: item.group_id || null,
          group_name: item.group_name || '',
        }))
      : [{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' } as InvoiceItem],
  )
  const [groups, setGroups] = useState<InvoiceGroup[]>([])
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  const initialCustomFields = useMemo(() => parseCustomFields(prefill?.custom_fields), [prefill?.custom_fields])

  useEffect(() => {
    setAdditionalFields(normalizeAdditionalFieldEntries(initialCustomFields.additionalFields, initialCustomFields.bottom))
  }, [initialCustomFields])

  useEffect(() => {
    if (initialCustomFields?.discountType) setDiscountType(initialCustomFields.discountType as DiscountType)
    if (initialCustomFields?.discountTiming) setDiscountTiming(initialCustomFields.discountTiming as DiscountTiming)
    if (initialCustomFields?.whtType) setWhtType(initialCustomFields.whtType as WhtType)
  }, [initialCustomFields])

  useEffect(() => {
    if (!prefillItems || prefillItems.length === 0) return
    const seen = new Set<string>()
    const recovered: InvoiceGroup[] = []
    prefillItems.forEach((item: any) => {
      if (item.row_type === 'group_header' && item.group_id && !seen.has(item.group_id)) {
        seen.add(item.group_id)
        const meta = initialCustomFields?.groupMeta?.[item.group_id]
        recovered.push({
          id: item.group_id,
          name: meta?.name || item.group_name || `Group ${recovered.length + 1}`,
          showSubtotal: meta?.showSubtotal ?? false,
        })
      }
    })
    if (recovered.length > 0) setGroups(recovered)
  }, [prefillItems, initialCustomFields])

  useEffect(() => {
    if (!projectPrefill.projectId && !projectPrefill.clientId && !projectPrefill.clientName) return
    setInvoice((current) => ({
      ...current,
      project_id: current.project_id || projectPrefill.projectId || '',
      client_id: current.client_id || projectPrefill.clientId || '',
      client_name: current.client_name || projectPrefill.clientName || '',
    }))
  }, [projectPrefill.clientId, projectPrefill.clientName, projectPrefill.projectId])

  useEffect(() => {
    if (prefill) return

    supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const number = parseInt(String(data[0].invoice_number || '').replace('SASINV-B', ''), 10) + 1
          setInvoice((current) => ({
            ...current,
            invoice_number: 'SASINV-B' + String(number).padStart(3, '0'),
          }))
        } else {
          setInvoice((current) => ({ ...current, invoice_number: 'SASINV-B001' }))
        }
      })
  }, [prefill])

  useEffect(() => {
    const loadSignatories = async () => {
      const [signatoriesResult, bankAccountsResult, settingsResult] = await Promise.all([
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
      ])
      setSignatories(signatoriesResult.data || [])
      setBankAccounts(bankAccountsResult.data || [])
      setSettingsData(settingsResult.data || null)
    }

    void loadSignatories()
  }, [])

  useEffect(() => {
    setSignatoryId(getInvoiceSignatoryId(prefill?.custom_fields))
    setPdfOutput(getInvoicePdfOutput(prefill?.custom_fields))
  }, [prefill?.custom_fields])

  const updateInvoice = (field: string, value: any) => setInvoice((current) => ({ ...current, [field]: value }))

  const updateItem = (index: number, field: string, value: any) =>
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === '__install_rate_override' && value && typeof value === 'object') {
          return { ...item, ...value }
        }
        return { ...item, [field]: field === 'quantity' ? normalizeQuantity(value, 1) : value }
      }),
    )

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
      const next = [...current]
      next.splice(insertAt, 0, { ...newItem, sort_order: insertAt })
      return next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
    })
  }

  const addItem = () => addUngroupedItem()
  const removeItem = (index: number) =>
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex })))
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
              if (index === 0) return 0
              const remainder = rows
              for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
                if (remainder[cursor].row_type === 'group_header') return cursor
              }
              return index - 1 >= 0 ? index - 1 : 0
            })()
          : (() => {
              if (index >= rows.length) return rows.length
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
              return index + 1
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
      ...current.map((item, itemIndex) => ({ ...item, sort_order: itemIndex })),
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
    setItems((current) => current.map((item) => (item.group_id === groupId ? { ...item, group_name: name } : item)))
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

  const calculationInputs = buildCalculationInputs({ invoice, discountType, discountTiming, whtType })
  const documentTotals = computeDocument({
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

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(supabase as any, {
      projectId: invoice.project_id,
      documentClientId: invoice.client_id,
      documentClientName: invoice.client_name,
    })

    if (projectError) {
      feedback.error('Project link invalid', { description: projectError })
      return
    }

    setSaving(true)
    const timer = createSaveTimer('invoice-save-total', { mode: 'new', status })

    const buildCustomFieldsStart = timer.phaseStart('build-custom-fields')
    const groupMeta: Record<string, { name: string; showSubtotal: boolean }> = {}
    groups.forEach((group) => {
      groupMeta[group.id] = { name: group.name, showSubtotal: group.showSubtotal }
    })

    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms
    const sanitizedInitialCustomFields = { ...initialCustomFields }
    delete sanitizedInitialCustomFields.bottom

    const customFieldsData: InvoiceCustomFields = {
      ...sanitizedInitialCustomFields,
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
    const normalizedNotes = normalizeRichTextHtml(invoice.notes)
    const normalizedTerms = normalizeRichTextHtml(invoice.terms)
    const insertPayload: any = {
      invoice_number: invoice.invoice_number,
      po_number: String(invoice.po_number || '').trim() || null,
      invoice_title: invoiceTitle || null,
      project_id: validatedProject?.id || null,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || null,
      status,
      document_type: invoice.document_type,
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
      payloadBytes: getJsonSizeBytes(insertPayload),
      notesBytes: getJsonSizeBytes(normalizedNotes),
      termsBytes: getJsonSizeBytes(normalizedTerms),
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
    })

    const saveDocumentRowStart = timer.phaseStart('save-document-row')
    const { data: invoiceRow, error } = await (supabase
      .from('invoices') as any)
      .insert([insertPayload])
      .select()
      .single()
    timer.phaseEnd('save-document-row', saveDocumentRowStart, {
      table: 'invoices',
      operation: 'insert-select-single',
      supabaseCalls: 1,
    })

    if (error || !invoiceRow) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const itemsToSave = items
      .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
      .map((item, index) => toDbItem(item, invoiceRow.id, index))

    const deleteExistingItemsStart = timer.phaseStart('delete-existing-items')
    timer.phaseEnd('delete-existing-items', deleteExistingItemsStart, {
      table: 'invoice_items',
      skipped: true,
      supabaseCalls: 0,
      reason: 'new invoice save does not delete existing rows',
    })

    if (itemsToSave.length > 0) {
      const insertItemsStart = timer.phaseStart('insert-items')
      await supabase.from('invoice_items').insert(itemsToSave)
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'invoice_items',
        rowCount: itemsToSave.length,
        payloadBytes: getJsonSizeBytes(itemsToSave),
        supabaseCalls: 1,
      })
    } else {
      const insertItemsStart = timer.phaseStart('insert-items')
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'invoice_items',
        rowCount: 0,
        skipped: true,
        supabaseCalls: 0,
      })
    }

    // Audit Trail
    const postSaveRefetchStart = timer.phaseStart('post-save-refetch')
    timer.phaseEnd('post-save-refetch', postSaveRefetchStart, {
      skipped: true,
      supabaseCalls: 0,
      reason: 'new invoice save navigates without refetch',
    })

    const saveAuditLogStart = timer.phaseStart('save-audit-log')
    try {
      const { recordInvoiceCreated, recordAuditLog, INVOICE_TRACKED_FIELDS } = await import('@/lib/audit')
      await recordInvoiceCreated(invoiceRow.id)
      await recordAuditLog({
        entityType: 'invoice',
        recordId: invoiceRow.id,
        entityLabel: invoiceRow.invoice_number,
        action: 'CREATE',
        oldData: null,
        newData: invoiceRow,
        trackedFields: INVOICE_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
    timer.phaseEnd('save-audit-log', saveAuditLogStart, {
      tables: ['audit_logs'],
      rpcCalls: 2,
      includesAuthLookup: true,
    })

    setSaving(false)
    const navigationAfterSaveStart = timer.phaseStart('navigation-after-save')
    navigate('/invoices/' + invoiceRow.id)
    timer.phaseEnd('navigation-after-save', navigationAfterSaveStart, {
      target: '/invoices/' + invoiceRow.id,
    })
    timer.finish({
      supabaseCalls: itemsToSave.length > 0 ? 4 : 3,
      itemRowCount: itemsToSave.length,
    })
  }

  return (
    <Layout title="Create Invoice" hidePageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        <SharedDocumentForm
          title="Create Invoice"
          modeLabel="New Invoice"
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
          primaryLabel="Create Invoice"
          onSaveSent={() => handleSave('unpaid')}
          onSaveDraft={() => handleSave('unpaid')}
          onFloatingSave={() => handleSave('unpaid')}
          onCancel={() => navigate('/invoices')}
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
          onUpdateHeaderField={(id, field, value) =>
            setCustomFields((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
          }
          onRemoveHeaderField={(id) => setCustomFields((current) => current.filter((entry) => entry.id !== id))}
          onAddAdditionalField={() => setAdditionalFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
          onUpdateAdditionalField={(id, field, value) =>
            setAdditionalFields((current) =>
              current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
            )
          }
          onRemoveAdditionalField={(id) => setAdditionalFields((current) => current.filter((entry) => entry.id !== id))}
          onChargeLabelChange={(key, value) => setChargeLabels((current) => ({ ...current, [key]: value }))}
          onAddExtraCharge={(withTax) => setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
          onUpdateExtraCharge={(id, field, value) =>
            setExtraCharges((current) => current.map((charge) => (charge.id === id ? { ...charge, [field]: value } : charge)))
          }
          onRemoveExtraCharge={(id) => setExtraCharges((current) => extraCharges.filter((charge) => charge.id !== id))}
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
