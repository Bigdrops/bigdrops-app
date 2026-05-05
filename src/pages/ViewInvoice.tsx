import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { PdfBankControls, PdfDocumentOptionsCard, PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import InvoiceDocumentPreview from '@/components/document-view/invoice/InvoiceDocumentPreview'
import {
  InvoiceHero,
  InvoicePageShell,
  InvoiceFloatingDownloadButton,
} from '@/components/document-view/invoice/InvoiceFidelityPrimitives'
import InvoiceMoreSheet from '@/components/document-view/invoice/InvoiceMoreSheet'
import InvoiceRecordPaymentSheet from '@/components/document-view/invoice/InvoiceRecordPaymentSheet'
import InvoiceAdvanceSheet from '@/components/invoice/view/InvoiceAdvanceSheet'
import InvoiceViewPage from '@/components/document-view/invoice/InvoiceViewPage'
import AuditTrailPanel from '@/components/audit/AuditTrailPanel'
import PdfOutputCustomizeSheet from '@/components/document-view/shared/PdfOutputCustomizeSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { getInvoiceSourceDocument } from '@/domain/documentRelationships'
import { resolveCanonicalItemImageUrl, resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
  getAdvanceDraftFromInvoice,
  type AdvanceMode,
} from '@/domain/invoice/advanceChildFlow'
import { getAdvanceSummaryValues } from '@/domain/invoice/advanceSummary'
import {
  BUILTIN_COLUMNS,
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  normalizeInvoicePdfTemplateId,
  parseCustomFields,
} from '@/domain/invoice'
import type { InvoicePdfTemplateId } from '@/domain/invoice/types'
import { buildInvoicePreviewModel } from '@/domain/invoice/previewModel'
import { buildInvoiceViewModel } from '@/domain/invoice/viewModel'
import { useInvoiceDetailData } from '@/hooks/useInvoiceDetailData'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { feedback } from '@/lib/feedback'
import { getPdfDesignPreset, resolvePdfWebFontFamily } from '@/lib/pdfDesignPreset'
import { computeDocument } from '@/lib/Calculations'
import { supabase } from '@/supabase'
import {
  archiveInvoiceRecord,
  buildWaybillPrefill,
  createAdvanceInvoiceRecord,
  deleteAdvanceInvoiceRecord,
  deleteInvoiceRecord,
  downloadInvoiceCsvFile,
  duplicateInvoiceDraft,
  revertInvoiceToQuotation,
  updateAdvanceInvoiceRecord,
} from './viewInvoiceActions'

const SHEET_CUSTOMIZE = 'customize-output'
const SHEET_MORE = 'more-actions'
const SHEET_RECORD_PAYMENT = 'record-payment'
const SHEET_ADVANCE = 'advance'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const MODAL_REVERT = 'revert'

type AdvanceSheetMode = 'create' | 'edit' | 'view'

const toTitleCase = (value: string) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

export default function ViewInvoice() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()

  const {
    invoice,
    items,
    payments,
    relatedCsrs,
    relatedWaybills,
    relatedAdvanceInvoices,
    invoiceFinancials,
    client,
    settings,
    bankAccounts,
    linkedProject,
    loading,
    refresh,
    setInvoice,
  } = useInvoiceDetailData(id)

  const [downloading, setDownloading] = useState(false)
  const [pdfOutput, setPdfOutput] = useState<PdfOutputSettingsValue>(DEFAULT_INVOICE_PDF_OUTPUT)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [advanceSheetMode, setAdvanceSheetMode] = useState<AdvanceSheetMode>('create')
  const [selectedAdvanceInvoice, setSelectedAdvanceInvoice] = useState<any | null>(null)
  const [advanceSaving, setAdvanceSaving] = useState(false)
  const [advancePdfGenerating, setAdvancePdfGenerating] = useState(false)
  const [advanceDeleteConfirmOpen, setAdvanceDeleteConfirmOpen] = useState(false)
  const [advanceMode, setAdvanceMode] = useState<AdvanceMode>('percent')
  const [advanceInputValue, setAdvanceInputValue] = useState<number>(30)
  const [advanceSuffixValue, setAdvanceSuffixValue] = useState(ADVANCE_SUFFIX_DEFAULT)
  const [advancePrimaryLabel, setAdvancePrimaryLabel] = useState(ADVANCE_PRIMARY_LABEL_DEFAULT)
  const [advanceSecondaryLabel, setAdvanceSecondaryLabel] = useState(ADVANCE_SECONDARY_LABEL_DEFAULT)
  const settingsData: any = settings || {}

  const customFields = useMemo(() => parseCustomFields(invoice?.custom_fields), [invoice?.custom_fields])
  const hasParentAdvanceConfig = Boolean(customFields?.advance_invoice)
  const visibleAdvanceInvoices = hasParentAdvanceConfig ? (Array.isArray(relatedAdvanceInvoices) ? relatedAdvanceInvoices : []) : []
  const pdfTemplateId: InvoicePdfTemplateId = normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || 'industry'
  const sourceDocument = useMemo(() => getInvoiceSourceDocument(invoice), [invoice])
  const contractValue = Math.max(0, Number(invoice?.total || 0))

  const resetAdvanceDraft = useCallback(() => {
    setAdvanceMode('percent')
    setAdvanceInputValue(30)
    setAdvanceSuffixValue(ADVANCE_SUFFIX_DEFAULT)
    setAdvancePrimaryLabel(ADVANCE_PRIMARY_LABEL_DEFAULT)
    setAdvanceSecondaryLabel(ADVANCE_SECONDARY_LABEL_DEFAULT)
  }, [])

  const applyAdvanceDraft = useCallback((advanceInvoice: any) => {
    const draft = getAdvanceDraftFromInvoice(advanceInvoice)
    setAdvanceMode(draft.mode)
    setAdvanceInputValue(draft.inputValue)
    setAdvanceSuffixValue(draft.suffix)
    setAdvancePrimaryLabel(draft.primaryLabel)
    setAdvanceSecondaryLabel(draft.secondaryLabel)
  }, [])

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

  const openAdvanceDetails = useCallback((advanceInvoice: any, mode: AdvanceSheetMode = 'view') => {
    setSelectedAdvanceInvoice(advanceInvoice)
    setAdvanceDeleteConfirmOpen(false)
    setAdvanceSheetMode(mode)
    applyAdvanceDraft(advanceInvoice)
    ui.closeSheet()
    requestAnimationFrame(() => {
      ui.openSheet(SHEET_ADVANCE)
    })
  }, [applyAdvanceDraft, ui])

  const openCreateAdvanceSheet = useCallback(() => {
    if (visibleAdvanceInvoices.length > 0) {
      openAdvanceDetails(visibleAdvanceInvoices[0], 'view')
      return
    }

    setSelectedAdvanceInvoice(null)
    setAdvanceDeleteConfirmOpen(false)
    setAdvanceSheetMode('create')
    resetAdvanceDraft()
    ui.closeSheet()
    requestAnimationFrame(() => {
      ui.openSheet(SHEET_ADVANCE)
    })
  }, [visibleAdvanceInvoices, openAdvanceDetails, resetAdvanceDraft, ui])

  const closeAdvanceSheet = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      ui.openSheet(SHEET_ADVANCE)
      return
    }
    setAdvanceDeleteConfirmOpen(false)
    setSelectedAdvanceInvoice(null)
    ui.closeSheet()
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

  useEffect(() => {
    if (!invoice?.id) return
    if (location.state?.openAdvanceSheet !== true) return

    openCreateAdvanceSheet()
    navigate(location.pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        openAdvanceSheet: false,
      },
    })
  }, [invoice?.id, location.pathname, location.state, navigate, openCreateAdvanceSheet])

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
    const options = { description }

    if (tone === 'success') {
      feedback.success(title, options)
      return
    }

    feedback.info(title, options)
  }

  const downloadInvoicePdfDocument = useCallback(async ({
    targetInvoice,
    targetItems,
    targetPayments,
  }: {
    targetInvoice: any
    targetItems: any[]
    targetPayments?: any[]
  }) => {
    const { buildPdfRowCells, generateInvoicePdf, interpretPdfTableSettings } = await import('@/components/pdf-new')
    const targetCustomFields = parseCustomFields(targetInvoice?.custom_fields)
    const targetTemplateId: InvoicePdfTemplateId = normalizeInvoicePdfTemplateId(targetCustomFields?.pdfTemplateId) || pdfTemplateId
    const savedColumns = Array.isArray(targetCustomFields?.columnConfig) ? targetCustomFields.columnConfig : BUILTIN_COLUMNS
    const totals = computeDocument({
      items: Array.isArray(targetItems) ? targetItems : [],
      document: targetInvoice,
      cf: targetCustomFields || {},
      columns: savedColumns as any,
    })
    const settledTotal = (Array.isArray(targetPayments) ? targetPayments : []).reduce((sum, payment) => {
      if (payment?.voided_at) return sum
      return sum + Number(payment?.cash_amount || 0) + Number(payment?.wht_amount || 0)
    }, 0)
    const targetPreviewModel = buildInvoicePreviewModel({
      invoice: targetInvoice || {},
      items: Array.isArray(targetItems) ? targetItems : [],
      client: client || undefined,
      settings: settings || undefined,
      bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
      customFieldObject: targetCustomFields as any,
      pdfOutput,
      poNumber: String(targetInvoice?.po_number || ''),
      invoiceTotal: totals.totalPayable || Number(targetInvoice?.total || 0),
      cashReceived: settledTotal,
      balanceDue: Math.max(0, (totals.totalPayable || Number(targetInvoice?.total || 0)) - settledTotal),
      totals: {
        rawSubtotal: totals.subtotal,
        vatAmount: totals.vat,
        discountAmount: totals.discount,
        whtAmount: totals.wht,
        installRateTotal: totals.installRateTotal,
      },
      formatMoney: (value) => formatNaira(value, { preserveFraction: true }),
    })
    const targetAdvanceSummary = getAdvanceSummaryValues(targetInvoice)
    const resolvedTable = interpretPdfTableSettings(savedColumns as any, {
      mergeQtyUnit: targetCustomFields?.mergeQtyUnit === true,
      items: Array.isArray(targetItems) ? targetItems : [],
    })
    const referenceLinks = Array.isArray(targetCustomFields?.attachments)
      ? targetCustomFields.attachments
          .filter((entry: any) => entry?.url)
          .map((entry: any, index: number) => ({
            label: String(entry.label || entry.name || `Reference ${index + 1}`),
            url: String(entry.url),
          }))
      : []

    await generateInvoicePdf({
      model: {
        identity: {
          id: String(targetInvoice.id || id),
          kind: 'invoice',
          number: String(targetInvoice.invoice_number || 'invoice'),
          title: String(targetInvoice.invoice_title || 'Invoice'),
          issueDate: String(targetInvoice.issue_date || ''),
          dueDate: String(targetInvoice.due_date || ''),
          poNumber: String(targetInvoice.po_number || ''),
          status: String(targetInvoice.status || ''),
          currency: 'NGN',
        },
        issuer: {
          label: 'From',
          name: String(settingsData?.company_name || ''),
          addressLines: Array.isArray(targetPreviewModel?.companyPreviewLines) ? targetPreviewModel.companyPreviewLines : [],
          phone: String(settingsData?.company_phone || ''),
          email: String(settingsData?.company_email || ''),
          taxId: String(settingsData?.company_vat || ''),
        },
        recipient: {
          label: 'Bill To',
          name: String(targetInvoice.client_name || ''),
          attention: String(client?.contact_person || ''),
          addressLines: Array.isArray(targetPreviewModel?.clientPreviewLines) ? targetPreviewModel.clientPreviewLines : [],
          phone: String(client?.phone || ''),
          email: String(client?.email || ''),
        },
        headerFields: Array.isArray(targetPreviewModel?.previewDetailRows) ? targetPreviewModel.previewDetailRows : [],
        columns: resolvedTable.columns,
        mergeQtyUnit: resolvedTable.mergeQtyUnit,
        items: (Array.isArray(targetItems) ? targetItems : []).map((item, index) => ({
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
            ...(item.row_type === 'group_header' ? { showSubtotal: targetCustomFields?.groupMeta?.[item.group_id]?.showSubtotal === true } : {}),
          },
        })),
        totals: {
          mode: targetPreviewModel?.advanceSummary ? 'advance' : 'standard',
          rows: (Array.isArray(targetPreviewModel?.previewTotals) ? targetPreviewModel.previewTotals : []).map((row) => ({
            key: String(row.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            label: String(row.label || ''),
            amount: Number(String(row.value || '0').replace(/[^\d.-]/g, '')) || 0,
            emphasis: row.emphasis === true,
          })),
          amountInWords: String(targetPreviewModel?.previewAmountInWords || ''),
          balanceDue: targetPreviewModel?.previewBalanceDueAmount ?? null,
          advanceSummary: targetPreviewModel?.advanceSummary
            ? {
                ...targetPreviewModel.advanceSummary,
                primaryLabel: targetAdvanceSummary?.primaryLabelWithPercent || targetPreviewModel.advanceSummary.primaryLabel,
                secondaryLabel: targetAdvanceSummary?.secondaryLabelWithPercent || targetPreviewModel.advanceSummary.secondaryLabel,
              }
            : null,
        },
        bankDetails: pdfOutput.showBankDetails ? targetPreviewModel?.selectedPreviewBank : null,
        notes: targetInvoice.notes
          ? { title: String(targetCustomFields?.notesTitle || 'Notes'), content: targetInvoice.notes, format: 'html' }
          : null,
        terms: targetInvoice.terms
          ? { title: String(targetCustomFields?.termsTitle || 'Terms and Conditions'), content: targetInvoice.terms, format: 'html' }
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
        template: { designPreset: getPdfDesignPreset('invoice') },
      },
      templateId: targetTemplateId,
    })
  }, [bankAccounts, client, id, pdfOutput, settings, settingsData])

  const handleCopyNumber = async () => {
    if (!invoice?.invoice_number) return
    try {
      await navigator.clipboard.writeText(invoice.invoice_number)
      showToast('Invoice number copied', invoice.invoice_number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available.')
    }
  }

  const handleSaveCustomization = useCallback(async (
    nextPdfOutput: PdfOutputSettingsValue,
    _nextPreset?: unknown,
    nextTemplateId?: InvoicePdfTemplateId,
  ) => {
    if (!invoice?.id) return
    const previousPdfOutput = pdfOutput
    setPdfOutput(nextPdfOutput)
    try {
      const nextCustomFields = {
        ...(customFields || {}),
        pdfOutput: nextPdfOutput,
        pdfTemplateId: nextTemplateId || pdfTemplateId,
      }
      const { error } = await supabase.from('invoices').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', invoice.id)
      if (error) throw error

      await refresh()
      showToast('Settings saved', 'Invoice PDF output settings updated.', 'success')
    } catch (err) {
      setPdfOutput(previousPdfOutput)
      showToast('Save failed', err instanceof Error ? err.message : 'Could not save customize settings')
    }
  }, [customFields, invoice?.id, pdfOutput, pdfTemplateId, refresh])

  const handleInlinePdfOutputChange = useCallback((nextPdfOutput: PdfOutputSettingsValue) => {
    void handleSaveCustomization(nextPdfOutput)
  }, [handleSaveCustomization])

  const handleToggleMergeQtyUnit = useCallback(async () => {
    if (!invoice?.id) return

    try {
      const nextCustomFields = {
        ...(customFields || {}),
        mergeQtyUnit: customFields?.mergeQtyUnit !== true,
      }
      const { error } = await supabase
        .from('invoices')
        .update({ custom_fields: JSON.stringify(nextCustomFields) })
        .eq('id', invoice.id)

      if (error) throw error

      await refresh()
      showToast(
        'Table setting updated',
        nextCustomFields.mergeQtyUnit ? 'Qty + Unit merge is now on for exports and preview.' : 'Qty + Unit merge is now off for exports and preview.',
        'success',
      )
    } catch (err) {
      showToast('Update failed', err instanceof Error ? err.message : 'Could not update the table export setting.')
    }
  }, [customFields, invoice?.id, refresh])

  const handleDownload = async () => {
    if (!invoice || downloading) return
    setDownloading(true)
    try {
      await downloadInvoicePdfDocument({
        targetInvoice: {
          ...invoice,
          status: viewModel.computedStatus || invoice.status || '',
        },
        targetItems: Array.isArray(items) ? items : [],
        targetPayments: Array.isArray(payments) ? payments : [],
      })
      showToast('Download ready', 'Invoice PDF downloaded.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the invoice PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    if (!invoice?.id) return
    if (location.state?.autoDownload !== true) return

    void handleDownload()
    navigate(location.pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        autoDownload: false,
      },
    })
  }, [invoice?.id, location.pathname, location.state, navigate])

  const handleAdvanceSave = async () => {
    if (!invoice?.id || advanceSaving) return
    setAdvanceSaving(true)
    try {
      let savedId: string | null = null
      let created = true
      if (advanceSheetMode === 'edit' && selectedAdvanceInvoice?.id) {
        const updated = await updateAdvanceInvoiceRecord({
          advanceInvoiceId: String(selectedAdvanceInvoice.id),
          parentInvoice: invoice,
          mode: advanceMode,
          inputValue: advanceInputValue,
          suffix: advanceSuffixValue,
          primaryLabel: advancePrimaryLabel,
          secondaryLabel: advanceSecondaryLabel,
          threadPosition: Number(parseCustomFields(selectedAdvanceInvoice.custom_fields)?.advance_invoice?.position || 1),
        })
        savedId = updated?.id ?? null
      } else {
        const result = await createAdvanceInvoiceRecord({
          parentInvoice: invoice,
          mode: advanceMode,
          inputValue: advanceInputValue,
          suffix: advanceSuffixValue,
          primaryLabel: advancePrimaryLabel,
          secondaryLabel: advanceSecondaryLabel,
        })
        savedId = result?.invoice?.id ?? null
        created = result?.created === true
      }

      if (!savedId) {
        throw new Error('No record returned after save')
      }

      await refresh()

      const { data: verifyRow, error: verifyError } = await supabase
        .from('invoices')
        .select('id, custom_fields')
        .eq('id', savedId)
        .ilike('custom_fields', `%"parentId":"${invoice.id}"%`)
        .is('archived_at', null)
        .single()

      if (verifyError || !verifyRow) {
        throw new Error('Saved advance invoice could not be verified. It may not appear on this page.')
      }

      showToast(
        advanceSheetMode === 'edit'
          ? 'Advance invoice updated'
          : created
            ? 'Advance invoice created'
            : 'Advance invoice already exists',
        advanceSheetMode === 'edit'
          ? 'Advance child record saved successfully.'
          : created
            ? 'Advance child record saved successfully.'
            : 'Opened the existing advance child invoice instead of creating another one.',
        'success'
      )
      closeAdvanceSheet(false)
    } catch (error) {
      showToast('Advance invoice failed', error instanceof Error ? error.message : 'Could not save advance invoice')
    } finally {
      setAdvanceSaving(false)
    }
  }

  const handleAdvanceDownload = useCallback(async () => {
    if (!selectedAdvanceInvoice?.id || advancePdfGenerating) return
    setAdvancePdfGenerating(true)
    try {
      await downloadInvoicePdfDocument({
        targetInvoice: {
          ...invoice,
          ...selectedAdvanceInvoice,
          status: selectedAdvanceInvoice.status || 'unpaid',
        },
        targetItems: Array.isArray(items) ? items : [],
        targetPayments: [],
      })
      showToast('Download ready', 'Advance invoice PDF downloaded.', 'success')
    } catch (error) {
      showToast('Download failed', error instanceof Error ? error.message : 'Could not generate the advance invoice PDF.')
    } finally {
      setAdvancePdfGenerating(false)
    }
  }, [advancePdfGenerating, downloadInvoicePdfDocument, invoice, items, selectedAdvanceInvoice])

  const handleAdvanceDelete = async () => {
    if (!selectedAdvanceInvoice?.id || !invoice?.id || advanceSaving) return
    setAdvanceSaving(true)
    try {
      const result = await deleteAdvanceInvoiceRecord({
        advanceInvoiceId: String(selectedAdvanceInvoice.id),
        parentInvoiceId: String(invoice.id),
        parentCustomFields: invoice.custom_fields,
      })
      setInvoice((current: any) => {
        if (!current) return current
        const nextCustomFields = {
          ...parseCustomFields(current.custom_fields),
        }
        delete nextCustomFields.advance_invoice
        return {
          ...current,
          custom_fields: nextCustomFields,
        }
      })
      await refresh()
      setAdvanceDeleteConfirmOpen(false)
      closeAdvanceSheet(false)
      showToast(
        result.status === 'deleted' ? 'Advance invoice deleted' : 'Advance invoice cleared',
        result.status === 'deleted'
          ? 'Advance child record removed.'
          : (result.message || 'Advance settings were cleared from the parent invoice.'),
        'success'
      )
    } catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'Could not delete advance invoice'
      showToast('Delete failed', message)
    } finally {
      setAdvanceSaving(false)
    }
  }

  const handleDownloadCsv = () => {
    if (!invoice) return
    downloadInvoiceCsvFile({ invoice, items: Array.isArray(items) ? items : [], invoiceTotal: viewModel.invoiceTotal })
    showToast('CSV downloaded', 'Invoice CSV exported.', 'success')
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
      <InvoicePageShell topNav={<DocumentTopNav title="Loading..." backLabel="Invoices" onBack={() => navigate('/invoices')} />}>
        <CenteredSpinner />
      </InvoicePageShell>
    )
  }

  if (!invoice) return null

  const docProps = {
    id: invoice.id,
    number: invoice.invoice_number || '',
    title: invoice.invoice_title || 'Invoice',
    status: toTitleCase(viewModel.statusLabel || invoice.status || 'unpaid'),
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
      <InvoicePageShell
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={invoice.invoice_title || 'Invoice'}
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
        floating={<InvoiceFloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlay={
          <>
            <PdfOutputCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize Invoice PDF"
              subtitle="Adjust template, font, and color styling for this invoice PDF."
              documentType="invoice"
              value={pdfOutput}
              bankAccounts={previewBankAccounts}
              companyTagline={String(settingsData?.company_tagline || '')}
              footerText={String(settingsData?.footer_text || '')}
              showBalanceDueOption={true}
              designOnly
              templateId={pdfTemplateId}
              onSave={(nextValue, nextPreset, nextTemplateId) => handleSaveCustomization(nextValue, nextPreset, nextTemplateId)}
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
              onOpenChange={closeAdvanceSheet}
              invoiceNumber={invoice.invoice_number || 'Invoice'}
              contractValue={contractValue}
              advanceSheetMode={advanceSheetMode}
              advanceInvoice={selectedAdvanceInvoice}
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
              onSave={() => void handleAdvanceSave()}
              onDownloadPdf={handleAdvanceDownload}
              onEdit={() => {
                if (selectedAdvanceInvoice) {
                  openAdvanceDetails(selectedAdvanceInvoice, 'edit')
                }
              }}
              onRequestDelete={() => setAdvanceDeleteConfirmOpen(true)}
              deleteConfirmOpen={advanceDeleteConfirmOpen}
              onDeleteConfirmOpenChange={setAdvanceDeleteConfirmOpen}
              onDeleteConfirm={() => void handleAdvanceDelete()}
            />

            <InvoiceMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onRevert={openRevertFlow}
              onGenerateWaybill={() => navigate('/waybills/new', { state: buildWaybillPrefill(invoice) })}
              onRecordPayment={() => { ui.closeSheet(); ui.openSheet(SHEET_RECORD_PAYMENT) }}
              onAdvanceInvoice={openCreateAdvanceSheet}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExportCsv={handleDownloadCsv}
              mergeQtyUnit={customFields?.mergeQtyUnit === true}
              onToggleMergeQtyUnit={() => void handleToggleMergeQtyUnit()}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_REVERT)}
              title="Revert to Quotation?"
              description={`${docProps.number} will be converted back to an open quotation. Existing payment records will be deleted and cannot be recovered.`}
              cancelLabel="Cancel"
              confirmLabel={reverting ? 'Reverting...' : 'Revert'}
              confirmDisabled={reverting}
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
        <InvoiceHero
          eyebrow="Invoice"
          number={docProps.number}
          title={docProps.title}
          clientName={invoice.client_name || 'No client specified'}
          status={docProps.status}
          metrics={[]}
          meta={[
            { label: 'Client', value: invoice.client_name || 'Unassigned' },
            { label: 'Issue date', value: invoice.issue_date ? formatDisplayDate(invoice.issue_date) : 'Not set' },
            { label: 'Due date', value: invoice.due_date ? formatDisplayDate(invoice.due_date) : 'Open' },
            { label: linkedProject ? 'Project' : sourceDocument ? 'Source' : 'PO number', value: (linkedProject?.name && String(linkedProject.name)) || (sourceDocument?.number && String(sourceDocument.number)) || invoice.po_number || 'Not linked' },
          ]}
        />

        <InvoiceViewPage
          documentPreview={
            <InvoiceDocumentPreview
              invoice={invoice}
              viewModel={viewModel}
              previewModel={previewModel}
              pdfOutput={pdfOutput}
              settingsData={settingsData}
              mergeQtyUnit={customFields?.mergeQtyUnit === true}
            />
          }
          previewControls={
            <>
              <PdfBankControls
                value={pdfOutput}
                onChange={handleInlinePdfOutputChange}
                bankAccounts={previewBankAccounts}
              />
              <PdfDocumentOptionsCard
                value={pdfOutput}
                onChange={handleInlinePdfOutputChange}
                companyTagline={String(settingsData?.company_tagline || '')}
                footerText={String(settingsData?.footer_text || '')}
                showBalanceDueOption
              />
            </>
          }
          paymentSummary={[
            { label: 'Cash Received', value: formatNaira(viewModel.cashReceived || 0), tone: 'success' },
            {
              label: 'Payments',
              value: `${viewModel.activePaymentCount || 0} recorded`,
            },
            {
              label: 'Balance Due',
              value: formatNaira(viewModel.balanceDue || 0),
              tone: (viewModel.balanceDue || 0) > 0 ? 'warning' : 'success',
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
          advanceInvoices={visibleAdvanceInvoices.map((advance: any) => {
            const rawCf = advance.custom_fields
            const cf = typeof rawCf === 'string' ? parseCustomFields(rawCf) : (rawCf || {})
            const advConfig = cf.advance_invoice || {}
            return {
              id: String(advance.id),
              title: advance.invoice_number || advance.invoice_title || 'Advance Invoice',
              subtitle: advConfig.primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT,
              amountLabel: formatNaira(Number(advance.total || 0)),
              onOpen: () => openAdvanceDetails(advance, 'view'),
            }
          })}
          relatedDocuments={relatedDocuments}
          activityHistory={
            <AuditTrailPanel
              entityType="invoice"
              entityId={invoice.id}
              entityLabel={invoice.invoice_number}
              defaultOpen={false}
            />
          }
          attachments={attachments}
          onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
          onEdit={() => navigate(`/invoices/edit/${id}`)}
          onDownload={() => void handleDownload()}
          canRecordPayment={viewModel.canRecordPayment}
        />
      </InvoicePageShell>
    </>
  )
}
