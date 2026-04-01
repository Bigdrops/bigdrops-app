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
  toDbItem,
} from '@/domain/invoice'
import {
  buildTrailLink,
  parseDocumentCustomFields,
  toQuotationItemRow,
  withSourceTrail,
} from '@/domain/documentConversion'
import {
  getInvoiceSourceDocument,
  hasInvoiceRelatedDocuments,
} from '@/domain/documentRelationships'
import { getNextQuotationNumber } from '@/domain/quotation'
import { computeDocument } from '@/lib/Calculations'
import { PDF_TEMPLATES, DEFAULT_TEMPLATE } from '@/components/pdf/pdfTemplates'
import {
  getPdfDesignPreset,
  setPdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { getPdfTemplatePreset, setPdfTemplatePreset } from '@/lib/pdfTemplatePreset'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import InvoiceActionsSheet from '@/components/invoice/InvoiceActionsSheet'
import RevertInvoiceDialog from '@/components/invoice/RevertInvoiceDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useInvoiceDetailData } from '@/hooks/useInvoiceDetailData'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

export default function ViewInvoice() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [showMore, setShowMore] = useState(false)
  const [showPdfSheet, setShowPdfSheet] = useState(false)
  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT)
  const [pdfTemplate, setPdfTemplate] = useState(() => getPdfTemplatePreset('invoice', DEFAULT_TEMPLATE))
  const [pdfDesignPreset, setPdfDesignPresetState] = useState(() => getPdfDesignPreset('invoice'))

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [voidingPaymentId, setVoidingPaymentId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [pendingVoidPaymentId, setPendingVoidPaymentId] = useState(null)
  const [voidReason, setVoidReason] = useState('')

  // PDF
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [converting, setConverting] = useState(false)

  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)

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

  if (loading) return <Layout title="Invoice"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!invoice) return <Layout title="Invoice"><p style={{ padding: 30 }}>Invoice not found.</p></Layout>

  const poNumber = String(invoice.po_number || '').trim()
  const formatMoney = (value) => `\u20A6${Number(value || 0).toLocaleString()}`
  const formatDate = (value) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
  }
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')
  const computedStatus = invoiceFinancials?.computed_status || invoice.status || 'draft'
  const invoiceTotal = Number(invoice.total || 0)
  const cashReceived = Number(invoiceFinancials?.cash_received || 0)
  const settledTotal = Number(invoiceFinancials?.settled_total || cashReceived)
  const balanceDue = Math.max(0, Number(invoiceFinancials?.balance_due ?? invoiceTotal - settledTotal))
  const paymentHistory = (() => {
    let runningBalance = invoiceTotal
    return payments.map((payment) => {
      const cash = Number(payment.cash_amount || 0)
      const total = cash + Number(payment.wht_amount || 0)
      if (!payment.voided_at) {
        runningBalance = Math.max(0, runningBalance - total)
      }
      return {
        ...payment,
        cash,
        total,
        runningBalance,
      }
    })
  })()
  const activePaymentCount = payments.filter((payment) => !payment.voided_at).length
  const activePaymentTotal = payments.reduce((sum, payment) => {
    if (payment.voided_at) return sum
    return sum + Number(payment.cash_amount || 0) + Number(payment.wht_amount || 0)
  }, 0)
  const sourceDocument = getInvoiceSourceDocument(invoice)
  const invoiceRelatedDocs = { csrs: relatedCsrs, waybills: relatedWaybills }
  const hasLinkedDocuments = hasInvoiceRelatedDocuments(invoice, invoiceRelatedDocs)
  const linkedDocumentsSections = [
    {
      key: 'source',
      title: 'Source',
      description: 'Documents this invoice came from.',
      items: sourceDocument
        ? [{
            key: `source-${sourceDocument.id || sourceDocument.number || 'invoice-source'}`,
            label: `${sourceDocument.type === 'quotation' ? 'Quotation' : 'Document'} ${sourceDocument.number || sourceDocument.id || 'Linked source'}`,
            subtitle: sourceDocument.po_number ? `PO ${sourceDocument.po_number}` : 'Open the source document',
            onClick: () => {
              if (sourceDocument.id) navigate(`/${sourceDocument.type === 'quotation' ? 'quotations' : 'invoices'}/${sourceDocument.id}`)
            },
            disabled: !sourceDocument.id,
          }]
        : [],
    },
    {
      key: 'generated',
      title: 'Generated / Child Documents',
      description: 'Documents created from this invoice.',
      items: [
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
        ? [{
            key: `project-${linkedProject.id}`,
            label: linkedProject.name || linkedProject.id,
            subtitle: 'Open linked project',
            onClick: () => navigate(`/projects/${linkedProject.id}`),
          }]
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
      a.download = (invoice.invoice_number || 'invoice') + '.pdf'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (err) {
      toast({ title: 'PDF generation failed', description: err.message, variant: 'destructive' })
    } finally {
      setPdfGenerating(false)
    }
  }

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
      toast({ title: 'Copy failed', description: `Could not copy ${label.toLowerCase()}.`, variant: 'destructive' })
    }
  }

  const buildInvoiceChildPrefill = () => ({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number || '',
    clientId: invoice.client_id || '',
    clientName: invoice.client_name || '',
    poNumber: poNumber || '',
  })

  const handleGenerateCsr = () => {
    setShowMore(false)
    navigate('/csr/new', {
      state: {
        sourceInvoice: buildInvoiceChildPrefill(),
      },
    })
  }

  const handleGenerateWaybill = () => {
    setShowMore(false)
    navigate('/waybills/new', {
      state: {
        sourceInvoice: buildInvoiceChildPrefill(),
      },
    })
  }

  const openRevertConfirm = () => {
    setShowMore(false)
    setShowRevertConfirm(true)
  }

  // ── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (newStatus === invoice.status) return
    await supabase.from('invoices').update({ status: newStatus }).eq('id', id)
    await refresh()
  }

  // ── Record Payment ──────────────────────────────────────────────────────────
  const handleClone = async () => {
    setShowMore(false)
    try {
      const { data: all } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', 'SASINV-B%')
        .order('created_at', { ascending: false })
      let nextNum = 1
      if (all && all.length > 0) {
        const nums = all.map((i) => parseInt(i.invoice_number.replace('SASINV-B', ''))).filter((n) => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }
      const newNumber = 'SASINV-B' + String(nextNum).padStart(3, '0')
      navigate('/invoices/new', {
        state: {
          prefill: {
            ...invoice,
            invoice_number: newNumber,
            client_id: null,
            client_name: '',
            status: 'draft',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: null,
            // Strip thread/advance fields — clone is standalone
            thread_id: null,
            thread_role: null,
            thread_position: 1,
          },
          prefillItems: items.map((it) => ({ ...it, id: null })),
        },
      })
    } catch (err) {
      toast({ title: 'Clone failed', description: err.message, variant: 'destructive' })
    }
  }

  // ── Misc More menu actions ──────────────────────────────────────────────────
  const handleConvertToQuote = async () => {
    if (converting) return
    setShowRevertConfirm(false)
    setConverting(true)
    try {
      const [{ data: quotationRows }, { data: latestInvoice }] = await Promise.all([
        supabase.from('quotations').select('quotation_number'),
        supabase.from('invoices').select('custom_fields').eq('id', id).single(),
      ])

      const nextQuotationNumber = getNextQuotationNumber(quotationRows || [])
      const sourceInvoiceFields = parseDocumentCustomFields(latestInvoice?.custom_fields || customFieldObject)
      const poValue = poNumber || null
      const sourceLink = buildTrailLink({
        id: invoice.id,
        type: 'invoice',
        number: invoice.invoice_number,
        project_id: invoice.project_id || null,
        po_number: poValue,
      })

      const quotationCustomFields = withSourceTrail(
        {
          ...sourceInvoiceFields,
          quotationTitle: invoice.invoice_title || '',
          clientName: invoice.client_name || '',
          notesHtml: invoice.notes || '',
          termsHtml: invoice.terms || '',
        },
        sourceLink
      )

      const quotationPayload = {
        quotation_number: nextQuotationNumber,
        po_number: poValue,
        quotation_title: invoice.invoice_title || null,
        client_id: invoice.client_id || null,
        client_name: invoice.client_name || '',
        project_id: invoice.project_id || null,
        issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
        valid_until: invoice.due_date || null,
        status: 'draft',
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
        total: Number(invoice.total || 0),
        amount_in_words: invoice.amount_in_words || '',
        custom_fields: JSON.stringify(quotationCustomFields),
      }

      const { data: createdQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationPayload])
        .select()
        .single()

      if (quotationError || !createdQuotation) throw new Error(quotationError?.message || 'Failed to create quotation')

      const itemRows = items
        .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
        .map((item, index) => toQuotationItemRow(item, createdQuotation.id, index))

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
        if (itemError) {
          await supabase.from('quotations').delete().eq('id', createdQuotation.id)
          throw new Error(itemError.message)
        }
      }

      const { error: deleteItemsError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
      if (deleteItemsError) {
        await supabase.from('quotation_items').delete().eq('quotation_id', createdQuotation.id)
        await supabase.from('quotations').delete().eq('id', createdQuotation.id)
        throw new Error(deleteItemsError.message)
      }

      const { error: deleteInvoiceError } = await supabase.from('invoices').delete().eq('id', id)
      if (deleteInvoiceError) {
        await supabase.from('invoice_items').insert(
          items
            .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
            .map((item, index) => toDbItem(item, id, index))
        )
        await supabase.from('quotation_items').delete().eq('quotation_id', createdQuotation.id)
        await supabase.from('quotations').delete().eq('id', createdQuotation.id)
        throw new Error(deleteInvoiceError.message)
      }

      navigate(`/quotations/${createdQuotation.id}`)
    } catch (err) {
      toast({
        title: 'Revert to quotation failed',
        description: (err && err.message) || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setConverting(false)
    }
  }
  const handleMarkSent = () => {
    handleStatusChange('sent')
    setShowMore(false)
  }

  // ── Delete invoice ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setShowMore(false)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    await supabase.from('invoices').delete().eq('id', id)
    navigate('/invoices')
  }

  // ── Archive invoice ─────────────────────────────────────────────────────────
  const handleArchive = async () => {
    setShowMore(false)
    setShowArchiveConfirm(true)
  }

  const confirmArchive = async () => {
    setShowArchiveConfirm(false)
    await supabase.from('invoices').update({ archived_at: new Date().toISOString() }).eq('id', id)
    navigate('/invoices')
  }

  // ── Custom fields ───────────────────────────────────────────────────────────
  const customFieldObject = parseCustomFields(invoice.custom_fields)
  const selectedSignatory = signatories.find((signatory) => signatory.id === getInvoiceSignatoryId(customFieldObject)) || null
  const handlePdfOutputChange = async (next) => {
    setPdfOutput(next)
    const updatedCf = {
      ...customFieldObject,
      pdfOutput: next,
    }
    await supabase
      .from('invoices')
      .update({
        custom_fields: JSON.stringify(updatedCf)
      })
      .eq('id', id)
  }
  const syncInvoiceStatusFromFinancials = async () => {
    const { data } = await supabase
      .from('invoice_financials_v')
      .select('*')
      .eq('id', id)
      .single()

    if (data?.computed_status) {
      await supabase
        .from('invoices')
        .update({ status: data.computed_status })
        .eq('id', id)
    }
  }
  const handleVoidPayment = async (paymentId) => {
    setPendingVoidPaymentId(paymentId)
    setVoidReason('')
    setShowVoidDialog(true)
  }

  const confirmVoidPayment = async () => {
    if (!pendingVoidPaymentId || !voidReason.trim()) return
    const reason = voidReason.trim()
    setShowVoidDialog(false)

    setVoidingPaymentId(pendingVoidPaymentId)
    const { error } = await supabase
      .from('payments')
      .update({
        voided_at: new Date().toISOString(),
        void_reason: reason,
      })
      .eq('id', pendingVoidPaymentId)

    if (error) {
      toast({ title: 'Void failed', description: error.message, variant: 'destructive' })
      setVoidingPaymentId(null)
      return
    }

    await syncInvoiceStatusFromFinancials()
    await refresh()
    setVoidingPaymentId(null)
    setPendingVoidPaymentId(null)
    setVoidReason('')
  }
  const shellStatusClass =
    computedStatus === 'paid'
      ? 'bg-emerald-50 text-emerald-700'
      : computedStatus === 'overdue'
        ? 'bg-red-50 text-red-700'
        : computedStatus === 'sent'
          ? 'bg-blue-50 text-blue-700'
          : computedStatus === 'partial'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-700'

  const shellStatusItems = ['draft', 'sent', 'partial', 'paid', 'overdue'].map((status) => ({
    label: String(status).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
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
  const previewBankAccounts = bankAccounts.map((b) => ({
    id: b.id,
    bankName: b.bank_name || '',
    accountName: b.account_name || '',
    accountNumber: b.account_number || '',
    sortCode: b.sort_code || '',
    isDefault: b.is_default === true,
  }))
  const selectedPreviewBank =
    previewBankAccounts.find((account) => account.id === pdfOutput.bankAccountId)
    || previewBankAccounts.find((account) => account.isDefault)
    || previewBankAccounts[0]
    || null
  const companyPreviewLines = [
    settings.company_address,
    [settings.company_city, settings.company_state].filter(Boolean).join(', '),
    settings.company_vat ? `VAT Number: ${settings.company_vat}` : null,
    settings.company_phone ? `Phone: ${settings.company_phone}` : null,
    settings.company_email ? `Email: ${settings.company_email}` : null,
  ].filter(Boolean)
  const clientPreviewLines = [
    client?.contact_person ? `Attn: ${client.contact_person}` : null,
    client?.address || null,
    [client?.city, client?.state].filter(Boolean).join(', '),
    client?.phone || null,
    client?.email || null,
  ].filter(Boolean)
  const topHeaderFields = Array.isArray(customFieldObject?.header)
    ? customFieldObject.header.filter((field) => field?.label && field?.value)
    : []
  const bottomFields = Array.isArray(customFieldObject?.bottom)
    ? customFieldObject.bottom.filter((field) => field?.text)
    : []
  const attachmentLinks = Array.isArray(customFieldObject?.attachments)
    ? customFieldObject.attachments.filter((entry) => entry?.url).map((entry, index) => ({
        key: `${entry.label || entry.url || index}`,
        label: entry.label || entry.name || `Reference ${index + 1}`,
        url: entry.url,
      }))
    : []
  const previewCustomColumns = Array.isArray(customFieldObject?.columnConfig)
    ? customFieldObject.columnConfig.filter((column) => column?.visible && String(column?.key || '').startsWith('custom_'))
    : []
  const previewDetailRows = [
    { label: 'Client', value: invoice.client_name || 'Unassigned' },
    { label: 'PO Number', value: poNumber || '' },
    { label: 'Payment Terms', value: invoice.payment_terms || '' },
    { label: 'Title', value: invoice.invoice_title || invoice.document_type || '' },
    { label: 'Work Duration', value: invoice.work_duration || '' },
    ...topHeaderFields.map((field) => ({ label: field.label, value: field.value })),
  ].filter((row) => String(row.value || '').trim().length > 0)
  const previewItems = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      return { type: 'group', label: item.group_name || `Group ${index + 1}` }
    }
    const customFacts = previewCustomColumns
      .map((column) => {
        const value = item.custom_data?.[column.key]
        return value === null || value === undefined || value === '' ? null : `${column.label}: ${value}`
      })
      .filter(Boolean)
    return {
      type: 'line',
      label: item.description || 'Untitled item',
      detail: item.sub_description || '',
      value: formatMoney(item.amount || item.quantity * item.unit_price || 0),
      facts: [
        item.quantity ? `Qty: ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null,
        `Rate: ${formatMoney(item.unit_price || 0)}`,
        item.make ? `Make: ${item.make}` : null,
        item.install_rate !== null && item.install_rate !== undefined ? `Install: ${item.install_rate}` : null,
        item.vat_rate !== null && item.vat_rate !== undefined ? `VAT: ${item.vat_rate}%` : null,
        item.discount_rate !== null && item.discount_rate !== undefined ? `Discount: ${item.discount_rate}%` : null,
        ...customFacts,
      ].filter(Boolean),
    }
  })
  const previewTotals = [
    { label: 'Subtotal', value: formatMoney(invoice.subtotal || 0) },
    ...(Number(invoice.vat || 0) > 0 ? [{ label: 'VAT', value: formatMoney(invoice.vat || 0) }] : []),
    ...(Number(invoice.workmanship || 0) > 0 ? [{ label: 'Workmanship', value: formatMoney(invoice.workmanship || 0) }] : []),
    ...(Number(invoice.transportation || 0) > 0 ? [{ label: 'Transportation', value: formatMoney(invoice.transportation || 0) }] : []),
    ...(Number(invoice.shipping || 0) > 0 ? [{ label: 'Shipping', value: formatMoney(invoice.shipping || 0) }] : []),
    ...(Number(invoice.discount || 0) > 0 ? [{ label: 'Discount', value: formatMoney(invoice.discount || 0), valueClassName: 'text-red-600' }] : []),
    ...(Number(invoice.wht || 0) > 0 ? [{ label: 'WHT', value: formatMoney(invoice.wht || 0) }] : []),
    { label: 'Total', value: formatMoney(invoiceTotal), emphasis: true, valueClassName: 'text-slate-950' },
    { label: 'Cash Received', value: formatMoney(cashReceived) },
    { label: 'Balance Due', value: formatMoney(balanceDue), emphasis: true, valueClassName: balanceDue > 0 ? 'text-red-200' : 'text-emerald-200' },
  ]
  const previewNotesSections = [
    invoice.notes
      ? {
          title: customFieldObject?.notesTitle || 'Notes',
          content: (
            <div
              className="prose prose-sm max-w-none break-words text-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(invoice.notes) }}
            />
          ),
        }
      : null,
    invoice.terms
      ? {
          title: customFieldObject?.termsTitle || 'Terms and Conditions',
          content: (
            <div
              className="prose prose-sm max-w-none break-words text-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(invoice.terms) }}
            />
          ),
        }
      : null,
    ...bottomFields.map((field, index) => ({
      title: index === 0 ? 'Additional Notes' : `Additional Notes ${index + 1}`,
      content: <div className="whitespace-pre-wrap break-words">{field.text}</div>,
    })),
    ...(attachmentLinks.length > 0
      ? [{
          title: 'Reference Links',
          content: (
            <div className="space-y-2">
              {attachmentLinks.map((link) => (
                <a
                  key={link.key}
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
        }]
      : []),
  ].filter(Boolean)

  return (
    <Layout title={invoice.invoice_number} hidePageHeader contentClassName="w-full px-4 pb-32 pt-4 md:px-6 md:pt-6">
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
          statusLabel={String(computedStatus).replace(/_/g, ' ')}
          statusClassName={shellStatusClass}
          onBack={() => navigate('/invoices')}
          onMore={() => setShowMore(true)}
        />

        <DocumentSummaryDisclosure
          eyebrow="Total Payable"
          value={formatMoney(invoiceTotal)}
          helper={invoice.amount_in_words || invoice.invoice_title || 'Invoice ready for payment tracking.'}
          stats={[
            { label: 'Balance Due', value: formatMoney(balanceDue), className: balanceDue > 0 ? 'text-red-400' : 'text-emerald-300' },
            { label: 'Received', value: formatMoney(cashReceived), className: 'text-emerald-300' },
            { label: 'Due Date', value: invoice.due_date || 'Open', className: 'text-white' },
          ]}
          compactLabel="Invoice Summary"
          openLabel="Open summary"
          closeLabel="Collapse summary"
        />

        <DocumentActionGrid
          actions={[
            { key: 'pdf', label: 'PDF', onClick: () => setShowPdfSheet(true), variant: 'dark' },
            { key: 'payment', label: 'Payment', onClick: () => setShowPaymentModal(true), variant: 'emerald', disabled: computedStatus === 'paid' },
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
            { label: 'Status', value: String(computedStatus).replace(/_/g, ' ') },
          ]}
          detailRows={previewDetailRows}
          items={previewItems}
          totals={previewTotals}
          amountInWords={invoice.amount_in_words || ''}
          bankDetails={pdfOutput.showBankDetails && selectedPreviewBank ? selectedPreviewBank : null}
          notesSections={previewNotesSections}
          signatory={selectedSignatory ? {
            name: selectedSignatory.name,
            role: selectedSignatory.role || 'Saved signatory',
            signatureUrl: selectedSignatory.signature_url || '',
          } : null}
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
                    onChange={handlePdfOutputChange}
                    companyTagline={settings.company_tagline || ''}
                    footerText={settings.footer_text || ''}
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
                        <div className="text-sm font-extrabold text-foreground">{formatMoney(item.amount || item.quantity * item.unit_price || 0)}</div>
                        <div className="text-[11px] text-muted-foreground">{formatMoney(item.unit_price || 0)} each</div>
                      </div>
                    </div>
                  )
                })
              })()}
            </CardContent>
          </Card>
        </DocumentSection>

        <DocumentSection title="Payment History">
          <Card className="rounded-[24px] border-border shadow-sm">
            <CardContent className="space-y-3 p-4">
              {paymentHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className={payment.voided_at ? 'line-through text-slate-400' : ''}>
                      <div className="text-sm font-bold text-foreground">{formatMoney(payment.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(payment.date)} · {payment.method || 'Payment'}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-bold ${payment.runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'} ${payment.voided_at ? 'line-through text-slate-400' : ''}`}>
                        {formatMoney(payment.runningBalance)}
                      </div>
                      {isAdmin && !payment.voided_at ? (
                        <Button type="button" variant="outline" size="sm" disabled={voidingPaymentId === payment.id} onClick={() => handleVoidPayment(payment.id)}>
                          {voidingPaymentId === payment.id ? 'Voiding...' : 'Void'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </DocumentSection>

        <InvoiceActionsSheet
          open={showMore}
          onOpenChange={setShowMore}
          invoiceNumber={invoice.invoice_number}
          projectActionLabel={invoice.project_id ? 'View Project' : 'Link to Project'}
          projectActionSubtitle={invoice.project_id ? (linkedProject?.name || 'Open the linked project workspace') : 'Attach this invoice to a project'}
          onProjectAction={() => {
            setShowMore(false)
            invoice.project_id ? navigate(`/projects/${invoice.project_id}`) : setShowProjectLinkDialog(true)
          }}
          documentActionLabel={hasLinkedDocuments ? 'Linked Documents' : 'Link Documents'}
          documentActionSubtitle={hasLinkedDocuments ? 'View source, generated, and related records' : 'Connect this invoice to related records'}
          onLinkedDocumentsAction={() => {
            setShowMore(false)
            setShowLinkedDocuments(true)
          }}
          showRecordPayment={invoice.status !== 'paid'}
          onRecordPayment={() => {
            setShowMore(false)
            setShowPaymentModal(true)
          }}
          onExportCsv={handleDownloadCsv}
          onCopyInvoiceNumber={() => { void handleCopy(invoice.invoice_number || '', 'Invoice number') }}
          onCloneInvoice={handleClone}
          onRevertToQuotation={openRevertConfirm}
          reverting={converting}
          onGenerateCsr={handleGenerateCsr}
          onGenerateWaybill={handleGenerateWaybill}
          showMarkSent={invoice.status === 'draft'}
          onMarkSent={handleMarkSent}
          onArchiveInvoice={handleArchive}
          onDeleteInvoice={handleDelete}
          hasProject={!!invoice.project_id}
          hasLinkedDocuments={hasLinkedDocuments}
        />

        <DocumentPdfSheet
          open={showPdfSheet}
          onOpenChange={setShowPdfSheet}
          title="Download & Export"
          subtitle={`Using ${activePdfTemplate.label} as the saved invoice PDF preset on this device.`}
          actions={[
            { label: 'Export CSV', onClick: handleDownloadCsv, variant: 'outline' },
            { label: pdfGenerating ? 'Preparing...' : 'Download PDF', onClick: () => void handleDownloadPDF(), className: 'bg-slate-950 text-white hover:bg-slate-800', disabled: pdfGenerating },
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

        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void payment</DialogTitle>
              <DialogDescription>Enter a reason for voiding this payment:</DialogDescription>
            </DialogHeader>
            <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason for voiding" autoFocus />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={!voidReason.trim() || voidingPaymentId !== null} onClick={() => void confirmVoidPayment()}>
                {voidingPaymentId !== null ? 'Voiding...' : 'Void Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <LinkedDocumentsSheet
          open={showLinkedDocuments}
          onOpenChange={setShowLinkedDocuments}
          title="Linked Documents"
          subtitle={invoice.invoice_number || 'Invoice'}
          sections={linkedDocumentsSections}
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
            { label: computedStatus === 'paid' ? 'Paid in Full' : 'Record Payment', onClick: () => setShowPaymentModal(true), className: 'bg-emerald-600 text-white hover:bg-emerald-700', disabled: computedStatus === 'paid' },
          ]}
        />
      </div>
    </Layout>
  )

  return (
    <Layout title={invoice.invoice_number}>
      <div style={{ maxWidth: '900px', width: '100%', boxSizing: 'border-box', padding: isNarrow ? '0' : undefined }}>
        {/* ── Record Payment Modal ── */}
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

        {showMore && isNarrow && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.35)', zIndex: 1200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowMore(false)}
          >
            <div
              style={{
                width: '100%',
                backgroundColor: 'white',
                borderTopLeftRadius: '18px',
                borderTopRightRadius: '18px',
                padding: '10px 0 calc(18px + env(safe-area-inset-bottom, 0px))',
                boxShadow: '0 -18px 48px rgba(15,23,42,0.22)',
                position: 'relative',
                zIndex: 1250,
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: '42px', height: '4px', borderRadius: '999px', backgroundColor: '#CBD5E1', margin: '0 auto 10px' }} />
              <div
                style={{
                  padding: '0 16px 8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Invoice actions
              </div>
              <div style={{ display: 'grid' }}>
                {moreMenuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onPointerUp={item.disabled ? undefined : handleMobileMenuItemClick(item.action)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px',
                      border: 'none',
                      borderTop: '1px solid #F1F5F9',
                      backgroundColor: 'white',
                      color: item.danger ? '#CC0000' : '#0F172A',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: item.disabled ? 'default' : 'pointer',
                      opacity: item.disabled ? 0.65 : 1,
                      touchAction: 'manipulation',
                      pointerEvents: 'auto',
                      position: 'relative',
                      zIndex: 1300,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '14px',
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'visible',
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px',
            position: 'relative',
            zIndex: 5,
          }}
        >
          <div
            onClick={() => navigate('/invoices')}
            style={{
              flexShrink: 0,
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
              color: '#374151',
              whiteSpace: 'nowrap',
            }}
          >
            ← Back
          </div>
          <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap' }}>{invoice.invoice_number}</span>
          <span
            style={{
              flexShrink: 0,
              backgroundColor: s.bg,
              color: s.color,
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {invoice.status || 'draft'}
          </span>
          <div style={{ flex: 1, minWidth: 4 }} />
          <div
            onClick={handleDownloadPDF}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: pdfGenerating ? 'default' : 'pointer',
              fontSize: '13px',
              backgroundColor: '#0F172A',
              color: 'white',
              fontWeight: '600',
              opacity: pdfGenerating ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {pdfGenerating ? 'Preparing…' : '↓ PDF'}
          </div>
          <div
            onClick={() => navigate('/invoices/edit/' + id)}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              fontWeight: '600',
              color: '#374151',
              whiteSpace: 'nowrap',
            }}
          >
            Edit
          </div>
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0, zIndex: 6 }}>
            <button
              type="button"
              onClick={() => setShowMore((open) => !open)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                fontWeight: '600',
                userSelect: 'none',
                color: '#374151',
                letterSpacing: '0.05em',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
                zIndex: 20,
              }}
            >
              ···
            </button>
            {showMore && !isNarrow && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  left: 'auto',
                  marginTop: '4px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  border: '1px solid #e2e8f0',
                  zIndex: 200,
                  minWidth: '220px',
                  overflow: 'hidden',
                }}
              >
                {moreMenuItems.map((item, i) => (
                    <div
                      key={i}
                      onClick={item.disabled ? undefined : handleMenuItemClick(item.action)}
                      style={{
                        padding: '10px 16px',
                        cursor: item.disabled ? 'default' : 'pointer',
                        fontSize: '13px',
                        color: item.danger ? '#CC0000' : '#1a1a1a',
                        borderBottom: '1px solid #f5f5f5',
                        transition: 'background 0.1s',
                        opacity: item.disabled ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!item.disabled) e.currentTarget.style.backgroundColor = '#f9f9f9'
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                    >
                      {item.label}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0,1fr) 240px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr' }}>
            {/* Client */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '11px 12px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '6px',
                }}
              >
                Client
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>{invoice.client_name || 'Unassigned'}</div>
              {client?.contact_person && <div style={{ marginTop: '3px', fontSize: '12px', color: '#64748b' }}>{client.contact_person}</div>}
              {client?.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{client.email}</div>}
              {client?.phone && <div style={{ fontSize: '12px', color: '#64748b' }}>{client.phone}</div>}
            </div>

            {/* Conversion Trail */}
            {(conversionTrail?.source?.number || (conversionTrail?.derived || []).length > 0) && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '11px 12px', gridColumn: isNarrow ? 'auto' : '1 / span 2' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: '6px',
                  }}
                >
                  Conversion Trail
                </div>
                <div style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#475569' }}>
                  {conversionTrail?.source?.number ? (
                    <button
                      type="button"
                      onClick={() => (conversionTrail.source.id ? navigate(`/quotations/${conversionTrail.source.id}`) : null)}
                      style={{
                        textAlign: 'left',
                        color: '#1d4ed8',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: conversionTrail.source.id ? 'pointer' : 'default',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      Source Quotation: {conversionTrail.source.number}
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Document Identity */}
          <div style={{ border: '1px solid #0f172a', borderRadius: '8px', backgroundColor: '#0f172a', padding: '11px 12px', color: 'white' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                marginBottom: '6px',
              }}
            >
              Document Identity
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', lineHeight: 1.3 }}>{companyName || (invoice.document_type || 'INVOICE')}</div>
            {companyTagline ? <div style={{ marginTop: '3px', fontSize: '12px', color: '#cbd5e1' }}>{companyTagline}</div> : null}
            {companyIdentityLines.length > 0 && (
              <div style={{ marginTop: '8px', display: 'grid', gap: '2px', fontSize: '11px', color: '#94a3b8' }}>
                {companyIdentityLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Invoice Preview ── */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            padding: isNarrow ? '16px' : '40px',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
            {hasCompanyIdentity ? (
              <div>
                {companyName ? <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '22px', marginBottom: '4px' }}>{companyName}</div> : null}
                {companyTagline ? <div style={{ color: '#555', fontSize: '12px' }}>{companyTagline}</div> : null}
                {companyIdentityLines.map((line) => (
                  <div key={line} style={{ color: '#555', fontSize: '12px' }}>{line}</div>
                ))}
              </div>
            ) : (
              <div />
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>{invoice.document_type || 'INVOICE'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: '12px', color: '#555' }}>Date: {invoice.issue_date}</div>
              {invoice.due_date && <div style={{ fontSize: '12px', color: '#555' }}>Due: {invoice.due_date}</div>}
            </div>
          </div>

          <div style={{ borderBottom: '2px solid #CC0000', marginBottom: '24px' }} />

          <div style={{ display: 'flex', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Bill To
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>{invoice.client_name}</div>
              {client?.contact_person && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>Attn: {client.contact_person}</div>}
              {client?.phone && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.phone}</div>}
              {client?.email && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.email}</div>}
              {client?.address && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.address}</div>}
              {client?.city && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.city}{client.state ? ', ' + client.state : ''}</div>}
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Details
              </div>
              {invoice.issue_date && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Issued: {invoice.issue_date}</div>}
              {poNumber && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>P.O.: {poNumber}</div>}
              {invoice.payment_terms && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Payment Terms: {invoice.payment_terms}</div>}
              {invoice.work_duration && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Work Duration: {invoice.work_duration}</div>}
              {topHeaderFields.map((field, index) =>
                field.label && field.value ? (
                  <div key={`${field.label}-${index}`} style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                    {field.label}: {field.value}
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Mobile items */}
          {isNarrow && (
            <div style={{ marginBottom: '24px' }}>
              {(() => {
                let stdCount = 0
                return items.map((item, index) => {
                  if (item.row_type === 'standard') stdCount++
                  const n = stdCount
                  if (item.row_type === 'group_header') {
                    return (
                      <div
                        key={index}
                        style={{
                          backgroundColor: '#333',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginBottom: '8px',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                      >
                        {item.group_name}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                        border: '1px solid #eee',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '11px', color: '#999', fontWeight: '700', marginRight: '6px' }}>{n}.</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{item.description}</span>
                          {item.sub_description && (
                            <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>{item.sub_description}</div>
                          )}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#CC0000', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                          ₦{Number(item.amount || item.quantity * item.unit_price || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {item.make && (
                          <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '2px 8px', color: '#555' }}>
                            Make: {item.make}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '2px 8px', color: '#555' }}>
                          Qty: {item.quantity}{item.unit ? ' ' + item.unit : ''}
                        </span>
                        <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '2px 8px', color: '#555' }}>
                          ₦{Number(item.unit_price || 0).toLocaleString()} / unit
                        </span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* Desktop table */}
          <div style={{ display: isNarrow ? 'none' : 'block', overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'white', width: '32px' }}>#</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white' }}>Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white' }}>Make</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>Qty</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>Unit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white' }}>Unit Price</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let stdCount = 0
                  return items.map((item, index) => {
                    if (item.row_type === 'standard') stdCount++
                    return item.row_type === 'group_header' ? (
                      <tr key={index} style={{ backgroundColor: '#333' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>—</td>
                        <td colSpan={6} style={{ padding: '10px 14px', fontWeight: 'bold', color: 'white', fontSize: '13px' }}>{item.group_name}</td>
                      </tr>
                    ) : (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#999', fontSize: '12px', fontWeight: '700' }}>{stdCount}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ color: '#1a1a1a', fontWeight: '500' }}>{item.description}</div>
                          {item.sub_description && <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>{item.sub_description}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{item.make || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>{item.unit || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>₦{Number(item.unit_price || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 'bold' }}>₦{Number(item.amount || item.quantity * item.unit_price || 0).toLocaleString()}</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <div style={{ width: '320px' }}>
              {[
                { label: 'Subtotal', value: invoice.subtotal },
                { label: 'VAT', value: invoice.vat },
                { label: 'Workmanship', value: invoice.workmanship },
                { label: 'Transportation', value: invoice.transportation },
                { label: 'Shipping', value: invoice.shipping },
                { label: 'Discount', value: invoice.discount, negative: true },
              ]
                .filter((r) => Number(r.value) > 0)
                .map(({ label, value, negative }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#555' }}>{label}</span>
                    <span style={{ color: negative ? '#CC0000' : '#1a1a1a' }}>
                      {negative ? '-' : ''}???{Number(value || 0).toLocaleString()}
                    </span>
                  </div>
                ))}

              {/* Grand total */}
              <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>TOTAL (NGN)</span>
                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#CC0000' }}>???{Number(invoice.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Card className="mb-6 border-border shadow-none">
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invoice Total</div>
                  <div className="mt-1 text-sm font-bold text-foreground">{formatMoney(invoiceTotal)}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cash Received</div>
                  <div className="mt-1 text-sm font-bold text-foreground">{formatMoney(cashReceived)}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Balance Due</div>
                  <div className={`mt-1 text-sm font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(balanceDue)}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</div>
                  <div className="mt-2">
                    <Badge className={`capitalize ${statusBadgeClass}`}>{String(computedStatus).replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Payment History</div>
                  <div className="text-xs text-muted-foreground">Running balance reflects non-voided settlements in date order.</div>
                </div>
                {computedStatus !== 'paid' ? (
                  <Button type="button" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowPaymentModal(true)}>
                    Record Payment
                  </Button>
                ) : null}
              </div>

              {paymentHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Settlement</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => {
                        const rowClassName = payment.voided_at ? 'line-through text-slate-400' : ''
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className={rowClassName}>
                              <div className="flex items-center gap-2">
                                <span>{formatDate(payment.date)}</span>
                                {payment.voided_at ? <Badge variant="outline">Voided</Badge> : null}
                              </div>
                            </TableCell>
                            <TableCell className={rowClassName}>{payment.method || '-'}</TableCell>
                            <TableCell className={rowClassName}>{payment.reference || '-'}</TableCell>
                            <TableCell className={`text-right ${rowClassName}`}>{formatMoney(payment.total)}</TableCell>
                            <TableCell className={`text-right font-semibold ${rowClassName}`}>{formatMoney(payment.total)}</TableCell>
                            <TableCell className={`text-right font-semibold ${payment.runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'} ${rowClassName}`}>{formatMoney(payment.runningBalance)}</TableCell>
                            <TableCell className="text-right">
                              {isAdmin && !payment.voided_at ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={voidingPaymentId === payment.id}
                                  onClick={() => handleVoidPayment(payment.id)}
                                >
                                  {voidingPaymentId === payment.id ? 'Voiding...' : 'Void'}
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.amount_in_words && (
            <div
              style={{
                backgroundColor: '#f9f9f9',
                padding: '12px',
                borderLeft: '3px solid #CC0000',
                marginBottom: '24px',
                fontSize: '12px',
                color: '#555',
                fontStyle: 'italic',
              }}
            >
              {invoice.amount_in_words}
            </div>
          )}

          {invoice.notes && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Notes
              </div>
              <div dangerouslySetInnerHTML={{ __html: safeInvoiceNotes }} style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }} />
            </div>
          )}
          {invoice.terms && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Terms & Conditions
              </div>
              <div dangerouslySetInnerHTML={{ __html: safeInvoiceTerms }} style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }} />
            </div>
          )}

          {attachments.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Supporting Documents
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#f8f9ff',
                      borderRadius: '8px',
                      border: '1px solid #e0e8ff',
                      textDecoration: 'none',
                      color: '#1a1a1a',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>📎</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0056B3',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {att.label || att.name}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6366F1', flexShrink: 0 }}>↗ Open</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #eee', paddingTop: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Payment Terms</div>
            <div style={{ fontSize: '12px', color: '#555' }}>{invoice.payment_terms || 'Net 30'}</div>
          </div>

          {selectedSignatory && (
            <Card className="mt-6 border-border shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {selectedSignatory.signature_url ? (
                    <img src={selectedSignatory.signature_url} alt={`${selectedSignatory.name} signature`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">SIG</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Signatory</div>
                  <div className="mt-1 text-sm font-bold text-foreground">{selectedSignatory.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedSignatory.role || 'Saved signatory'}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── PDF Download + Template Selector ── */}
        <PdfOutputSettings
          value={pdfOutput}
          onChange={handlePdfOutputChange}
          bankAccounts={bankAccounts.map(b => ({
            id: b.id,
            bankName: b.bank_name,
            accountName: b.account_name,
            accountNumber: b.account_number,
            sortCode: b.sort_code,
            isDefault: b.is_default,
          }))}
          companyTagline={settings.company_tagline || ''}
          footerText={settings.footer_text || ''}
        />
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            PDF Template
          </div>
          <div
            onClick={handleDownloadPDF}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: '6px',
              cursor: pdfGenerating ? 'default' : 'pointer',
              fontSize: '13px',
              backgroundColor: '#0F172A',
              color: 'white',
              fontWeight: '600',
              opacity: pdfGenerating ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {pdfGenerating ? 'Preparing…' : '↓ Download PDF'}
          </div>
        </div>
        <TemplateSelector value={pdfTemplate} onChange={setPdfTemplate} />
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

        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void payment</DialogTitle>
              <DialogDescription>Enter a reason for voiding this payment:</DialogDescription>
            </DialogHeader>
            <Input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for voiding"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={!voidReason.trim() || voidingPaymentId !== null} onClick={() => void confirmVoidPayment()}>
                {voidingPaymentId !== null ? 'Voiding...' : 'Void Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}

