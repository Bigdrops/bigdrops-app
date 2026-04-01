import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { PdfBankControls, PdfSupportingOptions } from '@/components/PdfOutputSettings'
import {
  DocumentActionGrid,
  DocumentActionSheet,
  DocumentBottomBar,
  DocumentDesignPanel,
  DocumentDesignStyleEditor,
  DocumentFloatingFab,
  DocumentLivePreviewCard,
  DocumentPdfSheet,
  DocumentSection,
  DocumentSummaryDisclosure,
  DocumentStatusStrip,
  DocumentTemplatePicker,
  DocumentTopBar,
} from '@/components/document/DocumentViewShell'
import { supabase } from '@/supabase'
import { calcTotals } from '@/components/useInvoiceColumns.jsx'
import { computeDocument } from '@/lib/Calculations'
import { PDF_TEMPLATES, DEFAULT_TEMPLATE, type PdfTemplateId } from '@/components/pdf/pdfTemplates'
import { getPdfDesignPreset, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { getPdfTemplatePreset, setPdfTemplatePreset } from '@/lib/pdfTemplatePreset'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { toDbItem, type InvoiceItem } from '@/domain/invoice'
import {
  appendDerivedTrail,
  buildTrailLink,
  getNextInvoiceNumber,
  parseDocumentCustomFields,
  toQuotationItemRow,
  withSourceTrail,
} from '@/domain/documentConversion'
import { fetchProjectSummary, getQuotationDocumentRelations, hasQuotationRelatedDocuments } from '@/domain/documentRelationships'
import type { DbQuotation, DbQuotationItem, Quotation } from '@/domain/quotation'
import { buildQuotationFormState, getNextQuotationNumber } from '@/domain/quotation'
import { buildQuotationCsv, downloadQuotationCsv } from './exportQuotationCsv'
import { QUOTATION_STATUSES, formatQuotationStatus, quotationStatusTone } from './quotationStatus'

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

const defaultPdfOutput: PdfOutputState = {
  showBankDetails: false,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
}

function renderRichText(value?: string) {
  if (!value) return <span className="text-muted-foreground">Not provided</span>
  const clean = DOMPurify.sanitize(value)
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: clean }} />
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isNarrow
}

function formatMoney(value: number | string | null | undefined) {
  const parsed =
    typeof value === 'string'
      ? Number(value.replace(/[^0-9.-]/g, '') || 0)
      : Number(value || 0)
  const safe = Number.isFinite(parsed) ? parsed : 0
  return `₦${safe.toLocaleString('en-NG', {
    minimumFractionDigits: Math.abs(safe % 1) > 0.000001 ? 2 : 0,
    maximumFractionDigits: Math.abs(safe % 1) > 0.000001 ? 2 : 0,
  })}`
}

export default function QuotationDetail({ quotationId }: { quotationId: string }) {
  const navigate = useNavigate()
  const isNarrow = useIsNarrow()
  const [loading, setLoading] = useState(true)
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [headerFields, setHeaderFields] = useState<any[]>([])
  const [bottomFields, setBottomFields] = useState<any[]>([])
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
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplateId>(() => getPdfTemplatePreset('quotation', DEFAULT_TEMPLATE))
  const [pdfDesignPreset, setPdfDesignPresetState] = useState(() => getPdfDesignPreset('quotation'))
  const [converting, setConverting] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const [showPdfSettings, setShowPdfSettings] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [linkedProject, setLinkedProject] = useState<{ id: string; name?: string | null } | null>(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const hasText = (value: unknown) => String(value || '').trim().length > 0

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
      setBottomFields(state.bottomFields)
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
      setSettings((settingsResponse.data as Record<string, unknown> | null) || null)
      setLinkedProject(state.quotation.project_id ? await fetchProjectSummary(state.quotation.project_id) : null)
      setLoading(false)
    }

    load()
  }, [quotationId])

  const totals = useMemo(() => {
    if (!quotation) return null
    return calcTotals({ items, columns, invoice: quotation, discountType, discountTiming, whtType })
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
  const hasLinkedDocuments = hasQuotationRelatedDocuments(quotation)
  const linkedDocumentsSections = [
    {
      key: 'source',
      title: 'Source',
      description: 'Documents this quotation came from.',
      items: quotationRelations.source
        ? [{
            key: `source-${quotationRelations.source.id || quotationRelations.source.number || 'quotation-source'}`,
            label: `${quotationRelations.source.type === 'invoice' ? 'Invoice' : 'Quotation'} ${quotationRelations.source.number || quotationRelations.source.id || 'Linked source'}`,
            subtitle: 'Open the source document',
            onClick: () => {
              if (quotationRelations.source?.id) {
                navigate(`/${quotationRelations.source.type === 'invoice' ? 'invoices' : 'quotations'}/${quotationRelations.source.id}`)
              }
            },
            disabled: !quotationRelations.source?.id,
          }]
        : [],
    },
    {
      key: 'generated',
      title: 'Generated / Child Documents',
      description: 'Documents created from this quotation.',
      items: derivedInvoices.map((entry) => ({
        key: `invoice-${entry.id}`,
        label: `Invoice ${entry.number || entry.id}`,
        subtitle: 'Open generated invoice',
        onClick: () => navigate(`/invoices/${entry.id}`),
      })),
    },
    {
      key: 'project',
      title: 'Project',
      description: 'Project connected to this quotation.',
      items: linkedProject
        ? [{
            key: `project-${linkedProject.id}`,
            label: linkedProject.name || linkedProject.id,
            subtitle: 'Open linked project',
            onClick: () => navigate(`/projects/${linkedProject.id}`),
          }]
        : [],
    },
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
      const computedResult = computeDocument({
        items,
        document: quotation,
        cf: quotation.custom_fields || {},
      })
      const templateMap = {
        bold: () => import('@/components/pdf/InvoicePDF_Bold'),
        compact: () => import('@/components/pdf/InvoicePDF_Compact'),
        proforma: () => import('@/components/pdf/InvoicePDF_Proforma'),
        quotation: () => import('./QuotationPDF'),
      }
      const [{ pdf }, { default: TemplatePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        (templateMap[pdfTemplate] ?? templateMap.proforma)(),
      ])
      const blob = await pdf(
        <TemplatePDF document={quotation} items={items} client={client} settings={settings} computedResult={computedResult} designPreset={pdfDesignPreset} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (quotation.quotation_number || 'quotation') + '.pdf'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
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
        project_id: quotation.project_id || null,
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: quotation.valid_until || null,
        status: 'draft',
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
    toast({ title: 'Coming soon', description: 'Convert this quotation to an invoice first before recording payment.' })
  }

  const handleConvertToInvoice = async () => {
    if (!quotation || converting) return
    setConverting(true)
    try {
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
        project_id: quotation.project_id || null,
        issue_date: quotation.issue_date || new Date().toISOString().split('T')[0],
        due_date: quotation.valid_until || null,
        status: 'draft',
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

  if (loading) return <div className="rounded-2xl border border-zinc-200 bg-card p-8 text-sm text-zinc-500 shadow-sm">Loading quotation...</div>
  if (!quotation) return <div className="rounded-2xl border border-zinc-200 bg-card p-8 text-sm text-zinc-500 shadow-sm">Quotation not found.</div>

  const shellActionItems = [
    {
      label: quotation.project_id ? 'View Project' : 'Link to Project',
      subtitle: quotation.project_id ? (linkedProject?.name || 'Open the linked project workspace') : 'Attach this quotation to a project',
      onClick: () => {
        if (quotation.project_id) {
          navigate(`/projects/${quotation.project_id}`)
          return
        }
        setShowProjectLinkDialog(true)
      },
      iconKey: quotation.project_id ? 'projectView' : 'projectLink',
    },
    {
      label: hasLinkedDocuments ? 'Linked Documents' : 'Link Documents',
      subtitle: hasLinkedDocuments ? 'View source, generated, and related records' : 'Connect this quotation to related records',
      onClick: () => setShowLinkedDocuments(true),
      iconKey: hasLinkedDocuments ? 'documentsView' : 'documentsLink',
    },
    { label: 'Export CSV', subtitle: 'Download a spreadsheet copy', onClick: () => handleDownloadCsv(), iconKey: 'export' },
    { label: 'Clone Quotation', subtitle: 'Duplicate this quotation as a draft', onClick: () => void handleClone(), iconKey: 'clone' },
    { label: 'Copy Quotation Number', subtitle: quotation.quotation_number || 'Copy the current document number', onClick: () => void handleCopy(quotation.quotation_number || '', 'Quotation number'), iconKey: 'copy' },
    { label: converting ? 'Converting...' : 'Convert to Invoice', subtitle: 'Turn this quotation into an invoice', onClick: () => void handleConvertToInvoice(), disabled: converting, iconKey: 'convert' },
    ...(quotation.status === 'draft' ? [{ label: 'Mark Sent', subtitle: 'Move this quotation to sent', onClick: () => void handleStatusChange('sent'), iconKey: 'convert' }] : []),
    { label: 'Record Payment', subtitle: 'Unavailable until converted to invoice', onClick: handleRecordPaymentPlaceholder, iconKey: 'payment' },
    { label: 'Archive Quotation', subtitle: 'Move this quotation to archives', onClick: () => setShowArchiveConfirm(true), iconKey: 'archive' },
    { label: 'Delete Quotation', subtitle: 'Permanently remove this quotation', onClick: () => setShowDeleteConfirm(true), danger: true, iconKey: 'delete' },
  ]

  const shellQuotationTotal = totals?.totalPayable ?? Number(quotation.total || 0)
  const activePdfTemplate = PDF_TEMPLATES.find((template) => template.id === pdfTemplate) || PDF_TEMPLATES[0]
  const handlePdfTemplateChange = (nextTemplate: PdfTemplateId) => {
    setPdfTemplate(nextTemplate)
    setPdfTemplatePreset('quotation', nextTemplate)
  }
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
  const previewItems = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      return { type: 'group', label: item.group_name || `Group ${index + 1}` }
    }
    const itemFacts = [
      item.quantity ? `Qty: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null,
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
    return {
      type: 'line',
      label: item.description || 'Untitled item',
      detail: item.sub_description || '',
      value: formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0)),
      facts: itemFacts,
    }
  })
  const previewTotals = [
    { label: 'Subtotal', value: formatMoney(totals?.rawSubtotal || 0) },
    ...(Number(totals?.installRateTotal || 0) > 0 ? [{ label: 'Install Rate', value: formatMoney(totals?.installRateTotal || 0) }] : []),
    ...(Number(totals?.vatAmount || 0) > 0 ? [{ label: 'VAT', value: formatMoney(totals?.vatAmount || 0) }] : []),
    ...(Number(totals?.discountAmount || 0) > 0 ? [{ label: 'Discount', value: formatMoney(totals?.discountAmount || 0), valueClassName: 'text-red-600' }] : []),
    ...(Number(totals?.whtAmount || 0) > 0 ? [{ label: 'WHT', value: formatMoney(totals?.whtAmount || 0) }] : []),
    { label: 'Total', value: formatMoney(shellQuotationTotal), emphasis: true, valueClassName: 'text-slate-950' },
  ]
  const previewNotesSections = [
    quotation.notes ? { title: notesTitle, content: renderRichText(quotation.notes) } : null,
    quotation.terms ? { title: termsTitle, content: renderRichText(quotation.terms) } : null,
    ...bottomFields
      .filter((field) => field?.text)
      .map((field, index) => ({
        title: index === 0 ? 'Additional Notes' : `Additional Notes ${index + 1}`,
        content: <div className="whitespace-pre-wrap break-words">{field.text}</div>,
      })),
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

      <DocumentSummaryDisclosure
        eyebrow="Total Quote"
        value={formatMoney(shellQuotationTotal)}
        helper={quotation.quotation_title || 'Quotation prepared for client review.'}
        stats={[
          { label: 'Valid Until', value: quotation.valid_until || 'Open' },
          { label: 'Issue Date', value: quotation.issue_date || 'Not set' },
          { label: 'Client', value: quotation.client_name || 'Unassigned' },
        ]}
        compactLabel="Quotation Summary"
        openLabel="Open summary"
        closeLabel="Collapse summary"
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
        templateLabel={activePdfTemplate.label}
        documentLabel="Quotation"
        documentNumber={quotation.quotation_number || 'Quotation'}
        companyName={companyIdentity.companyName || ''}
        companyTagline={pdfOutput.showTagline ? companyIdentity.companyTagline || '' : ''}
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
        amountInWords={quotation.amount_in_words || ''}
        bankDetails={pdfOutput.showBankDetails && selectedPreviewBank ? selectedPreviewBank : null}
        notesSections={previewNotesSections}
        accentColor={pdfDesignPreset.accentColor}
      />

      <PdfBankControls
        value={pdfOutput}
        onChange={(next) => void handlePdfOutputChange(next)}
        bankAccounts={previewBankAccounts}
      />

      <DocumentSection title="Customize Design">
        <DocumentDesignPanel
          title="Design"
          badge={activePdfTemplate.label}
          sections={[
            {
              key: 'template',
              title: 'Template',
              content: (
                <DocumentTemplatePicker value={pdfTemplate} onChange={handlePdfTemplateChange} templates={PDF_TEMPLATES} />
              ),
            },
            {
              key: 'styling',
              title: 'Fonts & Color',
              content: (
                <DocumentDesignStyleEditor value={pdfDesignPreset} onChange={handlePdfDesignPresetChange} />
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

      <DocumentSection title="Line Items">
        <Card className="rounded-[24px] border-border shadow-sm">
          <CardContent className="space-y-3 p-4">
            {(() => {
              let itemNumber = 0
              return items.map((item, index) => {
                if (item.row_type === 'group_header') {
                  return (
                    <div key={item._uiKey || item.id || index} className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-300">
                      {item.group_name || `Group ${index + 1}`}
                    </div>
                  )
                }
                itemNumber += 1
                return (
                  <div key={item._uiKey || item.id || index} className="flex gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-extrabold text-slate-500">{itemNumber}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">{item.description || 'Untitled item'}</div>
                      {item.sub_description ? <div className="mt-1 text-xs text-muted-foreground">{item.sub_description}</div> : null}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Qty {item.quantity || 0}
                        {item.unit ? ` ${item.unit}` : ''}
                        {item.make ? ` · ${item.make}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold text-foreground">{formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}</div>
                      <div className="text-[11px] text-muted-foreground">{formatMoney(item.unit_price || 0)} each</div>
                    </div>
                  </div>
                )
              })
            })()}
          </CardContent>
        </Card>
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
        subtitle={`Using ${activePdfTemplate.label} as the saved quotation PDF preset on this device.`}
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

  const actionItems = [
    {
      key: 'project',
      label: quotation.project_id ? 'View Project' : 'Link to Project',
      action: () => {
        if (quotation.project_id) {
          navigate(`/projects/${quotation.project_id}`)
          return
        }
        setShowProjectLinkDialog(true)
      },
    },
    {
      key: 'documents',
      label: hasLinkedDocuments ? 'Linked Documents' : 'Link Documents',
      action: () => setShowLinkedDocuments(true),
    },
    { key: 'export-csv', label: 'Export CSV', action: () => handleDownloadCsv() },
    { key: 'clone-quotation', label: 'Clone Quotation', action: () => void handleClone() },
    { key: 'pdf-output-settings', label: 'PDF Output Settings', action: () => setShowPdfSettings(true) },
    {
      key: 'convert-to-invoice',
      label: converting ? 'Converting...' : 'Convert to Invoice',
      action: () => void handleConvertToInvoice(),
      disabled: converting,
    },
    ...(quotation.status === 'draft'
      ? [{ key: 'mark-sent', label: 'Mark Sent', action: () => void handleStatusChange('sent') }]
      : []),
    { key: 'record-payment', label: 'Record Payment', action: handleRecordPaymentPlaceholder },
    { key: 'separator-copy', separator: true },
    {
      key: 'copy-quotation-number',
      label: 'Copy quotation number',
      action: () => void handleCopy(quotation.quotation_number || '', 'Quotation number'),
    },
    { key: 'separator-danger', separator: true },
    { key: 'archive-quotation', label: 'Archive Quotation', action: () => setShowArchiveConfirm(true) },
    { key: 'delete-quotation', label: 'Delete Quotation', action: () => setShowDeleteConfirm(true), danger: true },
  ] as Array<
    | { key: string; separator: true }
    | { key: string; label: string; action: () => void; disabled?: boolean; danger?: boolean }
  >

  return (
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-5 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={`h-auto px-3 py-1 text-[11px] font-bold uppercase ${quotationStatusTone(quotation.status)}`}>
                {formatQuotationStatus(quotation.status)}
              </Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Quotation</span>
            </div>
            <h2 className="m-0 break-words text-[24px] font-extrabold tracking-tight text-foreground sm:text-[30px]">
              {quotation.quotation_number}
            </h2>
            {quotation.quotation_title ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-[15px]">{quotation.quotation_title}</p>
            ) : null}
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/quotations')}>
              Back to Quotations
            </Button>
            <Button type="button" variant="default" className="w-full" onClick={handleDownloadPdf} disabled={pdfGenerating}>
              {pdfGenerating ? 'Generating PDF...' : 'Download PDF'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/quotations/edit/${quotationId}`)}>
              Edit
            </Button>
            {isNarrow ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowMobileActions(true)}>
                More Actions
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="w-full">
                    More Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-56 max-w-[calc(100vw-2rem)]">
                  <DropdownMenuLabel>Quotation Actions</DropdownMenuLabel>
                  {actionItems.map((item) =>
                    'separator' in item ? (
                      <DropdownMenuSeparator key={item.key} />
                    ) : (
                      <DropdownMenuItem
                        key={item.key}
                        onSelect={item.action}
                        disabled={item.disabled}
                        className={item.danger ? 'text-red-700 focus:text-red-700' : undefined}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border bg-card shadow-none">
              <CardContent className="p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Client</div>
                <div className="mt-2 text-base font-semibold text-foreground">{quotation.client_name || 'Unassigned'}</div>
                {hasText(client?.contact_person) ? <div className="mt-1 text-sm text-muted-foreground">{String(client?.contact_person)}</div> : null}
                {hasText(client?.email) ? <div className="text-sm text-muted-foreground">{String(client?.email)}</div> : null}
                {hasText(client?.phone) ? <div className="text-sm text-muted-foreground">{String(client?.phone)}</div> : null}
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-none">
              <CardContent className="p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Quotation Summary</div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div>Status: {formatQuotationStatus(quotation.status)}</div>
                  <div>Issued: {quotation.issue_date || 'Not set'}</div>
                  <div>Valid until: {quotation.valid_until || 'Not set'}</div>
                  {poNumber ? <div>P.O. Number: {poNumber}</div> : null}
                </div>
              </CardContent>
            </Card>
            {topHeaderFields.length > 0 ? (
              <Card className="border-border bg-card shadow-none sm:col-span-2">
                <CardContent className="p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Reference Fields</div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {topHeaderFields.map((field: any) => (
                      <div key={field.id || field.label}>
                        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{field.label}</div>
                        <div className="mt-1 break-words text-sm text-foreground">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {(conversionTrail.source?.number || derivedInvoices.length > 0) ? (
              <Card className="border-border bg-card shadow-none sm:col-span-2">
                <CardContent className="p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Conversion Trail</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {conversionTrail.source?.number ? (
                      <div>
                        Source: {conversionTrail.source.type === 'invoice' ? 'Invoice' : 'Quotation'} {conversionTrail.source.number}
                      </div>
                    ) : null}
                    {derivedInvoices.length > 0 ? (
                      <div className="space-y-1">
                        <div>Created invoices:</div>
                        {derivedInvoices.map((entry) => (
                          <button
                            key={entry.id || entry.number}
                            type="button"
                            onClick={() => navigate(`/invoices/${entry.id}`)}
                            className="block text-left text-sm font-medium text-blue-700 hover:underline"
                          >
                            {entry.number || 'Open invoice'}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="border-border bg-slate-950 text-white shadow-none">
            <CardContent className="px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Document Identity</div>
              <div className="mt-2 text-lg font-bold">{companyIdentity.companyName || 'Quotation'}</div>
              {companyIdentity.companyTagline ? <div className="mt-1 text-sm text-slate-300">{companyIdentity.companyTagline}</div> : null}
              {companyIdentity.lines.length > 0 ? (
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  {companyIdentity.lines.map((line) => <div key={line}>{line}</div>)}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {QUOTATION_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size={isNarrow ? 'sm' : 'default'}
            variant={quotation.status === status ? 'default' : 'outline'}
            onClick={() => handleStatusChange(status)}
          >
            Mark {formatQuotationStatus(status)}
          </Button>
        ))}
      </div>

      <Sheet open={showMobileActions} onOpenChange={setShowMobileActions}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-3xl px-0">
          <SheetHeader className="border-b border-border px-5 pb-4 pt-5">
            <SheetTitle className="text-base font-bold text-foreground">Quotation Actions</SheetTitle>
            <SheetDescription>
              Quick actions for this quotation, optimized for smaller screens.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-5 py-4">
            {actionItems.map((item) =>
              'separator' in item ? (
                <div key={item.key} className="my-1 border-t border-border" />
              ) : (
                <Button
                  key={item.key}
                  type="button"
                  variant={item.danger ? 'destructive' : 'outline'}
                  className="justify-start"
                  disabled={item.disabled}
                  onClick={() => {
                    setShowMobileActions(false)
                    item.action()
                  }}
                >
                  {item.label}
                </Button>
              ),
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showPdfSettings} onOpenChange={setShowPdfSettings}>
        <SheetContent side={isNarrow ? 'bottom' : 'right'} className="overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base font-bold text-foreground">PDF Output Settings</SheetTitle>
            <SheetDescription>
              Control what appears in the generated quotation PDF.
            </SheetDescription>
          </SheetHeader>
          <div className="pb-6">
            <PdfOutputSettings
              value={pdfOutput}
              onChange={(next) => void handlePdfOutputChange(next)}
              bankAccounts={bankAccounts.map((account) => ({
                id: account.id,
                bankName: account.bank_name || '',
                accountName: account.account_name || '',
                accountNumber: account.account_number || '',
                sortCode: account.sort_code || '',
                isDefault: account.is_default === true,
              }))}
              companyTagline={String(settings?.company_tagline || '')}
              footerText={String(settings?.footer_text || '')}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Template</div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {PDF_TEMPLATES.map((t) => {
                  const on = pdfTemplate === t.id
                  return (
                    <div
                      key={t.id}
                      onClick={() => setPdfTemplate(t.id)}
                      style={{
                        flexShrink: 0,
                        width: 110,
                        border: `2px solid ${on ? '#0F172A' : '#E2E8F0'}`,
                        borderRadius: 12,
                        padding: '10px 8px',
                        backgroundColor: on ? '#0F172A' : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: on ? 'white' : '#0F172A', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 9, color: on ? '#94A3B8' : '#64748B' }}>{t.description}</div>
                      {on && <div style={{ marginTop: 3, fontSize: 8, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>Active</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              {isNarrow ? (
                <div className="space-y-3">
                  {(() => {
                    let itemNumber = 0
                    return items.map((item, index) => {
                      if (item.row_type === 'group_header') {
                        return (
                          <div key={item._uiKey || item.id || index} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                            {item.group_name || `Group ${index + 1}`}
                          </div>
                        )
                      }
                      itemNumber += 1
                      return (
                        <div key={item._uiKey || item.id || index} className="rounded-2xl border border-zinc-200 bg-card p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Item {itemNumber}</div>
                              <div className="mt-1 break-words font-semibold text-foreground">{item.description || 'Untitled item'}</div>
                              {item.sub_description ? <div className="mt-1 break-words text-sm text-muted-foreground">{item.sub_description}</div> : null}
                            </div>
                            <div className="shrink-0 text-right text-sm font-bold text-foreground">
                              {formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                            <div>Qty: {item.quantity || 0}</div>
                            <div>Rate: {formatMoney(item.unit_price || 0)}</div>
                            {columns.find((column: any) => column.key === 'unit')?.visible ? <div>Unit: {item.unit || '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'make')?.visible ? <div>Make: {item.make || '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'install_rate')?.visible ? <div>Install: {item.install_rate ?? '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'vat_rate')?.visible ? <div>VAT %: {item.vat_rate ?? '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'discount_rate')?.visible ? <div>Disc %: {item.discount_rate ?? '-'}</div> : null}
                            {visibleCustomColumns.map((column: any) => (
                              <div key={column.key}>
                                {column.label}: {(item.custom_data || {})[column.key] || '-'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 hover:bg-transparent">
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      {columns.find((column: any) => column.key === 'make')?.visible && <TableHead>Make</TableHead>}
                      <TableHead>Qty</TableHead>
                      {columns.find((column: any) => column.key === 'unit')?.visible && <TableHead>Unit</TableHead>}
                      <TableHead>Rate</TableHead>
                      {columns.find((column: any) => column.key === 'install_rate')?.visible && <TableHead>Install</TableHead>}
                      {columns.find((column: any) => column.key === 'vat_rate')?.visible && <TableHead>VAT %</TableHead>}
                      {columns.find((column: any) => column.key === 'discount_rate')?.visible && <TableHead>Disc %</TableHead>}
                      {visibleCustomColumns.map((column: any) => <TableHead key={column.key}>{column.label}</TableHead>)}
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {(() => {
                      let itemNumber = 0
                      return items.map((item, index) => {
                        if (item.row_type === 'group_header') {
                          return (
                            <TableRow key={item._uiKey || item.id || index} className="bg-slate-900 hover:bg-slate-900">
                              <TableCell className="font-semibold text-muted-foreground">-</TableCell>
                              <TableCell colSpan={6 + (columns.find((column: any) => column.key === 'make')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'unit')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'install_rate')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'vat_rate')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'discount_rate')?.visible ? 1 : 0) + visibleCustomColumns.length} className="font-bold text-white">
                                {item.group_name || `Group ${index + 1}`}
                              </TableCell>
                            </TableRow>
                          )
                        }
                        itemNumber += 1
                        return (
                          <TableRow key={item._uiKey || item.id || index} className="align-top">
                            <TableCell className="font-semibold text-zinc-500">{itemNumber}</TableCell>
                            <TableCell className="whitespace-normal">
                              <div className="font-semibold text-foreground">{item.description}</div>
                              {item.sub_description ? <div className="mt-1 text-sm text-muted-foreground">{item.sub_description}</div> : null}
                            </TableCell>
                            {columns.find((column: any) => column.key === 'make')?.visible && <TableCell>{item.make || '-'}</TableCell>}
                            <TableCell>{item.quantity || 0}</TableCell>
                            {columns.find((column: any) => column.key === 'unit')?.visible && <TableCell>{item.unit || '-'}</TableCell>}
                            <TableCell>{formatMoney(item.unit_price || 0)}</TableCell>
                            {columns.find((column: any) => column.key === 'install_rate')?.visible && <TableCell>{item.install_rate ?? '-'}</TableCell>}
                            {columns.find((column: any) => column.key === 'vat_rate')?.visible && <TableCell>{item.vat_rate ?? '-'}</TableCell>}
                            {columns.find((column: any) => column.key === 'discount_rate')?.visible && <TableCell>{item.discount_rate ?? '-'}</TableCell>}
                            {visibleCustomColumns.map((column: any) => <TableCell key={column.key}>{(item.custom_data || {})[column.key] || '-'}</TableCell>)}
                            <TableCell className="font-bold text-foreground">
                              {formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Document Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="notes" className="w-full">
                <TabsList className="mb-4 h-auto flex-wrap justify-start rounded-xl bg-muted p-1">
                  <TabsTrigger value="notes">{notesTitle}</TabsTrigger>
                  <TabsTrigger value="terms">{termsTitle}</TabsTrigger>
                  {bottomFields.length > 0 ? <TabsTrigger value="additional">Additional Notes</TabsTrigger> : null}
                </TabsList>
                <TabsContent value="notes">{renderRichText(quotation.notes)}</TabsContent>
                <TabsContent value="terms">{renderRichText(quotation.terms)}</TabsContent>
                {bottomFields.length > 0 ? (
                  <TabsContent value="additional" className="space-y-2 text-sm text-muted-foreground">
                    {bottomFields.map((field) => <div key={field.id}>{field.text}</div>)}
                  </TabsContent>
                ) : null}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {totals && [['Subtotal', totals.rawSubtotal], ['Install Rate Total', totals.installRateTotal], ['VAT', totals.vatAmount], ['Discount', totals.discountAmount], ['WHT', totals.whtAmount], ['Total Payable', totals.totalPayable]].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                  <span className="font-medium text-zinc-600">{label}</span>
                  <span className="font-bold text-zinc-900">{formatMoney(value as number)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
