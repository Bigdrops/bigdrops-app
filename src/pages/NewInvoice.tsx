import { useEffect, useMemo, useState } from 'react'
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
import { toast } from '@/hooks/use-toast'
import { validateProjectAssignment } from '@/domain/projects'

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
  const [discountType, setDiscountType] = useState<DiscountType>('fixed')
  const [discountTiming, setDiscountTiming] = useState<DiscountTiming>('after')
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
  const initialCustomFields = useMemo(() => parseCustomFields(prefill?.custom_fields), [prefill?.custom_fields])

  useEffect(() => {
    setAdditionalFields(normalizeAdditionalFieldEntries(initialCustomFields.additionalFields, initialCustomFields.bottom))
  }, [initialCustomFields])

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
    const item = items[index]
    addUngroupedItem(index + 1, item?.group_id || null, item?.group_name || '')
  }
  const moveItem = (index: number, direction: number) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    setItems((current) => {
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
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
      updateTopLevelField: (field: string, value: any) => updateInvoice(field, value),
      setExtraCharges,
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
      toast({ title: 'Validation Error', description: 'Pick a client before saving', variant: 'destructive' })
      return
    }

    const standardItems = items.filter((item) => item.row_type === 'standard')
    const hasMeaningfulItem = standardItems.some((item) => item.description?.trim())

    if (!hasMeaningfulItem) {
      toast({ title: 'Validation Error', description: 'Add at least one item before saving', variant: 'destructive' })
      return
    }

    if (standardItems.some((item) => !item.description?.trim())) {
      toast({ title: 'Validation Error', description: 'Each item needs a description', variant: 'destructive' })
      return
    }

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(supabase as any, {
      projectId: invoice.project_id,
      documentClientId: invoice.client_id,
      documentClientName: invoice.client_name,
    })

    if (projectError) {
      toast({ title: 'Project link invalid', description: projectError, variant: 'destructive' })
      return
    }

    setSaving(true)

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
      notes: invoice.notes,
      terms: invoice.terms,
      workmanship: Number(invoice.workmanship || 0),
      transportation: Number(invoice.transportation || 0),
      shipping: Number(invoice.shipping || 0),
      discount: documentTotals.discount,
      vat: documentTotals.vat,
      wht: documentTotals.wht,
      custom_fields: JSON.stringify(customFieldsData),
      work_duration: invoice.work_duration,
      subtotal: documentTotals.subtotal,
      install_rate_total: documentTotals.installRateTotal,
      total: documentTotals.totalPayable,
      amount_in_words: numberToWords(documentTotals.totalPayable),
    }

    const { data: invoiceRow, error } = await (supabase
      .from('invoices') as any)
      .insert([insertPayload])
      .select()
      .single()

    if (error || !invoiceRow) {
      toast({
        title: 'Save failed',
        description: getUserFacingMutationMessage(error, { action: 'save' }),
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    const itemsToSave = items
      .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
      .map((item, index) => toDbItem(item, invoiceRow.id, index))

    if (itemsToSave.length > 0) {
      await supabase.from('invoice_items').insert(itemsToSave)
    }

    // Audit Trail
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

    setSaving(false)
    navigate('/invoices/' + invoiceRow.id)
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
