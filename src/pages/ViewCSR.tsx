import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/supabase'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import type { CsrMetric } from '@/components/document-view/csr/csrViewMockData'

import CsrHeroMeta from '@/components/document-view/csr/CsrHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import CsrViewPage from '@/components/document-view/csr/CsrViewPage'
import CsrMoreSheet from '@/components/document-view/csr/CsrMoreSheet'
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
const MODAL_COMPLETE = 'complete'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewCSR() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const [loading, setLoading] = useState(true)
  const [csr, setCsr] = useState<any>(null)

  useEffect(() => {
    const loadCsr = async () => {
      if (!id) return
      setLoading(true)
      try {
        const { data, error } = await supabase.from('csrs').select('*').eq('id', id).single()

        if (error || !data) {
          navigate('/csr')
          return
        }

        setCsr(data)
      } catch (err) {
        console.error('Failed to load CSR', err)
      } finally {
        setLoading(false)
      }
    }

    loadCsr()
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!csr?.csr_number) return
    try {
      await navigator.clipboard.writeText(csr.csr_number)
      showToast('CSR number copied', csr.csr_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  if (loading) {
    return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/csr')} />}><CenteredSpinner /></DocumentPage>
  }

  if (!csr) return null

  const docProps: BaseDocument = {
    id: csr.id,
    number: csr.csr_number,
    title: 'Customer Service Report',
    status: (csr.status || 'draft') as any
  }

  const metrics: CsrMetric[] = [
    { label: 'Equipment', value: csr.equipment_type || 'N/A' },
    { label: 'Date', value: csr.date || 'N/A', tone: 'amber' },
    { label: 'Status', value: csr.status || 'draft', tone: csr.status === 'completed' ? 'green' : 'amber' }
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
            onBack={() => navigate('/csr')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share', 'Share flow remains outside Phase 1 scope.')}
                onCustomize={() => showToast('Customise disabled', 'Service records do not use custom templates.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={csr.client_name || 'No client specified'}
            status={docProps.status}
            meta={<CsrHeroMeta threadTag={csr.make || 'General Service'} />}
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
            <CsrMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkInProgress={() => showToast('Marked In Progress', '', 'success')}
              onMarkAsCompleted={() => ui.openModal(MODAL_COMPLETE)}
              onReopenRecord={() => showToast('Record Reopened', '', 'info')}
              onLinkProject={() => showToast('Link to Project', '')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExport={() => showToast('Exported record', 'Downloading PDF...', 'success')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_COMPLETE)}
              title="Close Service Record?"
              description="This will mark the service record as completed."
              cancelLabel="Cancel"
              confirmLabel="Mark as Completed"
              onConfirm={() => showToast('Record Completed', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive CSR?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('CSR archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete CSR?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
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
          document={docProps}
          metrics={metrics}
          onComplete={() => ui.openModal(MODAL_COMPLETE)}
          onEdit={() => navigate(`/csr/edit/${id}`)}
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
