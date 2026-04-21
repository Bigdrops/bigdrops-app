import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import InvoiceHtmlView from '@/components/document-view/invoice/InvoiceHtmlView'
import {
  InvoiceHero,
} from '@/components/document-view/invoice/InvoiceFidelityPrimitives'
import InvoiceMoreSheet from '@/components/document-view/invoice/InvoiceMoreSheet'
import InvoiceRecordPaymentSheet from '@/components/document-view/invoice/InvoiceRecordPaymentSheet'
import InvoiceAdvanceSheet from '@/components/document-view/invoice/InvoiceAdvanceSheet'
import InvoiceViewPage from '@/components/document-view/invoice/InvoiceViewPage'
import PdfOutputCustomizeSheet from '@/components/document-view/shared/PdfOutputCustomizeSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { buildPdfRowCells, generateInvoicePdf, interpretPdfTableSettings } from '@/components/pdf-new'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { getInvoiceSourceDocument } from '@/domain/documentRelationships'
import { resolveCanonicalItemImageUrl, resolveCanonicalLogoUrl } from '@/domain/documentMedia.js'
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
import { getPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { computeDocument } from '@/lib/Calculations'
import { supabase } from '@/supabase'
import { archiveInvoiceRecord, buildWaybillPrefill, deleteInvoiceRecord, downloadInvoiceCsvFile, duplicateInvoiceDraft, revertInvoiceToQuotation } from './viewInvoiceActions'

const SHEET_CUSTOMIZE = 'customize-output'
const SHEET_MORE = 'more-actions'
const SHEET_RECORD_PAYMENT = 'record-payment'
const SHEET_ADVANCE = 'advance'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const MODAL_REVERT = 'revert'

const toTitleCase = (value: string) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

export default function ViewInvoice() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [pdfOutput, setPdfOutput] = useState<PdfOutputSettingsValue>(DEFAULT_INVOICE_PDF_OUTPUT)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)
  const [reverting, setReverting] = useState(false)
  const settingsData: any = settings || {}

  const customFields = useMemo(() => parseCustomFields(invoice?.custom_fields), [invoice?.custom_fields])
  const sourceDocument = useMemo(() => getInvoiceSourceDocument(invoice), [invoice])

  const viewModel = useMemo(
    () =>
      buildInvoiceViewModel({
        invoice,
        items: Array.isArray(items) ? items : [],
        payments: Array.isArray(payments) ? payments : [],
        relatedCsrs: Array.isArray(relatedCsrs) ? relatedCsrs : [],
        relatedWaybills: Array.isArray(relatedWaybills) ? relatedWaybills : [],
        financials: invoiceFinancials || null,
        project: linkedProject || null,
        sourceDocument: sourceDocument || null,
      }),
    [invoice, items, payments, relatedCsrs, relatedWaybills, invoiceFinancials, linkedProject, sourceDocument],
  )

  useEffect(() => {
    if (invoice?.custom_fields) {
      setPdfOutput(getInvoicePdfOutput(invoice.custom_fields))
    }
  }, [invoice?.custom_fields])

  const previewTotalsSource = useMemo(() => {
    if (!invoice) return null

    const savedColumns = Array.isArray(customFields?.columnConfig) ? customFields.columnConfig : BUILTIN_COLUMNS
    const totals = computeDocument({
      items: Array.isArray(items) ? items : [],
      document: invoice,
      cf: customFields || {},
      columns: savedColumns as any,
    })

    return {
      totals,
      invoiceTotal: totals.totalPayable || 0,
      balanceDue: Math.max(0, (totals.totalPayable || 0) - Number(viewModel.settledTotal || 0)),
    }
  }, [customFields, invoice, items, viewModel.settledTotal])

  const openRevertFlow = useCallback(() => {
    ui.closeSheet()
    requestAnimationFrame(() => {
      ui.openModal(MODAL_REVERT)
    })
  }, [ui])

  useEffect(() => {
    if (!invoice?.id) return
    if (location.state?.openRevertModal !== true) return

    openRevertFlow()
    navigate(location.pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        openRevertModal: false,
      },
    })
  }, [invoice?.id, location.pathname, location.state, navigate, openRevertFlow])

  const previewModel = useMemo(
    () =>
      buildInvoicePreviewModel({
        invoice: invoice || {},
        items: Array.isArray(items) ? items : [],
        client: client || undefined,
        settings: settings || undefined,
        bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
        customFieldObject: customFields as any,
        pdfOutput,
        poNumber: String(invoice?.po_number || ''),
        invoiceTotal: previewTotalsSource?.invoiceTotal || 0,
        cashReceived: viewModel.cashReceived || 0,
        balanceDue: previewTotalsSource?.balanceDue || 0,
        totals: previewTotalsSource?.totals
          ? {
              rawSubtotal: previewTotalsSource.totals.subtotal,
              vatAmount: previewTotalsSource.totals.vat,
              discountAmount: previewTotalsSource.totals.discount,
              whtAmount: previewTotalsSource.totals.wht,
              installRateTotal: previewTotalsSource.totals.installRateTotal,
            }
          : undefined,
        formatMoney: (value) => formatNaira(value, { preserveFraction: true }),
      }),
    [invoice, items, client, settings, bankAccounts, customFields, pdfOutput, previewTotalsSource, viewModel.cashReceived],
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

  const handleSaveCustomization = async (nextPdfOutput: PdfOutputSettingsValue) => {
    if (!invoice?.id) return
    try {
      const nextCustomFields = {
        ...(customFields || {}),
        pdfOutput: nextPdfOutput,
      }
      const { error } = await supabase.from('invoices').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', invoice.id)
      if (error) throw error
      
      setPdfOutput(nextPdfOutput)
      await refresh()
      showToast('Settings saved', 'Invoice PDF output settings updated.', 'success')
    } catch (err) {
      showToast('Save failed', err instanceof Error ? err.message : 'Could not save customize settings')
    }
  }

  const handleDownload = async () => {
    if (!invoice || downloading) return
    setDownloading(true)
    try {
      const pdfDesignPreset = getPdfDesignPreset('invoice')
      const savedColumns = Array.isArray(customFields?.columnConfig) ? customFields.columnConfig : (BUILTIN_COLUMNS as any)
      const resolvedTable = interpretPdfTableSettings(savedColumns, { 
        mergeQtyUnit: customFields?.mergeQtyUnit === true 
      })
      const referenceLinks = Array.isArray(customFields?.attachments)
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
            name: String(settingsData?.company_name || ''),
            addressLines: Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : [],
            phone: String(settingsData?.company_phone || ''),
            email: String(settingsData?.company_email || ''),
            taxId: String(settingsData?.company_vat || ''),
          },
          recipient: {
            label: 'Bill To',
            name: String(invoice.client_name || ''),
            attention: String(client?.contact_person || ''),
            addressLines: Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : [],
            phone: String(client?.phone || ''),
            email: String(client?.email || ''),
          },
          headerFields: Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : [],
          columns: resolvedTable.columns,
          mergeQtyUnit: resolvedTable.mergeQtyUnit,
          items: (Array.isArray(items) ? items : []).map((item, index) => ({
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
            cells:
              item.row_type === 'group_header'
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
            rows: (Array.isArray(previewModel?.previewTotals) ? previewModel.previewTotals : []).map((row) => ({
              key: String(row.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              label: String(row.label || ''),
              amount: Number(String(row.value || '0').replace(/[^\d.-]/g, '')) || 0,
              emphasis: row.emphasis === true,
            })),
            amountInWords: String(previewModel?.previewAmountInWords || ''),
            balanceDue: previewModel?.previewBalanceDueAmount ?? null,
          },
          bankDetails: pdfOutput.showBankDetails ? previewModel?.selectedPreviewBank : null,
          notes: invoice.notes
            ? { title: String(customFields?.notesTitle || 'Notes'), content: invoice.notes, format: 'html' }
            : null,
          terms: invoice.terms
            ? { title: String(customFields?.termsTitle || 'Terms and Conditions'), content: invoice.terms, format: 'html' }
            : null,
          additionalSections: [],
          referenceLinks,
          signature: null,
          logo: {
            imageUrl: resolveCanonicalLogoUrl(settingsData),
            altText: String(settingsData?.company_name || ''),
          },
          footerText: pdfOutput.showFooter ? String(settingsData?.footer_text || '') : '',
          tagline: pdfOutput.showTagline ? String(settingsData?.company_tagline || '') : '',
          metaFooter: { companyName: String(settingsData?.company_name || '') },
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
    downloadInvoiceCsvFile({ invoice, items: Array.isArray(items) ? items : [], invoiceTotal: viewModel.invoiceTotal })
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
      navigate('/invoices/new', { state: await duplicateInvoiceDraft({ invoice, items: Array.isArray(items) ? items : [] }) })
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate this invoice.')
    }
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
      const createdQuotation = await revertInvoiceToQuotation({ invoice, items: Array.isArray(items) ? items : [], customFields })
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
      <DocumentPage topNav={<DocumentTopNav title="Loading..." backLabel="Invoices" onBack={() => navigate('/invoices')} />}>
        <CenteredSpinner />
      </DocumentPage>
    )
  }

  if (!invoice) return null

  const docProps = {
    id: invoice.id,
    number: invoice.invoice_number || '',
    title: invoice.invoice_title || 'Invoice',
    status: toTitleCase(viewModel.statusLabel || invoice.status || 'draft'),
  }

  const previewBankAccounts = (Array.isArray(bankAccounts) ? bankAccounts : []).map((account) => ({
    id: String(account.id),
    bankName: account.bank_name || '',
    accountName: account.account_name || '',
    accountNumber: account.account_number || '',
    sortCode: account.sort_code || '',
    isDefault: account.is_default === true,
  }))

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
    ...(Array.isArray(relatedCsrs) ? relatedCsrs : []).map((csr: any) => ({
      id: `csr-${csr.id}`,
      title: `CSR · ${csr.csr_number || csr.id}`,
      subtitle: 'Open linked CSR',
      kind: 'csr' as const,
      onClick: () => navigate(`/csr/${csr.id}`),
    })),
    ...(Array.isArray(relatedWaybills) ? relatedWaybills : []).map((waybill: any) => ({
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

  const attachments = Array.isArray(customFields?.attachments)
    ? customFields.attachments.map((entry: any, index: number) => ({
        id: `attachment-${index}`,
        label: String(entry.label || entry.name || entry.url || `Reference ${index + 1}`),
      }))
    : []

  const handleShare = async () => {
    try {
      await shareDocument({ title: docProps.number, text: docProps.title })
      showToast('Share successful', 'Document link handled.', 'success')
    } catch (err) {
      showToast('Share failed', 'Could not share the document.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="Invoices"
            onBack={() => navigate('/invoices')}
            onShare={handleShare}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
            customizeIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            }
          />
        }
        hero={
          <InvoiceHero
            eyebrow="Invoice"
            number={docProps.number}
            title={docProps.title}
            clientName={invoice.client_name || 'No client specified'}
            status={docProps.status}
            metrics={[
              { label: 'Total Due', value: formatNaira(viewModel.invoiceTotal || 0), hint: invoice.issue_date ? `Issued ${formatDisplayDate(invoice.issue_date)}` : 'Issue date not set', tone: 'default' },
              { label: 'Received', value: formatNaira(viewModel.cashReceived || 0), hint: `${viewModel.activePaymentCount || 0} payment${viewModel.activePaymentCount === 1 ? '' : 's'} recorded`, tone: 'positive' },
              { label: 'Balance Due', value: formatNaira(viewModel.balanceDue || 0), hint: invoice.due_date ? `Due ${formatDisplayDate(invoice.due_date)}` : 'Open due date', tone: (viewModel.balanceDue || 0) > 0 ? 'warning' : 'positive' },
            ]}
            meta={[
              { label: 'Client', value: invoice.client_name || 'Unassigned' },
              { label: 'Issue date', value: invoice.issue_date ? formatDisplayDate(invoice.issue_date) : 'Not set' },
              { label: 'Due date', value: invoice.due_date ? formatDisplayDate(invoice.due_date) : 'Open' },
              { label: linkedProject ? 'Project' : sourceDocument ? 'Source' : 'PO number', value: (linkedProject?.name && String(linkedProject.name)) || (sourceDocument?.number && String(sourceDocument.number)) || invoice.po_number || 'Not linked' },
            ]}
          />
        }
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <PdfOutputCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize Invoice PDF"
              subtitle="Configure how the PDF version of this invoice is generated."
              documentType="invoice"
              value={pdfOutput}
              bankAccounts={previewBankAccounts}
              companyTagline={String(settingsData?.company_tagline || '')}
              footerText={String(settingsData?.footer_text || '')}
              showBalanceDueOption={true}
              onSave={(nextValue) => handleSaveCustomization(nextValue)}
            />

            <InvoiceRecordPaymentSheet
              open={ui.isSheetOpen(SHEET_RECORD_PAYMENT)}
              onClose={ui.closeSheet}
              onSaved={refresh}
              invoice={{
                id: String(invoice.id),
                invoice_number: invoice.invoice_number || 'Invoice',
                client_name: invoice.client_name || '',
                total: Number(viewModel.invoiceTotal || 0),
              }}
            />

            <InvoiceAdvanceSheet
              open={ui.isSheetOpen(SHEET_ADVANCE)}
              onClose={ui.closeSheet}
              onSaved={refresh}
              invoice={invoice}
            />

            <InvoiceMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => void handleMarkSent()}
              onRevert={openRevertFlow}
              onGenerateWaybill={() => navigate('/waybills/new', { state: buildWaybillPrefill(invoice) })}
              onRecordPayment={() => { ui.closeSheet(); ui.openSheet(SHEET_RECORD_PAYMENT) }}
              onAdvanceInvoice={() => { ui.closeSheet(); ui.openSheet(SHEET_ADVANCE) }}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExportCsv={handleDownloadCsv}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_REVERT)}
              title="Revert to Quotation?"
              description={`${docProps.number} will be converted back to a draft quotation. Existing payment records will be deleted and cannot be recovered.`}
              cancelLabel="Cancel"
              confirmLabel={reverting ? 'Reverting...' : 'Revert'}
              onConfirm={() => void handleRevertToQuotation()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Invoice?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Invoice?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => void handleDelete()}
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
        <InvoiceViewPage
          documentPreview={
            <InvoiceHtmlView
              invoice={invoice}
              viewModel={viewModel}
              previewModel={previewModel}
              pdfOutput={pdfOutput}
              settingsData={settingsData}
              mergeQtyUnit={customFields?.mergeQtyUnit === true}
            />
          }
          paymentSummary={[
            { label: 'Cash Received', value: formatNaira(viewModel.cashReceived || 0), tone: 'green' },
            {
              label: 'Payments',
              value: `${viewModel.activePaymentCount || 0} recorded`,
            },
            {
              label: 'Balance Due',
              value: formatNaira(viewModel.balanceDue || 0),
              tone: (viewModel.balanceDue || 0) > 0 ? 'amber' : 'green',
            },
          ]}
          paymentProgressLabel={`${viewModel.invoiceTotal > 0 ? Math.min(100, Math.round((viewModel.cashReceived / viewModel.invoiceTotal) * 100)) : 0}% settled · ${formatNaira(viewModel.balanceDue || 0)} remaining`}
          paymentProgressWidth={`${viewModel.invoiceTotal > 0 ? Math.min(100, Math.round((viewModel.cashReceived / viewModel.invoiceTotal) * 100)) : 0}%`}
          paymentHistory={(Array.isArray(viewModel.paymentHistory) ? viewModel.paymentHistory : []).map((payment: any) => ({
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
          onDownload={() => void handleDownload()}
          canRecordPayment={viewModel.canRecordPayment}
        />
      </DocumentPage>

      <DocumentToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}
