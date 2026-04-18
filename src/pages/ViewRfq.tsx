import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/supabase'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import type { RfqMetric } from '@/components/document-view/rfq/rfqViewMockData'

import RfqHeroMeta from '@/components/document-view/rfq/RfqHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import RfqViewPage from '@/components/document-view/rfq/RfqViewPage'
import RfqMoreSheet from '@/components/document-view/rfq/RfqMoreSheet'
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
const MODAL_CONVERT = 'convert'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewRfq() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const [loading, setLoading] = useState(true)
  const [rfq, setRfq] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    const loadRfq = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [rfqRes, itemsRes] = await Promise.all([
          supabase.from('rfqs').select('*').eq('id', id).single(),
          supabase.from('rfq_items').select('*').eq('rfq_id', id).order('sort_order')
        ])

        if (rfqRes.error || !rfqRes.data) {
          navigate('/rfqs')
          return
        }

        setRfq(rfqRes.data)
        setItems(itemsRes.data || [])
      } catch (err) {
        console.error('Failed to load RFQ', err)
      } finally {
        setLoading(false)
      }
    }

    loadRfq()
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!rfq?.rfq_number) return
    try {
      await navigator.clipboard.writeText(rfq.rfq_number)
      showToast('RFQ number copied', rfq.rfq_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  if (loading) {
    return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/rfqs')} />}><CenteredSpinner /></DocumentPage>
  }

  if (!rfq) return null

  const docProps: BaseDocument = {
    id: rfq.id,
    number: rfq.rfq_number,
    title: rfq.title || 'Request for Quotation',
    status: (rfq.status || 'open') as any
  }

  const metrics: RfqMetric[] = [
    { label: 'Requested Items', value: `${items.length} lines` },
    { label: 'Submission Deadline', value: rfq.expiry_date || 'No deadline', tone: 'amber' }
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
            onBack={() => navigate('/rfqs')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share', 'Share flow remains outside Phase 1 scope.')}
                onCustomize={() => showToast('Customise disabled', 'RFQs do not support standard template customization.')}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={rfq.vendor_name || 'Multiple Eligible Vendors'}
            status={docProps.status}
            meta={<RfqHeroMeta threadTag={rfq.vendor_contact || 'Tender Invitation'} />}
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
            <RfqMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => showToast('Marked as dispatched', '', 'success')}
              onMarkAsClosed={() => showToast('Marked as closed', '')}
              onConvertToQuotation={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => showToast('Link to Project', '')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExportCsv={() => showToast('Export as CSV', '')}
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
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('RFQ archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete RFQ?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
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
          document={docProps}
          metrics={metrics}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/rfqs/edit/${id}`)}
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
