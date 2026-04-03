import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvoiceDetailData } from '@/hooks/useInvoiceDetailData'
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations'
import { createAdvanceInvoiceFromSource, validateAdvanceInput } from '@/domain/invoice/advance'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

export default function ViewInvoice() {
  const { id } = useParams()
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
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false)
  const [creatingAdvance, setCreatingAdvance] = useState(false)
  const [advanceMode, setAdvanceMode] = useState('percent')
  const [advanceValue, setAdvanceValue] = useState('')
  const [advanceSuffix, setAdvanceSuffix] = useState('A')

  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [attachKind, setAttachKind] = useState(null)
  const [showAttachSheet, setShowAttachSheet] = useState(false)

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

  const customFieldObject = parseCustomFields(invoice.custom_fields)
  const advanceStage = customFieldObject?.advanceStage && typeof customFieldObject.advanceStage === 'object'
    ? customFieldObject.advanceStage
    : null
  const isAdvanceInvoice = invoice.thread_role === 'advance' || advanceStage?.kind === 'advance'
  const selectedSignatory =
    signatories.find((signatory) => signatory.id === getInvoiceSignatoryId(customFieldObject)) || null

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
    canRecordPayment,
    reverting: converting,
    showMarkSent: invoice.status === 'draft',
    isStandalone: !invoice.thread_id,
  })

  const openAdvanceDialog = () => {
    setShowMore(false)
    setAdvanceMode('percent')
    setAdvanceValue('')
    setAdvanceSuffix('A')
    setShowAdvanceDialog(true)
  }

  const handleCreateAdvanceInvoice = async () => {
    if (creatingAdvance) return
    const sourceTotal = Number(invoice.total || 0)
    const numericValue = Number(advanceValue)
    const validationError = validateAdvanceInput({
      sourceTotal,
      mode: advanceMode,
      value: numericValue,
    })
    if (validationError) {
      toast({ title: 'Invalid advance input', description: validationError, variant: 'destructive' })
      return
    }

    setCreatingAdvance(true)
    try {
      const child = await createAdvanceInvoiceFromSource({
        sourceInvoice: invoice,
        mode: advanceMode,
        value: numericValue,
        suffix: advanceSuffix,
      })
      setShowAdvanceDialog(false)
      navigate(`/invoices/edit/${child.id}`)
    } catch (error) {
      toast({
        title: 'Advance invoice failed',
        description: error?.message || 'Unable to create advance invoice.',
        variant: 'destructive',
      })
    } finally {
      setCreatingAdvance(false)
    }
  }

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
    export: handleDownloadCsv,
    'copy-number': () => {
      void handleCopy(invoice.invoice_number || '', 'Invoice number')
    },
    clone: handleClone,
    advance: openAdvanceDialog,
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
        cashReceived,
        settledTotal,
        balanceDue,
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
          subtitle={isAdvanceInvoice ? 'Advance Invoice' : 'Invoice'}
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
              disabled: !canRecordPayment,
            },
            { key: 'edit', label: 'Edit', onClick: () => navigate('/invoices/edit/' + id), variant: 'blue' },
            { key: 'more', label: 'More', onClick: () => setShowMore(true), variant: 'outline' },
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
            ...(isAdvanceInvoice && advanceStage?.sourceInvoiceNumber
              ? [{ label: 'Source', value: String(advanceStage.sourceInvoiceNumber) }]
              : []),
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

        <DocumentSection title="Line Items">
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

        <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Advance Invoice</DialogTitle>
              <DialogDescription>
                Create a child invoice from {invoice.invoice_number || 'this invoice'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={advanceMode} onValueChange={setAdvanceMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{advanceMode === 'percent' ? 'Percent Value' : 'Fixed Amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  step={advanceMode === 'percent' ? '0.01' : '1'}
                  value={advanceValue}
                  onChange={(event) => setAdvanceValue(event.target.value)}
                  placeholder={advanceMode === 'percent' ? 'e.g. 30' : 'e.g. 50000'}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Suffix</Label>
                <Input value={advanceSuffix} onChange={(event) => setAdvanceSuffix(event.target.value)} placeholder="A" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdvanceDialog(false)} disabled={creatingAdvance}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleCreateAdvanceInvoice()} disabled={creatingAdvance}>
                {creatingAdvance ? 'Creating…' : 'Create Advance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DocumentBottomBar
          actions={[
            { label: 'Back', onClick: () => navigate('/invoices'), variant: 'outline' },
            { label: 'Edit', onClick: () => navigate('/invoices/edit/' + id), variant: 'outline' },
            {
              label: computedStatus === 'paid' ? 'Paid in Full' : 'Record Payment',
              onClick: () => setShowPaymentModal(true),
              className: 'bg-emerald-600 text-white hover:bg-emerald-700',
              disabled: computedStatus === 'paid',
            },
          ]}
        />
      </div>
    </Layout>
  )
}
