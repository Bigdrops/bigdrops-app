import React, { useCallback, useState, useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import {
  DocumentActionGrid,
  DocumentBottomBar,
  DocumentDesignPanel,
  DocumentFloatingFab,
  DocumentHeroCard,
  DocumentLivePreviewCard,
  DocumentPdfSheet,
  DocumentSection,
  DocumentStatusStrip,
  DocumentTopBar,
} from '@/components/document/DocumentViewShell'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import RecordPaymentModal from '@/components/RecordPaymentModal'
import { PdfBankControls, PdfSupportingOptions } from '@/components/PdfOutputSettings'
import { buildInvoiceCsv, downloadInvoiceCsv } from '../components/invoice/exportInvoiceCsv'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  parseCustomFields,
  toDbItem,
  getAdvanceConfig,
  mapAdvanceConfigToInvoice,
} from '@/domain/invoice'
import { getInvoiceSourceDocument } from '@/domain/documentRelationships'
import { buildInvoiceViewModel } from '@/domain/invoice/viewModel'
import { buildPdfRowCells, generateInvoicePdf, interpretPdfTableSettings } from '@/components/pdf-new'
import { getPdfDesignPreset, resolvePdfWebFontFamily, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { toast } from '@/hooks/use-toast'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import InvoiceActionsSheet from '@/components/invoice/InvoiceActionsSheet'
import InvoiceAdvanceSheet from '@/components/invoice/view/InvoiceAdvanceSheet'
import {
  buildInvoiceLinkedDocumentSections,
  buildInvoiceShellStatusItems,
  mapInvoicePreviewNotesContent,
} from '@/components/invoice/view/invoiceDetailHelpers'
import RevertInvoiceDialog from '@/components/invoice/RevertInvoiceDialog'
import InvoicePaymentSection from '@/components/invoice/InvoicePaymentSection'
import VoidPaymentDialog from '@/components/invoice/VoidPaymentDialog'
import { getInvoiceDetailActionDefs } from '@/domain/invoice/actions'
import { buildInvoicePreviewModel } from '@/domain/invoice/previewModel'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { operationalEmptyStateClassName } from '@/components/ui/operational-card-styles'
import { CenteredSpinner, SkeletonCard } from '@/components/loading/AppLoadingStates'
import { useInvoiceDetailData } from '@/hooks/useInvoiceDetailData'
import { numberToWords } from '@/hooks/useInvoiceForm'
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { getAdvanceSummaryValues } from '@/domain/invoice/advanceSummary'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

export default function ViewInvoice() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [showMore, setShowMore] = useState(false)
  const [showPdfSheet, setShowPdfSheet] = useState(false)
  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT)
  const [pdfDesignPreset, setPdfDesignPresetState] = useState(() => getPdfDesignPreset('invoice'))

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [voidingPaymentId, setVoidingPaymentId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [pendingVoidPaymentId, setPendingVoidPaymentId] = useState(null)
  const [voidReason, setVoidReason] = useState('')

  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [converting, setConverting] = useState(false)

  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [attachKind, setAttachKind] = useState(null)
  const [showAttachSheet, setShowAttachSheet] = useState(false)
  const [showAdvanceSheet, setShowAdvanceSheet] = useState(false)
  const [advanceSheetMode, setAdvanceSheetMode] = useState('create')
  const [advanceMode, setAdvanceMode] = useState('percent')
  const [advanceInputValue, setAdvanceInputValue] = useState('50')
  const [advanceSuffixValue, setAdvanceSuffixValue] = useState('A')
  const [advancePrimaryLabel, setAdvancePrimaryLabel] = useState('Advance Payable Now')
  const [advanceSecondaryLabel, setAdvanceSecondaryLabel] = useState('Balance upon Completion')
  const [advanceInvoice, setAdvanceInvoice] = useState(null)
  const [advanceSaving, setAdvanceSaving] = useState(false)
  const [advancePdfGenerating, setAdvancePdfGenerating] = useState(false)
  const [showAdvanceDeleteConfirm, setShowAdvanceDeleteConfirm] = useState(false)

  const {
    invoice,
    items,
    payments,
    invoiceFinancials,
    client,
    settings,
    bankAccounts,
    signatories,
    creatorProfile,
    session,
    linkedProject,
    relatedCsrs,
    relatedWaybills,
    loading,
    refresh,
  } = useInvoiceDetailData(id)

  useEffect(() => {
    setPdfOutput(getInvoicePdfOutput(invoice?.custom_fields))
  }, [invoice?.custom_fields])

  const loadAdvanceInvoice = useCallback(async () => {
    if (!invoice?.id || invoice.thread_id) {
      setAdvanceInvoice(null)
      return
    }

    // 1. Primary source: Parent-owned config
    const config = getAdvanceConfig(invoice.custom_fields)
    if (config && config.enabled) {
      const virtualAdvance = mapAdvanceConfigToInvoice(invoice, config)
      setAdvanceInvoice({ ...virtualAdvance, suffix: config.suffix }) // Attach suffix for form sync
      return
    }

    // 2. Fallback: Old child row architecture (Legacy read)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('thread_id', invoice.id)
      .eq('thread_role', 'advance')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('Advance invoice legacy fetch failed:', error)
      setAdvanceInvoice(null)
      return
    }

    setAdvanceInvoice(data?.[0] || null)
  }, [invoice])

  useEffect(() => {
    void loadAdvanceInvoice()
  }, [loadAdvanceInvoice])

  useEffect(() => {
    if (!invoice || !location.state?.openAdvanceSheet || invoice.thread_id) return
    setAdvanceSheetMode('create')
    setShowAdvanceSheet(true)
    navigate(`/invoices/${id}`, { replace: true, state: {} })
  }, [id, invoice, invoice?.thread_id, location.state?.openAdvanceSheet, navigate])

  const syncAdvanceForm = useCallback((nextAdvanceInvoice) => {
    const nextMode = nextAdvanceInvoice?.advance_mode === 'fixed' ? 'fixed' : 'percent'
    const rawValue =
      nextAdvanceInvoice?.advance_value !== null &&
      nextAdvanceInvoice?.advance_value !== undefined
        ? String(nextAdvanceInvoice.advance_value)
        : nextMode === 'fixed'
          ? String(nextAdvanceInvoice?.total || '')
          : '50'

    setAdvanceMode(nextMode)
    setAdvanceInputValue(rawValue)
    setAdvanceSuffixValue(nextAdvanceInvoice?.suffix ?? 'A')
    setAdvancePrimaryLabel(nextAdvanceInvoice?.advance_primary_label || 'Advance Payable Now')
    setAdvanceSecondaryLabel(nextAdvanceInvoice?.advance_secondary_label || 'Balance upon Completion')
  }, [])

  useEffect(() => {
    if (advanceInvoice && advanceSheetMode === 'create') {
      setAdvanceSheetMode('view')
      syncAdvanceForm(advanceInvoice)
    }
  }, [advanceInvoice, advanceSheetMode, syncAdvanceForm])

  if (loading) {
    return (
      <Layout title="Invoice">
        <div className="space-y-3">
          <SkeletonCard className="h-[110px]" />
          <SkeletonCard className="h-[260px]" />
          <Card className={operationalEmptyStateClassName}><CardContent className="p-0"><CenteredSpinner /></CardContent></Card>
        </div>
      </Layout>
    )
  }

  if (!invoice) {
    return (
      <Layout title="Invoice">
        <Card className={operationalEmptyStateClassName}>
          <CardContent className="p-0">Invoice not found.</CardContent>
        </Card>
      </Layout>
    )
  }

  const poNumber = String(invoice.po_number || '').trim()

  const formatMoney = formatNaira

  const formatDate = (value) => formatDisplayDate(value, { fallback: '-', locale: undefined })

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')
  const isStandaloneInvoice = !invoice.thread_id
  const isAdvanceInvoice = invoice.thread_role === 'advance' || invoice.is_advance === true
  const sourceDocument = getInvoiceSourceDocument(invoice)
  const invoiceRelatedDocs = { csrs: relatedCsrs, waybills: relatedWaybills }

  const viewModel = buildInvoiceViewModel({
    invoice,
    items,
    payments,
    relatedCsrs,
    relatedWaybills,
    financials: invoiceFinancials,
    project: linkedProject,
    sourceDocument,
  })

  const {
    computedStatus,
    statusLabel,
    statusBadgeClass,
    invoiceTotal,
    cashReceived,
    settledTotal,
    balanceDue,
    paymentHistory,
    activePaymentCount,
    activePaymentTotal,
    hasLinkedDocuments,
    hasProject,
    canRecordPayment,
    projectActionLabel,
    documentActionLabel,
  } = viewModel

  const contractValue = Number(invoiceTotal || 0)

  const canManagePayment = canRecordPayment && isStandaloneInvoice

  const customFieldObject = parseCustomFields(invoice.custom_fields)
  const selectedSignatory =
    signatories.find((signatory) => signatory.id === getInvoiceSignatoryId(customFieldObject)) || null

  const openAdvanceSheet = (mode = advanceInvoice ? 'view' : 'create') => {
    if (mode === 'edit' && advanceInvoice) {
      syncAdvanceForm(advanceInvoice)
    }
    if (mode === 'create' && !advanceInvoice) {
      setAdvanceMode('percent')
      setAdvanceInputValue('50')
      setAdvanceSuffixValue('A')
      setAdvancePrimaryLabel('Advance Payable Now')
      setAdvanceSecondaryLabel('Balance upon Completion')
    }
    if (mode === 'view' && advanceInvoice) {
      syncAdvanceForm(advanceInvoice)
    }
    setAdvanceSheetMode(mode)
    setShowAdvanceSheet(true)
  }

  const parsedAdvanceInput = Number(advanceInputValue || 0)
  const safeAdvanceInput = Number.isFinite(parsedAdvanceInput) ? parsedAdvanceInput : 0
  const currentAdvanceAmount = advanceMode === 'fixed'
    ? safeAdvanceInput
    : contractValue * (safeAdvanceInput / 100)
  const advanceAmount = Math.min(Math.max(currentAdvanceAmount, 0), contractValue)
  const balanceRemaining = Math.max(0, contractValue - advanceAmount)

  const handleDownloadCsv = () => {
    const csv = buildInvoiceCsv({
      invoice,
      items,
      totals: {
        rawSubtotal: Number(invoice.subtotal || 0),
        installRateTotal: Number(invoice.install_rate_total || 0),
        vatAmount: Number(invoice.vat || 0),
        discountAmount: Number(invoice.discount || 0),
        whtAmount: Number(invoice.wht || 0),
        totalPayable: Number(invoice.total || 0),
      },
    })

    downloadInvoiceCsv(`${invoice.invoice_number || 'invoice'}.csv`, csv)
    setShowMore(false)
  }

  const handleCopy = async (value, label) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: 'Copied', description: `${label} copied.` })
    } catch {
      toast({
        title: 'Copy failed',
        description: `Could not copy ${label.toLowerCase()}.`,
        variant: 'destructive',
      })
    }
  }

  const handleSaveAdvance = async () => {
    if (!Number.isFinite(safeAdvanceInput) || safeAdvanceInput <= 0) {
      toast({
        title: 'Invalid advance value',
        description: advanceMode === 'fixed'
          ? 'Enter a valid advance amount.'
          : 'Enter a percentage between 1 and 100.',
        variant: 'destructive',
      })
      return
    }
    if (advanceMode === 'percent' && safeAdvanceInput > 100) {
      toast({
        title: 'Invalid advance percentage',
        description: 'Enter a percentage between 1 and 100.',
        variant: 'destructive',
      })
      return
    }
    if (advanceAmount <= 0 || advanceAmount > contractValue) {
      toast({
        title: 'Invalid advance value',
        description: 'Advance must be greater than zero and not exceed the contract value.',
        variant: 'destructive',
      })
      return
    }

    setAdvanceSaving(true)

    try {
      const updatedCf = {
        ...(customFieldObject || {}),
        advance_invoice: {
          enabled: true,
          mode: advanceMode,
          value: safeAdvanceInput,
          suffix: advanceSuffixValue === null ? '' : advanceSuffixValue,
          primaryLabel: advancePrimaryLabel,
          secondaryLabel: advanceSecondaryLabel,
        },
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          custom_fields: JSON.stringify(updatedCf),
        })
        .eq('id', invoice.id)

      if (updateError) throw updateError

      await refresh()
      setAdvanceSheetMode('view')
      toast({
        title: advanceInvoice ? 'Advance updated' : 'Advance invoice created',
        description: 'Advance configuration saved to parent invoice.',
      })
    } catch (error) {
      toast({
        title: advanceInvoice ? 'Advance update failed' : 'Advance creation failed',
        description: error?.message || 'Could not save advance configuration.',
        variant: 'destructive',
      })
    } finally {
      setAdvanceSaving(false)
    }
  }


  const handleDownloadAdvancePDF = async () => {
    if (!advanceInvoice?.id || advancePdfGenerating) return
    setAdvancePdfGenerating(true)

    try {
      const advanceSummary = getAdvanceSummaryValues(advanceInvoice)
      const resolvedTable = interpretPdfTableSettings(customFieldObject?.columnConfig || [], {
        mergeQtyUnit: customFieldObject?.mergeQtyUnit === true,
      })
      let advanceRowNumber = 0
      const sharedItems = items.map((item, index) => ({
        id: String(item.id || item._uiKey || index),
        rowType: item.row_type === 'group_header' ? 'group_header' : 'line',
        groupLabel: item.group_name || null,
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
        imageUrl: item.image_url || null,
        cells: item.row_type === 'group_header'
          ? undefined
          : buildPdfRowCells(item, resolvedTable.columns, {
              mergeQtyUnit: resolvedTable.mergeQtyUnit,
              configuredColumns: resolvedTable.configuredColumns,
              rowNumber: ++advanceRowNumber,
            }),
        customData: item.custom_data || {},
      }))

      await generateInvoicePdf({
        model: {
          identity: {
            id: String(advanceInvoice.id || invoice.id || 'advance'),
            kind: 'invoice',
            number: String(advanceInvoice.invoice_number || invoice.invoice_number || 'advance-invoice'),
            title: String(invoice.invoice_title || invoice.document_type || 'Invoice'),
            issueDate: String(advanceInvoice.issue_date || invoice.issue_date || ''),
            dueDate: String(advanceInvoice.due_date || invoice.due_date || ''),
            poNumber: String(invoice.po_number || ''),
            status: String(invoice.status || ''),
            currency: 'NGN',
          },
          issuer: {
            label: 'From',
            name: String(settings.company_name || ''),
            addressLines: companyPreviewLines,
            phone: String(settings.company_phone || ''),
            email: String(settings.company_email || ''),
            taxId: String(settings.company_vat || ''),
          },
          recipient: {
            label: 'Bill To',
            name: String(invoice.client_name || ''),
            addressLines: clientPreviewLines,
            attention: String(client?.contact_person || ''),
            phone: String(client?.phone || ''),
            email: String(client?.email || ''),
          },
          headerFields: topHeaderFields.map((field) => ({ label: String(field.label || ''), value: String(field.value || '') })),
          columns: resolvedTable.columns,
          mergeQtyUnit: resolvedTable.mergeQtyUnit,
          items: sharedItems,
          totals: {
            mode: advanceSummary ? 'advance' : 'standard',
            rows: [],
            advanceSummary: advanceSummary
              ? {
                  contractValue: advanceSummary.contractValue,
                  requestedAmount: advanceSummary.thisAdvance,
                  balanceRemaining: advanceSummary.balanceRemaining,
                  percentage: advanceSummary.advancePercent,
                  balancePercentage: advanceSummary.balancePercent,
                  primaryLabel: advanceSummary.primaryLabel,
                  secondaryLabel: advanceSummary.secondaryLabel,
                }
              : null,
            amountInWords: String(advanceInvoice.amount_in_words || ''),
            balanceDue: pdfOutput.showBalanceDue === false ? null : Number(balanceDue || 0),
          },
          bankDetails: pdfOutput.showBankDetails && selectedPreviewBank
            ? {
                bankName: selectedPreviewBank.bankName,
                accountName: selectedPreviewBank.accountName,
                accountNumber: selectedPreviewBank.accountNumber,
                sortCode: selectedPreviewBank.sortCode,
              }
            : null,
          notes: invoice.notes ? { title: customFieldObject?.notesTitle || 'Notes', content: invoice.notes, format: 'html' } : null,
          terms: invoice.terms ? { title: customFieldObject?.termsTitle || 'Terms and Conditions', content: invoice.terms, format: 'html' } : null,
          additionalSections: (customFieldObject?.additionalFields || [])
            .filter((field) => field?.label || field?.value)
            .map((field) => ({ title: String(field.label || 'Additional Field'), content: String(field.value || ''), format: 'text' })),
          referenceLinks: (customFieldObject?.attachments || [])
            .filter((entry) => entry?.url)
            .map((entry, idx) => ({ label: String(entry.label || entry.name || `Reference ${idx + 1}`), url: String(entry.url) })),
          signature: selectedSignatory
            ? { name: selectedSignatory.name, role: selectedSignatory.role || '', imageUrl: selectedSignatory.signature_url || '' }
            : null,
          logo: { imageUrl: String(settings.company_logo_url || '') || null, altText: String(settings.company_name || '') },
          footerText: pdfOutput.showFooter ? String(settings.footer_text || '') : '',
          tagline: pdfOutput.showTagline ? String(settings.company_tagline || '') : '',
          metaFooter: { companyName: String(settings.company_name || '') },
          template: {
            designPreset: pdfDesignPreset,
            fontConfig: {
              useCustomFonts: pdfDesignPreset.useCustomFonts,
              headerFont: pdfDesignPreset.headerFont,
              bodyFont: pdfDesignPreset.bodyFont,
            },
          },
        },
      })
      toast({ title: 'PDF ready', description: 'Advance invoice PDF downloaded.' })
    } catch (error) {
      toast({
        title: 'Advance PDF failed',
        description: error?.message || 'Could not download advance PDF.',
        variant: 'destructive',
      })
    } finally {
      setAdvancePdfGenerating(false)
    }
  }


  const confirmDeleteAdvanceInvoice = async () => {
    if (!advanceInvoice) return
    setShowAdvanceDeleteConfirm(false)
    setAdvanceSaving(true)

    try {
      // 1. Clear from parent config
      const updatedCf = { ...(customFieldObject || {}) }
      delete updatedCf.advance_invoice

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          custom_fields: JSON.stringify(updatedCf),
        })
        .eq('id', invoice.id)

      if (updateError) throw updateError

      // 2. Clear legacy child row if it exists
      const isVirtual = String(advanceInvoice.id || '').startsWith('virtual-advance')
      if (!isVirtual && advanceInvoice.id) {
        await supabase.from('invoice_items').delete().eq('invoice_id', advanceInvoice.id)
        await supabase.from('invoices').delete().eq('id', advanceInvoice.id)
      }

      await refresh()
      setShowAdvanceSheet(false)
      setAdvanceSheetMode('create')
      setAdvanceMode('percent')
      setAdvanceInputValue('50')
      toast({ title: 'Advance removed', description: 'The advance configuration was cleared.' })
    } catch (error) {
      toast({
        title: 'Advance removal failed',
        description: error?.message || 'Could not remove advance configuration.',
        variant: 'destructive',
      })
    } finally {
      setAdvanceSaving(false)
    }
  }


  const {
    handleAttachExisting,
    handleGenerateCsr,
    handleGenerateWaybill,
    openRevertConfirm,
    handleStatusChange,
    handleClone,
    handleConvertToQuote,
    handleMarkSent,
    handleDelete,
    confirmDelete,
    handleArchive,
    confirmArchive,
    handleVoidPayment,
    confirmVoidPayment,
  } = useInvoiceMutations({
    id,
    invoice,
    items,
    poNumber,
    customFieldObject,
    converting,
    pendingVoidPaymentId,
    voidReason,
    attachKind,
    refresh,
    navigate,
    setShowMore,
    setShowDeleteConfirm,
    setShowArchiveConfirm,
    setShowRevertConfirm,
    setShowVoidDialog,
    setPendingVoidPaymentId,
    setVoidReason,
    setVoidingPaymentId,
    setConverting,
    setAttachKind,
    setShowAttachSheet,
  })

  const detailActionDefs = getInvoiceDetailActionDefs({
    invoiceNumber: invoice.invoice_number || '',
    projectActionLabel,
    projectActionSubtitle: hasProject
      ? linkedProject?.name || 'Open the linked project workspace'
      : 'Attach this invoice to a project',
    hasProject,
    documentActionLabel,
    documentActionSubtitle: hasLinkedDocuments
      ? 'View source, generated, and related records'
      : 'Connect this invoice to related records',
    hasLinkedDocuments,
    canRecordPayment: canManagePayment,
    isStandalone: isStandaloneInvoice,
    reverting: converting,
    showMarkSent: invoice.status === 'draft',
  })

  const detailActionHandlers = {
    project: () => {
      setShowMore(false)
      invoice.project_id ? navigate(`/projects/${invoice.project_id}`) : setShowProjectLinkDialog(true)
    },
    documents: () => {
      setShowMore(false)
      setShowLinkedDocuments(true)
    },
    payment: () => {
      setShowMore(false)
      setShowPaymentModal(true)
    },
    advance: () => {
      setShowMore(false)
      openAdvanceSheet()
    },
    export: handleDownloadCsv,
    'copy-number': () => {
      void handleCopy(invoice.invoice_number || '', 'Invoice number')
    },
    clone: handleClone,
    revert: openRevertConfirm,
    'generate-csr': handleGenerateCsr,
    'generate-waybill': handleGenerateWaybill,
    'mark-sent': handleMarkSent,
    archive: handleArchive,
    delete: handleDelete,
  }

  const detailActions = detailActionDefs.map((action) => ({
    ...action,
    onClick: detailActionHandlers[action.key],
  }))

  const linkedDocumentsSections = buildInvoiceLinkedDocumentSections({
    sourceDocument,
    relatedDocs: invoiceRelatedDocs,
    linkedProject,
    navigate,
    onAttachCsr: () => {
      setShowLinkedDocuments(false)
      setAttachKind('csr')
      setShowAttachSheet(true)
    },
    onAttachWaybill: () => {
      setShowLinkedDocuments(false)
      setAttachKind('waybill')
      setShowAttachSheet(true)
    },
  })

  const handleDownloadPDF = async () => {
    if (pdfGenerating) return
    setPdfGenerating(true)

    try {
      const advanceSummary = getAdvanceSummaryValues(invoice)
      const summaryRows = [
        { key: 'subtotal', label: 'Subtotal', amount: Number(invoice.subtotal || 0) },
        ...(Number(invoice.install_rate_total || 0) > 0 ? [{ key: 'installation', label: 'Installation Total', amount: Number(invoice.install_rate_total || 0) }] : []),
        ...(Number(invoice.workmanship || 0) > 0 ? [{ key: 'workmanship', label: 'Workmanship', amount: Number(invoice.workmanship || 0) }] : []),
        ...(Number(invoice.transportation || 0) > 0 ? [{ key: 'transportation', label: 'Transportation', amount: Number(invoice.transportation || 0) }] : []),
        ...(Number(invoice.shipping || 0) > 0 ? [{ key: 'shipping', label: 'Shipping', amount: Number(invoice.shipping || 0) }] : []),
        ...(Number(invoice.discount || 0) > 0 ? [{ key: 'discount', label: 'Discount', amount: Number(invoice.discount || 0), tone: 'danger' }] : []),
        ...(Number(invoice.vat || 0) > 0 ? [{ key: 'vat', label: 'VAT', amount: Number(invoice.vat || 0) }] : []),
        ...(Number(invoice.wht || 0) > 0 ? [{ key: 'wht', label: 'WHT', amount: Number(invoice.wht || 0) }] : []),
        { key: 'total', label: 'Total', amount: Number(invoiceTotal || invoice.total || 0), emphasis: true, tone: 'primary' },
      ]
      const resolvedTable = interpretPdfTableSettings(customFieldObject?.columnConfig || [], {
        mergeQtyUnit: customFieldObject?.mergeQtyUnit === true,
      })
      let mainRowNumber = 0

      await generateInvoicePdf({
        model: {
          identity: {
            id: String(invoice.id || 'invoice'),
            kind: 'invoice',
            number: String(invoice.invoice_number || 'invoice'),
            title: String(invoice.invoice_title || invoice.document_type || 'Invoice'),
            issueDate: String(invoice.issue_date || ''),
            dueDate: String(invoice.due_date || ''),
            poNumber: String(invoice.po_number || ''),
            status: String(invoice.status || ''),
            currency: 'NGN',
          },
          issuer: {
            label: 'From',
            name: String(settings.company_name || ''),
            addressLines: companyPreviewLines,
            phone: String(settings.company_phone || ''),
            email: String(settings.company_email || ''),
            taxId: String(settings.company_vat || ''),
          },
          recipient: {
            label: 'Bill To',
            name: String(invoice.client_name || ''),
            attention: String(client?.contact_person || ''),
            addressLines: clientPreviewLines,
            phone: String(client?.phone || ''),
            email: String(client?.email || ''),
          },
          headerFields: topHeaderFields.map((field) => ({ label: String(field.label || ''), value: String(field.value || '') })),
          columns: resolvedTable.columns,
          mergeQtyUnit: resolvedTable.mergeQtyUnit,
          items: items.map((item, index) => ({
            id: String(item.id || item._uiKey || index),
            rowType: item.row_type === 'group_header' ? 'group_header' : 'line',
            groupLabel: item.group_name || null,
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
            imageUrl: item.image_url || null,
            cells: item.row_type === 'group_header'
              ? undefined
              : buildPdfRowCells(item, resolvedTable.columns, {
                  mergeQtyUnit: resolvedTable.mergeQtyUnit,
                  configuredColumns: resolvedTable.configuredColumns,
                  rowNumber: ++mainRowNumber,
                }),
            customData: item.custom_data || {},
          })),
          totals: {
            mode: advanceSummary ? 'advance' : 'standard',
            rows: summaryRows,
            advanceSummary: advanceSummary
              ? {
                  contractValue: advanceSummary.contractValue,
                  requestedAmount: advanceSummary.thisAdvance,
                  balanceRemaining: advanceSummary.balanceRemaining,
                  percentage: advanceSummary.advancePercent,
                  balancePercentage: advanceSummary.balancePercent,
                  primaryLabel: advanceSummary.primaryLabel,
                  secondaryLabel: advanceSummary.secondaryLabel,
                }
              : null,
            amountInWords: String(invoice.amount_in_words || numberToWords(Number(invoiceTotal || invoice.total || 0))),
            balanceDue: pdfOutput.showBalanceDue === false ? null : Number(balanceDue || 0),
          },
          bankDetails: pdfOutput.showBankDetails && selectedPreviewBank
            ? {
                bankName: selectedPreviewBank.bankName,
                accountName: selectedPreviewBank.accountName,
                accountNumber: selectedPreviewBank.accountNumber,
                sortCode: selectedPreviewBank.sortCode,
              }
            : null,
          notes: invoice.notes ? { title: customFieldObject?.notesTitle || 'Notes', content: invoice.notes, format: 'html' } : null,
          terms: invoice.terms ? { title: customFieldObject?.termsTitle || 'Terms and Conditions', content: invoice.terms, format: 'html' } : null,
          additionalSections: (customFieldObject?.additionalFields || [])
            .filter((field) => field?.label || field?.value)
            .map((field) => ({ title: String(field.label || 'Additional Field'), content: String(field.value || ''), format: 'text' })),
          referenceLinks: (customFieldObject?.attachments || [])
            .filter((entry) => entry?.url)
            .map((entry, idx) => ({ label: String(entry.label || entry.name || `Reference ${idx + 1}`), url: String(entry.url) })),
          signature: selectedSignatory
            ? { name: selectedSignatory.name, role: selectedSignatory.role || '', imageUrl: selectedSignatory.signature_url || '' }
            : null,
          logo: { imageUrl: String(settings.company_logo_url || '') || null, altText: String(settings.company_name || '') },
          footerText: pdfOutput.showFooter ? String(settings.footer_text || '') : '',
          tagline: pdfOutput.showTagline ? String(settings.company_tagline || '') : '',
          metaFooter: { companyName: String(settings.company_name || '') },
          template: {
            designPreset: pdfDesignPreset,
            fontConfig: {
              useCustomFonts: pdfDesignPreset.useCustomFonts,
              headerFont: pdfDesignPreset.headerFont,
              bodyFont: pdfDesignPreset.bodyFont,
            },
          },
        },
      })
      toast({ title: 'PDF ready', description: 'Invoice PDF downloaded.' })
    } catch (err) {
      toast({
        title: 'PDF generation failed',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setPdfGenerating(false)
    }
  }

  const handlePdfOutputChange = async (next) => {
    setPdfOutput(next)

    const updatedCf = {
      ...customFieldObject,
      pdfOutput: next,
    }

    await supabase
      .from('invoices')
      .update({
        custom_fields: JSON.stringify(updatedCf),
      })
      .eq('id', id)
  }

  const shellStatusClass = statusBadgeClass

  const shellStatusItems = buildInvoiceShellStatusItems({
    computedStatus,
    onStatusChange: handleStatusChange,
  })

  const handlePdfDesignPresetChange = (nextPreset) => {
    setPdfDesignPresetState(nextPreset)
    setPdfDesignPreset('invoice', nextPreset)
  }

  const previewModel = buildInvoicePreviewModel({
    invoice,
    items,
    client,
    settings,
    bankAccounts,
    customFieldObject,
    pdfOutput,
    poNumber,
    invoiceTotal,
    cashReceived,
    balanceDue,
    formatMoney,
  })

  const {
    previewBankAccounts,
    selectedPreviewBank,
    companyPreviewLines,
    clientPreviewLines,
    topHeaderFields,
    previewDetailRows,
    previewItems,
    previewTotals,
    previewNotesSections,
  } = previewModel

  const previewNotesContent = mapInvoicePreviewNotesContent(previewNotesSections)
  const creatorName = [
    creatorProfile?.full_name,
    creatorProfile?.display_name,
    creatorProfile?.name,
    creatorProfile?.email,
    invoice?.created_by === session?.user?.id
      ? session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email
      : null,
  ].find((value) => {
    const text = String(value || '').trim()
    if (!text) return false
    const lowered = text.toLowerCase()
    return lowered !== 'unknown' && lowered !== 'unknown creator' && lowered !== 'n/a'
  }) || null
  const dueStatusText =
    computedStatus === 'paid'
      ? 'Paid in full'
      : computedStatus === 'overdue'
        ? 'Overdue'
        : invoice.due_date
          ? `Due ${formatDate(invoice.due_date)}`
          : 'Open'
  const amountInWordsText = String(invoice.amount_in_words || '').trim()

  return (
    <Layout
      title={invoice.invoice_number}
      hidePageHeader
      contentClassName="w-full px-4 pb-32 pt-4 md:px-6 md:pt-6"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <RecordPaymentModal
          invoice={{
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            client_name: invoice.client_name,
            total: Number(invoice.total || 0),
          }}
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          onSuccess={refresh}
        />

        <DocumentTopBar
          title={invoice.invoice_number}
          subtitle="Invoice"
          statusLabel={statusLabel}
          statusClassName={shellStatusClass}
          onBack={() => navigate('/invoices')}
          onMore={() => setShowMore(true)}
        />

        <CompactInvoiceSummary
          totalText={formatMoney(invoiceTotal)}
          balanceText={formatMoney(balanceDue)}
          receivedText={formatMoney(cashReceived)}
          dueStatusText={dueStatusText}
          amountInWordsText={amountInWordsText || 'Amount in words not provided.'}
          creatorName={creatorName}
          openLabel="Show summary"
          closeLabel="Hide summary"
        >
          <DocumentHeroCard
            eyebrow={`Invoice Summary · ${statusLabel}`}
            value={formatMoney(invoiceTotal)}
            helper={`${dueStatusText}.${creatorName ? ` Created by ${creatorName}.` : ''}${amountInWordsText ? ` ${amountInWordsText}` : ''}`}
            stats={[
              { label: 'Balance', value: formatMoney(balanceDue), className: balanceDue > 0 ? 'text-rose-300' : 'text-emerald-300' },
              { label: 'Received', value: formatMoney(cashReceived) },
              { label: 'Due / Open', value: dueStatusText },
            ]}
          />
        </CompactInvoiceSummary>

        <DocumentActionGrid
          actions={[
            { key: 'pdf', label: 'PDF', onClick: () => setShowPdfSheet(true), variant: 'dark' },
            {
              key: 'payment',
              label: 'Payment',
              onClick: () => setShowPaymentModal(true),
              variant: 'emerald',
              disabled: !canManagePayment,
            },
            { key: 'edit', label: 'Edit', onClick: () => navigate('/invoices/edit/' + id), variant: 'blue' },
            isStandaloneInvoice
              ? {
                  key: 'advance',
                  label: advanceInvoice ? 'View Advance' : 'Advance',
                  onClick: () => openAdvanceSheet(),
                  variant: 'outline',
                }
              : null,
          ].filter(Boolean)}
        />

        <DocumentStatusStrip items={shellStatusItems} />

        <DocumentLivePreviewCard
          templateLabel="New PDF Foundation"
          documentLabel="Invoice"
          documentNumber={invoice.invoice_number || 'Invoice'}
          companyName={settings.company_name || ''}
          companyTagline={pdfOutput.showTagline ? settings.company_tagline || '' : ''}
          companyLines={companyPreviewLines}
          recipientLabel="Bill To"
          recipientName={invoice.client_name || 'Unassigned'}
          recipientLines={clientPreviewLines}
          meta={[
            { label: 'Issue Date', value: invoice.issue_date || 'Not set' },
            { label: 'Due Date', value: invoice.due_date || 'Open' },
            { label: 'Status', value: statusLabel },
          ]}
          detailRows={previewDetailRows}
          items={previewItems}
          totals={previewTotals}
          amountInWords={invoice.amount_in_words || ''}
          bankDetails={pdfOutput.showBankDetails && selectedPreviewBank ? selectedPreviewBank : null}
          notesSections={previewNotesContent}
          signatory={
            selectedSignatory
              ? {
                  name: selectedSignatory.name,
                  role: selectedSignatory.role || 'Saved signatory',
                  signatureUrl: selectedSignatory.signature_url || '',
                }
              : null
            }
            accentColor={pdfDesignPreset.accentColor}
            headerFontFamily={resolvePdfWebFontFamily(pdfDesignPreset.headerFont)}
            bodyFontFamily={resolvePdfWebFontFamily(pdfDesignPreset.bodyFont)}
            previewNote="Preview reflects the live PDF foundation and current export settings."
          />

        <PdfBankControls
          value={pdfOutput}
          onChange={handlePdfOutputChange}
          bankAccounts={previewBankAccounts}
        />

        <DocumentSection title="Customize Design">
          <DocumentDesignPanel
            title="Design"
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
                    onChange={handlePdfOutputChange}
                    companyTagline={settings.company_tagline || ''}
                    footerText={settings.footer_text || ''}
                    showBalanceDueOption
                  />
                ),
              },
            ]}
          />
        </DocumentSection>

        <InvoicePaymentSection
          variant="simple"
          paymentHistory={paymentHistory}
          formatMoney={formatMoney}
          formatDate={formatDate}
          isAdmin={isAdmin}
          voidingPaymentId={voidingPaymentId}
          onVoidPayment={handleVoidPayment}
        />

        <InvoiceActionsSheet
          open={showMore}
          onOpenChange={setShowMore}
          invoiceNumber={invoice.invoice_number}
          actions={detailActions}
        />

        <DocumentPdfSheet
          open={showPdfSheet}
          onOpenChange={setShowPdfSheet}
          title="Download & Export"
          subtitle="Invoice PDF export uses the live PDF renderer and current output settings."
          settingsNode={(
            <Card className="rounded-[20px] border-border shadow-sm">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="text-sm font-semibold text-foreground">Show Balance Due</div>
                <button
                  type="button"
                  onClick={() => void handlePdfOutputChange({ ...pdfOutput, showBalanceDue: !pdfOutput.showBalanceDue })}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                    pdfOutput.showBalanceDue ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-md transition-transform duration-200 ${
                      pdfOutput.showBalanceDue ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </CardContent>
            </Card>
          )}
          actions={[
            { label: 'Export CSV', onClick: handleDownloadCsv, variant: 'outline' },
            {
              label: pdfGenerating ? 'Preparing...' : 'Download PDF',
              onClick: () => void handleDownloadPDF(),
              className: 'bg-foreground text-background hover:bg-foreground/90',
              disabled: pdfGenerating,
            },
          ]}
        />

        <ConfirmActionDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete this invoice?"
          description="Deleting is permanent and cannot be undone. You can archive it instead and restore it later from Settings > Archives."
          confirmLabel="Delete Invoice"
          onConfirm={() => void confirmDelete()}
        />

        <ConfirmActionDialog
          open={showArchiveConfirm}
          onOpenChange={setShowArchiveConfirm}
          title="Archive this invoice?"
          description="This invoice will be hidden from your active list until you restore it from Settings > Archives."
          confirmLabel="Archive Invoice"
          variant="default"
          onConfirm={() => void confirmArchive()}
        />

        <RevertInvoiceDialog
          open={showRevertConfirm}
          onOpenChange={setShowRevertConfirm}
          invoiceNumber={invoice.invoice_number || ''}
          paymentCount={activePaymentCount}
          paymentTotal={formatMoney(activePaymentTotal)}
          submitting={converting}
          onConfirm={() => void handleConvertToQuote()}
        />

        <VoidPaymentDialog
          open={showVoidDialog}
          onOpenChange={setShowVoidDialog}
          reason={voidReason}
          onReasonChange={setVoidReason}
          submitting={voidingPaymentId !== null}
          onConfirm={() => void confirmVoidPayment()}
          onCancel={() => setShowVoidDialog(false)}
        />

        <InvoiceAdvanceSheet
          open={showAdvanceSheet}
          onOpenChange={(nextOpen) => {
            setShowAdvanceSheet(nextOpen)
            if (!nextOpen && advanceInvoice) setAdvanceSheetMode('view')
          }}
          invoiceNumber={invoice.invoice_number}
          contractValue={contractValue}
          formatMoney={formatMoney}
          advanceSheetMode={advanceSheetMode}
          advanceInvoice={advanceInvoice}
          advanceSaving={advanceSaving}
          advancePdfGenerating={advancePdfGenerating}
          advanceMode={advanceMode}
          setAdvanceMode={setAdvanceMode}
          advanceInputValue={advanceInputValue}
          setAdvanceInputValue={setAdvanceInputValue}
          advanceSuffixValue={advanceSuffixValue}
          setAdvanceSuffixValue={setAdvanceSuffixValue}
          advancePrimaryLabel={advancePrimaryLabel}
          setAdvancePrimaryLabel={setAdvancePrimaryLabel}
          advanceSecondaryLabel={advanceSecondaryLabel}
          setAdvanceSecondaryLabel={setAdvanceSecondaryLabel}
          advanceAmount={advanceAmount}
          balanceRemaining={balanceRemaining}
          onSave={() => void handleSaveAdvance()}
          onDownloadPdf={() => void handleDownloadAdvancePDF()}
          onEdit={() => openAdvanceSheet('edit')}
          onRequestDelete={() => setShowAdvanceDeleteConfirm(true)}
          deleteConfirmOpen={showAdvanceDeleteConfirm}
          onDeleteConfirmOpenChange={setShowAdvanceDeleteConfirm}
          onDeleteConfirm={() => void confirmDeleteAdvanceInvoice()}
        />

        <LinkedDocumentsSheet
          open={showLinkedDocuments}
          onOpenChange={setShowLinkedDocuments}
          title="Linked Documents"
          subtitle={invoice.invoice_number || 'Invoice'}
          sections={linkedDocumentsSections}
        />

        <AttachExistingDocumentSheet
          open={showAttachSheet}
          onOpenChange={setShowAttachSheet}
          title={attachKind === 'csr' ? 'Attach Existing CSR' : 'Attach Existing Waybill'}
          description={invoice.invoice_number || 'Invoice'}
          table={attachKind === 'csr' ? 'csrs' : 'waybills'}
          numberField={attachKind === 'csr' ? 'csr_number' : 'waybill_number'}
          clientField="client_name"
          poField="po_number"
          linkedInvoiceField={attachKind === 'csr' ? 'linked_invoice_id' : 'invoice_id'}
          currentInvoiceId={invoice.id}
          currentClientName={invoice.client_name}
          searchPlaceholder={
            attachKind === 'csr'
              ? 'Search CSR number, client, or PO'
              : 'Search waybill number, client, or PO'
          }
          onAttach={handleAttachExisting}
        />

        <ProjectLinkDialog
          open={showProjectLinkDialog}
          onOpenChange={setShowProjectLinkDialog}
          tableName="invoices"
          recordId={id}
          documentLabel="Invoice"
          onLinked={async () => {
            await refresh()
          }}
        />

        <DocumentFloatingFab onClick={() => setShowPdfSheet(true)} />

        <DocumentBottomBar
          actions={[
            { label: 'Back', onClick: () => navigate('/invoices'), variant: 'outline' },
            { label: 'Edit', onClick: () => navigate('/invoices/edit/' + id), variant: 'outline' },
            {
              label: computedStatus === 'paid' ? 'Paid in Full' : 'Record Payment',
              onClick: () => setShowPaymentModal(true),
              className: 'bg-primary text-primary-foreground hover:bg-primary/90',
              disabled: computedStatus === 'paid' || !isStandaloneInvoice,
            },
          ]}
        />
      </div>
    </Layout>
  )
}

function CompactInvoiceSummary({
  totalText,
  balanceText,
  receivedText,
  dueStatusText,
  amountInWordsText,
  creatorName,
  openLabel,
  closeLabel,
  children,
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border/80 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-5 text-foreground">
            {`Total ${totalText} · Balance ${balanceText} · Received ${receivedText} · ${dueStatusText}`}
          </div>
          <div className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{amountInWordsText}</div>
          {creatorName ? (
            <div className="mt-0.5 text-xs leading-4 text-muted-foreground">{creatorName}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 text-[11px] font-semibold leading-4 text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
        >
          {open ? closeLabel : openLabel}
        </button>
      </div>

      {open ? <div className="pt-2">{children}</div> : null}
    </div>
  )
}
