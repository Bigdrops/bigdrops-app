import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import MobileInvoiceForm from '@/components/invoice/MobileInvoiceForm'
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

const invoicePageClassName = 'p-0 max-w-none'

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
  const [customFields, setCustomFields] = useState([])
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
      const { data } = await supabase.from('invoices').select('*').eq('id', id).single()
      if (!data) {
        navigate('/invoices')
        return
      }

      let savedGroupMeta = {}
      let parsedCustomFields = null

      try {
        const parsed = JSON.parse(data.custom_fields || '{}')
        parsedCustomFields = parsed
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
        custom_data: typeof item.custom_data === 'string' ? JSON.parse(item.custom_data || '{}') : item.custom_data || {},
        install_rate_override: !!(item.install_rate !== null && item.install_rate !== undefined && item.install_rate !== 0),
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

  const parseCsvItems = (text) => {
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length < 2) return { error: 'The CSV needs a header row and at least one item row.' }

    const headers = lines[0].split(',').map((header) => header.trim().toLowerCase().replace(/"/g, ''))
    const newItems = []

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const columnsInRow = lines[lineIndex].split(',').map((cell) => cell.trim().replace(/"/g, ''))
      if (!columnsInRow[0]) continue

      const row = {}
      headers.forEach((header, headerIndex) => {
        row[header] = columnsInRow[headerIndex] || ''
      })

      newItems.push({
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
        description: row.description || columnsInRow[0],
        sub_description: row.sub_description || '',
        make: row.make || '',
        quantity: Number(row.quantity || 1),
        unit: (row.unit || '').toUpperCase(),
        unit_price: Number(row.unit_price || 0),
        sort_order: newItems.length,
      })
    }

    if (!newItems.length) {
      return { error: 'No valid item rows were found. Check that the file contains description values under the CSV header.' }
    }

    return { newItems }
  }

  const handleCSVImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result || '')
      handleCSVTextImport(text)
    }

    reader.readAsText(file)
    event.target.value = ''
  }

  const handleCSVTextImport = (text) => {
    const { newItems, error } = parseCsvItems(text)
    if (error) {
      alert(error)
      return
    }

    setItems((current) => [...current.filter((item) => item.description || item.row_type === 'group_header'), ...newItems])
    alert(newItems.length + ' items imported')
  }

  if (loading || !invoice) {
    return (
      <Layout title="Edit Invoice" hidePageHeader contentClassName={invoicePageClassName}>
        <div className="mx-auto max-w-5xl px-3 pb-24 pt-4 text-sm text-zinc-500 sm:px-4 sm:pb-12 sm:pt-6">
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
    }

    const { error } = await supabase
      .from('invoices')
      .update({
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
      })
      .eq('id', id)

    if (error) {
      alert('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    const itemsToSave = items
      .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
      .map((item, index) => toDbItem(item, id, index))

    const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
    if (deleteError) {
      alert('Error clearing previous items: ' + deleteError.message)
      setSaving(false)
      return
    }

    if (itemsToSave.length > 0) {
      const { error: insertError } = await supabase.from('invoice_items').insert(itemsToSave)
      if (insertError) {
        alert('Error saving items: ' + insertError.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    navigate('/invoices/' + id)
  }

  return (
    <Layout title="Edit Invoice" hidePageHeader contentClassName={invoicePageClassName}>
      <MobileInvoiceForm
        title="Edit Invoice"
        modeLabel="Edit Invoice"
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
        primaryLabel="Save Changes"
        onSaveSent={() => handleSave('sent')}
        onSaveDraft={() => handleSave('draft')}
        onCancel={() => navigate('/invoices/' + id)}
        onImportFileChange={handleCSVImport}
        onImportText={handleCSVTextImport}
        onAddItem={addItem}
        onAddGroup={addGroup}
        onAddItemToGroup={addItemToGroup}
        onUpdateItem={updateItem}
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
        onAddBottomField={() => setBottomFields((current) => [...current, makeFieldEntry({ text: '' })])}
        onUpdateBottomField={(fieldId, value) =>
          setBottomFields((current) => current.map((entry) => (entry.id === fieldId ? { ...entry, text: value } : entry)))
        }
        onRemoveBottomField={(fieldId) => setBottomFields((current) => current.filter((entry) => entry.id !== fieldId))}
        onChargeLabelChange={(key, value) => setChargeLabels((current) => ({ ...current, [key]: value }))}
        onAddExtraCharge={(withTax) => setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
        onUpdateExtraCharge={(chargeId, field, value) =>
          setExtraCharges((current) => current.map((charge) => (charge.id === chargeId ? { ...charge, [field]: value } : charge)))
        }
        onRemoveExtraCharge={(chargeId) => setExtraCharges((current) => current.filter((charge) => charge.id !== chargeId))}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        isMobile={isMobile}
      />
    </Layout>
  )
}
