import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/supabase'
import { computeDocument } from '@/lib/Calculations'
import { formatNaira } from '@/lib/formatters/money'
import { 
  parseCustomFields, 
  normalizeExtraCharges,
  ensureUiKey,
  inferLegacyCalculationState,
  buildCalculationInputs,
  BUILTIN_COLUMNS,
  type InvoiceMetric,
  type BaseDocument
} from '@/domain/invoice'

import InvoiceViewPage from '@/components/document-view/invoice/InvoiceViewPage'
import InvoiceMoreSheet from '@/components/document-view/invoice/InvoiceMoreSheet'
import InvoiceRecordPaymentSheet from '@/components/document-view/invoice/InvoiceRecordPaymentSheet'
import InvoiceAdvanceSheet from '@/components/document-view/invoice/InvoiceAdvanceSheet'
import InvoiceCustomizeSheet from '@/components/document-view/invoice/InvoiceCustomizeSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import '@/components/document-view/shared/documentViewTheme.css'
import InvoiceConfirmDialog from '@/components/document-view/invoice/InvoiceConfirmDialog'
import InvoiceToastViewport from '@/components/document-view/invoice/InvoiceToastViewport'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'

import { 
  InvoicePageShell, 
  InvoiceTopNav, 
  InvoiceFloatingDownloadButton, 
  InvoiceHero 
} from '@/components/document-view/invoice/InvoiceFidelityPrimitives'

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
  
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [advanceMode, setAdvanceMode] = useState<'create' | 'edit'>('create')

  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [invoiceRes, itemsRes] = await Promise.all([
          supabase.from('invoices').select('*').eq('id', id).single(),
          supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
        ])

        if (invoiceRes.error || !invoiceRes.data) {
          navigate('/invoices')
          return
        }

        const data = invoiceRes.data
        const itemRows = itemsRes.data || []
        
        let parsedCustomFields: any = {}
        try {
          parsedCustomFields = parseCustomFields(data.custom_fields)
        } catch {}

        const legacyState = inferLegacyCalculationState({
          invoice: data,
          items: itemRows,
          customFields: parsedCustomFields && !Array.isArray(parsedCustomFields) ? parsedCustomFields : {},
        })

        const mappedItems = itemRows.map(item => ({
          ...ensureUiKey(item),
          row_type: item.row_type || 'standard'
        }))

        const calcInputs = buildCalculationInputs({
          invoice: {
            ...data,
            vat: legacyState.editableInputs.vatRate,
            discount: legacyState.editableInputs.discountValue,
            wht: legacyState.calculationInputs.whtValue,
          },
          items: mappedItems,
          discountType: legacyState.calculationInputs.discountType,
          discountTiming: legacyState.calculationInputs.discountTiming,
          whtType: legacyState.calculationInputs.whtType
        })

        const computed = computeDocument({
          items: mappedItems,
          columns: BUILTIN_COLUMNS,
          document: data,
          cf: {
            calculationInputs: calcInputs,
            extraCharges: normalizeExtraCharges(parsedCustomFields?.extraCharges || [])
          }
        })

        setInvoice(data)
        setItems(mappedItems)
        setTotals(computed)
      } catch (err) {
        console.error('Failed to load invoice', err)
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!invoice?.invoice_number) return
    try {
      await navigator.clipboard.writeText(invoiceDocument.number)
      showToast('Invoice number copied', invoiceDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  const handleDuplicate = () => {
    showToast('Duplicate', 'Cloning invoice logic will be added in Phase 2.')
  }

  return (
    <>
      <InvoicePageShell
        topNav={
          <InvoiceTopNav
            title={docProps.number}
            subtitle={invoice.invoice_title || 'Tax Invoice'}
            onBack={() => navigate('/invoices')}
            onShare={() => showToast('Share', 'Share flow remains outside Phase 1 scope.')}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
          />
        }
        floating={
          <InvoiceFloatingDownloadButton
            onClick={() =>
              showToast(
                'Download',
                'PDF generation requires backend service.',
                'success',
              )
            }
          />
        }
        overlay={
          <>
            <InvoiceCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              onSave={() => showToast('Settings saved', '', 'success')}
            />

            <InvoiceMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => showToast('Marked as sent', '')}
              onRevert={() => ui.openModal(MODAL_REVERT)}
              onGenerateWaybill={() => showToast('Generate Waybill', '')}
              onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
              onAdvanceInvoice={() => {
                setAdvanceMode('create')
                ui.openSheet(SHEET_ADVANCE)
              }}
              onLinkProject={() => showToast('Link to Project', '')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExportCsv={() => showToast('Export as CSV', '')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <InvoiceRecordPaymentSheet
              open={ui.isSheetOpen(SHEET_RECORD_PAYMENT)}
              onClose={ui.closeSheet}
              onSave={() => showToast('Payment recorded', '', 'success')}
            />

            <InvoiceAdvanceSheet
              open={ui.isSheetOpen(SHEET_ADVANCE)}
              mode={advanceMode}
              totalAmount={totals?.totalPayable || 0}
              onClose={ui.closeSheet}
              onSave={() => showToast('Advance generated', '', 'success')}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Invoice?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => {
                showToast('Invoice archived', '', 'success')
                ui.closeModal()
              }}
              onCancel={ui.closeModal}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_REVERT)}
              title="Revert to Quotation?"
              description={`${docProps.number} will be converted back to a draft quotation. Existing payment records will be preserved.`}
              cancelLabel="Cancel"
              confirmLabel="Revert"
              onConfirm={() => {
                showToast('Reverted to quotation', '', 'success')
                ui.closeModal()
              }}
              onCancel={ui.closeModal}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Invoice?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => {
                showToast('Invoice deleted', '', 'success')
                ui.closeModal()
              }}
              onCancel={ui.closeModal}
            />

            <InvoiceConfirmDialog
              open={ui.isModalOpen(MODAL_VOID_PAYMENT)}
              title="Void Payment?"
              description="This payment record will be marked as voided. The invoice balance will be updated accordingly."
              cancelLabel="Cancel"
              confirmLabel="Void Payment"
              destructive
              onConfirm={() => {
                showToast('Payment voided', '', 'success')
                ui.closeModal()
              }}
              onCancel={ui.closeModal}
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
          document={docProps}
          metrics={metrics}
          onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
          onEdit={() => navigate(`/invoices/edit/${id}`)}
          onDuplicate={handleDuplicate}
          onCopyNumber={handleCopyNumber}
          onAdvanceDownload={() =>
            showToast('Download', 'Advance invoice PDF generation.')
          }
          onAdvanceEdit={() => {
            setAdvanceMode('create')
            ui.openSheet(SHEET_ADVANCE)
          }}
          onAdvanceRemove={() => ui.openModal(MODAL_DELETE)}
          onVoidPayment={() => ui.openModal(MODAL_VOID_PAYMENT)}
        />
      </InvoicePageShell>

      <InvoiceToastViewport
        toasts={toastStack.toasts}
        onDismiss={toastStack.dismissToast}
      />
    </>
  )
}
