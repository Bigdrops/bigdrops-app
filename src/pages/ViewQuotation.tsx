import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import DOMPurify from 'dompurify'

import { PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import { DocumentLivePreviewCard } from '@/components/document/DocumentViewShell'
import PdfOutputCustomizeSheet from '@/components/document-view/shared/PdfOutputCustomizeSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import QuotationHeroMeta from '@/components/document-view/quotation/QuotationHeroMeta'
import QuotationMoreSheet from '@/components/document-view/quotation/QuotationMoreSheet'
import QuotationViewPage from '@/components/document-view/quotation/QuotationViewPage'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { getPdfSummaryLabels } from '@/domain/document/pdfSummaryLabels'
import { buildPdfRowCells, generateQuotationPdf, interpretPdfTableSettings } from '@/components/pdf-new'
import { BUILTIN_COLUMNS } from '@/domain/invoice'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import { formatNaira } from '@/lib/formatters/money'
import { getPdfDesignPreset, resolvePdfWebFontFamily } from '@/lib/pdfDesignPreset'
import { supabase } from '@/supabase'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { archiveQuotationRecord, convertQuotationToInvoice, deleteQuotationRecord, downloadQuotationCsvFile, duplicateQuotationRecord, loadQuotationViewData } from './viewQuotationActions'

const SHEET_CUSTOMIZE = 'customize-output'
const SHEET_MORE = 'more-actions'
const MODAL_CONVERT = 'convert'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

const defaultPdfOutput: PdfOutputSettingsValue = {
  showBankDetails: false,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showBalanceDue: false,
  showVatPercentage: true,
  showWhtPercentage: true,
  showDiscountPercentage: true,
}

function renderRichText(value?: string) {
  if (!value) return null
  return (
    <div
      className="prose prose-sm max-w-none break-words text-foreground"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
    />
  )
}

export default function ViewQuotation() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const [loading, setLoading] = useState(true)
  const [quotation, setQuotation] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [pdfOutput, setPdfOutput] = useState<PdfOutputSettingsValue>(defaultPdfOutput)
  const [downloading, setDownloading] = useState(false)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    const loadQuotation = async () => {
      if (!id) return
      setLoading(true)
      try {
        const data = await loadQuotationViewData(id)
        if (!data) {
          navigate('/quotations')
          return
        }

        setQuotation(data.quotation)
        setItems(data.items)
        setTotals(data.totals)
        setClient(data.client)
        setSettings(data.settings)
        setBankAccounts(data.bankAccounts)
        setCustomFields(data.customFields)
        setPdfOutput({
          ...defaultPdfOutput,
          ...(data.customFields?.pdfOutput || {}),
          showBalanceDue: false,
        })
      } catch (err) {
        console.error('Failed to load quotation', err)
      } finally {
        setLoading(false)
      }
    }

    void loadQuotation()
  }, [id, navigate])

  const refreshQuotation = async () => {
    if (!id) return
    const data = await loadQuotationViewData(id)
    if (!data) return
    setQuotation(data.quotation)
    setItems(data.items)
    setTotals(data.totals)
    setClient(data.client)
    setSettings(data.settings)
    setBankAccounts(data.bankAccounts)
    setCustomFields(data.customFields)
  }

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!quotation?.quotation_number) return
    try {
      await navigator.clipboard.writeText(quotation.quotation_number)
      showToast('Quotation number copied', quotation.quotation_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  const handleShare = async () => {
    try {
      const result = await shareDocument({
        title: quotation?.quotation_number || 'Quotation',
        text: quotation?.quotation_title || 'Quotation',
      })
      showToast(result === 'shared' ? 'Share sheet opened' : 'Link copied', result === 'shared' ? 'Quotation share is ready.' : 'Quotation link copied.', 'success')
    } catch (error) {
      showToast('Share failed', error instanceof Error ? error.message : 'Could not share this quotation.')
    }
  }

  const handleSaveCustomization = async (nextPdfOutput: PdfOutputSettingsValue) => {
    if (!quotation || !id) return
    const nextCustomFields = {
      ...customFields,
      pdfOutput: nextPdfOutput,
    }
    const { error } = await supabase.from('quotations').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', id)
    if (error) throw error
    setCustomFields(nextCustomFields)
    setPdfOutput(nextPdfOutput)
    setQuotation((current: any) => (current ? { ...current, custom_fields: nextCustomFields } : current))
    showToast('Settings saved', 'Quotation PDF output settings updated.', 'success')
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

  const companyLines = [
    settings?.company_address,
    [settings?.company_city, settings?.company_state].filter(Boolean).join(', '),
    settings?.company_phone,
    settings?.company_email,
  ].filter(Boolean)

  const clientLines = [
    client?.contact_person ? `Attn: ${client.contact_person}` : null,
    client?.address || null,
    [client?.city, client?.state].filter(Boolean).join(', '),
    client?.phone || null,
    client?.email || null,
  ].filter(Boolean)

  const previewDetailRows = [
    { label: 'Client', value: quotation?.client_name || 'Unassigned' },
    { label: 'PO Number', value: quotation?.po_number || '' },
    { label: 'Title', value: quotation?.quotation_title || '' },
    ...((Array.isArray(customFields.header) ? customFields.header : []).filter((field: any) => field?.label && field?.value).map((field: any) => ({
      label: String(field.label),
      value: String(field.value),
    }))),
  ].filter((row) => String(row.value || '').trim().length > 0)

  const previewItems = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      return { type: 'group', label: item.group_name || `Group ${index + 1}` }
    }
    return {
      type: 'line',
      label: item.description || 'Untitled item',
      detail: item.sub_description || '',
      value: formatNaira(item.amount || Number(item.quantity || 0) * Number(item.unit_price || 0)),
      facts: [
        item.quantity ? `Qty: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null,
        `Rate: ${formatNaira(item.unit_price || 0)}`,
        item.make ? `Make: ${item.make}` : null,
      ].filter(Boolean),
    }
  })

  const previewSummaryLabels = getPdfSummaryLabels(quotation, pdfOutput)
  const previewTotals = [
    { label: 'Subtotal', value: formatNaira(totals?.rawSubtotal || 0) },
    ...(Number(totals?.installRateTotal || 0) > 0 ? [{ label: 'Install Rate', value: formatNaira(totals?.installRateTotal || 0) }] : []),
    ...(Number(totals?.vatAmount || 0) > 0 ? [{ label: previewSummaryLabels.vat, value: formatNaira(totals?.vatAmount || 0) }] : []),
    ...(Number(totals?.discountAmount || 0) > 0 ? [{ label: previewSummaryLabels.discount, value: formatNaira(totals?.discountAmount || 0), valueClassName: 'text-red-600' }] : []),
    ...(Number(totals?.whtAmount || 0) > 0 ? [{ label: previewSummaryLabels.wht, value: formatNaira(totals?.whtAmount || 0) }] : []),
    { label: 'Total', value: formatNaira(totals?.totalPayable || 0), emphasis: true, valueClassName: 'text-slate-950' },
  ]

  const previewNotesSections = [
    quotation?.notes ? { title: customFields.notesTitle || 'Notes', content: renderRichText(quotation.notes) } : null,
    quotation?.terms ? { title: customFields.termsTitle || 'Terms and Conditions', content: renderRichText(quotation.terms) } : null,
    Array.isArray(customFields.additionalFields) && customFields.additionalFields.length > 0
      ? {
          title: 'Additional Fields',
          content: (
            <div className="space-y-3">
              {customFields.additionalFields
                .filter((field: any) => field?.label || field?.value)
                .map((field: any, index: number) => (
                  <div key={`field-${index}`} className="grid gap-1">
                    {field.label ? <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{field.label}</div> : null}
                    <div className="whitespace-pre-wrap break-words">{field.value || '—'}</div>
                  </div>
                ))}
            </div>
          ),
        }
      : null,
  ].filter(Boolean)

  const handleDownload = async () => {
    if (!quotation || downloading) return
    setDownloading(true)
    try {
      const pdfDesignPreset = getPdfDesignPreset('quotation')
      const resolvedTable = interpretPdfTableSettings(BUILTIN_COLUMNS as any, { mergeQtyUnit: false })
      const referenceLinks = Array.isArray(customFields.attachments)
        ? customFields.attachments.filter((entry: any) => entry?.url).map((entry: any, index: number) => ({
            label: String(entry.label || entry.name || `Reference ${index + 1}`),
            url: String(entry.url),
          }))
        : []

      await generateQuotationPdf({
        model: {
          identity: {
            id: String(quotation.id || id),
            kind: 'quotation',
            number: String(quotation.quotation_number || 'quotation'),
            title: String(quotation.quotation_title || 'Quotation'),
            issueDate: String(quotation.issue_date || ''),
            validUntil: String(quotation.valid_until || ''),
            poNumber: String(quotation.po_number || ''),
            status: String(quotation.status || ''),
            currency: 'NGN',
          },
          issuer: {
            label: 'From',
            name: String(settings?.company_name || ''),
            addressLines: companyLines,
            phone: String(settings?.company_phone || ''),
            email: String(settings?.company_email || ''),
            taxId: String(settings?.company_vat || ''),
          },
          recipient: {
            label: 'Prepared For',
            name: String(quotation.client_name || ''),
            attention: String(client?.contact_person || ''),
            addressLines: clientLines,
            phone: String(client?.phone || ''),
            email: String(client?.email || ''),
          },
          headerFields: previewDetailRows.map((row) => ({ label: row.label, value: row.value })),
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
            cells: item.row_type === 'group_header' ? undefined : buildPdfRowCells(item, resolvedTable.columns, { mergeQtyUnit: resolvedTable.mergeQtyUnit, configuredColumns: resolvedTable.configuredColumns }),
            customData: item.custom_data || {},
          })),
          totals: {
            mode: 'standard',
            rows: previewTotals.map((row) => ({ key: row.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: row.label, amount: Number(String(row.value).replace(/[^\d.-]/g, '')) || 0, emphasis: row.emphasis === true })),
            amountInWords: String(quotation.amount_in_words || ''),
          },
          bankDetails: pdfOutput.showBankDetails && selectedPreviewBank ? selectedPreviewBank : null,
          notes: quotation.notes ? { title: customFields.notesTitle || 'Notes', content: quotation.notes, format: 'html' } : null,
          terms: quotation.terms ? { title: customFields.termsTitle || 'Terms and Conditions', content: quotation.terms, format: 'html' } : null,
          additionalSections: [],
          referenceLinks,
          signature: null,
          logo: { imageUrl: String(settings?.company_logo_url || '') || null, altText: String(settings?.company_name || '') },
          footerText: pdfOutput.showFooter ? String(settings?.footer_text || '') : '',
          tagline: pdfOutput.showTagline ? String(settings?.company_tagline || '') : '',
          metaFooter: { companyName: String(settings?.company_name || '') },
          template: { designPreset: pdfDesignPreset },
        },
        templateId: 'industry',
      })
      showToast('Download ready', 'Quotation PDF downloaded.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the quotation PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadCsv = () => {
    if (!quotation) return
    downloadQuotationCsvFile({ quotation, items, totals })
    showToast('CSV downloaded', 'Quotation CSV exported.', 'success')
  }

  const handleDuplicate = async () => {
    if (!quotation) return
    try {
      const createdQuotation = await duplicateQuotationRecord({ quotation, items })
      navigate(`/quotations/${createdQuotation.id}`)
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate this quotation.')
    }
  }

  const handleConvertToInvoice = async () => {
    if (!quotation || converting || !id) return
    setConverting(true)
    try {
      const createdInvoice = await convertQuotationToInvoice({ id, quotation, items })
      navigate(`/invoices/${createdInvoice.id}`)
    } catch (error) {
      showToast('Conversion failed', error instanceof Error ? error.message : 'Could not convert this quotation.')
    } finally {
      ui.closeModal()
      setConverting(false)
    }
  }

  const handleArchive = async () => {
    if (!id) return
    try {
      await archiveQuotationRecord(id)
      navigate('/quotations')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive this quotation.')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteQuotationRecord(id)
      navigate('/quotations')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete this quotation.')
    }
  }

  if (loading) {
    return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/quotations')} />}><CenteredSpinner /></DocumentPage>
  }

  if (!quotation) return null

  const docProps: BaseDocument = {
    id: quotation.id,
    number: quotation.quotation_number,
    title: quotation.quotation_title || 'Quotation',
    status: (quotation.status || 'draft') as any,
  }

  const metrics = [
    { label: 'Subtotal', value: formatNaira(totals?.subtotal || 0) },
    { label: 'VAT', value: formatNaira(totals?.vatAmount || 0) },
    { label: 'Total Amount', value: formatNaira(totals?.totalPayable || 0), status: 'info' as const },
  ]

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={quotation.quotation_title || 'Quotation'}
            onBack={() => navigate('/quotations')}
            actions={
              <DocumentTopNavActions
                onShare={() => void handleShare()}
                onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={quotation.quotation_title || 'Quotation'}
            title={docProps.number}
            subtitle={quotation.client_name || 'No client specified'}
            status={docProps.status}
            meta={<QuotationHeroMeta threadTag={quotation.id?.slice(0, 8)} />}
          />
        }
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <PdfOutputCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize Quotation PDF"
              subtitle="These controls update the same PDF output settings used by quotation download."
              documentType="quotation"
              value={pdfOutput}
              bankAccounts={previewBankAccounts}
              companyTagline={String(settings?.company_tagline || '')}
              footerText={String(settings?.footer_text || '')}
              onSave={(nextValue) => handleSaveCustomization(nextValue)}
            />

            <QuotationMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => showToast('Marked as sent', '')}
              onMarkAsAccepted={() => showToast('Marked as accepted', '', 'success')}
              onMarkAsRejected={() => showToast('Marked as rejected', '')}
              onConvertToInvoice={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExportCsv={handleDownloadCsv}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Convert to Invoice?"
              description="This will generate a new draft invoice based on this quotation. The quotation will be marked as accepted."
              cancelLabel="Cancel"
              confirmLabel={converting ? 'Converting...' : 'Convert to Invoice'}
              onConfirm={() => void handleConvertToInvoice()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Quotation?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Quotation?"
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
              tableName="quotations"
              recordId={String(id || '')}
              documentLabel={docProps.number || 'Quotation'}
              onLinked={() => refreshQuotation()}
            />
          </>
        }
      >
        <QuotationViewPage
          document={docProps}
          metrics={metrics}
          preview={
            <DocumentLivePreviewCard
              templateLabel="Live PDF"
              documentLabel="Quotation"
              documentNumber={quotation.quotation_number || 'Quotation'}
              companyName={settings?.company_name || ''}
              companyTagline={pdfOutput.showTagline ? settings?.company_tagline || '' : ''}
              companyLines={companyLines}
              recipientLabel="Prepared For"
              recipientName={quotation.client_name || 'Unassigned'}
              recipientLines={clientLines}
              meta={[
                { label: 'Issue Date', value: quotation.issue_date || 'Not set' },
                { label: 'Valid Until', value: quotation.valid_until || 'Open' },
                { label: 'Status', value: quotation.status || 'draft' },
              ]}
              detailRows={previewDetailRows}
              items={previewItems}
              totals={previewTotals}
              amountInWords={quotation.amount_in_words || ''}
              bankDetails={pdfOutput.showBankDetails ? selectedPreviewBank : null}
              notesSections={previewNotesSections}
              signatory={null}
              accentColor={getPdfDesignPreset('quotation').accentColor}
              headerFontFamily={resolvePdfWebFontFamily(getPdfDesignPreset('quotation').headerFont)}
              bodyFontFamily={resolvePdfWebFontFamily(getPdfDesignPreset('quotation').bodyFont)}
              previewNote="Preview reflects the current quotation record and PDF output settings."
            />
          }
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/quotations/edit/${id}`)}
          onDuplicate={() => void handleDuplicate()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}
