import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import InvoiceHtmlView from '@/components/document-view/invoice/InvoiceHtmlView'
import InvoiceConfirmDialog from '@/components/document-view/invoice/InvoiceConfirmDialog'
import {
  InvoiceFloatingDownloadButton,
  InvoiceHero,
  InvoicePageShell,
  InvoiceTopNav,
} from '@/components/document-view/invoice/InvoiceFidelityPrimitives'
import InvoiceMoreSheet from '@/components/document-view/invoice/InvoiceMoreSheet'
import InvoiceToastViewport from '@/components/document-view/invoice/InvoiceToastViewport'
import InvoiceViewPage from '@/components/document-view/invoice/InvoiceViewPage'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import PdfOutputCustomizeSheet from '@/components/document-view/shared/PdfOutputCustomizeSheet'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { buildPdfRowCells, generateInvoicePdf, interpretPdfTableSettings } from '@/components/pdf-new'
import { mapInvoicePreviewNotesContent } from '@/components/invoice/view/invoiceDetailHelpers'
import RecordPaymentModal from '@/components/RecordPaymentModal'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { getInvoiceSourceDocument } from '@/domain/documentRelationships'
import {
  BUILTIN_COLUMNS,
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  parseCustomFields,
} from '@/domain/invoice'
import { buildInvoicePreviewModel } from '@/domain/invoice/previewModel'
import { buildInvoiceViewModel } from '@/domain/invoice/viewModel'
import { useInvoiceDetailData } from '@/hooks/useInvoiceDetailData'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { getPdfDesignPreset, resolvePdfWebFontFamily } from '@/lib/pdfDesignPreset'
import { supabase } from '@/supabase'
import { archiveInvoiceRecord, buildWaybillPrefill, deleteInvoiceRecord, downloadInvoiceCsvFile, duplicateInvoiceDraft, revertInvoiceToQuotation } from './viewInvoiceActions'

const SHEET_CUSTOMIZE = 'customize-output'
const SHEET_MORE = 'more-actions'
const SHEET_RECORD_PAYMENT = 'record-payment'
const SHEET_ADVANCE = 'advance'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const MODAL_REVERT = 'revert'
const MODAL_VOID_PAYMENT = 'void-payment'

export default function ViewInvoice() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const {
    invoice,
    items,
    payments,
    relatedCsrs,
    relatedWaybills,
    invoiceFinancials,
    client,
    settings,
    bankAccounts,
    linkedProject,
    loading,
    refresh,
  } = useInvoiceDetailData(id)

  const [downloading, setDownloading] = useState(false)
  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)
  const [reverting, setReverting] = useState(false)
  const settingsData: any = settings || {}

  const customFields = useMemo(() => parseCustomFields(invoice?.custom_fields), [invoice?.custom_fields])
  const sourceDocument = useMemo(() => getInvoiceSourceDocument(invoice), [invoice])

  const viewModel = useMemo(
    () =>
      buildInvoiceViewModel({
        invoice,
        items,
        payments,
        relatedCsrs,
        relatedWaybills,
        financials: invoiceFinancials,
        project: linkedProject,
        sourceDocument,
      }),
    [invoice, items, payments, relatedCsrs, relatedWaybills, invoiceFinancials, linkedProject, sourceDocument],
  )

  useEffect(() => {
    setPdfOutput(getInvoicePdfOutput(invoice?.custom_fields))
  }, [invoice?.custom_fields])

  const previewModel = useMemo(
    () =>
      buildInvoicePreviewModel({
        invoice: invoice || {},
        items: items || [],
        client: client || undefined,
        settings: settings || undefined,
        bankAccounts: bankAccounts || [],
        customFieldObject: customFields as any,
        pdfOutput,
        poNumber: String(invoice?.po_number || ''),
        invoiceTotal: viewModel.invoiceTotal || 0,
        cashReceived: viewModel.cashReceived || 0,
        balanceDue: viewModel.balanceDue || 0,
        formatMoney: (value) => formatNaira(value, { preserveFraction: true }),
      }),
    [invoice, items, client, settings, bankAccounts, customFields, pdfOutput, viewModel.balanceDue, viewModel.cashReceived, viewModel.invoiceTotal],
  )

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!invoice?.invoice_number) return
    try {
      await navigator.clipboard.writeText(invoice.invoice_number)
      showToast('Invoice number copied', invoice.invoice_number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available.')
    }
  }

  const handleShare = async () => {
    try {
      const result = await shareDocument({
        title: invoice?.invoice_number || 'Invoice',
        text: invoice?.invoice_title || 'Invoice',
      })
      showToast(
        result === 'shared' ? 'Share sheet opened' : 'Link copied',
        result === 'shared' ? 'Invoice share is ready.' : 'Invoice link copied.',
        'success',
      )
    } catch (error) {
      showToast('Share failed', error instanceof Error ? error.message : 'Could not share this invoice.')
    }
  }

  const handleSaveCustomization = async (nextPdfOutput: PdfOutputSettingsValue) => {
    if (!invoice?.id) return
    const nextCustomFields = {
      ...customFields,
      pdfOutput: nextPdfOutput,
    }
    const { error } = await supabase.from('invoices').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', invoice.id)
    if (error) throw error
    setPdfOutput(nextPdfOutput)
    showToast('Settings saved', 'Invoice PDF output settings updated.', 'success')
  }

  const handleDownload = async () => {
    if (!invoice || downloading) return
    setDownloading(true)
    try {
      const pdfDesignPreset = getPdfDesignPreset('invoice')
      const resolvedTable = interpretPdfTableSettings(BUILTIN_COLUMNS as any, { mergeQtyUnit: false })
      const referenceLinks = Array.isArray(customFields.attachments)
        ? customFields.attachments
            .filter((entry: any) => entry?.url)
            .map((entry: any, index: number) => ({
              label: String(entry.label || entry.name || `Reference ${index + 1}`),
              url: String(entry.url),
            }))
        : []

      await generateInvoicePdf({
        model: {
          identity: {
            id: String(invoice.id || id),
            kind: 'invoice',
            number: String(invoice.invoice_number || 'invoice'),
            title: String(invoice.invoice_title || 'Invoice'),
            issueDate: String(invoice.issue_date || ''),
            dueDate: String(invoice.due_date || ''),
            poNumber: String(invoice.po_number || ''),
            status: String(viewModel.computedStatus || invoice.status || ''),
            currency: 'NGN',
          },
          issuer: {
            label: 'From',
            name: String(settingsData.company_name || ''),
            addressLines: previewModel.companyPreviewLines || [],
            phone: String(settingsData.company_phone || ''),
            email: String(settingsData.company_email || ''),
            taxId: String(settingsData.company_vat || ''),
          },
          recipient: {
            label: 'Bill To',
            name: String(invoice.client_name || ''),
            attention: String(client?.contact_person || ''),
            addressLines: previewModel.clientPreviewLines || [],
            phone: String(client?.phone || ''),
            email: String(client?.email || ''),
          },
          headerFields: previewModel.previewDetailRows || [],
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
            cells:
              item.row_type === 'group_header'
                ? undefined
                : buildPdfRowCells(item, resolvedTable.columns, {
                    mergeQtyUnit: resolvedTable.mergeQtyUnit,
                    configuredColumns: resolvedTable.configuredColumns,
                  }),
            customData: item.custom_data || {},
          })),
          totals: {
            mode: 'standard',
            rows: (previewModel.previewTotals || []).map((row) => ({
              key: row.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              label: row.label,
              amount: Number(String(row.value).replace(/[^\d.-]/g, '')) || 0,
              emphasis: row.emphasis === true,
            })),
            amountInWords: String(invoice.amount_in_words || ''),
            balanceDue: viewModel.balanceDue || 0,
          },
          bankDetails: pdfOutput.showBankDetails ? previewModel.selectedPreviewBank : null,
          notes: invoice.notes
            ? { title: String(customFields.notesTitle || 'Notes'), content: invoice.notes, format: 'html' }
            : null,
          terms: invoice.terms
            ? { title: String(customFields.termsTitle || 'Terms and Conditions'), content: invoice.terms, format: 'html' }
            : null,
          additionalSections: [],
          referenceLinks,
          signature: null,
          logo: { imageUrl: String(settingsData.company_logo_url || '') || null, altText: String(settingsData.company_name || '') },
          footerText: pdfOutput.showFooter ? String(settingsData.footer_text || '') : '',
          tagline: pdfOutput.showTagline ? String(settingsData.company_tagline || '') : '',
          metaFooter: { companyName: String(settingsData.company_name || '') },
          template: { designPreset: pdfDesignPreset },
        },
        templateId: 'industry',
      })
      showToast('Download ready', 'Invoice PDF downloaded.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the invoice PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadCsv = () => {
    if (!invoice) return
    downloadInvoiceCsvFile({ invoice, items, invoiceTotal: viewModel.invoiceTotal })
    showToast('CSV downloaded', 'Invoice CSV exported.', 'success')
  }

  const handleMarkSent = async () => {
    if (!invoice?.id) return
    const { error } = await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id)
    if (error) {
      showToast('Status update failed', error.message)
      return
    }
    await refresh()
    showToast('Marked as sent', 'Invoice status updated.', 'success')
  }

  const handleDuplicate = async () => {
    if (!invoice) return
    try {
      navigate('/invoices/new', { state: await duplicateInvoiceDraft({ invoice, items }) })
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate this invoice.')
    }
  }

  const handleGenerateWaybill = () => {
    navigate('/waybills/new', { state: buildWaybillPrefill(invoice) })
  }

  const handleArchive = async () => {
    if (!invoice?.id) return
    try {
      await archiveInvoiceRecord(invoice.id)
      navigate('/invoices')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive this invoice.')
    }
  }

  const handleDelete = async () => {
    if (!invoice?.id) return
    try {
      await deleteInvoiceRecord(invoice.id)
      navigate('/invoices')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete this invoice.')
    }
  }

  const handleRevertToQuotation = async () => {
    if (!invoice?.id || reverting) return
    setReverting(true)
    try {
      const createdQuotation = await revertInvoiceToQuotation({ invoice, items, customFields })
      navigate(`/quotations/${createdQuotation.id}`)
    } catch (error) {
      showToast('Revert failed', error instanceof Error ? error.message : 'Could not revert this invoice.')
    } finally {
      ui.closeModal()
      setReverting(false)
    }
  }

  if (loading) {
    return (
      <InvoicePageShell topNav={<InvoiceTopNav title="Loading..." onBack={() => navigate('/invoices')} />} floating={null}>
        <CenteredSpinner />
      </InvoicePageShell>
    )
  }

  if (!invoice) return null

  const docProps = {
    id: invoice.id,
    number: invoice.invoice_number || '',
    title: invoice.invoice_title || 'Invoice',
    status: (viewModel.computedStatus || invoice.status || 'draft') as any,
  }

  const metrics = [
    { label: 'Total Due', value: formatNaira(viewModel.invoiceTotal || 0), status: 'info' as const },
    { label: 'Received', value: formatNaira(viewModel.cashReceived || 0), status: 'positive' as const },
    {
      label: 'Balance',
      value: formatNaira(viewModel.balanceDue || 0),
      status: (viewModel.balanceDue || 0) > 0 ? ('warning' as const) : ('positive' as const),
    },
  ]

  const progressPercent =
    viewModel.invoiceTotal > 0 ? Math.min(100, Math.round((viewModel.cashReceived / viewModel.invoiceTotal) * 100)) : 0
  const relatedDocuments = [
    ...(sourceDocument
      ? [
          {
            id: String(sourceDocument.id || sourceDocument.number || 'source'),
            title: `${sourceDocument.type === 'quotation' ? 'Quotation' : 'Document'} · ${sourceDocument.number || sourceDocument.id || 'Linked source'}`,
            subtitle: sourceDocument.po_number ? `PO ${sourceDocument.po_number}` : 'Open source document',
            kind: 'quotation' as const,
            onClick: sourceDocument.id
              ? () => navigate(`/${sourceDocument.type === 'quotation' ? 'quotations' : 'invoices'}/${sourceDocument.id}`)
              : undefined,
          },
        ]
      : []),
    ...relatedCsrs.map((csr: any) => ({
      id: `csr-${csr.id}`,
      title: `CSR · ${csr.csr_number || csr.id}`,
      subtitle: 'Open linked CSR',
      kind: 'csr' as const,
      onClick: () => navigate(`/csr/${csr.id}`),
    })),
    ...relatedWaybills.map((waybill: any) => ({
      id: `waybill-${waybill.id}`,
      title: `Waybill · ${waybill.waybill_number || waybill.id}`,
      subtitle: 'Open linked waybill',
      kind: 'document' as const,
      onClick: () => navigate(`/waybills/${waybill.id}`),
    })),
    ...(linkedProject
      ? [
          {
            id: `project-${linkedProject.id}`,
            title: `Project · ${linkedProject.name || linkedProject.id}`,
            subtitle: 'Open linked project',
            kind: 'project' as const,
            onClick: () => navigate(`/projects/${linkedProject.id}`),
          },
        ]
      : []),
  ]

  const attachments = Array.isArray(customFields.attachments)
    ? customFields.attachments.map((entry: any, index: number) => ({
        id: `attachment-${index}`,
        label: String(entry.label || entry.name || entry.url || `Reference ${index + 1}`),
      }))
    : []

  return (
    <>
      <InvoicePageShell
        topNav={
          <InvoiceTopNav
            title={docProps.number}
            subtitle={invoice.invoice_title || 'Tax Invoice'}
            onBack={() => navigate('/invoices')}
            onShare={() => void handleShare()}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
          />
        }
        floating={<InvoiceFloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlay={
          <>
            <PdfOutputCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize Invoice PDF"
              subtitle="These controls update the same invoice PDF output settings used by download."
              documentType="invoice"
              value={pdfOutput}
              bankAccounts={previewModel.previewBankAccounts}
              companyTagline={String(settingsData.company_tagline || '')}
              footerText={String(settingsData.footer_text || '')}
              showBalanceDueOption
              onSave={(nextValue) => handleSaveCustomization(nextValue)}
            />

            <InvoiceMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => void handleMarkSent()}
              onRevert={() => ui.openModal(MODAL_REVERT)}
              onGenerateWaybill={handleGenerateWaybill}
              onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
              onAdvanceInvoice={() => ui.openSheet(SHEET_ADVANCE)}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExportCsv={handleDownloadCsv}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <RecordPaymentModal
              open={ui.isSheetOpen(SHEET_RECORD_PAYMENT)}
              invoice={{
                id: String(invoice.id),
                invoice_number: invoice.invoice_number || 'Invoice',
                client_name: invoice.client_name || '',
                total: Number(viewModel.invoiceTotal || 0),
              }}
              onOpenChange={(open) => {
                if (!open) ui.closeSheet()
              }}
              onSaved={() => refresh()}
            />

            <InvoiceConfirmDialog
              open={ui.isSheetOpen(SHEET_ADVANCE)}
              title="Advance Invoice"
              description="Advance invoice creation is not wired into this view yet. Use the invoice edit/detail flow for now."
              cancelLabel="Close"
              confirmLabel="Close"
              onConfirm={ui.closeSheet}
              onCancel={ui.closeSheet}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Invoice?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_REVERT)}
              title="Revert to Quotation?"
              description={`${docProps.number} will be converted back to a draft quotation. Existing payment records will be preserved.`}
              cancelLabel="Cancel"
              confirmLabel={reverting ? 'Reverting...' : 'Revert'}
              onConfirm={() => void handleRevertToQuotation()}
              onCancel={ui.closeModal}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Invoice?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => void handleDelete()}
              onCancel={ui.closeModal}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_VOID_PAYMENT)}
              title="Void Payment?"
              description="Payment voiding is not wired from this view yet."
              cancelLabel="Close"
              confirmLabel="Close"
              onConfirm={ui.closeModal}
              onCancel={ui.closeModal}
            />

            <ProjectLinkDialog
              open={projectLinkOpen}
              onOpenChange={setProjectLinkOpen}
              tableName="invoices"
              recordId={String(invoice.id || '')}
              documentLabel={docProps.number || 'Invoice'}
              onLinked={() => refresh()}
            />
          </>
        }
      >
        <InvoiceHero
          label={invoice.invoice_title || 'Tax Invoice'}
          number={docProps.number}
          description={invoice.client_name || 'No client specified'}
          status={docProps.status}
          totals={metrics}
        />

        <InvoiceViewPage
          metrics={metrics}
          documentPreview={
            <InvoiceHtmlView
              invoice={invoice}
              viewModel={viewModel}
              previewModel={previewModel}
              pdfOutput={pdfOutput}
              settingsData={settingsData}
            />
          }
          paymentSummary={[
            { label: 'Cash Received', value: formatNaira(viewModel.cashReceived || 0), tone: 'green' },
            { label: 'Balance Due', value: formatNaira(viewModel.balanceDue || 0) },
          ]}
          paymentProgressLabel={`${progressPercent}% settled · ${formatNaira(viewModel.balanceDue || 0)} remaining`}
          paymentProgressWidth={`${progressPercent}%`}
          paymentHistory={(viewModel.paymentHistory || []).map((payment: any) => ({
            id: String(payment.id),
            amountLabel: formatNaira(payment.total || 0),
            dateLabel: formatDisplayDate(payment.date),
            methodLabel: payment.method || 'Payment',
            referenceLabel: payment.reference || '',
            kind: Number(payment.wht_amount || 0) > 0 && Number(payment.cash_amount || 0) === 0 ? 'wht' : 'cash',
          }))}
          advanceInvoices={
            invoice.is_advance
              ? [
                  {
                    id: String(invoice.id),
                    title: invoice.invoice_title || invoice.invoice_number || 'Advance Invoice',
                    subtitle: 'This invoice is marked as an advance invoice.',
                    amountLabel: formatNaira(viewModel.invoiceTotal || 0),
                  },
                ]
              : []
          }
          relatedDocuments={relatedDocuments}
          attachments={attachments}
          onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
          onEdit={() => navigate(`/invoices/edit/${id}`)}
          onAdvanceDownload={() => void handleDownload()}
          onAdvanceEdit={() => ui.openSheet(SHEET_ADVANCE)}
          onAdvanceRemove={() => ui.openModal(MODAL_DELETE)}
          onVoidPayment={() => ui.openModal(MODAL_VOID_PAYMENT)}
        />
      </InvoicePageShell>

      <InvoiceToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}