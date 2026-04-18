import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/supabase'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import type { WaybillMetric } from '@/components/document-view/waybill/waybillViewMockData'
import { mapDbWaybill } from '@/components/waybill/waybillUtils'

import WaybillHeroMeta from '@/components/document-view/waybill/WaybillHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import WaybillViewPage from '@/components/document-view/waybill/WaybillViewPage'
import WaybillMoreSheet from '@/components/document-view/waybill/WaybillMoreSheet'
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
const MODAL_DELIVERED = 'delivered'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewWaybill() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const [loading, setLoading] = useState(true)
  const [waybill, setWaybill] = useState<any>(null)

  useEffect(() => {
    const loadWaybill = async () => {
      if (!id) return
      setLoading(true)
      try {
        const { data, error } = await supabase.from('waybills').select('*').eq('id', id).single()

        if (error || !data) {
          navigate('/waybills')
          return
        }

        setWaybill(mapDbWaybill(data))
      } catch (err) {
        console.error('Failed to load waybill', err)
      } finally {
        setLoading(false)
      }
    }

    loadWaybill()
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!waybill?.waybill_number) return
    try {
      await navigator.clipboard.writeText(waybill.waybill_number)
      showToast('Waybill number copied', waybill.waybill_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  if (loading) {
    return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/waybills')} />}><CenteredSpinner /></DocumentPage>
  }

  if (!waybill) return null

  const docProps: BaseDocument = {
    id: waybill.id,
    number: waybill.waybill_number,
    title: waybill.type === 'internal' ? 'Internal Waybill' : 'External Waybill',
    status: (waybill.status || 'draft') as any
  }

  const metrics: WaybillMetric[] = [
    { label: 'Dispatch From', value: waybill.sender_name || 'N/A' },
    { label: 'Vehicle', value: waybill.vehicle_plate || 'Self Pickup', tone: 'amber' },
    { label: 'Status', value: waybill.status || 'draft', tone: waybill.status === 'delivered' ? 'green' : 'amber' }
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
            onBack={() => navigate('/waybills')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share', 'Share flow remains outside Phase 1 scope.')}
                onCustomize={() => showToast('Customise disabled', 'Waybills do not use brand template customization.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={waybill.client_name || 'No client specified'}
            status={docProps.status}
            meta={<WaybillHeroMeta threadTag={waybill.receiver_name || 'Individual Receiver'} />}
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
            <WaybillMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsDispatched={() => showToast('Marked as dispatched', '', 'success')}
              onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
              onMarkAsReturned={() => showToast('Marked as returned', '', 'info')}
              onLinkProject={() => showToast('Link to Project', '')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExport={() => showToast('Exported to CSV', '', 'success')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELIVERED)}
              title="Confirm Delivery?"
              description="This will lock the Waybill route status as successfully delivered."
              cancelLabel="Cancel"
              confirmLabel="Confirm"
              onConfirm={() => showToast('Delivery confirmed', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Waybill?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Waybill archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Waybill?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
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
          document={docProps}
          metrics={metrics}
          onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
          onEdit={() => navigate(`/waybills/edit/${id}`)}
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
