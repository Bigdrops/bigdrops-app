import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import MobileInvoiceForm from '@/components/invoice/MobileInvoiceForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  invoiceImportAdapter,
  parseCustomFields,
} from '@/domain/invoice'
import {
  BUILTIN_COLUMNS,
  buildCalculationInputs,
  ensureUiKey,
  inferLegacyCalculationState,
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeExtraCharges,
  normalizeFieldEntries,
  toDbItem,
  useInvoiceColumns,
} from '../components/useInvoiceColumns.jsx'
import { computeDocument } from '../lib/Calculations'
import { numberToWords } from '../hooks/useInvoiceForm'
import { toast } from '@/hooks/use-toast'
import { composeAdvanceInvoiceNumber, extractAdvanceSuffix } from '@/domain/invoice/advance'
import { Card, CardContent } from '@/components/ui/card'

export default function EditInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [discountType, setDiscountType] = useState('fixed')
  const [discountTiming, setDiscountTiming] = useState('after')
  const [whtType, setWhtType] = useState('percent')
  const [attachments, setAttachments] = useState([])
  const [signatories, setSignatories] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [settingsData, setSettingsData] = useState(null)
  const [customFields, setCustomFields] = useState([])
  const [signatoryId, setSignatoryId] = useState(null)
  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT)
  const [bottomFields, setBottomFields] = useState([])
  const [extraCharges, setExtraCharges] = useState([])
  const [chargeLabels, setChargeLabels] = useState({
    workmanship: 'Workmanship',
    transportation: 'Transportation',
    shipping: 'Shipping',
  })
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [baseCustomFields, setBaseCustomFields] = useState({})
  const [items, setItems] = useState([{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' }])
  const [groups, setGroups] = useState([])
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

      let savedGroupMeta = {}
      let parsedCustomFields = null

      try {
        const parsed = parseCustomFields(data.custom_fields)
        parsedCustomFields = parsed
        setBaseCustomFields(parsed)
        setSignatoryId(getInvoiceSignatoryId(parsed))
        setPdfOutput(getInvoicePdfOutput(parsed))
        if (parsed && !Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed.header, 'value'))
          setBottomFields(normalizeFieldEntries(parsed.bottom, 'text'))
          setExtraCharges(normalizeExtraCharges(parsed.extraCharges))
          if (parsed.chargeLabels) setChargeLabels(parsed.chargeLabels)
          if (parsed.columnConfig) {
            const merged = parsed.columnConfig.map((saved) => {
              const base = BUILTIN_COLUMNS.find((column) => column.key === saved.key)
              return base ? { ...base, ...saved } : saved
            })
            setColumns(merged)
          }
          if (parsed.notesTitle) setNotesTitle(parsed.notesTitle)
          if (parsed.termsTitle) setTermsTitle(parsed.termsTitle)
          if (parsed.attachments) setAttachments(parsed.attachments)
          if (parsed.mergeQtyUnit) setMergeQtyUnit(parsed.mergeQtyUnit)
          if (parsed.discountType) setDiscountType(parsed.discountType)
          if (parsed.discountTiming) setDiscountTiming(parsed.discountTiming)
          if (parsed.whtType) setWhtType(parsed.whtType)
          if (parsed.groupMeta) savedGroupMeta = parsed.groupMeta
        } else if (Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed, 'value'))
        }
      } catch {}

      if (data.invoice_title) setInvoiceTitle(data.invoice_title)

      const { data: itemRows } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
      const legacyCalculationState = inferLegacyCalculationState({
        invoice: data,
        items: itemRows || [],
        customFields: parsedCustomFields && !Array.isArray(parsedCustomFields) ? parsedCustomFields : {},
      })

      const loadedItems = (itemRows && itemRows.length > 0 ? itemRows : [makeEmptyItem()]).map((item) => ({
        ...ensureUiKey(item),
        row_type: item.row_type || 'standard',
        group_id: item.group_id || null,
        group_name: item.group_name || '',
        custom_data:
          typeof item.custom_data === 'string'
            ? JSON.parse(item.custom_data || '{}')
            : item.custom_data && typeof item.custom_data === 'object'
              ? item.custom_data
              : {},
        vat_rate: item.vat_rate === undefined ? null : item.vat_rate,
        discount_rate: item.discount_rate === undefined ? null : item.discount_rate,
        install_rate: item.install_rate === undefined ? null : item.install_rate,
        install_rate_override: item.install_rate_override === true,
        image_url: item.image_url || null,
      }))

      setItems(loadedItems)
      setInvoice({
        ...data,
        vat: legacyCalculationState.editableInputs.vatRate,
        discount: legacyCalculationState.editableInputs.discountValue,
        wht: legacyCalculationState.calculationInputs.whtValue,
      })
      setDiscountType(legacyCalculationState.calculationInputs.discountType)
      setDiscountTiming(legacyCalculationState.calculationInputs.discountTiming)
      setWhtType(legacyCalculationState.calculationInputs.whtType)

      const seenGroupIds = new Set()
      const discoveredGroups = loadedItems
        .filter((item) => item.row_type === 'group_header')
        .map((item, index) => {
          const groupId = item.group_id || `group_${index}`
          if (seenGroupIds.has(groupId)) return null
          seenGroupIds.add(groupId)
          const meta = savedGroupMeta[groupId] || savedGroupMeta[item.group_name] || {}
          return {
            id: groupId,
            name: item.group_name || `Group ${index + 1}`,
            showSubtotal: !!meta.showSubtotal,
          }
        })
        .filter(Boolean)

      setGroups(discoveredGroups)
      setLoading(false)
    }

    load()
  }, [id, navigate, setColumns])

  const advanceStage = baseCustomFields?.advanceStage && typeof baseCustomFields.advanceStage === 'object'
    ? baseCustomFields.advanceStage
    : null
  const sourceNumberPrefix = String(advanceStage?.sourceNumberPrefix || advanceStage?.sourceInvoiceNumber || '').trim()
  const isAdvanceChild = Boolean(invoice?.thread_role === 'advance' || advanceStage?.kind === 'advance')
  const isLockedField = (field) => isAdvanceChild && !['invoice_number', 'notes', 'terms', 'status'].includes(field)

  const updateInvoice = (field, value) => {
    if (isLockedField(field)) return
    setInvoice((current) => {
      if (!current) return current
      if (field === 'invoice_number' && isAdvanceChild && sourceNumberPrefix) {
        const raw = String(value || '').trim()
        const suffix = raw.startsWith(sourceNumberPrefix)
          ? extractAdvanceSuffix(raw, sourceNumberPrefix)
          : raw
        return { ...current, invoice_number: composeAdvanceInvoiceNumber(sourceNumberPrefix, suffix) }
      }
      return { ...current, [field]: value }
    })
  }

  const updateItem = (index, field, value) =>
    isAdvanceChild
      ? undefined
      :
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === '__install_rate_override' && value && typeof value === 'object') {
          return { ...item, ...value }
        }
        return { ...item, [field]: value }
      }),
    )

  const resetItemOverrides = (fields) =>
    isAdvanceChild
      ? undefined
      :
    setItems((current) =>
      current.map((item) => {
        if (item.row_type !== 'standard') return item
        const patch = {}
        if (fields.vat)      patch.vat_rate = null
        if (fields.discount) patch.discount_rate = null
        if (fields.install)  patch.install_rate = null, patch.install_rate_override = false
        return { ...item, ...patch }
      }),
    )

  const addUngroupedItem = (insertAt = null) => {
    if (isAdvanceChild) return
    setItems((current) => {
      const newItem = { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' }
      if (insertAt === null || insertAt >= current.length) {
        return [...current, { ...newItem, sort_order: current.length }]
      }
      const next = [...current]
      next.splice(insertAt, 0, { ...newItem, sort_order: insertAt })
      return next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
    })
  }

  const addItem = () => addUngroupedItem()
  const removeItem = (index) =>
    isAdvanceChild
      ? undefined
      :
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex })))
  const insertItemAfter = (index) => addUngroupedItem(index + 1)
  const moveItem = (index, direction) => {
    if (isAdvanceChild) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    setItems((current) => {
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex }))
    })
  }

  const addGroup = () => {
    if (isAdvanceChild) return
    const baseGroup = makeEmptyGroup()
    const group = {
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
      },
    ])
  }

  const updateGroupName = (groupId, name) => {
    if (isAdvanceChild) return
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, name } : group)))
    setItems((current) => current.map((item) => (item.group_id === groupId ? { ...item, group_name: name } : item)))
  }

  const toggleGroupSubtotal = (groupId) =>
    isAdvanceChild
      ? undefined
      :
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group)))

  const deleteGroup = (groupId) => {
    if (isAdvanceChild) return
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

  const addItemToGroup = (groupId) => {
    if (isAdvanceChild) return
    const group = groups.find((entry) => entry.id === groupId)
    if (!group) return

    setItems((current) => {
      let insertAt = current.findIndex((item) => item.row_type === 'group_header' && item.group_id === groupId)
      if (insertAt === -1) insertAt = current.length - 1

      for (let index = insertAt + 1; index < current.length; index += 1) {
        if (current[index].row_type === 'group_header') break
        if (current[index].group_id === groupId) insertAt = index
      }

      const newItem = {
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

  const handleImportApply = (result) => {
    if (isAdvanceChild) return
    invoiceImportAdapter.applyResult({
      result,
      setColumns,
      setItems,
      updateTopLevelField: (field, value) => updateInvoice(field, value),
      setExtraCharges,
    })
  }

  if (loading || !invoice) {
    return (
      <Layout title="Edit Invoice" hidePageHeader>
        <div className="w-full px-4 py-6 pb-24 text-sm text-muted-foreground sm:px-6 md:mx-auto md:max-w-2xl md:pb-12 lg:px-8">
          Loading invoice...
        </div>
      </Layout>
    )
  }

  const calculationInputs = buildCalculationInputs({ invoice, discountType, discountTiming, whtType })
  const documentTotals = computeDocument({
    items,
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

  const handleSave = async (status) => {
    setSaving(true)

    const groupMeta = {}
    groups.forEach((group) => {
      groupMeta[group.id] = { name: group.name, showSubtotal: group.showSubtotal }
    })

    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms
    const customFieldsData = {
      ...baseCustomFields,
      header: customFields.filter((field) => field.label && field.value),
      bottom: bottomFields.filter((field) => field.text),
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

    const updatePayload = isAdvanceChild
      ? {
          invoice_number: invoice.invoice_number,
          status,
          notes: invoice.notes,
          terms: invoice.terms,
          custom_fields: JSON.stringify(customFieldsData),
        }
      : {
          invoice_title: invoiceTitle || null,
          po_number: String(invoice.po_number || '').trim() || null,
          client_id: invoice.client_id || null,
          client_name: invoice.client_name,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date || null,
          status,
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

    const { error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      toast({ title: 'Save failed', description: 'Error saving: ' + error.message, variant: 'destructive' })
      setSaving(false)
      return
    }

    if (!isAdvanceChild) {
      const itemsToSave = items
        .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
        .map((item, index) => toDbItem(item, id, index))

      const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
      if (deleteError) {
        toast({ title: 'Save failed', description: 'Error clearing previous items: ' + deleteError.message, variant: 'destructive' })
        setSaving(false)
        return
      }

      if (itemsToSave.length > 0) {
        const { error: insertError } = await supabase.from('invoice_items').insert(itemsToSave)
        if (insertError) {
          toast({ title: 'Save failed', description: 'Error saving items: ' + insertError.message, variant: 'destructive' })
          setSaving(false)
          return
        }
      }
    }

    setSaving(false)
    navigate('/invoices/' + id)
  }

  return (
    <Layout title="Edit Invoice" hidePageHeader>
      <div className="space-y-6">
        {isAdvanceChild ? (
          <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-sm text-blue-900">
                Advance invoice mode: source/client/items/totals are locked. Notes, terms, signatory, links, and invoice suffix remain editable.
              </CardContent>
            </Card>
          </div>
        ) : null}
        <MobileInvoiceForm
          title={isAdvanceChild ? 'Edit Advance Invoice' : 'Edit Invoice'}
          modeLabel="Edit Invoice"
          invoice={invoice}
          invoiceTitle={invoiceTitle}
          setInvoiceTitle={(next) => {
            if (isAdvanceChild) return
            setInvoiceTitle(next)
          }}
          updateInvoice={updateInvoice}
          items={items}
          groups={groups}
          customFields={customFields}
          bottomFields={bottomFields}
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
          setMergeQtyUnit={(next) => { if (!isAdvanceChild) setMergeQtyUnit(next) }}
          columns={columns}
          isVisible={isVisible}
          getColumn={getColumn}
          toggleVisible={(...args) => { if (!isAdvanceChild) toggleVisible(...args) }}
          updateColumn={(...args) => { if (!isAdvanceChild) updateColumn(...args) }}
          addCustomColumn={(...args) => { if (!isAdvanceChild) addCustomColumn(...args) }}
          removeCustomColumn={(...args) => { if (!isAdvanceChild) removeCustomColumn(...args) }}
          resetColumns={() => { if (!isAdvanceChild) resetColumns() }}
          moveColumn={(...args) => { if (!isAdvanceChild) moveColumn(...args) }}
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
          setDiscountType={(next) => { if (!isAdvanceChild) setDiscountType(next) }}
          discountTiming={discountTiming}
          setDiscountTiming={(next) => { if (!isAdvanceChild) setDiscountTiming(next) }}
          whtType={whtType}
          setWhtType={(next) => { if (!isAdvanceChild) setWhtType(next) }}
          saving={saving}
          primaryLabel="Save Changes"
          onSaveSent={() => handleSave('sent')}
          onSaveDraft={() => handleSave('draft')}
          onFloatingSave={() => handleSave('draft')}
          onCancel={() => navigate('/invoices/' + id)}
          onApplyImport={isAdvanceChild ? () => {} : handleImportApply}
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
          onAddHeaderField={() => {
            if (isAdvanceChild) return
            setCustomFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])
          }}
          onUpdateHeaderField={(fieldId, field, value) =>
            !isAdvanceChild && setCustomFields((current) => current.map((entry) => (entry.id === fieldId ? { ...entry, [field]: value } : entry)))
          }
          onRemoveHeaderField={(fieldId) => !isAdvanceChild && setCustomFields((current) => current.filter((entry) => entry.id !== fieldId))}
          onAddBottomField={() => setBottomFields((current) => [...current, makeFieldEntry({ text: '' })])}
          onUpdateBottomField={(fieldId, value) =>
            setBottomFields((current) => current.map((entry) => (entry.id === fieldId ? { ...entry, text: value } : entry)))
          }
          onRemoveBottomField={(fieldId) => setBottomFields((current) => current.filter((entry) => entry.id !== fieldId))}
          onChargeLabelChange={(key, value) => !isAdvanceChild && setChargeLabels((current) => ({ ...current, [key]: value }))}
          onAddExtraCharge={(withTax) => !isAdvanceChild && setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
          onUpdateExtraCharge={(chargeId, field, value) =>
            !isAdvanceChild && setExtraCharges((current) => current.map((charge) => (charge.id === chargeId ? { ...charge, [field]: value } : charge)))
          }
          onRemoveExtraCharge={(chargeId) => !isAdvanceChild && setExtraCharges((current) => current.filter((charge) => charge.id !== chargeId))}
          showColumnManager={isAdvanceChild ? false : showColumnManager}
          setShowColumnManager={(open) => { if (!isAdvanceChild) setShowColumnManager(open) }}
          isMobile={isMobile}
        />

        <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
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
