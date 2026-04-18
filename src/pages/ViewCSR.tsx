import { useNavigate } from 'react-router-dom'

import CsrHeroMeta from '@/components/document-view/csr/CsrHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import CsrViewPage from '@/components/document-view/csr/CsrViewPage'
import CsrMoreSheet from '@/components/document-view/csr/CsrMoreSheet'
import {
  csrDocument,
  csrMetrics,
  csrSubtitle,
  csrThreadTag,
} from '@/components/document-view/csr/csrViewMockData'
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
const MODAL_COMPLETE = 'complete'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewCSR() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(csrDocument.number)
      showToast('CSR number copied', csrDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={csrDocument.number}
            subtitle="CSR"
            onBack={() => navigate('/csrs')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share clicked', 'Share menu opened.')}
                onCustomize={() => showToast('Customise disabled', 'Service records do not use custom templates.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={csrDocument.title}
            title={csrDocument.number}
            subtitle={csrSubtitle}
            status={csrDocument.status}
            meta={<CsrHeroMeta threadTag={csrThreadTag} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download clicked',
                'PDF export is intentionally static in Phase 9.',
                'success',
              )
            }
          />
        }
        overlays={
          <>
            <CsrMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkInProgress={() => showToast('Marked In Progress', '', 'success')}
              onMarkAsCompleted={() => ui.openModal(MODAL_COMPLETE)}
              onReopenRecord={() => showToast('Record Reopened', '', 'info')}
              onLinkProject={() => showToast('Link to Project clicked', '')}
              onAttachDocument={() => showToast('Photos attached', 'Service images uploaded successfully', 'success')}
              onCopyNumber={handleCopyNumber}
              onExport={() => showToast('Exported record', 'Downloading PDF...', 'success')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_COMPLETE)}
              title="Close Service Record?"
              description="This will mark the service record as completed. Ensure all notes and materials are fully logged."
              cancelLabel="Cancel"
              confirmLabel="Mark as Completed"
              onConfirm={() => showToast('Record Completed', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive CSR?"
              description="SASCSR-9014 will be moved to your archive. It won't appear in your active lists."
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('CSR archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete CSR?"
              description="SASCSR-9014 will be permanently deleted. This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('CSR deleted', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <CsrViewPage
          document={csrDocument}
          metrics={csrMetrics}
          onComplete={() => ui.openModal(MODAL_COMPLETE)}
          onEdit={() => showToast('Edit Record', 'Edit flow safely navigated.')}
          onDuplicate={() => showToast('Duplicate', 'Duplicate action fired.')}
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
