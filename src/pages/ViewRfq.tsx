import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import RfqHeroMeta from '@/components/document-view/rfq/RfqHeroMeta'
import RfqMoreSheet from '@/components/document-view/rfq/RfqMoreSheet'
import RfqViewPage from '@/components/document-view/rfq/RfqViewPage'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { RfqCustomizationPanel } from '@/components/rfq/RfqCustomizationPanel'
import { RfqPdfDocument } from '@/components/rfq/RfqPdfDocument'
import { RfqPreview } from '@/components/rfq/RfqPreview'
import { denormalizeToDbRfq, normalizeDbRfq } from '@/domain/rfq/normalize'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import { supabase } from '@/supabase'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import { archiveRFQRecord, convertRFQToQuotation, deleteRFQRecord, duplicateRFQRecord, updateRFQStatus } from './viewRFQActions'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'
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
  const [draftRfq, setDraftRfq] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [savingCustomization, setSavingCustomization] = useState(false)

  useEffect(() => {
    const loadRfq = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [rfqRes, itemsRes] = await Promise.all([
          supabase.from('rfqs').select('*').eq('id', id).single(),
          supabase.from('rfq_items').select('*').eq('rfq_id', id).order('sort_order'),
        ])

        if (rfqRes.error || !rfqRes.data) {
          navigate('/rfqs')
          return
        }

        const normalized = normalizeDbRfq(rfqRes.data, itemsRes.data || [])
        setRfq(normalized)
        setDraftRfq(normalized)
      } catch (err) {
        console.error('Failed to load RFQ', err)
      } finally {
        setLoading(false)
      }
    }

    void loadRfq()
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

  const handleDownload = async () => {
    if (!rfq || downloading) return
    setDownloading(true)
    try {
      await downloadPdfFromElement({
        fileName: rfq.rfq_number || 'rfq',
        subdirectory: 'rfq',
        element: <RfqPdfDocument rfq={rfq} rows={rfq.table_rows} columns={rfq.table_columns} />,
      })
      showToast('Download ready', `${rfq.rfq_number || 'RFQ'} exported as PDF.`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the RFQ PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id) return
    try {
      await updateRFQStatus(id, status)
      setRfq((curr: any) => ({ ...curr, status }))
      showToast(successLabel, `RFQ marked as ${status}.`, 'success')
      ui.closeModal()
    } catch (error) {
      showToast('Update failed', error instanceof Error ? error.message : 'Could not update status.')
    }
  }

  const handleDuplicate = async () => {
    if (!id) return
    try {
      const created = await duplicateRFQRecord(id)
      navigate(`/rfq/${created.id}`)
      showToast('RFQ Cloned', 'A new draft RFQ has been created.', 'success')
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate.')
    }
  }

  const handleArchive = async () => {
    if (!id) return
    try {
      await archiveRFQRecord(id)
      navigate('/rfq')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive.')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteRFQRecord(id)
      navigate('/rfq')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete.')
    }
  }

  const handleConvertToQuotation = async () => {
    if (!rfq) return
    try {
      const created = await convertRFQToQuotation({ rfq, items: rfq.table_rows })
      navigate(`/quotations/${created.id}`)
      showToast('Quotation Created', 'Linked quotation draft is ready.', 'success')
    } catch (error) {
      showToast('Conversion failed', error instanceof Error ? error.message : 'Could not generate quotation.')
    } finally {
      ui.closeModal()
    }
  }

  const handleSaveCustomization = async () => {
    if (!draftRfq || !id) return
    setSavingCustomization(true)
    try {
      const payload = denormalizeToDbRfq(draftRfq)
      const { error } = await supabase.from('rfqs').update(payload).eq('id', id)
      if (error) throw error
      setRfq(draftRfq)
      ui.closeSheet()
      showToast('Customization saved', 'RFQ template settings updated.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save RFQ customization.'
      showToast('Save failed', message)
    } finally {
      setSavingCustomization(false)
    }
  }

  const handleReshuffle = () => {
    setDraftRfq((current: any) => {
      if (!current?.table_rows?.length) return current
      const itemRows = current.table_rows.filter((row: any) => row.row_type !== 'section')
      const sectionRows = current.table_rows.filter((row: any) => row.row_type === 'section')
      const shuffled = [...itemRows].sort(() => Math.random() - 0.5)
      return {
        ...current,
        table_rows: [...sectionRows, ...shuffled].map((row: any, index: number) => ({
          ...row,
          sort_order: index,
        })),
      }
    })
  }

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Loading..." backLabel="RFQs" onBack={() => navigate('/rfqs')} />}>
        <CenteredSpinner />
      </DocumentPage>
    )
  }

  if (!rfq) return null

  const docProps: BaseDocument = {
    id: rfq.id,
    number: rfq.rfq_number,
    title: rfq.title || 'Request for Quotation',
    status: (rfq.status || 'open') as any,
  }

  const metrics = [
    { label: 'Requested Items', value: `${rfq.table_rows?.filter((row: any) => row.row_type !== 'section').length || 0} lines` },
    { label: 'Submission Deadline', value: rfq.expiry_date || 'No deadline', tone: 'amber' as const },
  ]

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="RFQs"
            onBack={() => navigate('/rfq')}
            onShare={() => void shareDocument({ title: docProps.number, text: docProps.title })}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={rfq.vendor_name || 'Vendor not specified'}
            status={docProps.status}
            meta={<RfqHeroMeta threadTag={rfq.vendor_contact || 'Tender Invitation'} />}
          />
        }
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize RFQ"
              subtitle="These controls update the same RFQ template, identity, and column settings used in the editor and export."
            >
              {draftRfq ? (
                <div className="space-y-4">
                  <RfqCustomizationPanel rfq={draftRfq} onUpdateRfq={(updates) => setDraftRfq((current: any) => ({ ...current, ...updates }))} onReshuffle={handleReshuffle} />
                  <button
                    type="button"
                    className="h-11 w-full rounded-[18px] bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    onClick={() => void handleSaveCustomization()}
                    disabled={savingCustomization}
                  >
                    {savingCustomization ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              ) : null}
            </DocumentSheet>

            <RfqMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => void handleUpdateStatus('sent', 'Marked as Sent')}
              onMarkAsClosed={() => void handleUpdateStatus('closed', 'Marked as Closed')}
              onConvertToQuotation={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => showToast('Project link pending', 'Project-link wiring is not finished for RFQ view.')}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExport={() => void handleDownload()}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Generate Quotation?"
              description="This will generate a new quotation draft supplying these requested items."
              cancelLabel="Cancel"
              confirmLabel="Generate Quotation"
              onConfirm={() => void handleConvertToQuotation()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive RFQ?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete RFQ?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => void handleDelete()}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <RfqViewPage
          document={docProps}
          metrics={metrics}
          preview={<RfqPreview rfq={rfq} rows={rfq.table_rows} columns={rfq.table_columns} />}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/rfqs/edit/${id}`)}
          onDuplicate={handleDuplicate}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}
