import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { PdfBankControls, PdfSupportingOptions } from '@/components/PdfOutputSettings'
import {
  DocumentActionGrid,
  DocumentActionSheet,
  DocumentBottomBar,
  DocumentDesignPanel,
  DocumentFloatingFab,
  DocumentLivePreviewCard,
  DocumentPdfSheet,
  DocumentSection,
  DocumentStatusStrip,
  DocumentTopBar,
} from '@/components/document/DocumentViewShell'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import { supabase } from '@/supabase'
import { calcTotals, buildSummaryRows, normalizeInvoicePdfTemplateId } from '@/domain/invoice'
import { buildPdfRowCells, generateQuotationPdf, interpretPdfTableSettings } from '@/components/pdf-new'
import { getPdfSummaryLabels } from '@/domain/document/pdfSummaryLabels'
import { formatMergedQtyUnit, resolveCanonicalItemImageUrl, resolveCanonicalLogoUrl } from '@/domain/documentMedia.js'
import { getPdfDesignPreset, resolvePdfWebFontFamily, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { toast } from '@/hooks/use-toast'
import { normalizeSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import {
  createLinkedDocumentItem,
  createLinkedDocumentsSection,
  createLinkedProjectSection,
} from '@/components/document/linkedDocumentSections'
import { operationalEmptyStateClassName } from '@/components/ui/operational-card-styles'
import { toDbItem, type InvoiceItem } from '@/domain/invoice'
import {
  appendDerivedTrail,
  buildTrailLink,
  getNextInvoiceNumber,
  parseDocumentCustomFields,
  toQuotationItemRow,
  withSourceTrail,
} from '@/domain/documentConversion'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchProjectSummary, getQuotationDocumentRelations } from '@/domain/documentRelationships'
import type { DbQuotation, DbQuotationItem, Quotation } from '@/domain/quotation'
import { buildQuotationFormState, getNextQuotationNumber } from '@/domain/quotation'
import { buildQuotationCsv, downloadQuotationCsv } from './exportQuotationCsv'
import { QUOTATION_STATUSES, formatQuotationStatus, quotationStatusTone } from './quotationStatus'
import { formatNaira } from '@/lib/formatters/money'
import { renderRichTextContent } from '@/lib/richText'

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
  showAmountInWords: boolean
  showVatPercentage: boolean
  showWhtPercentage: boolean
  showDiscountPercentage: boolean
}

const defaultPdfOutput: PdfOutputState = {
  showBankDetails: false,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showAmountInWords: true,
  showVatPercentage: true,
  showWhtPercentage: true,
  showDiscountPercentage: true,
}

function renderRichText(value?: string) {
  if (!value) return <span className="text-muted-foreground">Not provided</span>
  return renderRichTextContent(value, 'prose prose-sm max-w-none')
}

const formatMoney = (value: number | string | null | undefined) =>
  formatNaira(value, { preserveFraction: true })

function resolvePreviewLineAmount(item: InvoiceItem) {
  return Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0))
}

function resolveGroupSubtotal(items: InvoiceItem[], groupId: string | null | undefined) {
  if (!groupId) return 0
  return items.reduce((subtotal, item) => {
    if (item?.row_type === 'group_header') return subtotal
    if (item?.group_id !== groupId) return subtotal
    return subtotal + resolvePreviewLineAmount(item)
  }, 0)
}

export default function QuotationDetail({ quotationId }: { quotationId: string }) {
  const navigate = useNavigate()
  const { isMobile: isNarrow } = useLayoutMode()
  const [loading, setLoading] = useState(true)
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [headerFields, setHeaderFields] = useState<any[]>([])
  const [additionalFields, setAdditionalFields] = useState<any[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [client, setClient] = useState<Record<string, unknown> | null>(null)
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfOutput, setPdfOutput] = useState<PdfOutputState>(defaultPdfOutput)
  const [pdfDesignPreset, setPdfDesignPresetState] = useState(() => getPdfDesignPreset('quotation'))
  const [converting, setConverting] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const [showPdfSettings, setShowPdfSettings] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [linkedProject, setLinkedProject] = useState<{ id: string; name?: string | null } | null>(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [templateId, setTemplateId] = useState('industry')
  const hasText = (value: unknown) => String(value || '').trim().length > 0

  const pdfTemplates = [
    {
      id: 'industry',
      label: 'Industry',
      description: 'Structured professional layout',
    },
    {
      id: 'ledger',
      label: 'Ledger',
      description: 'Editorial premium layout',
    },
    {
      id: 'apex',
      label: 'Apex',
      description: 'Placeholder shell while Apex is in progress',
    },
    {
      id: 'bolt',
      label: 'Bolt',
      description: 'Blue banner commercial layout',
    },
    {
      id: 'obsidian-receipt',
      label: 'Obsidian Receipt',
      description: 'Dark elegant minimalist receipt',
    },
  ]

  useEffect(() => {
    const load = async () => {
      const [{ data: quotationRow, error }, { data: itemRows }, { data: bankAccountRows }, settingsResponse] = await Promise.all([
        supabase.from('quotations').select('*').eq('id', quotationId).single(),
        supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 1).single(),
      ])
      if (error || !quotationRow) {
        setQuotation(null)
        setLoading(false)
        return
      }
      const state = buildQuotationFormState(quotationRow as DbQuotation, (itemRows || []) as DbQuotationItem[])
      setQuotation(state.quotation)
      setItems(state.items)
      setColumns(state.columns)
      setHeaderFields(state.headerFields)
      setAdditionalFields(state.additionalFields)
      setDiscountType(state.discountType)
      setDiscountTiming(state.discountTiming)
      setWhtType(state.whtType)
      setNotesTitle(state.notesTitle)
      setTermsTitle(state.termsTitle)
      setPdfOutput(
        state.quotation.custom_fields?.pdfOutput && typeof state.quotation.custom_fields.pdfOutput === 'object'
          ? {
              ...defaultPdfOutput,
              ...(state.quotation.custom_fields.pdfOutput as Partial<PdfOutputState>),
            }
          : defaultPdfOutput,
      )
      setBankAccounts((bankAccountRows as BankAccountRow[] | null) || [])

      const [clientResponse] = await Promise.all([
        state.quotation.client_id
          ? supabase.from('clients').select('*').eq('id', state.quotation.client_id).single()
          : Promise.resolve({ data: null }),
      ])

      setClient((clientResponse.data as Record<string, unknown> | null) || null)
      setSettings(normalizeSettings(settingsResponse.data))
      setLinkedProject(state.quotation.project_id ? await fetchProjectSummary(state.quotation.project_id) : null)
      setLoading(false)
    }

    load()
  }, [quotationId])

  const totals = useMemo(() => {
    if (!quotation) return null
    return calcTotals({
      items,
      columns,
      invoice: quotation,
      customFields: parseDocumentCustomFields(quotation.custom_fields),
      discountType,
      discountTiming,
      whtType,
    })
  }, [columns, discountTiming, discountType, items, quotation, whtType])

  const visibleCustomColumns = columns.filter((column: any) => column.key.startsWith('custom_') && column.visible)
  const topHeaderFields = headerFields.filter((field: any) => field.label && field.value)
  const poNumber = String(quotation?.po_number || '').trim()
  const conversionTrail = (quotation?.custom_fields?.conversionTrail || {}) as {
    source?: { id?: string | null; type?: 'invoice' | 'quotation'; number?: string }
    derived?: Array<{ id?: string | null; type?: 'invoice' | 'quotation'; number?: string }>
  }
  const derivedInvoices = (conversionTrail.derived || []).filter((entry) => entry.type === 'invoice' && entry.id)
  const quotationRelations = getQuotationDocumentRelations(quotation)
  const projectActionState = getProjectActionState({ projectId: quotation?.project_id, project: linkedProject })
  const documentActionState = getDocumentActionState({
    sourceDocument: quotationRelations.source,
    relatedDocuments: derivedInvoices,
  })
  const linkedDocumentsSections = [
    createLinkedDocumentsSection({
      key: 'source',
      title: 'Source',
      description: 'Documents this quotation came from.',
      items: quotationRelations.source
        ? [
            createLinkedDocumentItem({
              key: `source-${quotationRelations.source.id || quotationRelations.source.number || 'quotation-source'}`,
              label: `${quotationRelations.source.type === 'invoice' ? 'Invoice' : 'Quotation'} ${quotationRelations.source.number || quotationRelations.source.id || 'Linked source'}`,
              subtitle: 'Open the source document',
              onClick: () => {
                if (quotationRelations.source?.id) {
                  navigate(`/${quotationRelations.source.type === 'invoice' ? 'invoices' : 'quotations'}/${quotationRelations.source.id}`)
                }
              },
              disabled: !quotationRelations.source?.id,
            }),
          ]
        : [],
    }),
    createLinkedDocumentsSection({
      key: 'generated',
      title: 'Generated / Child Documents',
      description: 'Documents created from this quotation.',
      items: derivedInvoices.map((entry) => createLinkedDocumentItem({
        key: `invoice-${entry.id}`,
        label: `Invoice ${entry.number || entry.id}`,
        subtitle: 'Open generated invoice',
        onClick: () => navigate(`/invoices/${entry.id}`),
      })),
    }),
    createLinkedProjectSection({
      project: linkedProject,
      description: 'Project connected to this quotation.',
      onOpenProject: () => {
        if (linkedProject?.id) navigate(`/projects/${linkedProject.id}`)
      },
    }),
  ]

  const companyIdentity = useMemo(() => {
    const companyName = String(settings?.company_name || '')
    const companyTagline = String(settings?.company_tagline || '')
    const companyAddress = String(settings?.company_address || '')
    const companyCity = String(settings?.company_city || '')
    const companyPhone = String(settings?.company_phone || '')
    const companyEmail = String(settings?.company_email || '')

    return {
      companyName,
      companyTagline,
      lines: [companyAddress, companyCity, companyPhone, companyEmail].filter(Boolean),
    }
  }, [settings])

  const handleStatusChange = async (status: string) => {
    if (!quotation || quotation.status === status) return
    const { error } = await supabase.from('quotations').update({ status }).eq('id', quotationId)
    if (!error) {
      setQuotation((current) => (current ? { ...current, status: status as Quotation['status'] } : current))
    }
  }

  const handleDownloadPdf = async () => {
    if (!quotation || pdfGenerating) return
    setPdfGenerating(true)
    try {
      const customFields = parseDocumentCustomFields(quotation.custom_fields)
      const referenceLinks = Array.isArray(customFields.attachments)
        ? customFields.attachments
            .filter((entry: any) => entry?.url)
            .map((entry: any, index: number) => ({
              label: String(entry.label || entry.name || `Reference ${index + 1}`),
              url: String(entry.url),
            }))
        : []

      const shellQuotationTotal = totals?.totalPayable ?? Number(quotation.total || 0)
      const summaryRows = [
        ...buildSummaryRows({
          invoice: quotation,
          totals,
          customFields,
          chargeLabels: customFields?.chargeLabels,
          summaryLabels: getPdfSummaryLabels(quotation, pdfOutput),
        }),
        { key: 'total', label: 'Total', amount: Number(shellQuotationTotal), emphasis: true, tone: 'primary' as const },
      ]

      const resolvedTable = interpretPdfTableSettings(columns as any, {
        mergeQtyUnit: customFields.mergeQtyUnit === true,
      })

      await generateQuotationPdf({
        model: {
          identity: {
            id: String(quotation.id || quotationId),
            kind: 'quotation',
            number: String(quotation.quotation_number || 'quotation'),
            title: String(quotation.quotation_title || 'Quotation'),
            issueDate: String(quotation.issue_date || ''),
            validUntil: String(quotation.valid_until || ''),
            poNumber: poNumber,
            status: String(quotation.status || ''),
            currency: 'NGN',
          },
          issuer: {
            label: 'From',
            name: String(settings?.company_name || ''),
            addressLines: companyIdentity.lines,
            phone: String(settings?.company_phone || ''),
            email: String(settings?.company_email || ''),
            taxId: String(settings?.company_vat || ''),
          },
          recipient: {
            label: 'Prepared For',
            name: String(quotation.client_name || ''),
            attention: String(client?.contact_person || ''),
            addressLines: clientPreviewLines,
            phone: String(client?.phone || ''),
            email: String(client?.email || ''),
          },
          headerFields: topHeaderFields.map((field: any) => ({ label: String(field.label || ''), value: String(field.value || '') })),
          columns: resolvedTable.columns,
          mergeQtyUnit: resolvedTable.mergeQtyUnit,
          items: items.map((item, index) => ({
            id: String(item.id || item._uiKey || index),
            rowType: item.row_type === 'group_header' ? 'group_header' : 'line',
            groupLabel: item.group_name || null,
            groupId: item.group_id || null,
            description: item.description || '',
            subDescription: item.sub_description || '',
            make: item.make || '',
            quantity: item.quantity ?? null,
            unit: item.unit || '',
            unitPrice: item.unit_price ?? 0,
            installRate: item.install_rate ?? null,
            vatRate: item.vat_rate ?? null,
            discountRate: item.discount_rate ?? null,
            amount: item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0),
            imageUrl: resolveCanonicalItemImageUrl(item),
            cells: item.row_type === 'group_header'
              ? undefined
              : buildPdfRowCells(item, resolvedTable.columns, {
                  mergeQtyUnit: resolvedTable.mergeQtyUnit,
                  configuredColumns: resolvedTable.configuredColumns,
                }),
            customData: {
              ...(item.custom_data || {}),
              ...(item.row_type === 'group_header' ? { showSubtotal: customFields?.groupMeta?.[item.group_id]?.showSubtotal === true } : {}),
            },
          })),
          totals: {
            mode: 'standard',
            rows: summaryRows,
            amountInWords: pdfOutput.showAmountInWords === false ? '' : String(quotation.amount_in_words || ''),
          },
          bankDetails: pdfOutput.showBankDetails && selectedPreviewBank
            ? {
                bankName: selectedPreviewBank.bankName,
                accountName: selectedPreviewBank.accountName,
                accountNumber: selectedPreviewBank.accountNumber,
                sortCode: selectedPreviewBank.sortCode,
              }
            : null,
          notes: quotation.notes ? { title: notesTitle || 'Notes', content: quotation.notes, format: 'html' } : null,
          terms: quotation.terms ? { title: termsTitle || 'Terms and Conditions', content: quotation.terms, format: 'html' } : null,
          additionalSections: additionalFields
            .filter((field) => field?.label || field?.value)
            .map((field) => ({ title: String(field.label || 'Additional Field'), content: String(field.value || ''), format: 'text' })),
          referenceLinks,
          signature: null,
          logo: {
            imageUrl: resolveCanonicalLogoUrl(settings),
            altText: String(settings?.company_name || ''),
          },
          footerText: pdfOutput.showFooter ? String(settings?.footer_text || '') : '',
          tagline: pdfOutput.showTagline ? String(settings?.company_tagline || '') : '',
          metaFooter: { companyName: String(settings?.company_name || '') },
          template: {
            designPreset: pdfDesignPreset,
            fontConfig: {
              useCustomFonts: pdfDesignPreset.useCustomFonts,
              headerFont: pdfDesignPreset.headerFont,
              bodyFont: pdfDesignPreset.bodyFont,
            },
          },
        },
        templateId: normalizeInvoicePdfTemplateId(templateId) || 'industry',
      })
      toast({ title: 'PDF ready', description: 'Quotation PDF downloaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: 'PDF generation failed', description: message, variant: 'destructive' })
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleDownloadCsv = () => {
    if (!quotation) return
    const csv = buildQuotationCsv({ quotation, items, totals })
    downloadQuotationCsv(`${quotation.quotation_number || 'quotation'}.csv`, csv)
  }

  const handleCopy = async (value: string, label: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      toast({ title: 'Copy failed', description: `Could not copy ${label.toLowerCase()}.`, variant: 'destructive' })
      return
    }
    toast({ title: 'Copied', description: `${label} copied.` })
  }

  const handlePdfOutputChange = async (next: PdfOutputState) => {
    if (!quotation) return
    setPdfOutput(next)
    const nextCustomFields = {
      ...(quotation.custom_fields || {}),
      pdfOutput: next,
    }
    const { error } = await supabase
      .from('quotations')
      .update({ custom_fields: JSON.stringify(nextCustomFields) })
      .eq('id', quotationId)

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
      return
    }

    setQuotation((current) => (current ? { ...current, custom_fields: nextCustomFields } : current))
  }

  const handleArchive = async () => {
    if (!quotation) return
    setShowArchiveConfirm(false)
    const { error } = await supabase
      .from('quotations')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', quotationId)
    if (error) {
      toast({ title: 'Archive failed', description: error.message, variant: 'destructive' })
      return
    }
    navigate('/quotations')
  }

  const handleDelete = async () => {
    if (!quotation) return
    setShowDeleteConfirm(false)
    const { error: itemError } = await supabase.from('quotation_items').delete().eq('quotation_id', quotationId)
    if (itemError) {
      toast({ title: 'Delete failed', description: itemError.message, variant: 'destructive' })
      return
    }
    const { error } = await supabase.from('quotations').delete().eq('id', quotationId)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }
    navigate('/quotations')
  }

  const handleClone = async () => {
    if (!quotation) return
    try {
      let safeProjectId = quotation.project_id || null
      if (safeProjectId) {
        const { validateProjectAssignment } = await import('@/domain/projects')
        const { project, error: projectError } = await validateProjectAssignment(supabase as any, {
          projectId: safeProjectId,
          documentClientId: quotation.client_id,
          documentClientName: quotation.client_name,
        })
        if (projectError || !project) safeProjectId = null
      }
      const { data: quotationRows } = await supabase.from('quotations').select('quotation_number')
      const nextQuotationNumber = getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>)
      const customFields = parseDocumentCustomFields(quotation.custom_fields || {})
      const { conversionTrail: _ignoredTrail, ...restCustomFields } = customFields
      const payload = {
        quotation_number: nextQuotationNumber,
        po_number: poNumber || null,
        quotation_title: quotation.quotation_title || null,
        client_id: quotation.client_id || null,
        client_name: quotation.client_name || '',
        project_id: safeProjectId,
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: quotation.valid_until || null,
        status: 'open',
        notes: quotation.notes || '',
        terms: quotation.terms || '',
        workmanship: Number(quotation.workmanship || 0),
        transportation: Number(quotation.transportation || 0),
        shipping: Number(quotation.shipping || 0),
        discount: Number(quotation.discount || 0),
        vat: Number(quotation.vat || 0),
        wht: Number(quotation.wht || 0),
        subtotal: Number(quotation.subtotal || 0),
        install_rate_total: Number(quotation.install_rate_total || 0),
        total: Number(quotation.total || 0),
        amount_in_words: quotation.amount_in_words || '',
        custom_fields: JSON.stringify({
          ...restCustomFields,
          quotationTitle: quotation.quotation_title || '',
          clientName: quotation.client_name || '',
          notesHtml: quotation.notes || '',
          termsHtml: quotation.terms || '',
        }),
      }

      const { data: createdQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([payload])
        .select()
        .single()

      if (quotationError || !createdQuotation) throw new Error(quotationError?.message || 'Failed to clone quotation')

      const itemRows = items
        .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
        .map((item, index) => toQuotationItemRow(item, String(createdQuotation.id), index))

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
        if (itemError) {
          await supabase.from('quotations').delete().eq('id', createdQuotation.id)
          throw new Error(itemError.message)
        }
      }

      navigate(`/quotations/${createdQuotation.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clone failed'
      toast({ title: 'Clone failed', description: message, variant: 'destructive' })
    }
  }

  const handleRecordPaymentPlaceholder = () => {
    toast({ title: 'Unavailable', description: 'Create an invoice from this quotation to record a payment.' })
  }

  const handleConvertToInvoice = async () => {
    if (!quotation || converting) return
    setConverting(true)
    try {
      let safeProjectId = quotation.project_id || null
      if (safeProjectId) {
        const { validateProjectAssignment } = await import('@/domain/projects')
        const { project, error: projectError } = await validateProjectAssignment(supabase as any, {
          projectId: safeProjectId,
          documentClientId: quotation.client_id,
          documentClientName: quotation.client_name,
        })
        if (projectError || !project) safeProjectId = null
      }
      const [{ data: invoiceRows }, { data: latestQuotation }] = await Promise.all([
        supabase.from('invoices').select('invoice_number'),
        supabase.from('quotations').select('custom_fields').eq('id', quotationId).single(),
      ])

      const nextInvoiceNumber = getNextInvoiceNumber((invoiceRows || []) as Array<{ invoice_number?: string | null }>)
      const quotationCustomFields = parseDocumentCustomFields(latestQuotation?.custom_fields || quotation.custom_fields)
      const sourceLink = buildTrailLink({
        id: quotation.id,
        type: 'quotation',
        number: quotation.quotation_number,
        project_id: quotation.project_id ?? null,
        po_number: poNumber || null,
      })

      const invoiceCustomFields = withSourceTrail(quotationCustomFields, sourceLink)
      const invoicePayload = {
        invoice_number: nextInvoiceNumber,
        po_number: poNumber || null,
        invoice_title: quotation.quotation_title || null,
        client_id: quotation.client_id || null,
        client_name: quotation.client_name || '',
        project_id: safeProjectId,
        issue_date: quotation.issue_date || new Date().toISOString().split('T')[0],
        due_date: quotation.valid_until || null,
        status: 'unpaid',
        document_type: 'INVOICE',
        payment_terms: null,
        notes: quotation.notes || '',
        terms: quotation.terms || '',
        workmanship: Number(quotation.workmanship || 0),
        transportation: Number(quotation.transportation || 0),
        shipping: Number(quotation.shipping || 0),
        discount: Number(quotation.discount || 0),
        vat: Number(quotation.vat || 0),
        wht: Number(quotation.wht || 0),
        subtotal: Number(quotation.subtotal || 0),
        install_rate_total: Number(quotation.install_rate_total || 0),
        total: Number(quotation.total || 0),
        amount_in_words: quotation.amount_in_words || '',
        custom_fields: JSON.stringify(invoiceCustomFields),
      }

      const { data: createdInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoicePayload])
        .select()
        .single()

      if (invoiceError || !createdInvoice) throw new Error(invoiceError?.message || 'Failed to create invoice')

      const itemRows = items
        .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
        .map((item, index) => toDbItem(item, createdInvoice.id, index))

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('invoice_items').insert(itemRows)
        if (itemError) {
          await supabase.from('invoices').delete().eq('id', createdInvoice.id)
          throw new Error(itemError.message)
        }
      }

      const derivedLink = buildTrailLink({
        id: createdInvoice.id,
        type: 'invoice',
        number: createdInvoice.invoice_number,
        project_id: createdInvoice.project_id ?? quotation.project_id ?? null,
        po_number: createdInvoice.po_number ?? poNumber ?? null,
      })
      const updatedQuotationFields = appendDerivedTrail(quotationCustomFields, derivedLink)
      const { error: trailError } = await supabase
        .from('quotations')
        .update({ custom_fields: JSON.stringify(updatedQuotationFields) })
        .eq('id', quotationId)

      if (trailError) {
        await supabase.from('invoice_items').delete().eq('invoice_id', createdInvoice.id)
        await supabase.from('invoices').delete().eq('id', createdInvoice.id)
        throw new Error(trailError.message)
      }

      navigate(`/invoices/${createdInvoice.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Conversion failed'
      toast({ title: 'Convert to invoice failed', description: message, variant: 'destructive' })
    } finally {
      setConverting(false)
    }
  }

  if (loading) return <div className={operationalEmptyStateClassName}>Loading quotation...</div>
  if (!quotation) return <div className={operationalEmptyStateClassName}>Quotation not found.</div>

  const shellActionItems = [
    {
      label: projectActionState.label,
      subtitle: projectActionState.hasProject ? (linkedProject?.name || 'Open the linked project workspace') : 'Attach this quotation to a project',
      onClick: () => {
        if (quotation.project_id) {
          navigate(`/projects/${quotation.project_id}`)
          return
        }
        setShowProjectLinkDialog(true)
      },
      iconKey: projectActionState.hasProject ? 'projectView' : 'projectLink',
    },
    {
      label: documentActionState.label,
      subtitle: documentActionState.hasLinkedDocuments ? 'View source, generated, and related records' : 'Connect this quotation to related records',
      onClick: () => setShowLinkedDocuments(true),
      iconKey: documentActionState.hasLinkedDocuments ? 'documentsView' : 'documentsLink',
    },
    { label: 'Export CSV', subtitle: 'Download a spreadsheet copy', onClick: () => handleDownloadCsv(), iconKey: 'export' },
    { label: 'Clone Quotation', subtitle: 'Duplicate this quotation as an open record', onClick: () => void handleClone(), iconKey: 'clone' },
    { label: 'Copy Quotation Number', subtitle: quotation.quotation_number || 'Copy the current document number', onClick: () => void handleCopy(quotation.quotation_number || '', 'Quotation number'), iconKey: 'copy' },
    { label: converting ? 'Converting...' : 'Convert to Invoice', subtitle: 'Turn this quotation into an invoice', onClick: () => void handleConvertToInvoice(), disabled: converting, iconKey: 'convert' },
    { label: 'Record Payment', subtitle: 'Unavailable until converted to invoice', onClick: handleRecordPaymentPlaceholder, iconKey: 'payment' },
    { label: 'Archive Quotation', subtitle: 'Move this quotation to archives', onClick: () => setShowArchiveConfirm(true), iconKey: 'archive' },
    { label: 'Delete Quotation', subtitle: 'Permanently remove this quotation', onClick: () => setShowDeleteConfirm(true), danger: true, iconKey: 'delete' },
  ]

  const shellQuotationTotal = totals?.totalPayable ?? Number(quotation.total || 0)
  const handlePdfDesignPresetChange = (nextPreset) => {
    setPdfDesignPresetState(nextPreset)
    setPdfDesignPreset('quotation', nextPreset)
  }
  const previewBankAccounts = bankAccounts.map((account) => ({
    id: account.id,
    bankName: account.bank_name || '',
    accountName: account.account_name || '',
    accountNumber: account.account_number || '',
    sortCode: account.sort_code || '',
    isDefault: account.is_default === true,
  }))
  const selectedPreviewBank =
    previewBankAccounts.find((account) => account.id === pdfOutput.bankAccountId)
    || previewBankAccounts.find((account) => account.isDefault)
    || previewBankAccounts[0]
    || null
  const clientPreviewLines = [
    hasText(client?.contact_person) ? `Attn: ${String(client?.contact_person)}` : null,
    hasText(client?.address) ? String(client?.address) : null,
    [String(client?.city || ''), String(client?.state || '')].filter(Boolean).join(', '),
    hasText(client?.phone) ? String(client?.phone) : null,
    hasText(client?.email) ? String(client?.email) : null,
  ].filter(Boolean)
  const previewDetailRows = [
    { label: 'Client', value: quotation.client_name || 'Unassigned' },
    { label: 'PO Number', value: poNumber || '' },
    { label: 'Title', value: quotation.quotation_title || '' },
    ...topHeaderFields.map((field: any) => ({ label: field.label, value: field.value })),
  ].filter((row) => String(row.value || '').trim().length > 0)
  const customFields = parseDocumentCustomFields(quotation.custom_fields)

  const previewItems = items.map((item, index, sourceItems) => {
    if (item.row_type === 'group_header') {
      const groupId = item.group_id || null
      const showSubtotal = customFields?.groupMeta?.[groupId || '']?.showSubtotal === true
      const nextItems: any[] = [{ type: 'group', label: item.group_name || `Group ${index + 1}` }]
      const nextItem = sourceItems[index + 1]
      const shouldCloseImmediately = !nextItem || nextItem.row_type === 'group_header' || nextItem.group_id !== groupId
      if (shouldCloseImmediately) {
        nextItems.push({
          type: 'group_footer',
          showSubtotal,
          value: showSubtotal ? formatMoney(resolveGroupSubtotal(sourceItems, groupId)) : '',
        })
      }
      return nextItems
    }
    const itemFacts = [
      item.quantity ? `Qty: ${formatMergedQtyUnit(item.quantity, item.unit)}` : null,
      `Rate: ${formatMoney(item.unit_price || 0)}`,
      columns.find((column: any) => column.key === 'make')?.visible && item.make ? `Make: ${item.make}` : null,
      columns.find((column: any) => column.key === 'install_rate')?.visible && item.install_rate !== null && item.install_rate !== undefined ? `Install: ${item.install_rate}` : null,
      columns.find((column: any) => column.key === 'vat_rate')?.visible && item.vat_rate !== null && item.vat_rate !== undefined ? `VAT: ${item.vat_rate}%` : null,
      columns.find((column: any) => column.key === 'discount_rate')?.visible && item.discount_rate !== null && item.discount_rate !== undefined ? `Discount: ${item.discount_rate}%` : null,
      ...visibleCustomColumns.map((column: any) => {
        const value = (item.custom_data || {})[column.key]
        return value === null || value === undefined || value === '' ? null : `${column.label}: ${value}`
      }),
    ].filter(Boolean)
    const nextItems: any[] = [{
      type: 'line',
      label: item.description || 'Untitled item',
      detail: item.sub_description || '',
      imageUrl: resolveCanonicalItemImageUrl(item),
      value: formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0)),
      facts: itemFacts,
    }]
    const groupId = item.group_id || null
    const nextItem = sourceItems[index + 1]
    const groupEndsHere = groupId && (!nextItem || nextItem.row_type === 'group_header' || nextItem.group_id !== groupId)
    if (groupEndsHere) {
      const showSubtotal = customFields?.groupMeta?.[groupId]?.showSubtotal === true
      nextItems.push({
        type: 'group_footer',
        showSubtotal,
        value: showSubtotal ? formatMoney(resolveGroupSubtotal(sourceItems, groupId)) : '',
      })
    }
    return nextItems
  }).flat()

  const previewTotals = [
    ...buildSummaryRows({
      invoice: quotation,
      totals,
      customFields,
      chargeLabels: customFields?.chargeLabels,
      summaryLabels: getPdfSummaryLabels(quotation, pdfOutput),
    }).map(row => ({
      label: row.label,
      value: formatMoney(row.amount),
      valueClassName: row.tone === 'danger' ? 'text-red-600' : undefined
    })),
    { label: 'Total', value: formatMoney(shellQuotationTotal), emphasis: true, valueClassName: 'text-slate-950' },
  ]
  
  const previewNotesSections = [
    quotation.notes ? { title: notesTitle, content: renderRichText(quotation.notes) } : null,
    quotation.terms ? { title: termsTitle, content: renderRichText(quotation.terms) } : null,
    additionalFields.filter((field) => field?.label || field?.value).length > 0
      ? {
          title: 'Additional Fields',
          content: (
            <div className="space-y-3">
              {additionalFields
                .filter((field) => field?.label || field?.value)
                .map((field, index) => (
                  <div key={`preview-additional-field-${index}`} className="grid gap-1">
                    {field.label ? (
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                        {field.label}
                      </div>
                    ) : null}
                    <div className="whitespace-pre-wrap break-words">{field.value || '—'}</div>
                  </div>
                ))}
            </div>
          ),
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-32">
      <DocumentTopBar
        title={quotation.quotation_number}
        subtitle="Quotation"
        statusLabel={formatQuotationStatus(quotation.status)}
        statusClassName={quotationStatusTone(quotation.status)}
        onBack={() => navigate('/quotations')}
        onMore={() => setShowMobileActions(true)}
      />

      <DocumentActionGrid
        actions={[
          { key: 'pdf', label: 'PDF', onClick: () => setShowPdfSettings(true), variant: 'dark' },
          { key: 'edit', label: 'Edit', onClick: () => navigate(`/quotations/edit/${quotationId}`), variant: 'outline' },
          { key: 'download', label: 'Convert', onClick: () => void handleConvertToInvoice(), variant: 'blue', disabled: converting },
          { key: 'more', label: 'More', onClick: () => setShowMobileActions(true), variant: 'outline' },
        ]}
      />

      <DocumentStatusStrip
        items={QUOTATION_STATUSES.map((status) => ({
          label: formatQuotationStatus(status),
          active: quotation.status === status,
          onClick: () => void handleStatusChange(status),
        }))}
      />

      <DocumentLivePreviewCard
        templateLabel="New PDF Foundation"
        documentLabel="Quotation"
        documentNumber={quotation.quotation_number || 'Quotation'}
        companyName={companyIdentity.companyName || ''}
        companyTagline={pdfOutput.showTagline ? companyIdentity.companyTagline || '' : ''}
        companyLogoUrl={resolveCanonicalLogoUrl(settings)}
        companyLines={companyIdentity.lines}
        recipientLabel="Prepared For"
        recipientName={quotation.client_name || 'Unassigned'}
        recipientLines={clientPreviewLines}
        meta={[
          { label: 'Issue Date', value: quotation.issue_date || 'Not set' },
          { label: 'Valid Until', value: quotation.valid_until || 'Open' },
          { label: 'Status', value: formatQuotationStatus(quotation.status) },
        ]}
        detailRows={previewDetailRows}
        items={previewItems}
        totals={previewTotals}
        amountInWords={pdfOutput.showAmountInWords === false ? '' : quotation.amount_in_words || ''}
        bankDetails={pdfOutput.showBankDetails && selectedPreviewBank ? selectedPreviewBank : null}
        notesSections={previewNotesSections}
        signatory={null}
        accentColor={pdfDesignPreset.accentColor}
        headerFontFamily={resolvePdfWebFontFamily(pdfDesignPreset.headerFont)}
        bodyFontFamily={resolvePdfWebFontFamily(pdfDesignPreset.bodyFont)}
        previewNote="Preview reflects the live PDF foundation and current export settings."
      />

      <PdfBankControls
        value={pdfOutput}
        onChange={(next) => void handlePdfOutputChange(next)}
        bankAccounts={previewBankAccounts}
      />

      <DocumentSection title="Customize Design">
        <DocumentDesignPanel
          title="Design"
          subtitle="Preview styling and supporting output controls while the new quotation PDF system is under construction."
          badge="Foundation Reset"
          sections={[
            {
              key: 'styling',
              title: 'Preview Styling',
              content: (
                <DocumentTemplateDesignOverrides
                  value={pdfDesignPreset}
                  onChange={handlePdfDesignPresetChange}
                />
              ),
            },
            {
              key: 'output',
              title: 'Letterhead & Footer',
              content: (
                <PdfSupportingOptions
                  value={pdfOutput}
                  onChange={(next) => void handlePdfOutputChange(next)}
                  companyTagline={String(settings?.company_tagline || '')}
                  footerText={String(settings?.footer_text || '')}
                />
              ),
            },
          ]}
          />
        </DocumentSection>

      <DocumentActionSheet
        open={showMobileActions}
        onOpenChange={setShowMobileActions}
        title="Quotation Actions"
        subtitle={quotation.quotation_number}
        actions={shellActionItems}
      />

      <DocumentPdfSheet
        open={showPdfSettings}
        onOpenChange={setShowPdfSettings}
        title="Download & Export"
        subtitle="Quotation PDF export uses the live PDF renderer and current output settings."
        settingsNode={null}
        templateValue={templateId}
        onTemplateChange={setTemplateId}
        templates={pdfTemplates}
        actions={[
          { label: 'Export CSV', onClick: handleDownloadCsv, variant: 'outline' },
          { label: pdfGenerating ? 'Generating...' : 'Download PDF', onClick: () => void handleDownloadPdf(), className: 'bg-slate-950 text-white hover:bg-slate-800', disabled: pdfGenerating },
        ]}
      />

      <ConfirmActionDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive this quotation?"
        description="This quotation will be hidden from your list until you restore it from Settings > Archives."
        confirmLabel="Archive Quotation"
        variant="default"
        onConfirm={() => void handleArchive()}
      />

      <ConfirmActionDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this quotation?"
        description="Deleting this quotation is permanent and cannot be undone."
        confirmLabel="Delete Quotation"
        onConfirm={() => void handleDelete()}
      />

      <LinkedDocumentsSheet
        open={showLinkedDocuments}
        onOpenChange={setShowLinkedDocuments}
        title="Linked Documents"
        subtitle={quotation.quotation_number}
        sections={linkedDocumentsSections}
      />

      <ProjectLinkDialog
        open={showProjectLinkDialog}
        onOpenChange={setShowProjectLinkDialog}
        tableName="quotations"
        recordId={quotationId}
        documentLabel="Quotation"
        onLinked={async () => {
          const { data: refreshed } = await supabase.from('quotations').select('*').eq('id', quotationId).single()
          if (!refreshed) return
          const nextProject = refreshed.project_id ? await fetchProjectSummary(refreshed.project_id) : null
          setQuotation((current) => (current ? { ...current, project_id: refreshed.project_id ?? null } : current))
          setLinkedProject(nextProject)
        }}
      />

      <DocumentFloatingFab onClick={() => setShowPdfSettings(true)} />

      <DocumentBottomBar
        actions={[
          { label: 'Back', onClick: () => navigate('/quotations'), variant: 'outline' },
          { label: 'Edit', onClick: () => navigate(`/quotations/edit/${quotationId}`), variant: 'outline' },
          { label: pdfGenerating ? 'Generating...' : 'Download PDF', onClick: () => void handleDownloadPdf(), className: 'bg-slate-950 text-white hover:bg-slate-800', disabled: pdfGenerating },
        ]}
      />
    </div>
  )

}
