import { useNavigate } from 'react-router-dom'

import WaybillHeroMeta from '@/components/document-view/waybill/WaybillHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import WaybillViewPage from '@/components/document-view/waybill/WaybillViewPage'
import WaybillMoreSheet from '@/components/document-view/waybill/WaybillMoreSheet'
import {
  waybillDocument,
  waybillMetrics,
  waybillSubtitle,
  waybillThreadTag,
} from '@/components/document-view/waybill/waybillViewMockData'
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
const MODAL_DELIVERED = 'delivered'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewWaybill() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(waybillDocument.number)
      showToast('Waybill number copied', waybillDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={waybillDocument.number}
            subtitle="Waybill"
            onBack={() => navigate('/waybills')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share clicked', 'Share feature not available for Waybills.')}
                onCustomize={() => showToast('Customise disabled', 'Waybills do not use brand template customization.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={waybillDocument.title}
            title={waybillDocument.number}
            subtitle={waybillSubtitle}
            status={waybillDocument.status}
            meta={<WaybillHeroMeta threadTag={waybillThreadTag} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download clicked',
                'PDF export is intentionally static in Phase 8.',
                'success',
              )
            }
          />
        }
        overlays={
          <>
            <WaybillMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsDispatched={() => showToast('Marked as dispatched', '', 'success')}
              onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
              onMarkAsReturned={() => showToast('Marked as returned', '', 'info')}
              onLinkProject={() => showToast('Link to Project clicked', '')}
              onAttachDocument={() => showToast('Photo/Scan attached', 'Proof of delivery uploaded', 'success')}
              onCopyNumber={handleCopyNumber}
              onExport={() => showToast('Exported to CSV', '', 'success')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELIVERED)}
              title="Confirm Delivery?"
              description="This will lock the Waybill route status as successfully delivered to the consignee."
              cancelLabel="Cancel"
              confirmLabel="Confirm"
              onConfirm={() => showToast('Delivery confirmed', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Waybill?"
              description="SASWB-1002 will be moved to your archive. It won't appear in your active lists."
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Waybill archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Waybill?"
              description="SASWB-1002 will be permanently deleted. This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Waybill deleted', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <WaybillViewPage
          document={waybillDocument}
          metrics={waybillMetrics}
          onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
          onEdit={() => showToast('Edit Waybill', 'Edit flow stays outside scope.')}
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
