import React, { useCallback, useState, useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import {
  DocumentActionGrid,
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
import RecordPaymentModal from '@/components/RecordPaymentModal'
import { PdfBankControls, PdfSupportingOptions } from '@/components/PdfOutputSettings'
import { buildInvoiceCsv, downloadInvoiceCsv } from '../components/invoice/exportInvoiceCsv'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  parseCustomFields,
  toDbItem,
} from '@/domain/invoice'
import { parseDocumentCustomFields } from '@/domain/documentConversion'
import { getInvoiceSourceDocument } from '@/domain/documentRelationships'
import { buildInvoiceViewModel } from '@/domain/invoice/viewModel'
import { computeDocument } from '@/lib/Calculations'
import { PDF_TEMPLATES, DEFAULT_TEMPLATE } from '@/components/pdf/pdfTemplates'
import {
  getPdfDesignPreset,
  setPdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { isDocumentFillableEnabled } from '@/lib/documentFillableSettings'
import { getPdfTemplatePreset, setPdfTemplatePreset } from '@/lib/pdfTemplatePreset'
import { toast } from '@/hooks/use-toast'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import InvoiceActionsSheet from '@/components/invoice/InvoiceActionsSheet'
import RevertInvoiceDialog from '@/components/invoice/RevertInvoiceDialog'
import InvoicePaymentSection from '@/components/invoice/InvoicePaymentSection'
import VoidPaymentDialog from '@/components/invoice/VoidPaymentDialog'
import { getInvoiceDetailActionDefs } from '@/domain/invoice/actions'
import { buildInvoicePreviewModel } from '@/domain/invoice/previewModel'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useInvoiceDetailData } from '@/hooks/useInvoiceDetailData'
import { numberToWords } from '@/hooks/useInvoiceForm'
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

export default function ViewInvoice() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [showMore, setShowMore] = useState(false)
  const [showPdfSheet, setShowPdfSheet] = useState(false)
  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT)
  const [pdfTemplate, setPdfTemplate] = useState(() => getPdfTemplatePreset('invoice', DEFAULT_TEMPLATE))
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

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('thread_id', invoice.id)
      .eq('thread_role', 'advance')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('Advance invoice fetch failed:', error)
      setAdvanceInvoice(null)
      return
    }

    setAdvanceInvoice(data?.[0] || null)
  }, [invoice?.id, invoice?.thread_id])

  useEffect(() => {
    void loadAdvanceInvoice()
  }, [loadAdvanceInvoice])

  useEffect(() => {
    if (!invoice || !location.state?.openAdvanceSheet || invoice.thread_id) return
    setAdvanceSheetMode('create')
    setShowAdvanceSheet(true)
    navigate(`/invoices/${id}`, { replace: true, state: {} })
  }, [id, invoice?.thread_id, location.state?.openAdvanceSheet, navigate])

  if (loading) {
    return (
      <Layout title="Invoice">
        <p style={{ padding: 30 }}>Loading...</p>
      </Layout>
    )
  }

  if (!invoice) {
    return (
      <Layout title="Invoice">
        <p style={{ padding: 30 }}>Invoice not found.</p>
      </Layout>
    )
  }

  const poNumber = String(invoice.po_number || '').trim()

  const formatMoney = (value) => `\u20A6${Number(value || 0).toLocaleString()}`

  const formatDate = (value) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
  }

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')
  const isStandaloneInvoice = !invoice.thread_id
  const isAdvanceInvoice = invoice.thread_role === 'advance' || invoice.is_advance === true
  const contractValue = Number(invoiceTotal || 0)
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

  const canManagePayment = canRecordPayment && isStandaloneInvoice

  const customFieldObject = parseCustomFields(invoice.custom_fields)
  const selectedSignatory =
    signatories.find((signatory) => signatory.id === getInvoiceSignatoryId(customFieldObject)) || null

  const syncAdvanceForm = useCallback((nextAdvanceInvoice) => {
    const nextMode = nextAdvanceInvoice?.advance_mode === 'fixed' ? 'fixed' : 'percent'
    const rawValue =
      nextAdvanceInvoice?.advance_value !== null
      && nextAdvanceInvoice?.advance_value !== undefined
        ? String(nextAdvanceInvoice.advance_value)
        : nextMode === 'fixed'
          ? String(nextAdvanceInvoice?.total || '')
          : '50'

    setAdvanceMode(nextMode)
    setAdvanceInputValue(rawValue)
  }, [])

  useEffect(() => {
    if (advanceInvoice && advanceSheetMode === 'create') {
      setAdvanceSheetMode('view')
      syncAdvanceForm(advanceInvoice)
    }
  }, [advanceInvoice, advanceSheetMode, syncAdvanceForm])

  const openAdvanceSheet = (mode = advanceInvoice ? 'view' : 'create') => {
    if (mode === 'edit' && advanceInvoice) {
      syncAdvanceForm(advanceInvoice)
    }
    if (mode === 'create' && !advanceInvoice) {
      setAdvanceMode('percent')
      setAdvanceInputValue('50')
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
      if (advanceInvoice) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            total: advanceAmount,
            amount_in_words: numberToWords(advanceAmount),
            advance_mode: advanceMode,
            advance_value: safeAdvanceInput,
          })
          .eq('id', advanceInvoice.id)

        if (updateError) throw updateError
      } else {
        const { data: existingNumbers, error: numberError } = await supabase
          .from('invoices')
          .select('invoice_number')
          .like('invoice_number', 'SASINV-B%')
          .order('created_at', { ascending: false })

        if (numberError) throw numberError

        const nextNumber = Math.max(
          0,
          ...(existingNumbers || [])
            .map((entry) => parseInt(String(entry.invoice_number || '').replace('SASINV-B', ''), 10))
            .filter((value) => Number.isFinite(value)),
        ) + 1

        const customFieldPayload = JSON.stringify(parseCustomFields(invoice.custom_fields))

        const { data: createdInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([
            {
              invoice_number: `SASINV-B${String(nextNumber).padStart(3, '0')}`,
              po_number: String(invoice.po_number || '').trim() || null,
              invoice_title: invoice.invoice_title || null,
              client_id: invoice.client_id || null,
              client_name: invoice.client_name || '',
              project_id: invoice.project_id || null,
              issue_date: new Date().toISOString().split('T')[0],
              due_date: invoice.due_date || null,
              status: 'draft',
              document_type: invoice.document_type || 'INVOICE',
              payment_terms: invoice.payment_terms || 'Custom',
              notes: invoice.notes || '',
              terms: invoice.terms || '',
              workmanship: Number(invoice.workmanship || 0),
              transportation: Number(invoice.transportation || 0),
              shipping: Number(invoice.shipping || 0),
              discount: Number(invoice.discount || 0),
              vat: Number(invoice.vat || 0),
              wht: Number(invoice.wht || 0),
              subtotal: Number(invoice.subtotal || 0),
              install_rate_total: Number(invoice.install_rate_total || 0),
              total: advanceAmount,
              amount_in_words: numberToWords(advanceAmount),
              custom_fields: customFieldPayload,
              thread_id: invoice.id,
              thread_role: 'advance',
              thread_position: 1,
              total_contract_value: contractValue,
              advance_mode: advanceMode,
              advance_value: safeAdvanceInput,
              is_advance: true,
            },
          ])
          .select()
          .single()

        if (invoiceError || !createdInvoice) {
          throw new Error(invoiceError?.message || 'Could not create advance invoice.')
        }

        const childItems = items
          .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
          .map((item, index) => toDbItem(item, createdInvoice.id, index))

        if (childItems.length > 0) {
          const { error: itemError } = await supabase.from('invoice_items').insert(childItems)
          if (itemError) {
            await supabase.from('invoices').delete().eq('id', createdInvoice.id)
            throw itemError
          }
        }
      }

      await loadAdvanceInvoice()
      setAdvanceSheetMode('view')
      toast({
        title: advanceInvoice ? 'Advance updated' : 'Advance invoice created',
        description: advanceInvoice
          ? 'Advance values were updated.'
          : 'Advance invoice was created from this invoice.',
      })
    } catch (error) {
      toast({
        title: advanceInvoice ? 'Advance update failed' : 'Advance creation failed',
        description: error?.message || 'Could not save advance invoice.',
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
      const { data: advanceItems, error: advanceItemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', advanceInvoice.id)
        .order('sort_order')

      if (advanceItemsError) throw advanceItemsError

      const loadedAdvanceItems = (advanceItems || []).map((item) => ({
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

      const advanceTotal = Number(advanceInvoice.total || 0)
      const baseComputedResult = computeDocument({
        items: loadedAdvanceItems,
        document: advanceInvoice,
        cf: parseDocumentCustomFields(advanceInvoice.custom_fields || {}),
      })

      const computedResult = {
        ...baseComputedResult,
        grandTotal: advanceTotal,
        totalPayable: advanceTotal,
        cashReceived: 0,
        settledTotal: 0,
        balanceDue: advanceTotal,
      }

      const advanceCustomFields = parseCustomFields(advanceInvoice.custom_fields)
      const advanceSignatory =
        signatories.find((signatory) => signatory.id === getInvoiceSignatoryId(advanceCustomFields)) || null

      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/InvoicePDF'),
      ])

      const blob = await pdf(
        <InvoicePDF
          document={advanceInvoice}
          items={loadedAdvanceItems}
          client={client}
          settings={settings}
          computedResult={computedResult}
          template={pdfTemplate}
          designPreset={pdfDesignPreset}
          bankAccounts={bankAccounts}
          pdfOutput={getInvoicePdfOutput(advanceInvoice.custom_fields)}
          signatory={advanceSignatory}
        />
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
    if (!advanceInvoice?.id) return
    setShowAdvanceDeleteConfirm(false)
    setAdvanceSaving(true)

    try {
      const { error: deleteItemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', advanceInvoice.id)
      if (deleteItemsError) throw deleteItemsError

      const { error: deleteInvoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', advanceInvoice.id)
      if (deleteInvoiceError) throw deleteInvoiceError

      setAdvanceInvoice(null)
      setShowAdvanceSheet(false)
      setAdvanceSheetMode('create')
      setAdvanceMode('percent')
      setAdvanceInputValue('50')
      toast({ title: 'Advance removed', description: 'The advance invoice was deleted.' })
    } catch (error) {
      toast({
        title: 'Advance removal failed',
        description: error?.message || 'Could not remove advance invoice.',
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

  const linkedDocumentsSections = [
    {
      key: 'source',
      title: 'Source',
      description: 'Documents this invoice came from.',
      items: sourceDocument
        ? [
            {
              key: `source-${sourceDocument.id || sourceDocument.number || 'invoice-source'}`,
              label: `${sourceDocument.type === 'quotation' ? 'Quotation' : 'Document'} ${
                sourceDocument.number || sourceDocument.id || 'Linked source'
              }`,
              subtitle: sourceDocument.po_number
                ? `PO ${sourceDocument.po_number}`
                : 'Open the source document',
              onClick: () => {
                if (sourceDocument.id) {
                  navigate(`/${sourceDocument.type === 'quotation' ? 'quotations' : 'invoices'}/${sourceDocument.id}`)
                }
              },
              disabled: !sourceDocument.id,
            },
          ]
        : [],
    },
    {
      key: 'generated',
      title: 'Generated / Child Documents',
      description: 'Documents created from this invoice.',
      items: [
        {
          key: 'attach-csr',
          label: 'Attach Existing CSR',
          subtitle: 'Search and link a CSR to this invoice',
          onClick: () => {
            setShowLinkedDocuments(false)
            setAttachKind('csr')
            setShowAttachSheet(true)
          },
        },
        {
          key: 'attach-waybill',
          label: 'Attach Existing Waybill',
          subtitle: 'Search and link a waybill to this invoice',
          onClick: () => {
            setShowLinkedDocuments(false)
            setAttachKind('waybill')
            setShowAttachSheet(true)
          },
        },
        ...(invoiceRelatedDocs.csrs || []).map((csr) => ({
          key: `csr-${csr.id}`,
          label: `CSR ${csr.csr_number || csr.id}`,
          subtitle: 'Open linked CSR',
          onClick: () => navigate(`/csr/${csr.id}`),
        })),
        ...(invoiceRelatedDocs.waybills || []).map((waybill) => ({
          key: `waybill-${waybill.id}`,
          label: `Waybill ${waybill.waybill_number || waybill.id}`,
          subtitle: 'Open linked waybill',
          onClick: () => navigate(`/waybills/${waybill.id}`),
        })),
      ],
    },
    {
      key: 'project',
      title: 'Project',
      description: 'Project connected to this invoice.',
      items: linkedProject
        ? [
            {
              key: `project-${linkedProject.id}`,
              label: linkedProject.name || linkedProject.id,
              subtitle: 'Open linked project',
              onClick: () => navigate(`/projects/${linkedProject.id}`),
            },
          ]
        : [],
    },
  ]

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
            }
          : {}),
        cashReceived,
        settledTotal,
        balanceDue: isAdvanceInvoice ? Math.max(0, invoiceTotal - settledTotal) : balanceDue,
      }

      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/InvoicePDF'),
      ])

      const blob = await pdf(
        <InvoicePDF
          document={invoice}
          items={items}
          client={client}
          settings={settings}
          computedResult={computedResult}
          template={pdfTemplate}
          designPreset={pdfDesignPreset}
          bankAccounts={bankAccounts}
          pdfOutput={pdfOutput}
          signatory={selectedSignatory}
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

  const shellStatusItems = ['draft', 'sent', 'partial', 'paid', 'overdue'].map((status) => ({
    label: String(status)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    active: computedStatus === status,
    onClick: () => {
      if (status === 'partial' || status === 'paid' || status === 'overdue') return
      void handleStatusChange(status)
    },
    disabled: status === 'partial' || status === 'paid' || status === 'overdue',
  }))

  const activePdfTemplate = PDF_TEMPLATES.find((template) => template.id === pdfTemplate) || PDF_TEMPLATES[0]
  const showInvoiceFillableControls = isDocumentFillableEnabled(settings?.document_fillable_settings, 'invoice')

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

  const previewNotesContent = previewNotesSections.map((section) => {
    if (section.kind === 'html') {
      return {
        title: section.title,
        content: (
          <div
            className="prose prose-sm max-w-none break-words text-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.html) }}
          />
        ),
      }
    }

    if (section.kind === 'links') {
      return {
        title: section.title,
        content: (
          <div className="space-y-2">
            {section.links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-4"
              >
                {link.label}
              </a>
            ))}
          </div>
        ),
      }
    }

    return {
      title: section.title,
      content: <div className="whitespace-pre-wrap break-words">{section.text}</div>,
    }
  })

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

        <DocumentSummaryDisclosure
          eyebrow="Total Payable"
          value={formatMoney(invoiceTotal)}
          helper={invoice.amount_in_words || invoice.invoice_title || 'Invoice ready for payment tracking.'}
          stats={[
            {
              label: 'Balance Due',
              value: formatMoney(balanceDue),
              className: balanceDue > 0 ? 'text-red-400' : 'text-emerald-300',
            },
            {
              label: 'Received',
              value: formatMoney(cashReceived),
              className: 'text-emerald-300',
            },
            {
              label: 'Due Date',
              value: invoice.due_date || 'Open',
              className: 'text-white',
            },
          ]}
          compactLabel="Invoice Summary"
          openLabel="Open summary"
          closeLabel="Collapse summary"
        />

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
              : {
                  key: 'more',
                  label: 'More',
                  onClick: () => setShowMore(true),
                  variant: 'outline',
                },
          ]}
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
          accentColor={pdfDesignPreset.accentColor}
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
                    templates={PDF_TEMPLATES}
                  />
                ),
              },
              {
                key: 'styling',
                title: 'Fonts & Color',
                content: (
                  <DocumentDesignStyleEditor
                    value={pdfDesignPreset}
                    onChange={handlePdfDesignPresetChange}
                    showFillableControls={showInvoiceFillableControls}
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

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Line Items</div>
          <Card className="rounded-[24px] border-border shadow-sm">
            <CardContent className="space-y-3 p-4">
              {(() => {
                let itemNumber = 0
                return items.map((item, index) => {
                  if (item.row_type === 'group_header') {
                    return (
                      <div
                        key={item._uiKey || item.id || index}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-300"
                      >
                        {item.group_name || `Group ${index + 1}`}
                      </div>
                    )
                  }

                  itemNumber += 1

                  return (
                    <div
                      key={item._uiKey || item.id || index}
                      className="flex gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-extrabold text-slate-500">
                        {itemNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-foreground">
                          {item.description || 'Untitled item'}
                        </div>
                        {item.sub_description ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.sub_description}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Qty {item.quantity || 0}
                          {item.unit ? ` ${item.unit}` : ''}
                          {item.make ? ` · ${item.make}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-extrabold text-foreground">
                          {formatMoney(item.amount || item.quantity * item.unit_price || 0)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatMoney(item.unit_price || 0)} each
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </CardContent>
          </Card>
        </div>

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
              className: 'bg-slate-950 text-white hover:bg-slate-800',
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

        <Sheet
          open={showAdvanceSheet}
          onOpenChange={(nextOpen) => {
            if (advanceSaving || advancePdfGenerating) return
            setShowAdvanceSheet(nextOpen)
          }}
        >
          <SheetContent side="bottom" className="max-h-[92vh] rounded-t-[28px] bg-card p-0 [&>[data-slot=sheet-close]]:hidden">
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
                <SheetTitle className="text-base font-semibold text-foreground">
                  {advanceSheetMode === 'edit'
                    ? 'Edit Advance'
                    : advanceInvoice && advanceSheetMode === 'view'
                      ? 'View Advance'
                      : 'Create Advance'}
                </SheetTitle>
                <SheetDescription>
                  For {invoice.invoice_number || 'this invoice'}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Invoice No</div>
                      <div className="mt-1 text-sm font-bold text-foreground">{invoice.invoice_number || 'Invoice'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Contract Value</div>
                      <div className="mt-1 text-sm font-bold text-foreground">{formatMoney(contractValue)}</div>
                    </div>
                  </div>
                </div>

                {advanceSheetMode === 'view' && advanceInvoice ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Advance Invoice</div>
                      <div className="mt-1 text-sm font-bold text-foreground">{advanceInvoice.invoice_number || 'Advance Invoice'}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{formatMoney(advanceInvoice.total || 0)}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Contract Value</div>
                          <div className="mt-1 text-base font-extrabold">{formatMoney(contractValue)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">This Advance</div>
                          <div className="mt-1 text-base font-extrabold">{formatMoney(Number(advanceInvoice.total || 0))}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Balance Remaining</div>
                          <div className="mt-1 text-base font-extrabold">{formatMoney(Math.max(0, contractValue - Number(advanceInvoice.total || 0)))}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Mode</div>
                      <div className="inline-flex rounded-full border border-border bg-muted/30 p-1">
                        <button
                          type="button"
                          onClick={() => setAdvanceMode('percent')}
                          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                            advanceMode === 'percent' ? 'bg-slate-950 text-white' : 'text-slate-600'
                          }`}
                        >
                          Percent
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvanceMode('fixed')}
                          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                            advanceMode === 'fixed' ? 'bg-slate-950 text-white' : 'text-slate-600'
                          }`}
                        >
                          Fixed
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advance-value">
                        {advanceMode === 'fixed' ? 'Advance Amount' : 'Advance Percentage'}
                      </Label>
                      <Input
                        id="advance-value"
                        type="number"
                        min="0"
                        max={advanceMode === 'fixed' ? String(contractValue) : '100'}
                        step={advanceMode === 'fixed' ? '0.01' : '1'}
                        inputMode="decimal"
                        value={advanceInputValue}
                        onChange={(event) => setAdvanceInputValue(event.target.value)}
                        disabled={advanceSaving}
                        className="h-12 rounded-2xl"
                      />
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Contract Value</div>
                          <div className="mt-1 text-base font-extrabold">{formatMoney(contractValue)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">This Advance</div>
                          <div className="mt-1 text-base font-extrabold">{formatMoney(advanceAmount)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Balance Remaining</div>
                          <div className="mt-1 text-base font-extrabold">{formatMoney(balanceRemaining)}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sticky bottom-0 border-t border-border bg-card px-5 py-4">
                {advanceSheetMode === 'view' && advanceInvoice ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAdvanceDeleteConfirm(true)}
                      disabled={advanceSaving || advancePdfGenerating}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Remove
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDownloadAdvancePDF()}
                        disabled={advanceSaving || advancePdfGenerating}
                      >
                        {advancePdfGenerating ? 'Preparing...' : 'Download PDF'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => openAdvanceSheet('edit')}
                        disabled={advanceSaving || advancePdfGenerating}
                        className="bg-slate-950 text-white hover:bg-slate-800"
                      >
                        Edit Advance
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAdvanceSheet(false)
                        if (advanceInvoice) setAdvanceSheetMode('view')
                      }}
                      disabled={advanceSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSaveAdvance()}
                      disabled={advanceSaving}
                      className="bg-slate-950 text-white hover:bg-slate-800"
                    >
                      {advanceSaving
                        ? advanceSheetMode === 'edit' ? 'Saving...' : 'Creating...'
                        : advanceSheetMode === 'edit' ? 'Save Advance' : 'Create Advance'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <ConfirmActionDialog
          open={showAdvanceDeleteConfirm}
          onOpenChange={setShowAdvanceDeleteConfirm}
          title="Remove advance invoice?"
          description="This deletes the advance invoice generated from this invoice."
          confirmLabel="Remove Advance"
          onConfirm={() => void confirmDeleteAdvanceInvoice()}
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
              className: 'bg-emerald-600 text-white hover:bg-emerald-700',
              disabled: computedStatus === 'paid' || !isStandaloneInvoice,
            },
          ]}
        />
      </div>
    </Layout>
  )
}
