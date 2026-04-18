import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBoqById } from '@/domain/boq/storage'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import type { BoqMetric } from '@/components/document-view/boq/boqViewMockData'

import BoqHeroMeta from '@/components/document-view/boq/BoqHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import BoqViewPage from '@/components/document-view/boq/BoqViewPage'
import BoqMoreSheet from '@/components/document-view/boq/BoqMoreSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'

const SHEET_MORE = 'more-actions'
const MODAL_GENERATE_QUOTE = 'generate-quote'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const MODAL_REVISION = 'revision'

export default function ViewBoq() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const [loading, setLoading] = useState(true)
  const [boq, setBoq] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const loaded = getBoqById(id)
    if (!loaded) {
      navigate('/boqs')
      return
    }
    setBoq(loaded)
    setLoading(false)
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!boq?.boq_number) return
    try {
      await navigator.clipboard.writeText(boq.boq_number)
      showToast('BOQ number copied', boq.boq_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  if (loading) {
    return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/boqs')} />}><CenteredSpinner /></DocumentPage>
  }

  if (!boq) return null

  const docProps: BaseDocument = {
    id: boq.id,
    number: boq.boq_number,
    title: boq.title || 'Bill of Quantities',
    status: 'open'
  }

  const metrics: BoqMetric[] = [
    { label: 'Billed Items', value: `${boq.table_rows?.length || 0} lines` },
    { label: 'Issue Date', value: boq.issue_date || 'N/A' },
    { label: 'Estimated Total', value: 'None', tone: 'default' }
  ]

  const handleDuplicate = () => {
    showToast('Duplicate', 'Logic will be added in Phase 2.')
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            onBack={() => navigate('/boqs')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share', 'Share flow remains outside Phase 1 scope.')}
                onCustomize={() => showToast('Customise disabled', 'BOQs are tabular exports and do not support standard template themes.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={boq.vendor_name || 'Generic Vendor'}
            status={docProps.status}
            meta={<BoqHeroMeta threadTag={boq.vendor_contact || 'No contact specified'} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download',
                'PDF generation requires backend service.',
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
              onLinkProject={() => showToast('Link to Project', '')}
              onDuplicate={handleDuplicate}
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
              description="This will lock the current BOQ and create a new editable draft."
              cancelLabel="Cancel"
              confirmLabel="Create Revision"
              onConfirm={() => showToast('Revision created', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive BOQ?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('BOQ archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete BOQ?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
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
          document={docProps}
          metrics={metrics}
          onGenerateQuotation={() => ui.openModal(MODAL_GENERATE_QUOTE)}
          onEdit={() => navigate(`/boqs/edit/${id}`)}
          onDuplicate={handleDuplicate}
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
