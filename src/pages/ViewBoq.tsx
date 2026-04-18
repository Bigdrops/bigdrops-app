import { useNavigate } from 'react-router-dom'

import BoqHeroMeta from '@/components/document-view/boq/BoqHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import BoqViewPage from '@/components/document-view/boq/BoqViewPage'
import BoqMoreSheet from '@/components/document-view/boq/BoqMoreSheet'
import {
  boqDocument,
  boqMetrics,
  boqSubtitle,
  boqThreadTag,
} from '@/components/document-view/boq/boqViewMockData'
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
const MODAL_GENERATE_QUOTE = 'generate-quote'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const MODAL_REVISION = 'revision'

export default function ViewBoq() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(boqDocument.number)
      showToast('BOQ number copied', boqDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={boqDocument.number}
            subtitle="BOQ"
            onBack={() => navigate('/boqs')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share clicked', 'Share feature not available for BOQ.')}
                onCustomize={() => showToast('Customise disabled', 'BOQs are tabular exports and do not support standard template themes.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={boqDocument.title}
            title={boqDocument.number}
            subtitle={boqSubtitle}
            status={boqDocument.status}
            meta={<BoqHeroMeta threadTag={boqThreadTag} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download clicked',
                'PDF export is intentionally static in Phase 7.',
                'success',
              )
            }
          />
        }
        overlays={
          <>
            <BoqMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsIssued={() => showToast('Marked as issued', 'BOQ status updated', 'success')}
              onGenerateQuotation={() => ui.openModal(MODAL_GENERATE_QUOTE)}
              onCreateRevision={() => ui.openModal(MODAL_REVISION)}
              onLinkProject={() => showToast('Link to Project clicked', '')}
              onAttachDocument={() => showToast('Attach Document clicked', '')}
              onCopyNumber={handleCopyNumber}
              onExport={() => showToast('Export as Spreadsheet', 'File downloading...', 'success')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_GENERATE_QUOTE)}
              title="Generate Quotation?"
              description="This will map all billed items into a new quotation draft."
              cancelLabel="Cancel"
              confirmLabel="Generate Quotation"
              onConfirm={() => showToast('Quotation generated', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_REVISION)}
              title="Create New Revision?"
              description="This will lock the current BOQ and create a new editable draft as Revision 3."
              cancelLabel="Cancel"
              confirmLabel="Create Revision"
              onConfirm={() => showToast('Revision 3 created', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive BOQ?"
              description="SASBOQ-A101 will be moved to your archive. It won't appear in your active lists."
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('BOQ archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete BOQ?"
              description="SASBOQ-A101 will be permanently deleted. This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('BOQ deleted', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <BoqViewPage
          document={boqDocument}
          metrics={boqMetrics}
          onGenerateQuotation={() => ui.openModal(MODAL_GENERATE_QUOTE)}
          onEdit={() => showToast('Edit BOQ', 'Edit flow stays outside scope.')}
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
