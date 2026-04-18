import { useNavigate } from 'react-router-dom'

import QuotationHeroMeta from '@/components/document-view/quotation/QuotationHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import QuotationViewPage from '@/components/document-view/quotation/QuotationViewPage'
import QuotationMoreSheet from '@/components/document-view/quotation/QuotationMoreSheet'
import QuotationCustomizeSheet from '@/components/document-view/quotation/QuotationCustomizeSheet'
import {
  quotationDocument,
  quotationMetrics,
  quotationSubtitle,
  quotationThreadTag,
} from '@/components/document-view/quotation/quotationViewMockData'
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
const MODAL_CONVERT = 'convert'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewQuotationNew() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(quotationDocument.number)
      showToast('Quotation number copied', quotationDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={quotationDocument.number}
            subtitle="Quotation"
            onBack={() => navigate('/quotations')}
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
            eyebrow={quotationDocument.title}
            title={quotationDocument.number}
            subtitle={quotationSubtitle}
            status={quotationDocument.status}
            meta={<QuotationHeroMeta threadTag={quotationThreadTag} />}
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
            <QuotationCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              onSave={() => showToast('Settings saved', '', 'success')}
            />

            <QuotationMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => showToast('Marked as sent', '')}
              onMarkAsAccepted={() => showToast('Marked as accepted', '', 'success')}
              onMarkAsRejected={() => showToast('Marked as rejected', '')}
              onConvertToInvoice={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => showToast('Link to Project clicked', '')}
              onAttachDocument={() => showToast('Attach / Link Document clicked', '')}
              onCopyNumber={handleCopyNumber}
              onExportCsv={() => showToast('Export as CSV clicked', '')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Convert to Invoice?"
              description="This will generate a new draft invoice based on this quotation. The quotation will be marked as accepted."
              cancelLabel="Cancel"
              confirmLabel="Convert to Invoice"
              onConfirm={() => showToast('Converted to Invoice', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Quotation?"
              description="SASQUO-B031 will be moved to your archive. It won't appear in your active quotation list but remains accessible."
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Quotation archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Quotation?"
              description="SASQUO-B031 will be permanently deleted. This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Quotation deleted', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <QuotationViewPage
          document={quotationDocument}
          metrics={quotationMetrics}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => showToast('Edit Quotation', 'Edit flow stays outside Phase 1 scope.')}
          onDuplicate={() => showToast('Duplicate', 'Duplicate action is represented visually only.')}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport
        toasts={toastStack.toasts}
        onDismiss={toastStack.dismissToast}
      />
    </>
  )
}
