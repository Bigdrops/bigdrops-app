import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  invoiceImportAdapter,
  normalizeAdditionalFieldEntries,
  parseCustomFields,
  filterPopulatedAdditionalFields,
  syncGroupsFromItems,
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
  ensureUiKey,
  inferLegacyCalculationState,
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
import { computeDocument, type ComputedItem, type ComputedGroup } from '../lib/Calculations'
import { resolveFinancialColumns } from '@/domain/financial/resolveFinancialColumns'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { numberToWords } from '../hooks/useInvoiceForm'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { feedback } from '@/lib/feedback'
import { validateProjectAssignment } from '@/domain/projects'
import { createSaveTimer, getJsonSizeBytes } from '@/lib/saveTiming'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import { useSettings } from '@/hooks/useSettings'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { mapDbInvoiceItem } from '@/domain/invoice'

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

interface InvoiceFormPageProps {
  mode: 'create' | 'edit'
}

export default function InvoiceFormPage({ mode }: InvoiceFormPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { settings } = useSettings()
  const { isMobile } = useLayoutMode()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const routeState = isCreate ? (location.state as LocationState) || {} : {}
  const prefill = isCreate ? routeState.prefill : null
  const prefillItems = isCreate ? routeState.prefillItems : null
  const projectPrefill = isCreate
    ? {
        projectId: String(routeState.projectId || prefill?.project_id || ''),
        clientId: String(routeState.clientId || prefill?.client_id || ''),
        clientName: String(routeState.clientName || prefill?.client_name || ''),
      }
    : { projectId: '', clientId: '', clientName: '' }

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [invalidRowIndex, setInvalidRowIndex] = useState<number | null>(null)
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
  const [invoiceTitle, setInvoiceTitle] = useState(isCreate ? (prefill?.invoice_title || '') : '')
  const [invoice, setInvoice] = useState<InvoiceFormFields | null>(
    isCreate
      ? (prefill
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
            })
      : null,
  )
  const [initialInvoiceSnapshot, setInitialInvoiceSnapshot] = useState<any>(null)
  const [baseCustomFields, setBaseCustomFields] = useState<any>({})

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

  const initialCustomFields = useMemo(
    () => (isCreate ? parseCustomFields(prefill?.custom_fields) : baseCustomFields),
    [isCreate, prefill?.custom_fields, baseCustomFields],
  )

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

  /* ── Create-mode init effects ── */
  useEffect(() => {
    if (!isCreate) return
    setAdditionalFields(normalizeAdditionalFieldEntries(initialCustomFields.additionalFields, initialCustomFields.bottom))
  }, [isCreate, initialCustomFields])

  useEffect(() => {
    if (!isCreate) return
    if (initialCustomFields?.discountType) setDiscountType(initialCustomFields.discountType as DiscountType)
    if (initialCustomFields?.discountTiming) setDiscountTiming(initialCustomFields.discountTiming as DiscountTiming)
    if (initialCustomFields?.whtType) setWhtType(initialCustomFields.whtType as WhtType)
  }, [isCreate, initialCustomFields])

  useEffect(() => {
    if (!isCreate) return
    if (initialCustomFields?.columnConfig) {
      setColumns(resolveFinancialColumns(initialCustomFields.columnConfig as any[]))
    }
  }, [isCreate, initialCustomFields, setColumns])

  useEffect(() => {
    if (!isCreate || !prefillItems || prefillItems.length === 0) return
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
  }, [isCreate, prefillItems, initialCustomFields])

  useEffect(() => {
    if (!isCreate) return
    if (!projectPrefill.projectId && !projectPrefill.clientId && !projectPrefill.clientName) return
    setInvoice((current) => ({
      ...current!,
      project_id: current!.project_id || projectPrefill.projectId || '',
      client_id: current!.client_id || projectPrefill.clientId || '',
      client_name: current!.client_name || projectPrefill.clientName || '',
    }))
  }, [isCreate, projectPrefill.clientId, projectPrefill.clientName, projectPrefill.projectId])

  useEffect(() => {
    if (!isCreate || prefill) return
    supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const newNumber = getNextInvoiceNumber(data || [], resolvePrefix(settings?.document_prefixes, 'invoice'))
        setInvoice((current) => ({ ...current!, invoice_number: newNumber }))
      })
  }, [isCreate, prefill, settings?.document_prefixes])

  useEffect(() => {
    if (!isCreate) return
    setSignatoryId(getInvoiceSignatoryId(prefill?.custom_fields))
    setPdfOutput(getInvoicePdfOutput(prefill?.custom_fields))
  }, [isCreate, prefill?.custom_fields])

  /* ── Edit-mode load effect ── */
  useEffect(() => {
    if (!isEdit || !id) return

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
          setColumns(resolveFinancialColumns(parsed.columnConfig as any[]))
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
  }, [isEdit, id, navigate, setColumns])

  /* ── Shared init effect (signatories, bank accounts, settings) ── */
  useEffect(() => {
    if (isEdit) return
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
  }, [isEdit])

  /* ── Shared handlers ── */

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
          // @ts-ignore - install_rate_override is a UI-only field often used in this codebase
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

  const handleImportApply = useCallback((result: any) => {
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
  }, [updateInvoice])

  /* ── Derived values ── */

  const calculationInputs = useMemo(
    () => buildCalculationInputs({ invoice, discountType, discountTiming, whtType }),
    [invoice?.vat, invoice?.discount, invoice?.wht, discountType, discountTiming, whtType],
  )
  const documentTotals = useMemo(() => {
    if (!invoice && isEdit) {
      return {
        items: [] as ComputedItem[],
        groups: [] as ComputedGroup[],
        subtotal: 0,
        installRateTotal: 0,
        extraChargesTotal: 0,
        taxableBase: 0,
        discount: 0,
        vat: 0,
        wht: 0,
        grandTotal: 0,
        totalPayable: 0,
      }
    }
    return computeDocument({
      items,
      columns,
      document: {
        ...invoice!,
        workmanship: Number(invoice?.workmanship || 0),
        transportation: Number(invoice?.transportation || 0),
        shipping: Number(invoice?.shipping || 0),
      },
      cf: {
        extraCharges,
        calculationInputs,
      },
    })
  }, [items, columns, extraCharges, calculationInputs, invoice, isEdit])

  /* ── Save handler ── */

  const handleSave = useCallback(async (status: string) => {
    if (!invoice?.client_id) {
      feedback.error('Validation Error', { description: 'Pick a client before saving' })
      return
    }

    const standardItems = items.filter((item) => item.row_type === 'standard')
    const hasMeaningfulItem = standardItems.some((item) => item.description?.trim())

    if (!hasMeaningfulItem) {
      feedback.error('Validation Error', { description: 'Add at least one item before saving' })
      return
    }

    const invalidStandardRowCount = standardItems.filter((item) => !item.description?.trim()).length
    if (invalidStandardRowCount > 0) {
      const firstInvalidIdx = items.findIndex((item) => item.row_type === 'standard' && !item.description?.trim())
      setInvalidRowIndex(firstInvalidIdx)
      setTimeout(() => setInvalidRowIndex(null), 2500)
      feedback.error('Validation Error', {
        description: `${invalidStandardRowCount} item row${invalidStandardRowCount === 1 ? '' : 's'} must have a description before saving.`,
      })
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
    const timer = createSaveTimer('invoice-save-total', { mode: isCreate ? 'new' : 'edit', status, invoiceId: isEdit ? (id || null) : null })

    /* ── Build custom fields ── */
    const buildCustomFieldsStart = timer.phaseStart('build-custom-fields')
    const groupMeta: Record<string, { name: string; showSubtotal: boolean }> = {}
    groups.forEach((group) => {
      groupMeta[group.id!] = { name: group.name!, showSubtotal: !!group.showSubtotal }
    })

    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms

    const customFieldsMergeBase = isEdit
      ? { ...baseCustomFields }
      : { ...initialCustomFields }
    delete customFieldsMergeBase.bottom

    const customFieldsData: InvoiceCustomFields = {
      ...customFieldsMergeBase,
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

    /* ── Build payload ── */
    const buildPayloadStart = timer.phaseStart('build-payload')

    const notesChanged = isEdit ? (invoice.notes !== initialInvoiceSnapshot?.notes) : true
    const termsChanged = isEdit ? (invoice.terms !== initialInvoiceSnapshot?.terms) : true
    const normalizedNotes = notesChanged ? normalizeRichTextHtml(invoice.notes) : (initialInvoiceSnapshot?.notes ?? invoice.notes)
    const normalizedTerms = termsChanged ? normalizeRichTextHtml(invoice.terms) : (initialInvoiceSnapshot?.terms ?? invoice.terms)

    const updatedInvoice = isEdit
      ? {
          ...invoice,
          notes: normalizedNotes,
          terms: normalizedTerms,
          subtotal: documentTotals.subtotal,
          install_rate_total: documentTotals.installRateTotal,
          total: documentTotals.totalPayable,
        }
      : null

    const payload: any = {
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

    if (isCreate) {
      payload.invoice_number = invoice.invoice_number
    }

    timer.phaseEnd('build-payload', buildPayloadStart, {
      documentTable: 'invoices',
      payloadBytes: getJsonSizeBytes(payload),
      notesBytes: getJsonSizeBytes(normalizedNotes),
      termsBytes: getJsonSizeBytes(normalizedTerms),
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      notesNormalized: notesChanged,
      termsNormalized: termsChanged,
    })

    /* ── Save document row ── */
    const saveDocumentRowStart = timer.phaseStart('save-document-row')

    let invoiceRow: any = null
    let error: any = null

    if (isCreate) {
      const result = await withUniqueRetry(
        async (candidateNumber: string) => {
          payload.invoice_number = candidateNumber
          return (supabase.from('invoices') as any).insert([payload]).select().single() as Promise<{ data: any; error: any }>
        },
        async () => {
          const { data: rows } = await supabase.from('invoices').select('invoice_number')
          return getNextInvoiceNumber(rows || [], resolvePrefix(settings?.document_prefixes, 'invoice'))
        },
      )
      invoiceRow = result.data
      error = result.error
    } else {
      const result = await (supabase
        .from('invoices') as any)
        .update(payload)
        .eq('id', id)
      error = result.error
    }

    timer.phaseEnd('save-document-row', saveDocumentRowStart, {
      table: 'invoices',
      operation: isCreate ? 'insert-select-single' : 'update',
      supabaseCalls: 1,
    })

    if (error || (isCreate && !invoiceRow)) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const effectiveId = isCreate ? invoiceRow!.id : id

    /* ── Save items ── */
    const itemsToSave = items.map((item, index) => toDbItem(item, effectiveId!, index))

    if (isEdit) {
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
    } else {
      const deleteExistingItemsStart = timer.phaseStart('delete-existing-items')
      timer.phaseEnd('delete-existing-items', deleteExistingItemsStart, {
        table: 'invoice_items',
        skipped: true,
        supabaseCalls: 0,
        reason: 'new invoice save does not delete existing rows',
      })
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

    /* ── Audit trail ── */
    const saveAuditLogStart = timer.phaseStart('save-audit-log')
    try {
      const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import('@/lib/audit')
      if (isCreate) {
        const { recordInvoiceCreated } = await import('@/lib/audit')
        await recordInvoiceCreated(invoiceRow!.id)
        await recordAuditLog({
          entityType: 'invoice',
          recordId: invoiceRow!.id,
          entityLabel: invoiceRow!.invoice_number,
          action: 'CREATE',
          oldData: null,
          newData: invoiceRow,
          trackedFields: INVOICE_TRACKED_FIELDS,
        })
      } else {
        timer.phaseEnd('post-save-refetch', null, { skipped: true, reason: 'no refetch — use merged snapshot' })
        await recordAuditLog({
          entityType: 'invoice',
          recordId: effectiveId || '',
          entityLabel: initialInvoiceSnapshot?.invoice_number || null,
          action: 'UPDATE',
          oldData: initialInvoiceSnapshot,
          newData: updatedInvoice,
          trackedFields: INVOICE_TRACKED_FIELDS,
        })
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
    timer.phaseEnd('save-audit-log', saveAuditLogStart, {
      tables: ['audit_logs'],
      rpcCalls: isCreate ? 2 : 1,
      includesAuthLookup: true,
    })

    setSaving(false)
    const navigationTarget = '/invoices/' + effectiveId
    const navigationAfterSaveStart = timer.phaseStart('navigation-after-save')
    navigate(navigationTarget)
    timer.phaseEnd('navigation-after-save', navigationAfterSaveStart, {
      target: navigationTarget,
    })
    timer.finish({
      supabaseCalls: itemsToSave.length > 0 ? (isCreate ? 4 : 5) : (isCreate ? 3 : 4),
      itemRowCount: itemsToSave.length,
    })
  }, [
    invoice, invoiceTitle, items, groups, initialCustomFields, baseCustomFields,
    customFields, additionalFields, extraCharges, chargeLabels, columns,
    notesTitle, termsTitle, attachments, mergeQtyUnit,
    discountType, discountTiming, whtType, calculationInputs,
    signatoryId, pdfOutput, settings?.document_prefixes, documentTotals,
    isCreate, isEdit, id, initialInvoiceSnapshot,
  ])

  /* ── Render ── */

  const pageTitle = isCreate ? 'Create Invoice' : 'Edit Invoice'
  const modeLabel = isCreate ? 'New Invoice' : 'Edit Invoice'
  const primaryLabel = isCreate ? 'Create Invoice' : 'Save Changes'

  const onSaveUnpaid = useCallback(() => handleSave('unpaid'), [handleSave])

  const handleCancel = useCallback(() => navigate(isCreate ? '/invoices' : '/invoices/' + id), [isCreate, id, navigate])

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

  if (isEdit && (loading || !invoice)) {
    return (
      <Layout title={pageTitle} hidePageHeader>
        <div className="w-full px-4 py-6 pb-24 text-sm text-muted-foreground sm:px-6 md:mx-auto md:max-w-2xl md:pb-12 lg:px-8">
          Loading invoice...
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={pageTitle} hidePageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        <SharedDocumentForm
          title={pageTitle}
          modeLabel={modeLabel}
          invoice={invoice!}
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
          primaryLabel={primaryLabel}
          onSaveSent={onSaveUnpaid}
          onSaveDraft={onSaveUnpaid}
          onFloatingSave={onSaveUnpaid}
          onCancel={handleCancel}
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
          onAddHeaderField={handleAddHeaderField}
          onUpdateHeaderField={handleUpdateHeaderField}
          onRemoveHeaderField={handleRemoveHeaderField}
          onAddAdditionalField={handleAddAdditionalField}
          onUpdateAdditionalField={handleUpdateAdditionalField}
          onRemoveAdditionalField={handleRemoveAdditionalField}
          onChargeLabelChange={handleChargeLabelChange}
          onAddExtraCharge={handleAddExtraCharge}
          onUpdateExtraCharge={handleUpdateExtraCharge}
          onRemoveExtraCharge={handleRemoveExtraCharge}
          onClearAll={handleClearAll}
          invalidRowIndex={invalidRowIndex}
          onClearInvalidRow={() => setInvalidRowIndex(null)}
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
