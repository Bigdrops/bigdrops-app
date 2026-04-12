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
  DocumentTemplatePicker,
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
import { parseDocumentCustomFields } from '@/domain/documentConversion'
import { getInvoiceSourceDocument } from '@/domain/documentRelationships'
import { buildInvoiceViewModel } from '@/domain/invoice/viewModel'
import { computeDocument } from '@/lib/Calculations'
import { DEFAULT_INVOICE_TEMPLATE, INVOICE_PDF_TEMPLATES } from '@/components/pdf/pdfTemplates'
import { getPdfDesignPreset, resolvePdfWebFontFamily, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { resolveTemplateDesignPreset } from '@/lib/pdfTemplateDesign'
import { getPdfTemplatePreset, setPdfTemplatePreset } from '@/lib/pdfTemplatePreset'
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

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

export default function ViewInvoice() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [showMore, setShowMore] = useState(false)
  const [showPdfSheet, setShowPdfSheet] = useState(false)
  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT)
  const [pdfTemplate, setPdfTemplate] = useState(() => getPdfTemplatePreset('invoice', DEFAULT_INVOICE_TEMPLATE))
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
      const isVirtual = String(advanceInvoice.id || '').startsWith('virtual-advance')
      let advanceItems = []

      if (isVirtual) {
        advanceItems = items.map((item) => ({
          ...item,
          custom_data: item.custom_data || {},
        }))
      } else {
        const { data, error: advanceItemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', advanceInvoice.id)
          .order('sort_order')

        if (advanceItemsError) throw advanceItemsError

        advanceItems = (data || []).map((item) => ({
          ...item,
          custom_data:
            typeof item.custom_data === 'string'
              ? JSON.parse(item.custom_data || '{}')
              : item.custom_data || {},
          install_rate_override: item.install_rate_override === true,
          install_rate: item.install_rate === undefined ? null : item.install_rate,
          vat_rate: item.vat_rate === undefined ? null : item.vat_rate,
          discount_rate: item.discount_rate === undefined ? null : item.discount_rate,
          image_url: item.image_url || null,
        }))
      }

      const advanceTotal = Number(advanceInvoice.total || 0)
      const baseComputedResult = computeDocument({
        items: advanceItems,
        document: advanceInvoice,
        cf: parseDocumentCustomFields(advanceInvoice.custom_fields || {}),
      })

      const computedResult = {
        ...baseComputedResult,
        grandTotal: advanceTotal,
        totalPayable: advanceTotal,
        thread_role: advanceInvoice.thread_role,
        is_advance: advanceInvoice.is_advance,
        total_contract_value: advanceInvoice.total_contract_value,
        total: advanceInvoice.total,
        cashReceived: 0,
        settledTotal: 0,
        balanceDue: advanceTotal,
      }

      const advanceCustomFields = parseCustomFields(advanceInvoice.custom_fields)
      const advanceSignatory =
        signatories.find((signatory) => signatory.id === getInvoiceSignatoryId(advanceCustomFields)) || null

      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/InvoicePDF'),
      ])

      const blob = await pdf(
        <InvoicePDF
          document={advanceInvoice}
          items={advanceItems}
          client={client}
          settings={settings}
          computedResult={computedResult}
          template={pdfTemplate}
          bankAccounts={bankAccounts}
          pdfOutput={getInvoicePdfOutput(advanceInvoice.custom_fields)}
          signatory={advanceSignatory}
          designPreset={resolvedPdfDesignPreset}
        />,
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${advanceInvoice.invoice_number || 'advance-invoice'}.pdf`
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
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
      const cf = parseDocumentCustomFields(invoice.custom_fields || customFieldObject)

      const baseComputedResult = computeDocument({
        items,
        document: invoice,
        cf,
      })

      const computedResult = {
        ...baseComputedResult,
        ...(isAdvanceInvoice
          ? {
              grandTotal: invoiceTotal,
              totalPayable: invoiceTotal,
              thread_role: invoice.thread_role,
              is_advance: invoice.is_advance,
              total_contract_value: invoice.total_contract_value,
              total: invoice.total,
            }
          : {}),
        cashReceived,
        settledTotal,
        balanceDue: isAdvanceInvoice ? Math.max(0, invoiceTotal - settledTotal) : balanceDue,
      }

      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/InvoicePDF'),
      ])

      const blob = await pdf(
        <InvoicePDF
          document={invoice}
          items={items}
          client={client}
          settings={settings}
          computedResult={computedResult}
          template={pdfTemplate}
          bankAccounts={bankAccounts}
          pdfOutput={pdfOutput}
          signatory={selectedSignatory}
          designPreset={resolvedPdfDesignPreset}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number || 'invoice'}.pdf`
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
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

  const activePdfTemplate = INVOICE_PDF_TEMPLATES.find((template) => template.id === pdfTemplate) || INVOICE_PDF_TEMPLATES[0]
  const resolvedPdfDesignPreset = resolveTemplateDesignPreset('invoice', pdfTemplate, pdfDesignPreset)

  const handlePdfTemplateChange = (nextTemplate) => {
    setPdfTemplate(nextTemplate)
    setPdfTemplatePreset('invoice', nextTemplate)
  }

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
          templateLabel={activePdfTemplate.label}
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
            accentColor={resolvedPdfDesignPreset.accentColor}
            headerFontFamily={resolvePdfWebFontFamily(resolvedPdfDesignPreset.headerFont)}
            bodyFontFamily={resolvePdfWebFontFamily(resolvedPdfDesignPreset.bodyFont)}
            previewNote="Browser preview may show web typography. Downloaded PDFs currently use safe built-in PDF fonts."
          />

        <PdfBankControls
          value={pdfOutput}
          onChange={handlePdfOutputChange}
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
                  <DocumentTemplatePicker
                    value={pdfTemplate}
                    onChange={handlePdfTemplateChange}
                    templates={INVOICE_PDF_TEMPLATES}
                  />
                ),
              },
              {
                key: 'styling',
                title: 'Template Overrides',
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
          subtitle={`Using ${activePdfTemplate.label} as the saved invoice PDF preset on this device.`}
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
