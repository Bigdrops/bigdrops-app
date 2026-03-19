import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import ClientSelector from '@/components/ClientSelector'
import ColumnManager from '@/components/ColumnManager'
import MobileItemCard from '@/components/MobileItemCard'
import UnitInput from '@/components/UnitInput'
import InvoiceFormActions from '@/components/invoice/InvoiceFormActions'
import InvoiceNotesTermsSection from '@/components/invoice/InvoiceNotesTermsSection'
import InvoiceCustomBottomFieldsSection from '@/components/invoice/InvoiceCustomBottomFieldsSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  buildCalculationInputs,
  inferLegacyCalculationState,
  makeEmptyItem,
  makeEmptyGroup,
  makeFieldEntry,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import { toDbItem } from '@/domain/invoice'
import { computeDocument } from '@/lib/Calculations'
import type { ColumnConfig, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import {
  buildQuotationFormState,
  getNextQuotationNumber,
  type DbQuotation,
  type DbQuotationItem,
  type Quotation,
} from '@/domain/quotation'
import { QUOTATION_STATUSES, formatQuotationStatus } from './quotationStatus'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function makeQuotationGroupId() {
  return `quo_group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toGroupMetaMap(groups: Array<{ id: string; name: string; showSubtotal?: boolean }>) {
  return Object.fromEntries(
    groups.map((group) => [group.id, { name: group.name, showSubtotal: !!group.showSubtotal }]),
  )
}

function normalizeQuotationGrouping(
  items: InvoiceItem[],
  groupMeta: Record<string, { name?: string; showSubtotal?: boolean }> = {},
) {
  const headerOrder: string[] = []
  const headerById = new Map<string, { id: string; name: string; showSubtotal: boolean }>()
  const rawToCanonical = new Map<string, string>()
  const seenCanonical = new Set<string>()

  items.forEach((item) => {
    if (item.row_type !== 'group_header') return
    const rawId = String(item.group_id || '').trim()
    let canonicalId =
      rawId && !seenCanonical.has(rawId) ? rawId : makeQuotationGroupId()

    while (seenCanonical.has(canonicalId)) {
      canonicalId = makeQuotationGroupId()
    }

    seenCanonical.add(canonicalId)
    if (rawId && !rawToCanonical.has(rawId)) rawToCanonical.set(rawId, canonicalId)

    const meta = (rawId && groupMeta[rawId]) || groupMeta[canonicalId] || {}
    const name =
      String(item.group_name || '').trim() ||
      String(meta.name || '').trim() ||
      `Group ${headerOrder.length + 1}`

    headerOrder.push(canonicalId)
    headerById.set(canonicalId, {
      id: canonicalId,
      name,
      showSubtotal: !!meta.showSubtotal,
    })
  })

  const normalizedItems = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      const rawId = String(item.group_id || '').trim()
      const canonicalId =
        (rawId && rawToCanonical.get(rawId)) ||
        headerOrder.find((groupId) => {
          const group = headerById.get(groupId)
          return group && group.name === item.group_name
        }) ||
        makeQuotationGroupId()
      const group = headerById.get(canonicalId) || {
        id: canonicalId,
        name: String(item.group_name || '').trim() || `Group ${index + 1}`,
        showSubtotal: false,
      }

      return {
        ...item,
        row_type: 'group_header' as const,
        group_id: canonicalId,
        group_name: group.name,
        sort_order: index,
      }
    }

    const rawId = String(item.group_id || '').trim()
    const canonicalId = rawId ? rawToCanonical.get(rawId) : null

    return {
      ...item,
      row_type: 'standard' as const,
      group_id: canonicalId || null,
      group_name: canonicalId ? item.group_name || '' : '',
      sort_order: index,
    }
  })

  return {
    items: normalizedItems,
    groups: headerOrder.map((groupId) => headerById.get(groupId)).filter(Boolean) as Array<{
      id: string
      name: string
      showSubtotal: boolean
    }>,
  }
}

function buildCustomFields({
  quotation,
  columns,
  headerFields,
  bottomFields,
  discountType,
  discountTiming,
  whtType,
  notesTitle,
  termsTitle,
  mergeQtyUnit,
  showItemImages,
  groups,
}: {
  quotation: Quotation
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  bottomFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
  groups: Array<{ id: string; name: string; showSubtotal?: boolean }>
}) {
  const groupMeta = toGroupMetaMap(groups)

  return {
    quotationTitle: quotation.quotation_title || '',
    clientName: quotation.client_name || '',
    notesHtml: quotation.notes || '',
    termsHtml: quotation.terms || '',
    header: headerFields.filter((field) => field.label && field.value),
    bottom: bottomFields.filter((field) => field.text),
    columnConfig: columns,
    notesTitle,
    termsTitle,
    mergeQtyUnit,
    showItemImages,
    discountType,
    discountTiming,
    whtType,
    groupMeta,
    calculationInputs: buildCalculationInputs({
      invoice: quotation,
      discountType,
      discountTiming,
      whtType,
    }),
  }
}

function toQuotationItem(item: InvoiceItem, quotationId: string, sortOrder: number) {
  const row = toDbItem(item, quotationId, sortOrder) as Record<string, unknown>
  delete row.invoice_id
  return { ...row, quotation_id: quotationId }
}

type QuotationGroupState = { id: string; name: string; showSubtotal: boolean }

export default function QuotationForm({ mode, quotationId }: { mode: 'new' | 'edit'; quotationId?: string }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [quotation, setQuotation] = useState<Quotation>({
    quotation_number: '',
    po_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'draft',
    quotation_title: '',
    notes: '',
    terms: '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
  })
  const [headerFields, setHeaderFields] = useState<InvoiceFieldEntry[]>([])
  const [bottomFields, setBottomFields] = useState<InvoiceFieldEntry[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [groups, setGroups] = useState<QuotationGroupState[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([
    { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' },
  ])
  const itemsRef = useRef(items)
  const groupsRef = useRef(groups)
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
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    const load = async () => {
      if (isEdit && quotationId) {
        const [{ data: quotationRow, error }, { data: itemRows }] = await Promise.all([
          supabase.from('quotations').select('*').eq('id', quotationId).single(),
          supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
        ])
        if (error || !quotationRow) {
          alert('Quotation not found.')
          navigate('/quotations')
          return
        }
        const state = buildQuotationFormState(
          quotationRow as DbQuotation,
          (itemRows || []) as DbQuotationItem[],
        )
        const normalizedGrouping = normalizeQuotationGrouping(
          state.items,
          state.quotation.custom_fields?.groupMeta || {},
        )
        setQuotation(state.quotation)
        setItems(normalizedGrouping.items)
        setColumns(state.columns)
        setHeaderFields(state.headerFields)
        setBottomFields(state.bottomFields)
        setDiscountType(state.discountType)
        setDiscountTiming(state.discountTiming)
        setWhtType(state.whtType)
        setNotesTitle(state.notesTitle)
        setTermsTitle(state.termsTitle)
        setMergeQtyUnit(state.mergeQtyUnit)
        setShowItemImages(state.showItemImages)
        setGroups(normalizedGrouping.groups)
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('quotations')
        .select('quotation_number')
        .order('created_at', { ascending: false })
      setQuotation((current) => ({
        ...current,
        quotation_number: getNextQuotationNumber((data || []) as Array<Pick<DbQuotation, 'quotation_number'>>),
      }))
      setGroups([])
    }
    load()
  }, [isEdit, navigate, quotationId, setColumns])

  const commitGrouping = (
    nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
    nextGroupsInput?:
      | QuotationGroupState[]
      | ((current: QuotationGroupState[]) => QuotationGroupState[]),
  ) => {
    const baseItems = itemsRef.current
    const baseGroups = groupsRef.current
    const nextItems =
      typeof nextItemsInput === 'function'
        ? nextItemsInput(baseItems)
        : nextItemsInput
    const nextGroups =
      typeof nextGroupsInput === 'function'
        ? nextGroupsInput(baseGroups)
        : nextGroupsInput ?? baseGroups

    const normalized = normalizeQuotationGrouping(nextItems, toGroupMetaMap(nextGroups))
    itemsRef.current = normalized.items
    groupsRef.current = normalized.groups
    setItems(normalized.items)
    setGroups(normalized.groups)
  }

  const updateQuotation = <K extends keyof Quotation>(field: K, value: Quotation[K]) =>
    setQuotation((current) => ({ ...current, [field]: value }))

  const updateItem = (index: number, field: string, value: unknown) =>
    commitGrouping((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === 'custom_data') return { ...item, custom_data: value as InvoiceItem['custom_data'] }
        return { ...item, [field]: value }
      }),
    )

  const applyRowPatch = (itemIndex: number, patch: Partial<InvoiceItem>) =>
    commitGrouping((current) =>
      current.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item)),
    )

  const updateInstallRateOverride = (itemIndex: number, rawValue: string) => {
    applyRowPatch(
      itemIndex,
      rawValue === ''
        ? { install_rate_override: false, install_rate: null }
        : { install_rate_override: true, install_rate: Number(rawValue) },
    )
  }

  const addUngroupedItem = (insertAt: number | null = null) => {
    commitGrouping((current) => {
      const newItem = {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
      }
      if (insertAt === null || insertAt >= current.length) {
        return [...current, { ...newItem, sort_order: current.length }]
      }
      const next = [...current]
      next.splice(insertAt, 0, { ...newItem, sort_order: insertAt })
      return next.map((item, index) => ({ ...item, sort_order: index }))
    })
  }

  const addQuotationItem = () => addUngroupedItem()

  const insertItemAfter = (index: number) => addUngroupedItem(index + 1)

  const addQuotationGroup = () => {
    const base = makeEmptyGroup()
    const groupId = base.id || makeQuotationGroupId()
    const group = {
      ...base,
      id: groupId,
      name: base.name || `Group ${groups.length + 1}`,
      showSubtotal: !!base.showSubtotal,
    }

    commitGrouping(
      (current) => [
        ...current.map((item, index) => ({ ...item, sort_order: index })),
        {
          ...makeEmptyItem(),
          row_type: 'group_header',
          group_id: group.id,
          group_name: group.name,
          description: '',
          sort_order: current.length,
        },
      ],
      (current) => [...current, group],
    )
  }

  const updateGroupName = (groupId: string, newName: string) => {
    commitGrouping((current) =>
      current.map((item) =>
        item.row_type === 'group_header' && item.group_id === groupId
          ? { ...item, group_name: newName }
          : item,
      ),
      (current) => current.map((group) => (group.id === groupId ? { ...group, name: newName } : group)),
    )
  }

  const toggleGroupSubtotal = (groupId: string) => {
    commitGrouping(
      (current) => current,
      (current) =>
        current.map((group) =>
          group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group,
        ),
    )
  }

  const deleteGroup = (groupId: string) => {
    commitGrouping((current) =>
      current
        .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
        .map((item, index) =>
          item.group_id === groupId
            ? { ...item, group_id: null, group_name: '', sort_order: index }
            : { ...item, sort_order: index },
        ),
      (current) => current.filter((group) => group.id !== groupId),
    )
  }

  const addItemToGroup = (groupId: string) => {
    const group = normalizedGroups.find((entry) => entry.id === groupId)
    if (!group) return

    commitGrouping((current) => {
      let insertAt = current.findIndex(
        (item) => item.row_type === 'group_header' && item.group_id === groupId,
      )

      if (insertAt === -1) insertAt = current.length - 1

      for (let index = insertAt + 1; index < current.length; index += 1) {
        if (current[index].row_type === 'group_header') break
        if (current[index].group_id === groupId) insertAt = index
      }

      const next = [...current]
      next.splice(insertAt + 1, 0, {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: groupId,
        group_name: '',
      })
      return next.map((item, index) => ({ ...item, sort_order: index }))
    })
  }

  const parseCsvItems = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      return { error: 'The CSV needs a header row and at least one item row.' }
    }

    const headers = lines[0]
      .split(',')
      .map((header) => header.trim().toLowerCase().replace(/"/g, ''))

    const newItems: InvoiceItem[] = []
    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(',').map((cell) => cell.trim().replace(/"/g, ''))
      if (!cols[0]) continue
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = cols[index] || ''
      })
      newItems.push({
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
        description: row.description || cols[0],
        sub_description: row.sub_description || '',
        make: row.make || '',
        quantity: Number(row.quantity || 1),
        unit: (row.unit || '').toUpperCase(),
        unit_price: Number(row.unit_price || 0),
        sort_order: newItems.length,
      })
    }

    if (!newItems.length) {
      return {
        error:
          'No valid item rows were found. Check that the file contains description values under the CSV header.',
      }
    }

    return { newItems }
  }

  const applyImportedItems = (newItems: InvoiceItem[]) => {
    commitGrouping((current) => [
      ...current.filter((item) => item.description?.trim() || item.row_type === 'group_header'),
      ...newItems,
    ])
    alert(`${newItems.length} items imported`)
    setShowCSVNote(false)
  }

  const handleCSVImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result || '')
      const { newItems, error } = parseCsvItems(text)
      if (error) {
        alert(error)
        return
      }

      applyImportedItems(newItems)
    }

    reader.readAsText(file)
    event.target.value = ''
  }

  const normalizedGroupMeta = useMemo(() => toGroupMetaMap(groups), [groups])
  const normalizedGrouping = useMemo(
    () => normalizeQuotationGrouping(items, normalizedGroupMeta),
    [items, normalizedGroupMeta],
  )
  const normalizedItems = normalizedGrouping.items
  const normalizedGroups = normalizedGrouping.groups

  const calculationInputs = useMemo(
    () =>
      buildCalculationInputs({
        invoice: quotation,
        discountType,
        discountTiming,
        whtType,
      }),
    [discountTiming, discountType, quotation, whtType],
  )

  const totals = useMemo(
    () =>
      computeDocument({
        items: normalizedItems,
        document: {
          ...quotation,
          workmanship: Number(quotation.workmanship || 0),
          transportation: Number(quotation.transportation || 0),
          shipping: Number(quotation.shipping || 0),
        },
        cf: {
          calculationInputs,
        },
      }),
    [calculationInputs, normalizedItems, quotation],
  )

  const computedGroups = useMemo(
    () => new Map(totals.groups.map((group) => [group.group_id, group])),
    [totals.groups],
  )

  const calculationState = useMemo(
    () =>
      inferLegacyCalculationState({
        invoice: quotation,
        items: normalizedItems,
        customFields: buildCustomFields({
          quotation,
          columns,
          headerFields,
          bottomFields,
          discountType,
          discountTiming,
          whtType,
          notesTitle,
          termsTitle,
          mergeQtyUnit,
          showItemImages,
          groups: normalizedGroups,
        }),
      }),
    [
      bottomFields,
      columns,
      discountTiming,
      discountType,
      headerFields,
      normalizedItems,
      mergeQtyUnit,
      notesTitle,
      quotation,
      showItemImages,
      termsTitle,
      whtType,
      normalizedGroups,
    ],
  )

  const handleSave = async (status: Quotation['status']) => {
    setSaving(true)
    const poNumber = String(quotation.po_number || '').trim()
    const payload = {
      quotation_number: quotation.quotation_number || '',
      po_number: poNumber || null,
      quotation_title: quotation.quotation_title || null,
      client_id: quotation.client_id || null,
      client_name: quotation.client_name || '',
      issue_date: quotation.issue_date || null,
      valid_until: quotation.valid_until || null,
      status: status || 'draft',
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      workmanship: Number(quotation.workmanship || 0),
      transportation: Number(quotation.transportation || 0),
      shipping: Number(quotation.shipping || 0),
      discount: totals.discount,
      vat: totals.vat,
      wht: totals.wht,
      subtotal: totals.subtotal,
      install_rate_total: totals.installRateTotal,
      total: totals.totalPayable,
      amount_in_words: quotation.amount_in_words || '',
      custom_fields: JSON.stringify(
        buildCustomFields({
          quotation,
          columns,
          headerFields,
          bottomFields,
          discountType,
          discountTiming,
          whtType,
          notesTitle,
          termsTitle,
          mergeQtyUnit,
          showItemImages,
          groups: normalizedGroups,
        }),
      ),
    }
    const quoteQuery =
      isEdit && quotationId
        ? supabase.from('quotations').update(payload).eq('id', quotationId).select().single()
        : supabase.from('quotations').insert([payload]).select().single()
    const { data: savedQuotation, error } = await quoteQuery
    if (error || !savedQuotation) {
      alert('Error saving quotation: ' + (error?.message || 'Unknown error'))
      setSaving(false)
      return
    }
    const resolvedId = String(savedQuotation.id)
    const itemRows = normalizedItems
      .filter((item) =>
        item.row_type === 'group_header'
          ? item.group_name?.trim()
          : item.description?.trim(),
      )
      .map((item, index) => toQuotationItem(item, resolvedId, index))
    const { error: deleteError } = await supabase.from('quotation_items').delete().eq('quotation_id', resolvedId)
    if (deleteError) {
      alert('Error clearing quotation items: ' + deleteError.message)
      setSaving(false)
      return
    }
    if (itemRows.length > 0) {
      const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
      if (itemError) {
        alert('Error saving quotation items: ' + itemError.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    navigate(`/quotations/${resolvedId}`)
  }

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Loading quotation...</div>
  }

  const visibleCustomColumns = customColumns.filter((column: ColumnConfig) => column.visible)
  const summaryHeaderFields = headerFields.filter((field) => field.label && field.value)
  const removeItemAt = (itemIndex: number) =>
    commitGrouping((current) =>
      current.filter((_, entryIndex) => entryIndex !== itemIndex).map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex })),
    )
  const moveItemBy = (itemIndex: number, direction: number) => {
    commitGrouping((current) => {
      const snapshot = normalizeQuotationGrouping(current, toGroupMetaMap(groupsRef.current))
      const rows = [...snapshot.items]
      const row = rows[itemIndex]
      if (!row) return rows

      const getGroupBlockEnd = (startIndex: number) => {
        let endIndex = startIndex
        for (let cursor = startIndex + 1; cursor < rows.length; cursor += 1) {
          if (rows[cursor].row_type === 'group_header') break
          if (rows[cursor].group_id === rows[startIndex].group_id) {
            endIndex = cursor
          }
        }
        return endIndex
      }

      const getBlockRange = (startIndex: number) => {
        const target = rows[startIndex]
        if (!target) return { start: startIndex, end: startIndex }
        if (target.row_type === 'group_header') {
          return { start: startIndex, end: getGroupBlockEnd(startIndex) }
        }
        return { start: startIndex, end: startIndex }
      }

      if (row.row_type === 'group_header') {
        const block = rows.slice(itemIndex, getGroupBlockEnd(itemIndex) + 1)
        const remainder = [...rows.slice(0, itemIndex), ...rows.slice(itemIndex + block.length)]
        let insertAt = itemIndex

        if (direction < 0) {
          if (itemIndex === 0) return rows
          const previousBlockStart = (() => {
            if (remainder[itemIndex - 1]?.row_type !== 'group_header') return itemIndex - 1
            for (let cursor = itemIndex - 1; cursor >= 0; cursor -= 1) {
              if (remainder[cursor].row_type === 'group_header') return cursor
            }
            return 0
          })()
          insertAt = previousBlockStart
        } else {
          const nextBlockStart = itemIndex
          if (nextBlockStart >= remainder.length) {
            insertAt = remainder.length
          } else {
            insertAt = getBlockRange(nextBlockStart).end + 1
          }
        }

        remainder.splice(insertAt, 0, ...block)
        return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
      }

      const nextIndex = itemIndex + direction
      if (nextIndex < 0 || nextIndex >= rows.length) return rows

      const moving = { ...row }
      const remainder = rows.filter((_, index) => index !== itemIndex)

      if (direction < 0) {
        const anchor = rows[nextIndex]
        if (!anchor) return rows
        if (anchor.row_type === 'group_header') {
          moving.group_id = anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex + 1, 0, moving)
        } else {
          moving.group_id = anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        }
      } else {
        const anchor = rows[nextIndex]
        if (!anchor) return rows
        if (anchor.row_type === 'group_header') {
          moving.group_id = null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        } else {
          moving.group_id = anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        }
      }

      return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
    })
  }

  const renderMobileRows = () => {
    let itemNumber = 0

    return normalizedItems.map((item, index) => {
      if (item.row_type === 'group_header') {
        const group = normalizedGroups.find((entry) => entry.id === item.group_id)
        if (!group) return null

        const groupItems = normalizedItems.filter((entry) => entry.row_type === 'standard' && entry.group_id === group.id)
        const groupSubtotal = computedGroups.get(group.id)?.subtotal || 0

        return (
          <div key={item._uiKey || item.id || `quotation_group_${index}`} className="overflow-hidden border border-slate-200 bg-[#f4f4f4] shadow-sm">
            <div className="border-l-[3px] border-l-[#0f62fe] px-3 py-3">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Group
              </div>
              <div className="flex items-start gap-3">
                <Input
                  value={group.name || item.group_name || ''}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  placeholder="Group name"
                  className="h-10 flex-1 border-slate-600 bg-slate-800 text-sm font-semibold text-white placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 rounded-none text-red-500 hover:bg-white hover:text-red-600"
                  onClick={() => deleteGroup(group.id)}
                >
                  x
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Group container
                </div>
                <Button type="button" size="sm" variant="ghost" className="h-8 rounded-none px-2 text-[11px] font-semibold text-[#0f62fe] hover:bg-blue-50" onClick={() => addItemToGroup(group.id)}>
                  Add item
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 rounded-none border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50" onClick={() => toggleGroupSubtotal(group.id)}>
                  {group.showSubtotal ? 'Hide Subtotal' : 'Show Subtotal'}
                </Button>
                {group.showSubtotal ? (
                  <span className="ml-auto text-xs font-semibold text-slate-700">
                    N{Number(groupSubtotal || 0).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 px-3 py-3">
              {groupItems.map((groupItem, groupIndex) => {
                itemNumber += 1
                const itemIndex = normalizedItems.indexOf(groupItem)

                return (
                  <MobileItemCard
                    key={groupItem._uiKey || groupItem.id || `quotation_group_item_${group.id}_${itemIndex}`}
                    item={groupItem}
                    index={itemIndex}
                    number={itemNumber}
                    isVisible={isVisible}
                    getColumn={getColumn}
                    customColumns={visibleCustomColumns}
                    showItemImages={showItemImages}
                    invoice={quotation}
                    computedAmount={totals.items[itemIndex]?.line_subtotal || 0}
                    showInsertBelow={false}
                    variant="quotation"
                    groupName={group.name || item.group_name || ''}
                    isFirst={groupIndex === 0}
                    isLast={groupIndex === groupItems.length - 1}
                    onUpdate={(itemIndex: number, field: string, value: unknown) => {
                      if (field === '__install_rate_override') {
                        applyRowPatch(itemIndex, value as Partial<InvoiceItem>)
                        return
                      }
                      updateItem(itemIndex, field, value)
                    }}
                    onRemove={removeItemAt}
                    onMoveUp={(itemIndex: number) => moveItemBy(itemIndex, -1)}
                    onMoveDown={(itemIndex: number) => moveItemBy(itemIndex, 1)}
                    onInsertBelow={() => addItemToGroup(group.id)}
                  />
                )
              })}

              <Button type="button" variant="outline" className="h-9 w-full rounded-none border-dashed border-slate-300 bg-white text-[11px] font-semibold text-[#0f62fe] hover:bg-blue-50" onClick={() => addItemToGroup(group.id)}>
                + Add item to {group.name || 'group'}
              </Button>
            </div>
          </div>
        )
      }

      if (item.row_type !== 'standard' || item.group_id) return null

      itemNumber += 1
      return (
        <MobileItemCard
          key={item._uiKey || item.id || `quotation_item_${index}`}
          item={item}
          index={index}
          number={itemNumber}
          isVisible={isVisible}
          getColumn={getColumn}
          customColumns={visibleCustomColumns}
          showItemImages={showItemImages}
          invoice={quotation}
          computedAmount={totals.items[index]?.line_subtotal || 0}
          showInsertBelow={false}
          variant="quotation"
          isFirst={itemNumber === 1}
          isLast={index === normalizedItems.length - 1}
          onUpdate={(itemIndex: number, field: string, value: unknown) => {
            if (field === '__install_rate_override') {
              applyRowPatch(itemIndex, value as Partial<InvoiceItem>)
              return
            }
            updateItem(itemIndex, field, value)
          }}
          onRemove={removeItemAt}
          onMoveUp={(itemIndex: number) => moveItemBy(itemIndex, -1)}
          onMoveDown={(itemIndex: number) => moveItemBy(itemIndex, 1)}
          onInsertBelow={(itemIndex: number) => insertItemAfter(itemIndex)}
        />
      )
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="m-0 text-[22px] font-semibold tracking-tight text-slate-900">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#0f62fe]">{formatQuotationStatus(quotation.status || 'draft')} quotation</p>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Use the existing grouping and totals engine, then save normally.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            id="quotation-csv-import"
            type="file"
            accept=".csv"
            hidden
            onChange={handleCSVImport}
          />
          <Button type="button" variant="outline" className="h-10 rounded-none border-slate-300 bg-white text-slate-700 w-full sm:w-auto" onClick={() => navigate('/quotations')}>Back to Quotations</Button>
        </div>
      </div>

      <Sheet open={showCSVNote} onOpenChange={setShowCSVNote}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={isMobile ? 'max-h-[88vh] rounded-t-3xl px-0' : 'w-full max-w-md px-0'}
        >
          <SheetHeader className="border-b border-slate-200 px-5 pb-4 pt-5">
            <SheetTitle className="text-base font-bold text-slate-900">Import quotation items</SheetTitle>
            <SheetDescription>
              Upload a CSV file or paste CSV text. Imported rows become editable quotation line items before you save.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-full flex-col overflow-hidden">
            <div className="overflow-y-auto px-5 py-4">
              <Tabs
                value={csvTab}
                onValueChange={setCSVTab}
                className="w-full"
              >
                <TabsList className="mb-4 grid h-auto w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <TabsTrigger value="Upload File">Upload File</TabsTrigger>
                  <TabsTrigger value="Paste Text">Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="Upload File" className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div><strong>Required:</strong> description</div>
                    <div><strong>Optional:</strong> sub_description, make, quantity, unit, unit_price</div>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => document.getElementById('quotation-csv-import')?.click()}
                  >
                    Choose CSV File
                  </Button>
                </TabsContent>

                <TabsContent value="Paste Text" className="space-y-4">
                  <div className="text-xs text-slate-500">
                    <div><strong>Required:</strong> description</div>
                    <div><strong>Optional:</strong> sub_description, make, quantity, unit, unit_price</div>
                  </div>
                  <Textarea
                    value={pasteCSV}
                    onChange={(event) => setPasteCSV(event.target.value)}
                    placeholder={'description,quantity,unit,unit_price\nCable tie,5,PCS,700'}
                    className="min-h-[180px] resize-y bg-white text-sm"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {csvTab === 'Paste Text' ? (
              <div className="border-t border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setPasteCSV('')}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!pasteCSV.trim()) {
                        alert('Paste CSV content before importing.')
                        return
                      }
                      const { newItems, error } = parseCsvItems(pasteCSV)
                      if (error) {
                        alert(error)
                        return
                      }
                      applyImportedItems(newItems)
                      setPasteCSV('')
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Import
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onUpdate={updateColumn}
          onToggle={toggleVisible}
          onAddCustom={addCustomColumn}
          onRemoveCustom={removeCustomColumn}
          onReset={resetColumns}
          onMove={moveColumn}
          onClose={() => setShowColumnManager(false)}
          vat={quotation.vat}
          setVat={(value: number) => updateQuotation('vat', value)}
          wht={quotation.wht}
          setWht={(value: number) => updateQuotation('wht', value)}
          whtType={whtType}
          setWhtType={setWhtType}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
        <div className="space-y-5">
          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Client Name</Label>
                <div className="mt-2">
                  <ClientSelector
                    clientId={quotation.client_id}
                    clientName={quotation.client_name}
                    isMobile={isMobile}
                    onClientChange={(clientId: string, clientName: string) => {
                      updateQuotation('client_id', clientId)
                      updateQuotation('client_name', clientName)
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Issue Date</Label>
                <Input className="mt-2 rounded-none border-slate-300 bg-[#f4f4f4]" type="date" value={quotation.issue_date || ''} onChange={(e) => updateQuotation('issue_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Valid Until</Label>
                <Input className="mt-2 rounded-none border-slate-300 bg-[#f4f4f4]" type="date" value={quotation.valid_until || ''} onChange={(e) => updateQuotation('valid_until', e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Quotation Number</Label>
                <Input className="mt-2 rounded-none border-slate-300 bg-[#f4f4f4]" value={quotation.quotation_number || ''} onChange={(e) => updateQuotation('quotation_number', e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">P.O. Number</Label>
                <Input className="mt-2 rounded-none border-slate-300 bg-[#f4f4f4]" value={quotation.po_number || ''} onChange={(e) => updateQuotation('po_number', e.target.value)} placeholder="Optional purchase order number" />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Status</Label>
                <Select value={quotation.status || 'draft'} onValueChange={(value) => updateQuotation('status', value as Quotation['status'])}>
                  <SelectTrigger className="mt-2 rounded-none border-slate-300 bg-[#f4f4f4]">
                    <SelectValue placeholder="Choose status" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatQuotationStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Scope Title</Label>
                <Input className="mt-2 rounded-none border-slate-300 bg-[#f4f4f4]" value={quotation.quotation_title || ''} onChange={(e) => updateQuotation('quotation_title', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Header Fields</CardTitle>
                <Button type="button" variant="ghost" className="h-auto p-0 text-sm font-bold text-indigo-500" onClick={() => setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}>+ Add Header Field</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {headerFields.length === 0 && <div className="text-sm italic text-slate-400">No custom header fields yet.</div>}
              {headerFields.map((field) => (
                <div key={field.id} className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_40px]">
                  <Input value={field.label || ''} onChange={(e) => setHeaderFields((current) => current.map((entry) => entry.id === field.id ? { ...entry, label: e.target.value } : entry))} placeholder="Label" />
                  <Input value={field.value || ''} onChange={(e) => setHeaderFields((current) => current.map((entry) => entry.id === field.id ? { ...entry, value: e.target.value } : entry))} placeholder="Value" />
                  <Button type="button" variant="ghost" className="h-10 px-2 text-xl text-red-700" onClick={() => setHeaderFields((current) => current.filter((entry) => entry.id !== field.id))}>×</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Scope of Work</CardTitle>
                  <div className="mt-1 text-xs text-slate-500">Groups stay structural; this is only a visual refresh.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-9 rounded-none border-slate-300 bg-white text-slate-700" onClick={() => setShowColumnManager(true)}>
                    Table & Tax Settings
                  </Button>
                  <Button type="button" className="h-9 rounded-none bg-slate-900 hover:bg-slate-800" onClick={() => setShowCSVNote(true)}>
                    Import CSV
                  </Button>
                  <Button type="button" variant="ghost" className="h-9 rounded-none text-[#0f62fe] hover:bg-blue-50" onClick={addQuotationGroup}>
                    + Group
                  </Button>
                  <Button type="button" variant="ghost" className="h-9 rounded-none text-[#0f62fe] hover:bg-blue-50" onClick={addQuotationItem}>
                    + Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <div className="space-y-3">
                  {renderMobileRows()}
                  <div className="grid gap-2 pt-2">
                    <Button type="button" onClick={addQuotationItem} className="h-10 w-full rounded-none bg-[#0f62fe] hover:bg-[#0353e9]">
                      + Add Item
                    </Button>
                    <Button type="button" variant="outline" onClick={addQuotationGroup} className="h-10 w-full rounded-none border-slate-300 bg-white text-[#0f62fe]">
                      + Group
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-2 py-3">#</th>
                        <th className="px-2 py-3">Description</th>
                        {isVisible('make') && <th className="px-2 py-3">Make</th>}
                        <th className="px-2 py-3">Qty</th>
                        {isVisible('unit') && <th className="px-2 py-3">Unit</th>}
                        <th className="px-2 py-3">Rate</th>
                        {isVisible('install_rate') && <th className="px-2 py-3">Install</th>}
                        {isVisible('vat_rate') && <th className="px-2 py-3">VAT %</th>}
                        {isVisible('discount_rate') && <th className="px-2 py-3">Disc %</th>}
                        {visibleCustomColumns.map((column) => <th key={column.key} className="px-2 py-3">{column.label}</th>)}
                        <th className="px-2 py-3">Amount</th>
                        <th className="px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let itemNumber = 0
                        return normalizedItems.map((item, index) => {
                          if (item.row_type === 'group_header') {
                            const group = normalizedGroups.find((entry) => entry.id === item.group_id)
                            const groupSubtotal = group ? computedGroups.get(group.id)?.subtotal || 0 : 0
                            return (
                              <tr key={item._uiKey || item.id || index} className="border-b border-zinc-100 bg-[#f4f4f4] align-top">
                                <td className="px-2 py-3 text-sm font-semibold text-slate-400">-</td>
                                <td colSpan={8 + (isVisible('make') ? 1 : 0) + (isVisible('unit') ? 1 : 0) + (isVisible('install_rate') ? 1 : 0) + (isVisible('vat_rate') ? 1 : 0) + (isVisible('discount_rate') ? 1 : 0) + visibleCustomColumns.length} className="px-2 py-3">
                                  <div className="flex flex-wrap items-center gap-3 border-l-[3px] border-l-[#0f62fe] pl-3">
                                    <Input value={item.group_name || ''} onChange={(e) => group ? updateGroupName(group.id, e.target.value) : updateItem(index, 'group_name', e.target.value)} placeholder="Group name" className="max-w-sm rounded-none border-0 border-b border-slate-300 bg-white text-slate-900" />
                                    {group ? (
                                      <>
                                        <Button type="button" size="sm" variant="ghost" className="rounded-none text-[#0f62fe] hover:bg-blue-50" onClick={() => addItemToGroup(group.id)}>
                                          + Add Item
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" className="rounded-none border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={() => toggleGroupSubtotal(group.id)}>
                                          {group.showSubtotal ? 'Hide Subtotal' : 'Show Subtotal'}
                                        </Button>
                                        {group.showSubtotal ? <span className="text-xs font-semibold text-slate-700">Subtotal: N{Number(groupSubtotal || 0).toLocaleString()}</span> : null}
                                      </>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-2 py-3">
                                  <Button type="button" variant="ghost" size="sm" className="rounded-none text-red-500 hover:bg-white hover:text-red-600" onClick={() => group ? deleteGroup(group.id) : removeItemAt(index)}>x</Button>
                                </td>
                              </tr>
                            )
                          }

                          itemNumber += 1
                          return (
                            <tr key={item._uiKey || item.id || index} className="border-b border-zinc-100 align-top">
                              <td className="px-2 py-3 text-sm font-semibold text-zinc-500">{itemNumber}</td>
                              <td className="px-2 py-3 min-w-[260px]">
                                <Input value={item.description || ''} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Item description" />
                                <Input className="mt-2" value={item.sub_description || ''} onChange={(e) => updateItem(index, 'sub_description', e.target.value)} placeholder="Sub-description" />
                              </td>
                              {isVisible('make') && <td className="px-2 py-3"><Input value={item.make || ''} onChange={(e) => updateItem(index, 'make', e.target.value)} /></td>}
                              <td className="px-2 py-3 min-w-[88px]"><Input type="number" min="0" value={item.quantity || 0} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                              {isVisible('unit') && <td className="px-2 py-3 min-w-[120px]"><UnitInput value={item.unit || ''} onChange={(value: string) => updateItem(index, 'unit', value)} /></td>}
                              <td className="px-2 py-3 min-w-[110px]"><Input type="number" min="0" value={item.unit_price || 0} onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} /></td>
                              {isVisible('install_rate') && <td className="px-2 py-3 min-w-[110px]"><Input type="number" min="0" value={item.install_rate_override ? item.install_rate ?? '' : ''} onChange={(e) => updateInstallRateOverride(index, e.target.value)} /></td>}
                              {isVisible('vat_rate') && <td className="px-2 py-3 min-w-[90px]"><Input type="number" min="0" max="100" value={item.vat_rate ?? ''} placeholder={String(quotation.vat || 0)} onChange={(e) => updateItem(index, 'vat_rate', e.target.value === '' ? null : Number(e.target.value))} /></td>}
                              {isVisible('discount_rate') && <td className="px-2 py-3 min-w-[90px]"><Input type="number" min="0" max="100" value={item.discount_rate ?? ''} placeholder="global" onChange={(e) => updateItem(index, 'discount_rate', e.target.value === '' ? null : Number(e.target.value))} /></td>}
                              {visibleCustomColumns.map((column) => <td key={column.key} className="px-2 py-3 min-w-[110px]"><Input type={column.type === 'number' ? 'number' : 'text'} value={(item.custom_data || {})[column.key] || ''} onChange={(e) => updateItem(index, 'custom_data', { ...(item.custom_data || {}), [column.key]: column.type === 'number' ? Number(e.target.value || 0) : e.target.value })} /></td>)}
                              <td className="px-2 py-3 text-sm font-bold text-zinc-900">₦{Number(totals.items[index]?.line_subtotal || 0).toLocaleString()}</td>
                              <td className="px-2 py-3"><Button type="button" variant="ghost" size="sm" className="rounded-none text-red-700" onClick={() => removeItemAt(index)}>x</Button></td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <InvoiceNotesTermsSection
            invoice={quotation}
            updateInvoice={updateQuotation}
            notesTitle={notesTitle}
            setNotesTitle={setNotesTitle}
            termsTitle={termsTitle}
            setTermsTitle={setTermsTitle}
          />

          <InvoiceCustomBottomFieldsSection
            bottomFields={bottomFields}
            setBottomFields={setBottomFields}
            emptyStateText="No custom footer fields yet."
            placeholder="Add a footer field"
          />
        </div>

        <div className="space-y-5">
          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Quotation Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Status', formatQuotationStatus(quotation.status || 'draft')],
                ['Issue Date', quotation.issue_date || 'Not set'],
                ['Valid Until', quotation.valid_until || 'Not set'],
                ...(String(quotation.po_number || '').trim()
                  ? [['P.O. Number', String(quotation.po_number || '').trim()]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                  <span className="font-medium text-zinc-600">{label}</span>
                  <span className="text-right font-semibold text-zinc-900">{value}</span>
                </div>
              ))}
              {summaryHeaderFields.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Header Fields</div>
                  <div className="space-y-2">
                    {summaryHeaderFields.map((field) => (
                      <div key={field.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="font-medium text-zinc-600">{field.label}</span>
                        <span className="text-right text-zinc-900">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Totals Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Global VAT</Label><Input className="mt-2" type="number" min="0" value={quotation.vat || 0} onChange={(e) => updateQuotation('vat', Number(e.target.value))} /></div>
                <div><Label>Discount</Label><Input className="mt-2" type="number" min="0" value={quotation.discount || 0} onChange={(e) => updateQuotation('discount', Number(e.target.value))} /></div>
                <div>
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'fixed' | 'percent')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="percent">Percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Timing</Label>
                  <Select value={discountTiming} onValueChange={(value) => setDiscountTiming(value as 'before' | 'after')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose discount timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after">After Tax</SelectItem>
                      <SelectItem value="before">Before Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>WHT</Label><Input className="mt-2" type="number" min="0" value={quotation.wht || 0} onChange={(e) => updateQuotation('wht', Number(e.target.value))} /></div>
                <div>
                  <Label>WHT Type</Label>
                  <Select value={whtType} onValueChange={(value) => setWhtType(value as 'fixed' | 'percent')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose WHT type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!calculationState.useGlobalVatInput ? <div className="text-xs text-slate-500">Global VAT is neutral because this quotation uses row-level VAT overrides.</div> : null}
              {!calculationState.useGlobalDiscountInput ? <div className="text-xs text-slate-500">Global discount is neutral because this quotation uses row-level discount overrides.</div> : null}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Subtotal', totals.subtotal],
                ['Install Rate Total', totals.installRateTotal],
                ['VAT', totals.vat],
                ['Discount', totals.discount],
                ['WHT', totals.wht],
                ['Total Payable', totals.totalPayable],
              ].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-slate-200 px-0 py-2 last:border-b-0"><span className="font-medium text-zinc-600">{label}</span><span className={`font-bold ${label === 'Total Payable' ? 'text-[#0f62fe]' : 'text-zinc-900'}`}>N{Number(value || 0).toLocaleString()}</span></div>)}
              <div className="rounded-none border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-800">Merge Qty + Unit in output</div>
                    <div className="text-xs text-zinc-500">Keep quantity and unit together in generated document output.</div>
                  </div>
                  <Switch checked={mergeQtyUnit} onCheckedChange={setMergeQtyUnit} />
                </div>
              </div>
              <div className="rounded-none border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-800">Show item images in output</div>
                    <div className="text-xs text-zinc-500">Include saved item images when a document output uses them.</div>
                  </div>
                  <Switch checked={showItemImages} onCheckedChange={setShowItemImages} />
                </div>
              </div>
            </CardContent>
          </Card>

          <InvoiceFormActions
            saving={saving}
            primaryLabel={isEdit ? 'Save Quotation' : 'Create Quotation'}
            onSaveSent={() => handleSave('sent')}
            onSaveDraft={() => handleSave('draft')}
            onCancel={() => navigate('/quotations')}
          />
        </div>
      </div>
    </div>
  )
}


