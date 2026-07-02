import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ExtraCharge,
  InvoiceAttachment,
  InvoiceFieldEntry,
  InvoiceItem,
  InvoicePdfOutput,
  DiscountType,
  DiscountTiming,
  WhtType,
} from '@/domain/invoice'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  ensureUiKey,
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeQuantity,
  syncGroupsFromItems,
} from '@/domain/invoice'

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

interface UseInvoiceEditableStateOptions {
  mode: 'create' | 'edit'
  prefill?: any
  prefillItems?: any[]
  projectPrefill?: {
    projectId: string
    clientId: string
    clientName: string
  }
}

export function useInvoiceEditableState({
  mode,
  prefill,
  prefillItems,
  projectPrefill,
}: UseInvoiceEditableStateOptions) {
  const isCreate = mode === 'create'

  const [invoice, setInvoice] = useState<InvoiceFormFields | null>(
    isCreate
      ? (prefill
          ? { ...prefill }
          : {
              invoice_number: '',
              po_number: '',
              project_id: projectPrefill?.projectId || '',
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
            })
      : null,
  )

  const [items, setItems] = useState<InvoiceItem[]>(
    isCreate && prefillItems
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
  useEffect(() => { setGroups((current) => syncGroupsFromItems(items, current)) }, [items, setGroups])

  const [customFields, setCustomFields] = useState<InvoiceFieldEntry[]>([])
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
  const [invoiceTitle, setInvoiceTitle] = useState(isCreate ? (prefill?.invoice_title || '') : '')
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([])
  const [signatoryId, setSignatoryId] = useState<string | null>(null)
  const [pdfOutput, setPdfOutput] = useState<InvoicePdfOutput>(DEFAULT_INVOICE_PDF_OUTPUT)
  const [discountType, setDiscountType] = useState<DiscountType>('percent')
  const [discountTiming, setDiscountTiming] = useState<DiscountTiming>('before')
  const [whtType, setWhtType] = useState<WhtType>('percent')

  const updateInvoice = useCallback((field: string, value: any) => setInvoice((current) => {
    if (!current) return null
    if (current[field] === value) return current
    return { ...current, [field]: value }
  }), [])

  const updateItem = useCallback((index: number, field: string, value: any) =>
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
    }), [])

  const resetItemOverrides = useCallback((fields: { vat?: boolean; discount?: boolean; install?: boolean }) =>
    setItems((current) =>
      current.map((item) => {
        if (item.row_type !== 'standard') return item
        const patch: Partial<InvoiceItem> = {}
        if (fields.vat)      patch.vat_rate = null
        if (fields.discount) patch.discount_rate = null
        if (fields.install)  {
          patch.install_rate = null
          patch.install_rate_override = false
        }
        return { ...item, ...patch }
      }),
    ), [])

  const addUngroupedItem = useCallback((insertAt: number | null = null, groupId: string | null = null, groupName = '') => {
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
  }, [])

  const addItem = useCallback(() => addUngroupedItem(), [addUngroupedItem])

  const removeItem = useCallback((index: number) =>
    setItems((current) => {
      if (index < 0 || index >= current.length) return current
      const before = current.slice(0, index)
      const after = current.slice(index + 1).map((item, i) => ({ ...item, sort_order: before.length + i }))
      return [...before, ...after]
    }), [])

  const insertItemAfter = useCallback((index: number) => {
    const item = itemsRef.current[index]
    addUngroupedItem(index + 1, item?.group_id || null, item?.group_name || '')
  }, [addUngroupedItem])

  const moveItem = useCallback((index: number, direction: number) => {
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
  }, [groups, items.length])

  const addGroup = useCallback(() => {
    const baseGroup = makeEmptyGroup()
    setGroups((current) => {
      const group: InvoiceGroup = {
        ...baseGroup,
        name: baseGroup.name || `Group ${current.length + 1}`,
        showSubtotal: !!baseGroup.showSubtotal,
      }
      setItems((prev) => [
        ...prev,
        {
          ...makeEmptyItem(),
          row_type: 'group_header',
          group_id: group.id,
          group_name: group.name,
          sort_order: prev.length,
        } as InvoiceItem,
        {
          ...makeEmptyItem(),
          row_type: 'standard',
          group_id: group.id,
          group_name: group.name,
          sort_order: prev.length + 1,
        } as InvoiceItem,
      ])
      return [...current, group]
    })
  }, [])

  const updateGroupName = useCallback((groupId: string, name: string) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, name } : group)))
    setItems((current) => {
      if (!current.some((item) => item.group_id === groupId)) return current
      return current.map((item) => (item.group_id === groupId ? { ...item, group_name: name } : item))
    })
  }, [])

  const toggleGroupSubtotal = useCallback((groupId: string) =>
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group))), [])

  const deleteGroup = useCallback((groupId: string) => {
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
  }, [])

  const addItemToGroup = useCallback((groupId: string) => {
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
  }, [groups])

  const handleAddHeaderField = useCallback(() => setCustomFields((current) => [...current, makeFieldEntry({ label: '', value: '' })]), [])
  const handleUpdateHeaderField = useCallback((fieldId: string | number, field: string, value: any) =>
    setCustomFields((current) => current.map((entry) => (entry.id === fieldId ? { ...entry, [field]: value } : entry))), [])
  const handleRemoveHeaderField = useCallback((fieldId: string | number) =>
    setCustomFields((current) => current.filter((entry) => entry.id !== fieldId)), [])

  const handleAddAdditionalField = useCallback(() =>
    setAdditionalFields((current) => [...current, makeFieldEntry({ label: '', value: '' })]), [])
  const handleUpdateAdditionalField = useCallback((fieldId: string | number, field: string, value: any) =>
    setAdditionalFields((current) => current.map((entry) => (entry.id === fieldId ? { ...entry, [field]: value } : entry))), [])
  const handleRemoveAdditionalField = useCallback((fieldId: string | number) =>
    setAdditionalFields((current) => current.filter((entry) => entry.id !== fieldId)), [])

  const handleChargeLabelChange = useCallback((key: string, value: string) =>
    setChargeLabels((current) => ({ ...current, [key]: value })), [])

  const handleAddExtraCharge = useCallback((withTax: boolean) =>
    setExtraCharges((current) => [...current, makeExtraCharge({ withTax })]), [])
  const handleUpdateExtraCharge = useCallback((chargeId: string | number, field: string, value: any) =>
    setExtraCharges((current) => current.map((charge) => (charge.id === chargeId ? { ...charge, [field]: value } : charge))), [])
  const handleRemoveExtraCharge = useCallback((chargeId: string | number) =>
    setExtraCharges((current) => current.filter((charge) => charge.id !== chargeId)), [])

  const handleClearAll = useCallback(() => {
    setItems([{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' } as InvoiceItem])
    setGroups([])
  }, [])

  return {
    invoice,
    setInvoice,
    items,
    setItems,
    groups,
    setGroups,
    itemsRef,
    customFields,
    setCustomFields,
    additionalFields,
    setAdditionalFields,
    extraCharges,
    setExtraCharges,
    chargeLabels,
    setChargeLabels,
    notesTitle,
    setNotesTitle,
    termsTitle,
    setTermsTitle,
    mergeQtyUnit,
    setMergeQtyUnit,
    invoiceTitle,
    setInvoiceTitle,
    attachments,
    setAttachments,
    signatoryId,
    setSignatoryId,
    pdfOutput,
    setPdfOutput,
    discountType,
    setDiscountType,
    discountTiming,
    setDiscountTiming,
    whtType,
    setWhtType,
    updateInvoice,
    updateItem,
    resetItemOverrides,
    addUngroupedItem,
    addItem,
    removeItem,
    insertItemAfter,
    moveItem,
    addGroup,
    updateGroupName,
    toggleGroupSubtotal,
    deleteGroup,
    addItemToGroup,
    handleAddHeaderField,
    handleUpdateHeaderField,
    handleRemoveHeaderField,
    handleAddAdditionalField,
    handleUpdateAdditionalField,
    handleRemoveAdditionalField,
    handleChargeLabelChange,
    handleAddExtraCharge,
    handleUpdateExtraCharge,
    handleRemoveExtraCharge,
    handleClearAll,
  }
}
