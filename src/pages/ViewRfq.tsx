import { useNavigate } from 'react-router-dom'

import RfqHeroMeta from '@/components/document-view/rfq/RfqHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import RfqViewPage from '@/components/document-view/rfq/RfqViewPage'
import RfqMoreSheet from '@/components/document-view/rfq/RfqMoreSheet'
import {
  rfqDocument,
  rfqMetrics,
  rfqSubtitle,
  rfqThreadTag,
} from '@/components/document-view/rfq/rfqViewMockData'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'

const SHEET_MORE = 'more-actions'
const MODAL_CONVERT = 'convert'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewRfq() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(rfqDocument.number)
      showToast('RFQ number copied', rfqDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={rfqDocument.number}
            subtitle="RFQ"
            onBack={() => navigate('/rfqs')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share clicked', 'Share feature not available for RFQ.')}
                onCustomize={() => showToast('Customise disabled', 'RFQs do not support standard template customization.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={rfqDocument.title}
            title={rfqDocument.number}
            subtitle={rfqSubtitle}
            status={rfqDocument.status}
            meta={<RfqHeroMeta threadTag={rfqThreadTag} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download clicked',
                'PDF export is intentionally static in Phase 6.',
                'success',
              )
            }
          />
        }
        overlays={
          <>
            <RfqMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => showToast('Marked as dispatched', '', 'success')}
              onMarkAsClosed={() => showToast('Marked as closed', '')}
              onConvertToQuotation={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => showToast('Link to Project clicked', '')}
              onAttachDocument={() => showToast('Attach Document clicked', '')}
              onCopyNumber={handleCopyNumber}
              onExportCsv={() => showToast('Export as CSV clicked', '')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Generate Quotation?"
              description="This will generate a new quotation draft supplying these requested items."
              cancelLabel="Cancel"
              confirmLabel="Generate Quotation"
              onConfirm={() => showToast('Quotation generated', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive RFQ?"
              description="SASRFQ-0021 will be moved to your archive. It won't appear in your active lists."
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('RFQ archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete RFQ?"
              description="SASRFQ-0021 will be permanently deleted. This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('RFQ deleted', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <RfqViewPage
          document={rfqDocument}
          metrics={rfqMetrics}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => showToast('Edit RFQ', 'Edit flow stays outside scope.')}
          onDuplicate={() => showToast('Duplicate', 'Duplicate action is visual only.')}
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
