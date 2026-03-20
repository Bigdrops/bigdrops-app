import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import { FileSpreadsheet, Layers, Plus, Settings2, Upload } from 'lucide-react'
import ClientSelector from '@/components/ClientSelector'
import ColumnManager from '@/components/ColumnManager'
import ItemImageUpload from '@/components/ItemImageUpload'
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
  BUILTIN_COLUMNS,
  inferLegacyCalculationState,
  makeEmptyItem,
  makeEmptyGroup,
  makeFieldEntry,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import {
  mapDbInvoice,
  mapDbInvoiceItem,
  parseCustomFields,
} from '@/domain/invoice/normalize'
import { toDbItem } from '@/domain/invoice'
import { computeDocument } from '@/lib/Calculations'
import { numberToWords } from '@/hooks/useInvoiceForm'
import type {
  ColumnConfig,
  DbInvoice,
  DbInvoiceItem,
  Invoice,
  InvoiceFieldEntry,
  InvoiceItem,
} from '@/domain/invoice'

const PROFORMA_STATUSES = ['draft', 'sent', 'approved'] as const

function formatProformaStatus(status: string) {
  return String(status || 'draft')
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function makeProformaGroupId() {
  return `proforma_group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toGroupMetaMap(groups: Array<{ id: string; name: string; showSubtotal?: boolean }>) {
  return Object.fromEntries(
    groups.map((group) => [group.id, { name: group.name, showSubtotal: !!group.showSubtotal }]),
  )
}

function normalizeProformaGrouping(
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
      rawId && !seenCanonical.has(rawId) ? rawId : makeProformaGroupId()

    while (seenCanonical.has(canonicalId)) {
      canonicalId = makeProformaGroupId()
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
        makeProformaGroupId()
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
  invoice,
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
  invoice: Invoice
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
    invoiceTitle: invoice.invoice_title || '',
    clientName: invoice.client_name || '',
    notesHtml: invoice.notes || '',
    termsHtml: invoice.terms || '',
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
      invoice,
      discountType,
      discountTiming,
      whtType,
    }),
  }
}

type ProformaGroupState = { id: string; name: string; showSubtotal: boolean }

export default function ProformaInvoiceForm({
  mode,
  proformaId,
}: {
  mode: 'new' | 'edit'
  proformaId?: string
}) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [invoice, setInvoice] = useState<Invoice>({
    invoice_number: '',
    po_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    document_type: 'Proforma Invoice',
    invoice_title: '',
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
  const [groups, setGroups] = useState<ProformaGroupState[]>([])
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
      if (isEdit && proformaId) {
        const [{ data: invoiceRow, error }, { data: itemRows }] = await Promise.all([
          supabase
            .from('invoices')
            .select('*')
            .eq('id', proformaId)
            .eq('document_type', 'Proforma Invoice')
            .single(),
          supabase.from('invoice_items').select('*').eq('invoice_id', proformaId).order('sort_order'),
        ])
        if (error || !invoiceRow) {
          alert('Proforma invoice not found.')
          navigate('/invoices')
          return
        }
        const mappedInvoice = mapDbInvoice(invoiceRow as DbInvoice)
        const mappedItems = ((itemRows || []) as DbInvoiceItem[]).map((row) => mapDbInvoiceItem(row))
        const customFields = parseCustomFields(invoiceRow.custom_fields)
        const legacyCalculationState = inferLegacyCalculationState({
          invoice: mappedInvoice,
          items: mappedItems,
          customFields,
        })
        const normalizedGrouping = normalizeProformaGrouping(
          mappedItems,
          (customFields.groupMeta as Record<string, { name?: string; showSubtotal?: boolean }>) || {},
        )
        setInvoice({
          ...mappedInvoice,
          status: mappedInvoice.status || 'draft',
          document_type: 'Proforma Invoice',
        })
        setItems(
          normalizedGrouping.items.length > 0
            ? normalizedGrouping.items
            : [{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' }],
        )
        setColumns(
          Array.isArray(customFields.columnConfig) && customFields.columnConfig.length > 0
            ? (customFields.columnConfig as ColumnConfig[])
            : BUILTIN_COLUMNS.map((column) => ({ ...column })),
        )
        setHeaderFields(Array.isArray(customFields.header) ? (customFields.header as InvoiceFieldEntry[]) : [])
        setBottomFields(Array.isArray(customFields.bottom) ? (customFields.bottom as InvoiceFieldEntry[]) : [])
        setDiscountType((customFields.discountType as 'fixed' | 'percent') || legacyCalculationState.editableInputs.discountType)
        setDiscountTiming((customFields.discountTiming as 'before' | 'after') || legacyCalculationState.editableInputs.discountTiming)
        setWhtType((customFields.whtType as 'fixed' | 'percent') || legacyCalculationState.editableInputs.whtType)
        setNotesTitle(typeof customFields.notesTitle === 'string' ? customFields.notesTitle : 'Notes')
        setTermsTitle(typeof customFields.termsTitle === 'string' ? customFields.termsTitle : 'Terms and Conditions')
        setMergeQtyUnit(Boolean(customFields.mergeQtyUnit))
        setShowItemImages(Boolean(customFields.showItemImages))
        setGroups(normalizedGrouping.groups)
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
      setInvoice((current) => ({
        ...current,
        invoice_number: getNextInvoiceNumber((data || []) as Array<Pick<DbInvoice, 'invoice_number'>>),
      }))
      setGroups([])
      setLoading(false)
    }
    load()
  }, [isEdit, navigate, proformaId, setColumns])

  const commitGrouping = (
    nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
    nextGroupsInput?:
      | ProformaGroupState[]
      | ((current: ProformaGroupState[]) => ProformaGroupState[]),
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

    const normalized = normalizeProformaGrouping(nextItems, toGroupMetaMap(nextGroups))
    itemsRef.current = normalized.items
    groupsRef.current = normalized.groups
    setItems(normalized.items)
    setGroups(normalized.groups)
  }

  const updateInvoice = <K extends keyof Invoice>(field: K, value: Invoice[K]) =>
    setInvoice((current) => ({ ...current, [field]: value }))

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

  const addProformaItem = () => addUngroupedItem()

  const insertItemAfter = (index: number) => addUngroupedItem(index + 1)

  const addProformaGroup = () => {
    const base = makeEmptyGroup()
    const groupId = base.id || makeProformaGroupId()
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
    () => normalizeProformaGrouping(items, normalizedGroupMeta),
    [items, normalizedGroupMeta],
  )
  const normalizedItems = normalizedGrouping.items
  const normalizedGroups = normalizedGrouping.groups

  const calculationInputs = useMemo(
    () =>
      buildCalculationInputs({
        invoice,
        discountType,
        discountTiming,
        whtType,
      }),
    [discountTiming, discountType, invoice, whtType],
  )

  const totals = useMemo(
    () =>
      computeDocument({
        items: normalizedItems,
        document: {
          ...invoice,
          workmanship: Number(invoice.workmanship || 0),
          transportation: Number(invoice.transportation || 0),
          shipping: Number(invoice.shipping || 0),
        },
        cf: {
          calculationInputs,
        },
      }),
    [calculationInputs, normalizedItems, invoice],
  )

  const computedGroups = useMemo(
    () => new Map(totals.groups.map((group) => [group.group_id, group])),
    [totals.groups],
  )

  const calculationState = useMemo(
    () =>
      inferLegacyCalculationState({
        invoice,
        items: normalizedItems,
        customFields: buildCustomFields({
          invoice,
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
      invoice,
      showItemImages,
      termsTitle,
      whtType,
      normalizedGroups,
    ],
  )

  const handleSave = async (status: string) => {
    setSaving(true)
    const poNumber = String(invoice.po_number || '').trim()
    const payload = {
      invoice_number: invoice.invoice_number || '',
      po_number: poNumber || null,
      invoice_title: invoice.invoice_title || null,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name || '',
      issue_date: invoice.issue_date || null,
      due_date: invoice.due_date || null,
      status: status || 'draft',
      document_type: 'Proforma Invoice',
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      workmanship: Number(invoice.workmanship || 0),
      transportation: Number(invoice.transportation || 0),
      shipping: Number(invoice.shipping || 0),
      discount: totals.discount,
      vat: totals.vat,
      wht: totals.wht,
      subtotal: totals.subtotal,
      total: totals.totalPayable,
      amount_in_words: numberToWords(totals.totalPayable),
      custom_fields: JSON.stringify(
        buildCustomFields({
          invoice: {
            ...invoice,
            status,
            document_type: 'Proforma Invoice',
            amount_in_words: numberToWords(totals.totalPayable),
          },
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
    const proformaQuery =
      isEdit && proformaId
        ? supabase
            .from('invoices')
            .update(payload)
            .eq('id', proformaId)
            .eq('document_type', 'Proforma Invoice')
            .select()
            .single()
        : supabase.from('invoices').insert([payload]).select().single()
    const { data: savedInvoice, error } = await proformaQuery
    if (error || !savedInvoice) {
      alert('Error saving proforma invoice: ' + (error?.message || 'Unknown error'))
      setSaving(false)
      return
    }
    const resolvedId = String(savedInvoice.id)
    const itemRows = normalizedItems
      .filter((item) =>
        item.row_type === 'group_header'
          ? item.group_name?.trim()
          : item.description?.trim(),
      )
      .map((item, index) => toDbItem(item, resolvedId, index))
    const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', resolvedId)
    if (deleteError) {
      alert('Error clearing proforma invoice items: ' + deleteError.message)
      setSaving(false)
      return
    }
    if (itemRows.length > 0) {
      const { error: itemError } = await supabase.from('invoice_items').insert(itemRows)
      if (itemError) {
        alert('Error saving proforma invoice items: ' + itemError.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    navigate(`/proforma/${resolvedId}/edit`)
  }

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Loading proforma invoice...</div>
  }

  const visibleCustomColumns = customColumns.filter((column: ColumnConfig) => column.visible)
  const summaryHeaderFields = headerFields.filter((field) => field.label && field.value)
  const formatCurrency = (value: number) => `N${Number(value || 0).toLocaleString()}`
  const removeItemAt = (itemIndex: number) =>
    commitGrouping((current) =>
      current.filter((_, entryIndex) => entryIndex !== itemIndex).map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex })),
    )
  const moveItemBy = (itemIndex: number, direction: number) => {
    commitGrouping((current) => {
      const snapshot = normalizeProformaGrouping(current, toGroupMetaMap(groupsRef.current))
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
                    invoice={invoice}
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
          invoice={invoice}
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
    <div className="mx-auto max-w-[1440px] px-3 pb-20 pt-4 sm:px-4 sm:pt-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-[22px] font-semibold tracking-tight text-slate-950">{isEdit ? 'Edit Proforma Invoice' : 'New Proforma Invoice'}</h2>
            <span className="inline-flex h-6 items-center border border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              {formatProformaStatus(invoice.status || 'draft')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Proforma #{invoice.invoice_number || 'Pending'}</span>
            <span>Client: {invoice.client_name || 'Unassigned'}</span>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">Compact Bugd-inspired shell with bigdrops invoice persistence, grouping, and calculation logic.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            id="proforma-csv-import"
            type="file"
            accept=".csv"
            hidden
            onChange={handleCSVImport}
          />
          <Button type="button" variant="outline" className="h-9 w-full rounded-none border-slate-300 bg-white px-3 text-slate-700 sm:w-auto" onClick={() => navigate('/invoices')}>Back to Invoices</Button>
        </div>
      </div>

      <Sheet open={showCSVNote} onOpenChange={setShowCSVNote}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={isMobile ? 'max-h-[88vh] rounded-t-3xl px-0' : 'w-full max-w-md px-0'}
        >
          <SheetHeader className="border-b border-slate-200 px-5 pb-4 pt-5">
            <SheetTitle className="text-base font-bold text-slate-900">Import proforma line items</SheetTitle>
            <SheetDescription>
              Upload a CSV file or paste CSV text. Imported rows become editable proforma line items before you save.
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
                    onClick={() => document.getElementById('proforma-csv-import')?.click()}
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
          vat={invoice.vat}
          setVat={(value: number) => updateInvoice('vat', value)}
          wht={invoice.wht}
          setWht={(value: number) => updateInvoice('wht', value)}
          whtType={whtType}
          setWhtType={setWhtType}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
        <div className="space-y-4">
          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Proforma Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Client Name</Label>
                <div className="mt-1.5">
                  <ClientSelector
                    clientId={invoice.client_id}
                    clientName={invoice.client_name}
                    isMobile={isMobile}
                    onClientChange={(clientId: string, clientName: string) => {
                      updateInvoice('client_id', clientId)
                      updateInvoice('client_name', clientName)
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Issue Date</Label>
                <Input className="mt-1.5 h-9 rounded-none border-slate-300 bg-slate-50" type="date" value={invoice.issue_date || ''} onChange={(e) => updateInvoice('issue_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Due Date</Label>
                <Input className="mt-1.5 h-9 rounded-none border-slate-300 bg-slate-50" type="date" value={invoice.due_date || ''} onChange={(e) => updateInvoice('due_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Invoice Number</Label>
                <Input className="mt-1.5 h-9 rounded-none border-slate-300 bg-slate-50" value={invoice.invoice_number || ''} onChange={(e) => updateInvoice('invoice_number', e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">P.O. Number</Label>
                <Input className="mt-1.5 h-9 rounded-none border-slate-300 bg-slate-50" value={invoice.po_number || ''} onChange={(e) => updateInvoice('po_number', e.target.value)} placeholder="Optional purchase order number" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</Label>
                <Select value={invoice.status || 'draft'} onValueChange={(value) => updateInvoice('status', value)}>
                  <SelectTrigger className="mt-1.5 h-9 rounded-none border-slate-300 bg-slate-50">
                    <SelectValue placeholder="Choose status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFORMA_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatProformaStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Document Title</Label>
                <Input className="mt-1.5 h-9 rounded-none border-slate-300 bg-slate-50" value={invoice.invoice_title || ''} onChange={(e) => updateInvoice('invoice_title', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Header Fields</CardTitle>
                <Button type="button" variant="ghost" className="h-7 rounded-none px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50" onClick={() => setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}>+ Add Header Field</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 py-4">
              {headerFields.length === 0 && <div className="text-sm italic text-slate-400">No custom header fields yet.</div>}
              {headerFields.map((field) => (
                <div key={field.id} className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_36px]">
                  <Input className="h-8 rounded-none border-slate-300 bg-slate-50" value={field.label || ''} onChange={(e) => setHeaderFields((current) => current.map((entry) => entry.id === field.id ? { ...entry, label: e.target.value } : entry))} placeholder="Label" />
                  <Input className="h-8 rounded-none border-slate-300 bg-slate-50" value={field.value || ''} onChange={(e) => setHeaderFields((current) => current.map((entry) => entry.id === field.id ? { ...entry, value: e.target.value } : entry))} placeholder="Value" />
                  <Button type="button" variant="ghost" className="h-10 px-2 text-xl text-red-700" onClick={() => setHeaderFields((current) => current.filter((entry) => entry.id !== field.id))}>×</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader className="space-y-0 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Scope of Work</CardTitle>
                  <div className="text-xs text-slate-500">Bugd-inspired compact shell over the existing invoice table and calculation patterns.</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" className="h-8 rounded-none border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700" onClick={() => setShowColumnManager(true)}>
                    <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                    Table & Tax
                  </Button>
                  <Button type="button" variant="outline" className="h-8 rounded-none border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700" onClick={() => setShowCSVNote(true)}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Import CSV
                  </Button>
                  <Button type="button" variant="ghost" className="h-8 rounded-none px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50" onClick={addProformaGroup}>
                    <Layers className="mr-1.5 h-3.5 w-3.5" />
                    Add Group
                  </Button>
                  <Button type="button" variant="ghost" className="h-8 rounded-none px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50" onClick={addProformaItem}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {isMobile ? (
                <div className="space-y-3 px-3 py-3">
                  {renderMobileRows()}
                  <div className="grid gap-2 pt-2">
                    <Button type="button" onClick={addProformaItem} className="h-9 w-full rounded-none bg-slate-900 text-xs font-semibold hover:bg-slate-800">
                      + Add Item
                    </Button>
                    <Button type="button" variant="outline" onClick={addProformaGroup} className="h-9 w-full rounded-none border-slate-300 bg-white text-xs font-semibold text-blue-700">
                      + Group
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="w-10 px-2 py-2.5">#</th>
                        <th className="min-w-[300px] px-2 py-2.5">Description</th>
                        {isVisible('make') && <th className="px-2 py-2.5">Make</th>}
                        <th className="w-[86px] px-2 py-2.5">Qty</th>
                        {isVisible('unit') && <th className="w-[96px] px-2 py-2.5">Unit</th>}
                        <th className="w-[112px] px-2 py-2.5">Rate</th>
                        {isVisible('install_rate') && <th className="w-[112px] px-2 py-2.5">Install</th>}
                        {isVisible('vat_rate') && <th className="w-[88px] px-2 py-2.5">VAT%</th>}
                        {isVisible('discount_rate') && <th className="w-[88px] px-2 py-2.5">Disc%</th>}
                        {visibleCustomColumns.map((column) => <th key={column.key} className="px-2 py-2.5">{column.label}</th>)}
                        <th className="w-[132px] px-2 py-2.5">Amount</th>
                        <th className="w-[54px] px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let itemNumber = 0
                        return normalizedItems.map((item, index) => {
                          if (item.row_type === 'group_header') {
                            const group = normalizedGroups.find((entry) => entry.id === item.group_id)
                            const groupSubtotal = group ? computedGroups.get(group.id)?.subtotal || 0 : 0
                            const groupItemCount = group ? normalizedItems.filter((entry) => entry.row_type === 'standard' && entry.group_id === group.id).length : 0
                            return (
                              <tr key={item._uiKey || item.id || index} className="border-b border-slate-200 bg-slate-50/70 align-top">
                                <td className="px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Grp</td>
                                <td colSpan={8 + (isVisible('make') ? 1 : 0) + (isVisible('unit') ? 1 : 0) + (isVisible('install_rate') ? 1 : 0) + (isVisible('vat_rate') ? 1 : 0) + (isVisible('discount_rate') ? 1 : 0) + visibleCustomColumns.length} className="px-2 py-3">
                                  <div className="flex flex-wrap items-center gap-2 border-l-2 border-l-blue-600 bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
                                    <Input value={item.group_name || ''} onChange={(e) => group ? updateGroupName(group.id, e.target.value) : updateItem(index, 'group_name', e.target.value)} placeholder="Group name" className="h-7 max-w-sm rounded-none border-0 bg-transparent px-0 text-sm font-semibold text-slate-900 shadow-none focus-visible:ring-0" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{groupItemCount} item{groupItemCount === 1 ? '' : 's'}</span>
                                    {group ? (
                                      <>
                                        <Button type="button" size="sm" variant="ghost" className="h-7 rounded-none px-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50" onClick={() => addItemToGroup(group.id)}>
                                          <Plus className="mr-1 h-3 w-3" />
                                          Add Item
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" className="h-7 rounded-none border-slate-300 bg-white px-2 text-[11px] text-slate-700 hover:bg-slate-50" onClick={() => toggleGroupSubtotal(group.id)}>
                                          {group.showSubtotal ? 'Hide Subtotal' : 'Show Subtotal'}
                                        </Button>
                                        {group.showSubtotal ? <span className="ml-auto border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">Subtotal {formatCurrency(groupSubtotal)}</span> : null}
                                      </>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <Button type="button" variant="ghost" size="sm" className="h-7 rounded-none px-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => group ? deleteGroup(group.id) : removeItemAt(index)}>×</Button>
                                </td>
                              </tr>
                            )
                          }

                          itemNumber += 1
                          const rowAmount = totals.items[index]?.line_subtotal || 0
                          const groupName = item.group_id ? normalizedGroups.find((entry) => entry.id === item.group_id)?.name || 'Grouped item' : ''
                          return (
                            <tr key={item._uiKey || item.id || index} className={`border-b border-slate-200 align-top ${item.group_id ? 'bg-slate-50/30' : 'bg-white'}`}>
                              <td className="px-2 py-2.5 text-sm font-semibold text-slate-500">{itemNumber}</td>
                              <td className={`min-w-[260px] px-2 py-2.5 ${item.group_id ? 'border-l-2 border-l-blue-100' : ''}`}>
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <Input className="h-7 rounded-none border-0 bg-transparent px-0 text-sm font-medium shadow-none placeholder:text-slate-400 focus-visible:ring-0" value={item.description || ''} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Item description" />
                                      <Input className="mt-0.5 h-6 rounded-none border-0 bg-transparent px-0 text-xs text-slate-500 shadow-none placeholder:text-slate-400 focus-visible:ring-0" value={item.sub_description || ''} onChange={(e) => updateItem(index, 'sub_description', e.target.value)} placeholder="Sub-description" />
                                    </div>
                                    {showItemImages ? (
                                      <div className="w-[88px] shrink-0 border border-slate-200 bg-slate-50 px-2 py-1.5">
                                        <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Image</div>
                                        <ItemImageUpload value={item.image_url || null} onChange={(url) => updateItem(index, 'image_url', url)} />
                                      </div>
                                    ) : null}
                                  </div>
                                  {item.group_id ? <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{groupName}</div> : null}
                                </div>
                              </td>
                              {isVisible('make') && <td className="px-2 py-2.5 align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" value={item.make || ''} onChange={(e) => updateItem(index, 'make', e.target.value)} /></td>}
                              <td className="px-2 py-2.5 min-w-[88px] align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" value={item.quantity || 0} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                              {isVisible('unit') && <td className="px-2 py-2.5 min-w-[120px] align-top"><UnitInput className="h-8 text-sm" value={item.unit || ''} onChange={(value: string) => updateItem(index, 'unit', value)} /></td>}
                              <td className="px-2 py-2.5 min-w-[110px] align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" value={item.unit_price || 0} onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} /></td>
                              {isVisible('install_rate') && <td className="px-2 py-2.5 min-w-[110px] align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" value={item.install_rate_override ? item.install_rate ?? '' : ''} onChange={(e) => updateInstallRateOverride(index, e.target.value)} /></td>}
                              {isVisible('vat_rate') && <td className="px-2 py-2.5 min-w-[90px] align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" max="100" value={item.vat_rate ?? ''} placeholder={String(invoice.vat || 0)} onChange={(e) => updateItem(index, 'vat_rate', e.target.value === '' ? null : Number(e.target.value))} /></td>}
                              {isVisible('discount_rate') && <td className="px-2 py-2.5 min-w-[90px] align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" max="100" value={item.discount_rate ?? ''} placeholder="global" onChange={(e) => updateItem(index, 'discount_rate', e.target.value === '' ? null : Number(e.target.value))} /></td>}
                              {visibleCustomColumns.map((column) => <td key={column.key} className="px-2 py-2.5 min-w-[110px] align-top"><Input className="h-8 rounded-none border-slate-300 bg-white text-sm" type={column.type === 'number' ? 'number' : 'text'} value={(item.custom_data || {})[column.key] || ''} onChange={(e) => updateItem(index, 'custom_data', { ...(item.custom_data || {}), [column.key]: column.type === 'number' ? Number(e.target.value || 0) : e.target.value })} /></td>)}
                              <td className="px-2 py-3 text-sm font-bold text-zinc-900">₦{Number(totals.items[index]?.line_subtotal || 0).toLocaleString()}</td>
                              <td className="px-2 py-2.5 align-top"><Button type="button" variant="ghost" size="sm" className="h-8 rounded-none px-2 text-red-700 hover:bg-red-50" onClick={() => removeItemAt(index)}>x</Button></td>
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
            invoice={invoice}
            updateInvoice={updateInvoice}
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

        <div className="space-y-4">
          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 px-4 py-3"><CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Proforma Summary</CardTitle></CardHeader>
            <CardContent className="space-y-0 px-4 py-3 text-sm">
              {[
                ['Status', formatProformaStatus(invoice.status || 'draft')],
                ['Issue Date', invoice.issue_date || 'Not set'],
                ['Due Date', invoice.due_date || 'Not set'],
                ...(String(invoice.po_number || '').trim()
                  ? [['P.O. Number', String(invoice.po_number || '').trim()]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-200 py-2 last:border-b-0">
                  <span className="font-medium text-slate-500">{label}</span>
                  <span className="text-right font-semibold text-zinc-900">{value}</span>
                </div>
              ))}
              {summaryHeaderFields.length > 0 ? (
                <div className="mt-3 border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Header Fields</div>
                  <div className="space-y-2">
                    {summaryHeaderFields.map((field) => (
                      <div key={field.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-500">{field.label}</span>
                        <span className="text-right text-zinc-900">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 px-4 py-3"><CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Totals Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Global VAT</Label><Input className="mt-1.5 h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" value={invoice.vat || 0} onChange={(e) => updateInvoice('vat', Number(e.target.value))} /></div>
                <div><Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Discount</Label><Input className="mt-1.5 h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" value={invoice.discount || 0} onChange={(e) => updateInvoice('discount', Number(e.target.value))} /></div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Discount Type</Label>
                  <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'fixed' | 'percent')}>
                    <SelectTrigger className="mt-1.5 h-8 rounded-none border-slate-300 bg-white text-sm">
                      <SelectValue placeholder="Choose discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="percent">Percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Discount Timing</Label>
                  <Select value={discountTiming} onValueChange={(value) => setDiscountTiming(value as 'before' | 'after')}>
                    <SelectTrigger className="mt-1.5 h-8 rounded-none border-slate-300 bg-white text-sm">
                      <SelectValue placeholder="Choose discount timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after">After Tax</SelectItem>
                      <SelectItem value="before">Before Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">WHT</Label><Input className="mt-1.5 h-8 rounded-none border-slate-300 bg-white text-sm" type="number" min="0" value={invoice.wht || 0} onChange={(e) => updateInvoice('wht', Number(e.target.value))} /></div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">WHT Type</Label>
                  <Select value={whtType} onValueChange={(value) => setWhtType(value as 'fixed' | 'percent')}>
                    <SelectTrigger className="mt-1.5 h-8 rounded-none border-slate-300 bg-white text-sm">
                      <SelectValue placeholder="Choose WHT type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!calculationState.useGlobalVatInput ? <div className="text-xs text-slate-500">Global VAT is neutral because this proforma uses row-level VAT overrides.</div> : null}
              {!calculationState.useGlobalDiscountInput ? <div className="text-xs text-slate-500">Global discount is neutral because this proforma uses row-level discount overrides.</div> : null}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 px-4 py-3"><CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-3 px-4 py-4 text-sm">
              {[
                ['Subtotal', totals.subtotal],
                ['Install Rate Total', totals.installRateTotal],
                ['VAT', totals.vat],
                ['Discount', totals.discount],
                ['WHT', totals.wht],
                ['Total Payable', totals.totalPayable],
              ].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-slate-200 px-0 py-2 last:border-b-0"><span className="font-medium text-zinc-600">{label}</span><span className={`font-bold ${label === 'Total Payable' ? 'text-[#0f62fe]' : 'text-zinc-900'}`}>N{Number(value || 0).toLocaleString()}</span></div>)}
              <div className="border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-800">Merge Qty + Unit in output</div>
                    <div className="text-xs text-zinc-500">Keep quantity and unit together in generated document output.</div>
                  </div>
                  <Switch checked={mergeQtyUnit} onCheckedChange={setMergeQtyUnit} />
                </div>
              </div>
              <div className="border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
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

          <div className="border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Save Actions
            </div>
            <InvoiceFormActions
              saving={saving}
              primaryLabel={isEdit ? 'Save Proforma Invoice' : 'Create Proforma Invoice'}
              onSaveSent={() => handleSave('sent')}
              onSaveDraft={() => handleSave('draft')}
              onCancel={() => navigate('/invoices')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}


