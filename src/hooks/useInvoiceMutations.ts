import { useEntity } from '@/lib/tenant/contexts'
import { feedback } from '@/lib/feedback'
import { voidInvoicePayment } from '@/modules/invoices/services/paymentService'
import { fetchInvoiceIdForPayment } from '@/modules/invoices/repositories/paymentRepository'
import {
  archiveInvoice,
  deleteInvoice,
  changeInvoiceStatus,
  attachExistingDocument,
  duplicateInvoice,
} from '@/modules/invoices/services/invoiceLifecycleService'
import { revertInvoiceToQuotationService } from '@/modules/invoices/services/invoiceConversionService'
import { useSettings } from '@/hooks/useSettings'

type NavigateFn = (to: string, options?: unknown) => void

type InvoiceLike = {
  id?: string
  invoice_number?: string | null
  client_id?: string | null
  client_name?: string | null
  project_id?: string | null
  issue_date?: string | null
  due_date?: string | null
  status?: string | null
  notes?: string | null
  terms?: string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  discount?: number | string | null
  vat?: number | string | null
  wht?: number | string | null
  subtotal?: number | string | null
  install_rate_total?: number | string | null
  total?: number | string | null
  amount_in_words?: string | null
  invoice_title?: string | null
  document_type?: string | null
  work_duration?: string | null
}

type UseInvoiceMutationsArgs = {
  id: string
  invoice: InvoiceLike
  items: any[]
  poNumber: string
  customFieldObject: any
  converting: boolean
  pendingVoidPaymentId: string | number | null
  voidReason: string
  attachKind: 'csr' | 'waybill' | null
  refresh: () => Promise<unknown> | void
  navigate: NavigateFn
  setShowMore: (value: boolean) => void
  setShowDeleteConfirm: (value: boolean) => void
  setShowArchiveConfirm: (value: boolean) => void
  setShowRevertConfirm: (value: boolean) => void
  setShowVoidDialog: (value: boolean) => void
  setPendingVoidPaymentId: (value: string | number | null) => void
  setVoidReason: (value: string) => void
  setVoidingPaymentId: (value: string | number | null) => void
  setConverting: (value: boolean) => void
  setAttachKind: (value: 'csr' | 'waybill' | null) => void
  setShowAttachSheet: (value: boolean) => void
}

export type RevertInvoiceToQuotationCommand = {
  endpoint: string
  method: 'POST'
  body: {
    reason: string | null
    confirmedInvoiceNumber: string | null
  }
}

export function buildRevertInvoiceToQuotationCommand({
  invoiceId,
  reason,
  confirmedInvoiceNumber,
}: {
  invoiceId: string
  reason?: string | null
  confirmedInvoiceNumber?: string | null
}): RevertInvoiceToQuotationCommand {
  return {
    endpoint: `/api/invoices/${invoiceId}/revert-to-quotation`,
    method: 'POST',
    body: {
      reason: reason ?? null,
      confirmedInvoiceNumber: confirmedInvoiceNumber ?? null,
    },
  }
}

export function useInvoiceMutations({
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
}: UseInvoiceMutationsArgs) {
  const { tenantClient, entity } = useEntity()
  const entityId = entity?.id ?? null
  const { settings } = useSettings()
  const handleAttachExisting = async (item: { id?: string }) => {
    if (!item?.id || !attachKind) return
    await attachExistingDocument({ invoiceId: invoice.id, childId: item.id, kind: attachKind }, tenantClient)
    setShowAttachSheet(false)
    setAttachKind(null)
    await refresh()
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

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === invoice.status) return
    const oldStatus = invoice.status || 'unpaid'
    const result = await changeInvoiceStatus({ invoiceId: id, oldStatus, newStatus, tenantClient })
    if (!result.success) throw new Error(result.error)
    await refresh()
  }

  const handleClone = async () => {
    setShowMore(false)
    try {
      const result = await duplicateInvoice({ invoice, items }, tenantClient)
      navigate('/invoices/new', {
        state: result,
      })
    } catch (err: any) {
      feedback.error('Clone failed', { description: err?.message || 'Unknown error' })
    }
  }

  const handleConvertToQuote = async () => {
    if (converting) return
    setShowRevertConfirm(false)
    setConverting(true)
    try {
      const createdQuotation = await revertInvoiceToQuotationService({
        invoice,
        items,
        customFields: customFieldObject,
        prefixes: settings?.document_prefixes,
      }, tenantClient, entityId)
      navigate(`/quotations/${createdQuotation.id}`)
    } catch (err: any) {
      feedback.error('Revert to quotation failed', {
        description: err?.message || 'Unknown error',
      })
    } finally {
      setConverting(false)
    }
  }

  const handleDelete = async () => {
    setShowMore(false)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    const result = await deleteInvoice(id, tenantClient, entityId)
    if (!result.success) {
      feedback.error('Delete failed', { description: result.error || 'Could not delete invoice' })
      return
    }
    navigate('/invoices')
  }

  const handleArchive = async () => {
    setShowMore(false)
    setShowArchiveConfirm(true)
  }

  const confirmArchive = async () => {
    setShowArchiveConfirm(false)
    const result = await archiveInvoice(id, tenantClient)
    if (!result.success) {
      feedback.error('Archive failed', { description: result.error || 'Could not archive invoice' })
      return
    }
    navigate('/invoices')
  }

  const handleVoidPayment = async (paymentId: string | number) => {
    setPendingVoidPaymentId(paymentId)
    setVoidReason('')
    setShowVoidDialog(true)
  }

  const confirmVoidPayment = async () => {
    if (!pendingVoidPaymentId || !voidReason.trim()) return
    const reason = voidReason.trim()
    setShowVoidDialog(false)

    setVoidingPaymentId(pendingVoidPaymentId)

    const invoiceId = await fetchInvoiceIdForPayment(String(pendingVoidPaymentId), tenantClient)
    if (!invoiceId) {
      feedback.error('Void failed', { description: 'Could not find invoice for payment' })
      setVoidingPaymentId(null)
      return
    }

    const result = await voidInvoicePayment({
      paymentId: String(pendingVoidPaymentId),
      invoiceId,
      reason,
    }, tenantClient)

    if (!result.success) {
      feedback.error('Void failed', { description: result.error || 'Unknown error' })
      setVoidingPaymentId(null)
      return
    }

    await refresh()
    setVoidingPaymentId(null)
    setPendingVoidPaymentId(null)
    setVoidReason('')
  }

  return {
    handleAttachExisting,
    handleGenerateCsr,
    handleGenerateWaybill,
    openRevertConfirm,
    handleStatusChange,
    handleClone,
    handleConvertToQuote,
    handleDelete,
    confirmDelete,
    handleArchive,
    confirmArchive,
    handleVoidPayment,
    confirmVoidPayment,
  }
}
