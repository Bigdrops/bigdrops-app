import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  toDbItem,
  useInvoiceColumns,
  buildCalculationInputs,
  ensureUiKey,
} from '../components/useInvoiceColumns.jsx'
import { computeDocument } from '../lib/Calculations'
import { numberToWords } from '../hooks/useInvoiceForm'

const invoicePageClassName = 'w-full p-0 max-w-none'

export default function NewInvoice() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const prefillItems = location.state?.prefillItems

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [saving, setSaving] = useState(false)
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

  const [invoice, setInvoice] = useState(
    prefill
      ? { ...prefill }
      : {
          invoice_number: '',
          po_number: '',
          client_id: '',
          client_name: '',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: '',
          status: 'draft',
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
          is_advance: false,
          advance_percentage: 0,
          work_duration: '',
          amount_in_words: '',
        },
  )

  const [items, setItems] = useState(
    prefillItems
      ? prefillItems.map((item) => ({
          ...ensureUiKey(item),
          row_type: item.row_type || 'standard',
          group_id: item.group_id || null,
          group_name: item.group_name || '',
        }))
      : [{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' }],
  )
  const [groups, setGroups] = useState([])
  const initialCustomFields = useMemo(() => parseCustomFields(prefill?.custom_fields), [prefill?.custom_fields])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const updateInvoice = (field, value) => setInvoice((current) => ({ ...current, [field]: value }))

  const updateItem = (index, field, value) =>
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
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex })))
  const insertItemAfter = (index) => addUngroupedItem(index + 1)
  const moveItem = (index, direction) => {
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
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, name } : group)))
    setItems((current) => current.map((item) => (item.group_id === groupId ? { ...item, group_name: name } : item)))
  }

  const toggleGroupSubtotal = (groupId) =>
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group)))

  const deleteGroup = (groupId) => {
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
    invoiceImportAdapter.applyResult({
      result,
      setColumns,
      setItems,
      updateTopLevelField: (field, value) => updateInvoice(field, value),
      setExtraCharges,
    })
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
      ...initialCustomFields,
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

    const { data: invoiceRow, error } = await supabase
      .from('invoices')
      .insert([
        {
          invoice_number: invoice.invoice_number,
          po_number: String(invoice.po_number || '').trim() || null,
          invoice_title: invoiceTitle || null,
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
        },
      ])
      .select()
      .single()

    if (error) {
      alert('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    const itemsToSave = items
      .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
      .map((item, index) => toDbItem(item, invoiceRow.id, index))

    if (itemsToSave.length > 0) {
      await supabase.from('invoice_items').insert(itemsToSave)
    }

    setSaving(false)
    navigate('/invoices/' + invoiceRow.id)
  }

  return (
    <Layout title="Create Invoice" hidePageHeader contentClassName={invoicePageClassName}>
      <MobileInvoiceForm
        title="Create Invoice"
        modeLabel="New Invoice"
        invoice={invoice}
        invoiceTitle={invoiceTitle}
        setInvoiceTitle={setInvoiceTitle}
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
        afterSignatorySlot={
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
          />
        }
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
        primaryLabel="Save & Send"
        onSaveSent={() => handleSave('sent')}
        onSaveDraft={() => handleSave('draft')}
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
        onAddBottomField={() => setBottomFields((current) => [...current, makeFieldEntry({ text: '' })])}
        onUpdateBottomField={(id, value) =>
          setBottomFields((current) => current.map((entry) => (entry.id === id ? { ...entry, text: value } : entry)))
        }
        onRemoveBottomField={(id) => setBottomFields((current) => current.filter((entry) => entry.id !== id))}
        onChargeLabelChange={(key, value) => setChargeLabels((current) => ({ ...current, [key]: value }))}
        onAddExtraCharge={(withTax) => setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
        onUpdateExtraCharge={(id, field, value) =>
          setExtraCharges((current) => current.map((charge) => (charge.id === id ? { ...charge, [field]: value } : charge)))
        }
        onRemoveExtraCharge={(id) => setExtraCharges((current) => current.filter((charge) => charge.id !== id))}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        isMobile={isMobile}
      />
    </Layout>
  )
}
