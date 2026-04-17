import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import MobileInvoiceForm from '@/components/invoice/MobileInvoiceForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import { supabase } from '@/supabase'
import {
  buildCalculationInputs,
  ensureUiKey,
  filterPopulatedAdditionalFields,
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeExtraCharges,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import { toDbItem } from '@/domain/invoice'
import type { ColumnConfig, ExtraCharge, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import {
  buildQuotationFormState,
  type DbQuotation,
  type DbQuotationItem,
  type Quotation,
  quotationImportAdapter,
} from '@/domain/quotation'
import type { ApplyImportResult } from '@/domain/import/types'
import { computeDocument } from '@/lib/Calculations'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'
import { type ProjectLookupClient, type ProjectPrefillState, validateProjectAssignment } from '@/domain/projects'
import {
  createOfflineQuotationDraft,
  peekNextOfflineQuotationNumber,
} from '@/lib/native/quotationOffline'
import { toast } from '@/hooks/use-toast'
import { formatQuotationStatus } from './quotationStatus'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function canUseOfflineQuotationDrafts() {
  return canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false
}

function makeQuotationGroupId() {
  return `quo_group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toGroupMetaMap(groups: Array<{ id: string; name: string; showSubtotal?: boolean }>) {
  return Object.fromEntries(groups.map((group) => [group.id, { name: group.name, showSubtotal: !!group.showSubtotal }]))
}

function parseGroupMeta(value: unknown): Record<string, { name?: string; showSubtotal?: boolean }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [key, {}]
      const record = entry as Record<string, unknown>
      return [
        key,
        {
          name: typeof record.name === 'string' ? record.name : undefined,
          showSubtotal: record.showSubtotal === true,
        },
      ]
    }),
  )
}

function parseChargeLabels(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, label]) => [
      key,
      typeof label === 'string' ? label : String(label || ''),
    ]),
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
    let canonicalId = rawId && !seenCanonical.has(rawId) ? rawId : makeQuotationGroupId()
    while (seenCanonical.has(canonicalId)) canonicalId = makeQuotationGroupId()

    seenCanonical.add(canonicalId)
    if (rawId && !rawToCanonical.has(rawId)) rawToCanonical.set(rawId, canonicalId)

    const meta = (rawId && groupMeta[rawId]) || groupMeta[canonicalId] || {}
    const name = String(item.group_name || '').trim() || String(meta.name || '').trim() || `Group ${headerOrder.length + 1}`

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
        headerOrder.find((groupId) => headerById.get(groupId)?.name === item.group_name) ||
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
  additionalFields,
  discountType,
  discountTiming,
  whtType,
  notesTitle,
  termsTitle,
  mergeQtyUnit,
  showItemImages,
  groups,
  attachments,
  extraCharges,
  chargeLabels,
  signatoryId,
  pdfOutput,
}: {
  quotation: QuotationEditorState
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  additionalFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
  groups: Array<{ id: string; name: string; showSubtotal?: boolean }>
  attachments: Array<Record<string, unknown>>
  extraCharges: ExtraCharge[]
  chargeLabels: Record<string, string>
  signatoryId: string | null
  pdfOutput: PdfOutputState
}) {
  const groupMeta = toGroupMetaMap(groups)

  return {
    quotationTitle: quotation.quotation_title || '',
    clientName: quotation.client_name || '',
    notesHtml: quotation.notes || '',
    termsHtml: quotation.terms || '',
    header: headerFields.filter((field) => field.label && field.value),
    additionalFields: filterPopulatedAdditionalFields(additionalFields),
    columnConfig: columns,
    notesTitle,
    termsTitle,
    mergeQtyUnit,
    showItemImages,
    attachments,
    extraCharges: extraCharges.filter((charge) => String(charge.label || '').trim()),
    chargeLabels,
    signatoryId,
    pdfOutput,
    payment_terms: quotation.payment_terms || '',
    custom_payment_terms: quotation.custom_payment_terms || '',
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
type QuotationEditorState = Quotation & {
  project_id?: string
  payment_terms?: string
  custom_payment_terms?: string
}
type SignatoryRow = { id: string; name: string; role?: string | null; signature_url?: string | null }
type BankAccountRow = {
  id: string
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}
type PdfOutputState = {
  showBankDetails: boolean
  bankAccountId: string | null
  showFooter: boolean
  showTagline: boolean
}

type RfqConversionPrefillState = ProjectPrefillState & {
  sourceRfq?: {
    rfqId?: string
    rfqNumber?: string
    title?: string
    notes?: string
    items?: Array<{
      id?: string
      description?: string
      quantity?: number
      unit?: string
      specification?: string
      notes?: string
    }>
  }
}

const defaultPdfOutput: PdfOutputState = {
  showBankDetails: false,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
}

export default function QuotationForm({ mode, quotationId }: { mode: 'new' | 'edit'; quotationId?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state || {}) as RfqConversionPrefillState
  const isMobile = useIsMobile()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [quotation, setQuotation] = useState<QuotationEditorState>({
    quotation_number: '',
    po_number: '',
    project_id: prefill.projectId || '',
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
    payment_terms: 'Custom',
    custom_payment_terms: '',
  })
  const [headerFields, setHeaderFields] = useState<InvoiceFieldEntry[]>([])
  const [additionalFields, setAdditionalFields] = useState<InvoiceFieldEntry[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [attachments, setAttachments] = useState<Array<Record<string, unknown>>>([])
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])
  const [chargeLabels, setChargeLabels] = useState({
    workmanship: 'Workmanship',
    transportation: 'Transportation',
    shipping: 'Shipping',
  })
  const [signatories, setSignatories] = useState<SignatoryRow[]>([])
  const [signatoryId, setSignatoryId] = useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [settingsData, setSettingsData] = useState<{ company_tagline?: string | null; footer_text?: string | null } | null>(null)
  const [pdfOutput, setPdfOutput] = useState<PdfOutputState>(defaultPdfOutput)
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
    if (isEdit) return
    if (!prefill.projectId && !prefill.clientId && !prefill.clientName) return

    setQuotation((current) => ({
      ...current,
      project_id: current.project_id || String(prefill.projectId || ''),
      client_id: current.client_id || String(prefill.clientId || ''),
      client_name: current.client_name || String(prefill.clientName || ''),
    }))
  }, [isEdit, prefill.clientId, prefill.clientName, prefill.projectId])

  useEffect(() => {
    if (isEdit) return
    if (!prefill.sourceRfq) return

    setQuotation((current) => ({
      ...current,
      quotation_title: current.quotation_title || String(prefill.sourceRfq?.title || ''),
      notes: current.notes || String(prefill.sourceRfq?.notes || ''),
    }))

    const nextItems = Array.isArray(prefill.sourceRfq.items)
      ? prefill.sourceRfq.items
          .filter((item) => String(item?.description || '').trim())
          .map((item, index) =>
            ensureUiKey({
              ...makeEmptyItem(),
              id: null,
              description: String(item?.description || ''),
              quantity: Number(item?.quantity || 0),
              unit: String(item?.unit || ''),
              sub_description: String(item?.specification || ''),
              row_type: 'standard',
              group_id: null,
              group_name: '',
              sort_order: index,
              custom_data: {},
            }),
          )
      : []

    if (nextItems.length > 0) {
      commitGrouping(nextItems)
    }
  }, [isEdit, prefill.sourceRfq])

  useEffect(() => {
    const load = async () => {
      if (!isEdit && canUseOfflineQuotationDrafts()) {
        try {
          const nextQuotationNumber = await peekNextOfflineQuotationNumber()
          setQuotation((current) => ({
            ...current,
            quotation_number: current.quotation_number || nextQuotationNumber,
          }))
        } catch (error) {
          console.warn('Failed to prepare offline quotation number', error)
        }

        setAttachments([])
        setExtraCharges([])
        setGroups([])
        setSignatoryId(null)
        setPdfOutput(defaultPdfOutput)
        setLoading(false)
        return
      }

      const [signatoriesResult, bankAccountsResult, settingsResult] = await Promise.all([
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
      ])

      setSignatories((signatoriesResult.data || []) as SignatoryRow[])
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[])
      setSettingsData(settingsResult.data || null)

      if (isEdit && quotationId) {
        const [{ data: quotationRow, error }, { data: itemRows }] = await Promise.all([
          supabase.from('quotations').select('*').eq('id', quotationId).single(),
          supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
        ])

        if (error || !quotationRow) {
          toast({ title: 'Quotation not found', description: 'Quotation not found.', variant: 'destructive' })
          navigate('/quotations')
          return
        }

        const state = buildQuotationFormState(quotationRow as DbQuotation, (itemRows || []) as DbQuotationItem[])
        const normalizedGrouping = normalizeQuotationGrouping(
          state.items,
          parseGroupMeta(state.quotation.custom_fields?.groupMeta),
        )

        setQuotation({
          ...state.quotation,
          payment_terms: String(state.quotation.custom_fields?.payment_terms || 'Custom'),
          custom_payment_terms: String(state.quotation.custom_fields?.custom_payment_terms || ''),
        })
        setItems(normalizedGrouping.items)
        setColumns(state.columns)
        setHeaderFields(state.headerFields)
        setAdditionalFields(state.additionalFields)
        setDiscountType(state.discountType)
        setDiscountTiming(state.discountTiming)
        setWhtType(state.whtType)
        setNotesTitle(state.notesTitle)
        setTermsTitle(state.termsTitle)
        setMergeQtyUnit(state.mergeQtyUnit)
        setShowItemImages(state.showItemImages)
        setAttachments(Array.isArray(state.quotation.custom_fields?.attachments) ? (state.quotation.custom_fields?.attachments as Array<Record<string, unknown>>) : [])
        setSignatoryId(typeof state.quotation.custom_fields?.signatoryId === 'string' ? state.quotation.custom_fields.signatoryId : null)
        setPdfOutput(
          state.quotation.custom_fields?.pdfOutput && typeof state.quotation.custom_fields.pdfOutput === 'object'
            ? {
                ...defaultPdfOutput,
                ...(state.quotation.custom_fields.pdfOutput as Partial<PdfOutputState>),
              }
            : defaultPdfOutput,
        )
        setExtraCharges(
          normalizeExtraCharges(
            Array.isArray(state.quotation.custom_fields?.extraCharges)
              ? state.quotation.custom_fields?.extraCharges
              : [],
          ),
        )
        setChargeLabels((current) => ({
          ...current,
          ...parseChargeLabels(state.quotation.custom_fields?.chargeLabels),
        }))
        setGroups(normalizedGrouping.groups)
        setLoading(false)
        return
      }

      const { data } = await supabase.from('quotations').select('quotation_number')
      const nums = (data || []).map((q: { quotation_number?: string | null }) => {
        const match = q.quotation_number?.match(/(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      const next = Math.max(0, ...nums) + 1
      const nextQuotationNumber = `SASQ-${String(next).padStart(4, '0')}`
      setQuotation((current) => ({
        ...current,
        quotation_number: nextQuotationNumber,
      }))
      setAttachments([])
      setExtraCharges([])
      setGroups([])
      setSignatoryId(null)
      setPdfOutput(defaultPdfOutput)
      setLoading(false)
    }

    void load()
  }, [isEdit, navigate, quotationId, setColumns])

  const commitGrouping = (
    nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
    nextGroupsInput?: QuotationGroupState[] | ((current: QuotationGroupState[]) => QuotationGroupState[]),
  ) => {
    const baseItems = itemsRef.current
    const baseGroups = groupsRef.current
    const nextItems = typeof nextItemsInput === 'function' ? nextItemsInput(baseItems) : nextItemsInput
    const nextGroups = typeof nextGroupsInput === 'function' ? nextGroupsInput(baseGroups) : nextGroupsInput ?? baseGroups

    const normalized = normalizeQuotationGrouping(nextItems, toGroupMetaMap(nextGroups))
    itemsRef.current = normalized.items
    groupsRef.current = normalized.groups
    setItems(normalized.items)
    setGroups(normalized.groups)
  }

  const updateQuotation = <K extends keyof QuotationEditorState>(field: K, value: QuotationEditorState[K]) =>
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
    commitGrouping((current) => current.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item)))

  const resetItemOverrides = (fields: { vat?: boolean; discount?: boolean; install?: boolean }) =>
    commitGrouping((current) =>
      current.map((item) => {
        if (item.row_type !== 'standard') return item
        const patch: Partial<InvoiceItem> = {}
        if (fields.vat) patch.vat_rate = null
        if (fields.discount) patch.discount_rate = null
        if (fields.install) {
          patch.install_rate = null
          patch.install_rate_override = false
        }
        return { ...item, ...patch }
      }),
    )

  const addUngroupedItem = (insertAt: number | null = null) => {
    commitGrouping((current) => {
      const newItem: InvoiceItem = { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' }
      if (insertAt === null || insertAt >= current.length) return [...current, { ...newItem, sort_order: current.length }]
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
    const group = { ...base, id: groupId, name: base.name || `Group ${groups.length + 1}`, showSubtotal: !!base.showSubtotal }

    commitGrouping(
      (current) => {
        const groupHeader: InvoiceItem = {
          ...makeEmptyItem(),
          row_type: 'group_header',
          group_id: group.id,
          group_name: group.name,
          description: '',
          sort_order: current.length,
        }

        return [
          ...current.map((item, index) => ({ ...item, sort_order: index })),
          groupHeader,
        ]
      },
      (current) => [...current, group],
    )
  }

  const updateGroupName = (groupId: string, newName: string) =>
    commitGrouping(
      (current) => current.map((item) => (item.row_type === 'group_header' && item.group_id === groupId ? { ...item, group_name: newName } : item)),
      (current) => current.map((group) => (group.id === groupId ? { ...group, name: newName } : group)),
    )

  const toggleGroupSubtotal = (groupId: string) =>
    commitGrouping(
      (current) => current,
      (current) => current.map((group) => (group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group)),
    )

  const deleteGroup = (groupId: string) =>
    commitGrouping(
      (current) =>
        current
          .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
          .map((item, index) => (item.group_id === groupId ? { ...item, group_id: null, group_name: '', sort_order: index } : { ...item, sort_order: index })),
      (current) => current.filter((group) => group.id !== groupId),
    )

  const normalizedGroupMeta = useMemo(() => toGroupMetaMap(groups), [groups])
  const normalizedGrouping = useMemo(() => normalizeQuotationGrouping(items, normalizedGroupMeta), [items, normalizedGroupMeta])
  const normalizedItems = normalizedGrouping.items
  const normalizedGroups = normalizedGrouping.groups

  const addItemToGroup = (groupId: string) => {
    const group = normalizedGroups.find((entry) => entry.id === groupId)
    if (!group) return

    commitGrouping((current) => {
      let insertAt = current.findIndex((item) => item.row_type === 'group_header' && item.group_id === groupId)
      if (insertAt === -1) insertAt = current.length - 1

      for (let index = insertAt + 1; index < current.length; index += 1) {
        if (current[index].row_type === 'group_header') break
        if (current[index].group_id === groupId) insertAt = index
      }

      const next = [...current]
      next.splice(insertAt + 1, 0, { ...makeEmptyItem(), row_type: 'standard', group_id: groupId, group_name: '' })
      return next.map((item, index) => ({ ...item, sort_order: index }))
    })
  }

  const handleImportApply = (result: ApplyImportResult) => {
    quotationImportAdapter.applyResult({
      result,
      setColumns,
      setItems: (nextItems) => commitGrouping(nextItems),
      updateTopLevelField: (field, value) => updateQuotation(field, value),
      setExtraCharges: (charges) => setExtraCharges(charges),
    })
  }

  const calculationInputs = useMemo(
    () => buildCalculationInputs({ invoice: quotation, discountType, discountTiming, whtType }),
    [discountTiming, discountType, quotation, whtType],
  )

  const totals = useMemo(
    () =>
      computeDocument({
        items: normalizedItems,
        columns,
        document: {
          ...quotation,
          workmanship: Number(quotation.workmanship || 0),
          transportation: Number(quotation.transportation || 0),
          shipping: Number(quotation.shipping || 0),
        },
        cf: {
          extraCharges,
          calculationInputs,
        },
      }),
    [calculationInputs, extraCharges, normalizedItems, quotation],
  )

  const handlePdfOutputChange = async (next: PdfOutputState) => {
    setPdfOutput(next)

    if (!isEdit || !quotationId) return

    const existingCustomFields = buildCustomFields({
      quotation,
      columns,
      headerFields,
      additionalFields,
      discountType,
      discountTiming,
      whtType,
      notesTitle,
      termsTitle,
      mergeQtyUnit,
      showItemImages,
      groups: normalizedGroups,
      attachments,
      extraCharges,
      chargeLabels,
      signatoryId,
      pdfOutput: next,
    })

    const { error } = await supabase
      .from('quotations')
      .update({
        custom_fields: JSON.stringify(existingCustomFields),
      })
      .eq('id', quotationId)

    if (error) {
      toast({
        title: 'Save failed',
        description: getUserFacingMutationMessage(error, { action: 'save' }),
        variant: 'destructive',
      })
    }
  }

  const handleSave = async (status: Quotation['status']) => {
    const { project: validatedProject, error: projectError } = await validateProjectAssignment(
      supabase as unknown as ProjectLookupClient,
      {
      projectId: quotation.project_id,
      documentClientId: quotation.client_id,
      documentClientName: quotation.client_name,
      },
    )

    if (projectError) {
      toast({ title: 'Project link invalid', description: projectError, variant: 'destructive' })
      return
    }

    setSaving(true)
    const poNumber = String(quotation.po_number || '').trim()
    const payload = {
      quotation_number: quotation.quotation_number || '',
      po_number: poNumber || null,
      quotation_title: quotation.quotation_title || null,
      project_id: validatedProject?.id || null,
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
          additionalFields,
          discountType,
          discountTiming,
          whtType,
          notesTitle,
          termsTitle,
          mergeQtyUnit,
          showItemImages,
          groups: normalizedGroups,
          attachments,
          extraCharges,
          chargeLabels,
          signatoryId,
          pdfOutput,
        }),
      ),
    }

    const persistableItems = normalizedItems.filter((item) =>
      item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim(),
    )

    if (!isEdit && canUseOfflineQuotationDrafts()) {
      try {
        const localDraft = await createOfflineQuotationDraft({
          ...payload,
          items: persistableItems.map((item, index) => ({ ...item, sort_order: index })),
        })
        setQuotation((current) => ({ ...current, quotation_number: localDraft.quotationNumber }))
        toast({
          title: 'Saved offline',
          description: `${localDraft.quotationNumber} was saved locally and queued for sync.`,
        })
        navigate('/quotations')
      } catch (error) {
        toast({
          title: 'Offline save failed',
          description: error instanceof Error ? error.message : 'Could not save this quotation offline.',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
      return
    }

    if (!isEdit) {
      let candidateNumber = payload.quotation_number
      const { data: existing } = await supabase
        .from('quotations')
        .select('id')
        .eq('quotation_number', candidateNumber)
        .maybeSingle()
      if (existing) {
        const match = candidateNumber.match(/(\d+)$/)
        const num = match ? parseInt(match[1], 10) : 0
        candidateNumber = `SASQ-${String(num + 1).padStart(4, '0')}`
        payload.quotation_number = candidateNumber
        setQuotation((current) => ({ ...current, quotation_number: candidateNumber }))
      }
    }

    const quoteQuery =
      isEdit && quotationId
        ? supabase.from('quotations').update(payload).eq('id', quotationId).select().single()
        : supabase.from('quotations').insert([payload]).select().single()

    const { data: savedQuotation, error } = await quoteQuery
    if (error || !savedQuotation) {
      toast({
        title: 'Save failed',
        description: getUserFacingMutationMessage(error, { action: 'save' }),
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    const resolvedId = String(savedQuotation.id)
    const itemRows = persistableItems.map((item, index) => toQuotationItem(item, resolvedId, index))

    const { error: deleteError } = await supabase.from('quotation_items').delete().eq('quotation_id', resolvedId)
    if (deleteError) {
      toast({
        title: 'Save failed',
        description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    if (itemRows.length > 0) {
      const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
      if (itemError) {
        toast({
          title: 'Save failed',
          description: getUserFacingMutationMessage(itemError, { action: 'save' }),
          variant: 'destructive',
        })
        setSaving(false)
        return
      }
    }

    setSaving(false)
    navigate(`/quotations/${resolvedId}`)
  }

  if (loading) {
    return <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground shadow-sm sm:px-6">Loading quotation...</div>
  }

  const removeItemAt = (itemIndex: number) =>
    commitGrouping((current) => current.filter((_, entryIndex) => entryIndex !== itemIndex).map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex })))

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
          if (rows[cursor].group_id === rows[startIndex].group_id) endIndex = cursor
        }
        return endIndex
      }

      const getBlockRange = (startIndex: number) => {
        const target = rows[startIndex]
        if (!target) return { start: startIndex, end: startIndex }
        if (target.row_type === 'group_header') return { start: startIndex, end: getGroupBlockEnd(startIndex) }
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
          insertAt = nextBlockStart >= remainder.length ? remainder.length : getBlockRange(nextBlockStart).end + 1
        }

        remainder.splice(insertAt, 0, ...block)
        return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
      }

      const nextIndex = itemIndex + direction
      if (nextIndex < 0 || nextIndex >= rows.length) return rows

      const moving = { ...row }
      const anchor = rows[nextIndex]
      if (!anchor) return rows
      const remainder = rows.filter((_, index) => index !== itemIndex)

      if (direction < 0) {
        moving.group_id = anchor.row_type === 'group_header' ? anchor.group_id || null : anchor.group_id || null
        moving.group_name = ''
        remainder.splice(anchor.row_type === 'group_header' ? nextIndex + 1 : nextIndex, 0, moving)
      } else {
        moving.group_id = anchor.row_type === 'group_header' ? null : anchor.group_id || null
        moving.group_name = ''
        remainder.splice(nextIndex, 0, moving)
      }

      return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
    })
  }

  const invoiceLikeQuotation = {
    ...quotation,
    invoice_number: quotation.quotation_number || '',
    due_date: quotation.valid_until || '',
    invoice_title: quotation.quotation_title || '',
  }

  const handleInvoiceLikeUpdate = (field: string, value: unknown) => {
    if (field === 'invoice_number') return updateQuotation('quotation_number', String(value || ''))
    if (field === 'due_date') return updateQuotation('valid_until', String(value || ''))
    if (field === 'invoice_title') return updateQuotation('quotation_title', String(value || ''))
    setQuotation((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <MobileInvoiceForm
        title={isEdit ? 'Edit Quotation' : 'Create Quotation'}
        modeLabel={formatQuotationStatus(quotation.status || 'draft')}
        invoice={invoiceLikeQuotation}
        invoiceTitle={quotation.quotation_title || ''}
        setInvoiceTitle={(value: string) => updateQuotation('quotation_title', value)}
        updateInvoice={handleInvoiceLikeUpdate}
        items={normalizedItems}
        groups={normalizedGroups}
        customFields={headerFields}
        additionalFields={additionalFields}
        extraCharges={extraCharges}
        chargeLabels={chargeLabels}
        notesTitle={notesTitle}
        setNotesTitle={setNotesTitle}
        termsTitle={termsTitle}
        setTermsTitle={setTermsTitle}
        attachments={attachments}
        setAttachments={setAttachments}
        signatories={signatories.map((signatory) => ({
          id: signatory.id,
          name: signatory.name,
          role: signatory.role || undefined,
          signatureUrl: signatory.signature_url || undefined,
        }))}
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
        computedItems={totals.items}
        computedGroups={totals.groups}
        rawSubtotal={totals.subtotal}
        installRateTotal={totals.installRateTotal}
        vatAmount={totals.vat}
        discountAmount={totals.discount}
        grandTotal={totals.grandTotal}
        whtAmount={totals.wht}
        totalPayable={totals.totalPayable}
        amountInWords={quotation.amount_in_words || ''}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountTiming={discountTiming}
        setDiscountTiming={setDiscountTiming}
        whtType={whtType}
        setWhtType={setWhtType}
        saving={saving}
        primaryLabel={isEdit ? 'Save Quotation' : 'Create Quotation'}
        onSaveSent={() => handleSave('sent')}
        onSaveDraft={() => handleSave('draft')}
        onFloatingSave={() => handleSave('draft')}
        onCancel={() => navigate('/quotations')}
        onApplyImport={handleImportApply}
        importAdapter={quotationImportAdapter}
        onAddItem={addQuotationItem}
        onAddGroup={addQuotationGroup}
        onAddItemToGroup={addItemToGroup}
        onUpdateItem={(itemIndex: number, field: string, value: unknown) => {
          if (field === '__install_rate_override') return applyRowPatch(itemIndex, value as Partial<InvoiceItem>)
          updateItem(itemIndex, field, value)
        }}
        onResetItemOverrides={resetItemOverrides}
        onRemoveItem={removeItemAt}
        onMoveItem={moveItemBy}
        onInsertItemAfter={insertItemAfter}
        onUpdateGroupName={updateGroupName}
        onToggleGroupSubtotal={toggleGroupSubtotal}
        onDeleteGroup={deleteGroup}
        onAddHeaderField={() => setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
        onUpdateHeaderField={(id: string, field: 'label' | 'value', value: string) =>
          setHeaderFields((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
        }
        onRemoveHeaderField={(id: string) => setHeaderFields((current) => current.filter((entry) => entry.id !== id))}
        onAddAdditionalField={() => setAdditionalFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
        onUpdateAdditionalField={(id: string, field: 'label' | 'value', value: string) =>
          setAdditionalFields((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
        }
        onRemoveAdditionalField={(id: string) => setAdditionalFields((current) => current.filter((field) => field.id !== id))}
        onChargeLabelChange={(key: string, value: string) => setChargeLabels((current) => ({ ...current, [key]: value }))}
        onAddExtraCharge={(withTax: boolean) => setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
        onUpdateExtraCharge={(id: string, field: string, value: unknown) =>
          setExtraCharges((current) => current.map((charge) => (charge.id === id ? { ...charge, [field]: value } : charge)))
        }
        onRemoveExtraCharge={(id: string) => setExtraCharges((current) => current.filter((charge) => charge.id !== id))}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        isMobile={isMobile}
      />

      <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
        <PdfOutputSettings
          value={pdfOutput}
          onChange={handlePdfOutputChange}
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
      </div>
    </div>
  )
}
