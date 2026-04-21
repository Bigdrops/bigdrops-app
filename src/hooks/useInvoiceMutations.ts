import { supabase } from '@/supabase'
import { toast } from '@/hooks/use-toast'
import {
  buildTrailLink,
  parseDocumentCustomFields,
  toQuotationItemRow,
  withSourceTrail,
} from '@/domain/documentConversion'
import { getNextQuotationNumber } from '@/domain/quotation'
import { toDbItem } from '@/domain/invoice'

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
  const handleAttachExisting = async (item: { id?: string }) => {
    if (!item?.id || !attachKind) return
    if (attachKind === 'csr') {
      await supabase.from('csrs').update({ linked_invoice_id: invoice.id }).eq('id', item.id)
    }
    if (attachKind === 'waybill') {
      await supabase.from('waybills').update({ invoice_id: invoice.id }).eq('id', item.id)
    }
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
    await supabase.from('invoices').update({ status: newStatus }).eq('id', id)
    await refresh()
  }

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
        const nums = all.map((entry) => parseInt(entry.invoice_number.replace('SASINV-B', ''))).filter((n) => !Number.isNaN(n))
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
            project_id: null,
            status: 'draft',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: null,
          },
          prefillItems: items.map((item) => ({ ...item, id: null })),
        },
      })
    } catch (err: any) {
      toast({ title: 'Clone failed', description: err?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  const handleConvertToQuote = async () => {
    if (converting) return
    setShowRevertConfirm(false)
    setConverting(true)
    try {
      let safeProjectId = invoice.project_id || null
      if (safeProjectId) {
        const { validateProjectAssignment } = await import('@/domain/projects')
        const { project, error: projectError } = await validateProjectAssignment(supabase as any, {
          projectId: safeProjectId,
          documentClientId: invoice.client_id,
          documentClientName: invoice.client_name,
        })
        if (projectError || !project) safeProjectId = null
      }

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
        project_id: safeProjectId,
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
    } catch (err: any) {
      toast({
        title: 'Revert to quotation failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setConverting(false)
    }
  }

  const handleMarkSent = () => {
    void handleStatusChange('sent')
    setShowMore(false)
  }

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

  const handleArchive = async () => {
    setShowMore(false)
    setShowArchiveConfirm(true)
  }

  const confirmArchive = async () => {
    setShowArchiveConfirm(false)
    await supabase.from('invoices').update({ archived_at: new Date().toISOString() }).eq('id', id)
    navigate('/invoices')
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

  return {
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
  }
}
