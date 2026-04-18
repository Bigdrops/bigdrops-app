import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { BoqCustomizationPanel } from '@/components/boq/BoqCustomizationPanel'
import { BoqPdfDocument } from '@/components/boq/BoqPdfDocument'
import { BoqPreview } from '@/components/boq/BoqPreview'
import BoqHeroMeta from '@/components/document-view/boq/BoqHeroMeta'
import BoqMoreSheet from '@/components/document-view/boq/BoqMoreSheet'
import BoqViewPage from '@/components/document-view/boq/BoqViewPage'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { getBoqById, saveBoq } from '@/domain/boq/storage'
import type { BaseDocument } from '@/components/document-view/types/documentView'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'
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
  const [draftBoq, setDraftBoq] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [savingCustomization, setSavingCustomization] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const loaded = getBoqById(id)
    if (!loaded) {
      navigate('/boqs')
      return
    }
    setBoq(loaded)
    setDraftBoq(loaded)
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

  const handleDownload = async () => {
    if (!boq || downloading) return
    setDownloading(true)
    try {
      await downloadPdfFromElement({
        fileName: boq.boq_number || 'boq',
        subdirectory: 'boq',
        element: <BoqPdfDocument boq={boq} />,
      })
      showToast('Download ready', `${boq.boq_number || 'BOQ'} exported as PDF.`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the BOQ PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  const estimatedTotalLabel = useMemo(() => {
    if (!boq?.table_rows?.length) return 'None'
    const total = boq.table_rows.reduce((sum: number, row: any) => {
      if (row.row_type === 'section') return sum
      const quantity = Number(row.quantity || 0)
      const rate = Number(row.sp || row.cp || 0)
      return sum + (quantity * rate)
    }, 0)
    return total > 0 ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(total) : 'None'
  }, [boq])

  const handleSaveCustomization = async () => {
    if (!draftBoq) return
    setSavingCustomization(true)
    try {
      const saved = saveBoq(draftBoq)
      setBoq(saved)
      setDraftBoq(saved)
      ui.closeSheet()
      showToast('Customization saved', 'BOQ template settings updated.', 'success')
    } finally {
      setSavingCustomization(false)
    }
  }

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/boqs')} />}>
        <CenteredSpinner />
      </DocumentPage>
    )
  }

  if (!boq) return null

  const docProps: BaseDocument = {
    id: boq.id,
    number: boq.boq_number,
    title: boq.title || 'Bill of Quantities',
    status: 'open',
  }

  const metrics = [
    { label: 'Billed Items', value: `${boq.table_rows?.filter((row: any) => row.row_type !== 'section').length || 0} lines` },
    { label: 'Issue Date', value: boq.issue_date || 'N/A' },
    { label: 'Estimated Total', value: estimatedTotalLabel, tone: 'default' as const },
  ]

  const handleDuplicate = () => {
    showToast('Duplicate pending', 'This BOQ can be viewed and exported, but duplicate logic is not wired yet.')
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
                onShare={() => showToast('Share pending', 'Share flow is not wired on BOQ view yet.')}
                onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={boq.vendor_name || 'Vendor not specified'}
            status={docProps.status}
            meta={<BoqHeroMeta threadTag={boq.vendor_contact || 'No contact specified'} />}
          />
        }
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize BOQ"
              subtitle="These controls update the same template and column settings used by the BOQ editor and PDF export."
            >
              {draftBoq ? (
                <div className="space-y-4">
                  <BoqCustomizationPanel boq={draftBoq} onChange={(patch) => setDraftBoq((current: any) => ({ ...current, ...patch }))} />
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

            <BoqMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsIssued={() => showToast('Marked as issued', 'BOQ status updated', 'success')}
              onGenerateQuotation={() => ui.openModal(MODAL_GENERATE_QUOTE)}
              onCreateRevision={() => ui.openModal(MODAL_REVISION)}
              onLinkProject={() => showToast('Project link pending', 'Project-link wiring is not finished for BOQ view.')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExport={() => void handleDownload()}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_GENERATE_QUOTE)}
              title="Generate Quotation?"
              description="This will map all billed items into a new quotation draft."
              cancelLabel="Cancel"
              confirmLabel="Generate Quotation"
              onConfirm={() => showToast('Quotation generation pending', 'Quotation creation is not wired from BOQ view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_REVISION)}
              title="Create New Revision?"
              description="This will lock the current BOQ and create a new editable draft."
              cancelLabel="Cancel"
              confirmLabel="Create Revision"
              onConfirm={() => showToast('Revision pending', 'Revision creation is not wired from BOQ view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive BOQ?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Archive pending', 'Archive handling is not wired for BOQ view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete BOQ?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Delete pending', 'Delete handling is not wired for BOQ view yet.')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <BoqViewPage
          document={docProps}
          metrics={metrics}
          preview={<BoqPreview boq={boq} />}
          onGenerateQuotation={() => ui.openModal(MODAL_GENERATE_QUOTE)}
          onEdit={() => navigate(`/boqs/edit/${id}`)}
          onDuplicate={handleDuplicate}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}
