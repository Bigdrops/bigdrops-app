import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import InvoiceHeroMeta from '@/components/document-view/invoice/InvoiceHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import InvoiceViewPage from '@/components/document-view/invoice/InvoiceViewPage'
import InvoiceMoreSheet from '@/components/document-view/invoice/InvoiceMoreSheet'
import InvoiceRecordPaymentSheet from '@/components/document-view/invoice/InvoiceRecordPaymentSheet'
import InvoiceAdvanceSheet from '@/components/document-view/invoice/InvoiceAdvanceSheet'
import InvoiceCustomizeSheet from '@/components/document-view/invoice/InvoiceCustomizeSheet'
import {
  invoiceDocument,
  invoiceMetrics,
  invoiceSubtitle,
  invoiceThreadTag,
} from '@/components/document-view/invoice/invoiceViewMockData'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'

const SHEET_CUSTOMIZE = 'customize-output'
const SHEET_MORE = 'more-actions'
const SHEET_RECORD_PAYMENT = 'record-payment'
const SHEET_ADVANCE = 'advance'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const MODAL_REVERT = 'revert'
const MODAL_VOID_PAYMENT = 'void-payment'
const MODAL_VOID = 'void'

export default function ViewInvoice() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()
  const [advanceMode, setAdvanceMode] = useState<'create' | 'edit'>('create')

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(invoiceDocument.number)
      showToast('Invoice number copied', invoiceDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={invoiceDocument.number}
            subtitle="Invoice"
            onBack={() => navigate('/invoices')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share clicked', 'Share flow remains static in Phase 1.')}
                onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={invoiceDocument.title}
            title={invoiceDocument.number}
            subtitle={invoiceSubtitle}
            status={invoiceDocument.status}
            meta={<InvoiceHeroMeta threadTag={invoiceThreadTag} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download clicked',
                'PDF export is intentionally static in Phase 1.',
                'success',
              )
            }
          />
        }
        overlays={
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
              onGenerateWaybill={() => showToast('Generate Waybill clicked', '')}
              onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
              onAdvanceInvoice={() => {
                setAdvanceMode('create')
                ui.openSheet(SHEET_ADVANCE)
              }}
              onLinkProject={() => showToast('Link to Project clicked', '')}
              onAttachDocument={() => showToast('Attach / Link Document clicked', '')}
              onCopyNumber={handleCopyNumber}
              onExportCsv={() => showToast('Export as CSV clicked', '')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <InvoiceRecordPaymentSheet
              open={ui.isSheetOpen(SHEET_RECORD_PAYMENT)}
              onClose={ui.closeSheet}
              onSave={() => showToast('Payment of ₦2,720,000 recorded', '', 'success')}
            />

            <InvoiceAdvanceSheet
              open={ui.isSheetOpen(SHEET_ADVANCE)}
              mode={advanceMode}
              totalAmount={4720000}
              onClose={ui.closeSheet}
              onSave={() => showToast('Advance invoice generated', '', 'success')}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Invoice?"
              description="SASINV-B047 will be moved to your archive. It won't appear in your active invoice list but remains accessible and recoverable."
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Invoice archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_REVERT)}
              title="Revert to Quotation?"
              description="SASINV-B047 will be converted back to a draft quotation. Existing payment records will be preserved but the invoice status will be removed."
              cancelLabel="Cancel"
              confirmLabel="Revert"
              onConfirm={() => showToast('Reverted to quotation', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Invoice?"
              description="SASINV-B047 will be permanently deleted. This cannot be undone. All payment records and linked data for this invoice will be removed."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Invoice deleted', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_VOID_PAYMENT)}
              title="Void Payment?"
              description="Bank Transfer · ₦1,650,000 recorded on 14 Apr 2025 will be marked as voided. The invoice balance will be updated accordingly."
              cancelLabel="Cancel"
              confirmLabel="Void Payment"
              destructive
              onConfirm={() => showToast('Payment voided', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <InvoiceViewPage
          document={invoiceDocument}
          metrics={invoiceMetrics}
          onRecordPayment={() => ui.openSheet(SHEET_RECORD_PAYMENT)}
          onEdit={() => showToast('Edit Invoice', 'Edit flow stays outside Phase 1 scope.')}
          onDuplicate={() => showToast('Duplicate', 'Duplicate action is represented visually only.')}
          onCopyNumber={handleCopyNumber}
          onAdvanceDownload={() =>
            showToast('Advance Download', 'Advance invoice download remains static for now.')
          }
          onAdvanceEdit={() => {
            setAdvanceMode('create') // Since we only mock it, assume all clicks enter create for now, unless specific
            ui.openSheet(SHEET_ADVANCE)
          }}
          onAdvanceRemove={() => ui.openModal(MODAL_DELETE)}
          onVoidPayment={() => ui.openModal(MODAL_VOID_PAYMENT)}
        />
      </DocumentPage>

      <DocumentToastViewport
        toasts={toastStack.toasts}
        onDismiss={toastStack.dismissToast}
      />
    </>
  )
}

const overlayCopyStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: '#57534a',
} as const
