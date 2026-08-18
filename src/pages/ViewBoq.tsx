import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { BoqPdfDocument } from '@/components/boq/BoqPdfDocument'
import { BoqPreview } from '@/components/boq/BoqPreview'
import BoqHeroMeta from '@/components/document-view/boq/BoqHeroMeta'
import BoqMoreSheet from '@/components/document-view/boq/BoqMoreSheet'
import BoqViewPage from '@/components/document-view/boq/BoqViewPage'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { archiveBOQRecord, convertBOQToQuotation, deleteBOQRecord, duplicateBOQRecord, updateBOQStatus } from './viewBOQActions'
import { useSettings } from '@/hooks/useSettings'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import { getPdfDesignPreset, setPdfDesignPreset } from '@/lib/pdfDesignPreset'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'
const MODAL_GENERATE_QUOTE = 'generate-quote'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewBoq() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { tenantClient } = useEntity()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()

  const [loading, setLoading] = useState(true)
  const [boq, setBoq] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    const loadBoq = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [boqRes, itemsRes] = await Promise.all([
          tenantClient.from('boqs').select('*').eq('id', id).single(),
          tenantClient.from('boq_items').select('*').eq('boq_id', id).order('sort_order'),
        ])

        if (boqRes.error || !boqRes.data) {
          navigate('/boqs')
          return
        }

        setBoq({
          ...boqRes.data,
          table_rows: itemsRes.data || [],
        })
      } catch (err) {
        console.error('Failed to load BOQ', err)
      } finally {
        setLoading(false)
      }
    }

    void loadBoq()
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    const options = { description }

    if (tone === 'success') {
      feedback.success(title, options)
      return
    }

    feedback.info(title, options)
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

  const handleShare = async () => {
    try {
      await shareDocument({
        title: boq?.boq_number || 'BOQ',
        text: 'Bill of Quantities',
      })
      showToast('Share successful', 'BOQ link handled.', 'success')
    } catch (err) {
      showToast('Share failed', 'Could not share this BOQ.')
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

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id || updatingStatus) return
    setUpdatingStatus(true)
    try {
      await updateBOQStatus(id, status, tenantClient)
      setBoq((curr: any) => ({ ...curr, status }))
      showToast(successLabel, `BOQ marked as ${status}.`, 'success')
      ui.closeModal()
    } catch (error) {
      showToast('Update failed', error instanceof Error ? error.message : 'Could not update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDuplicate = async () => {
    if (!id || duplicating) return
    setDuplicating(true)
    try {
      const created = await duplicateBOQRecord(id, tenantClient)
      navigate(`/boqs/${created.id}`)
      showToast('BOQ Cloned', 'A new BOQ copy has been created.', 'success')
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate.')
    } finally {
      setDuplicating(false)
    }
  }

  const handleArchive = async () => {
    if (!id || archiving) return
    setArchiving(true)
    try {
      await archiveBOQRecord(id, tenantClient)
      navigate('/boqs')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive.')
    } finally {
      setArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || deleting) return
    setDeleting(true)
    try {
      await deleteBOQRecord(id, tenantClient)
      navigate('/boqs')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete.')
    } finally {
      setDeleting(false)
    }
  }

  const handleConvertToQuotation = async () => {
    if (!boq || converting) return
    setConverting(true)
    try {
      const created = await convertBOQToQuotation({ boq, items: boq.table_rows, prefixes: settings?.document_prefixes, tenantClient })
      navigate(`/quotations/${created.id}`)
      showToast('Quotation Created', 'Linked quotation is ready.', 'success')
    } catch (error) {
      showToast('Conversion failed', error instanceof Error ? error.message : 'Could not generate quotation.')
    } finally {
      ui.closeModal()
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Opening BOQ..." backLabel="BOQs" onBack={() => navigate('/boqs')} />}>
        <CenteredSpinner />
      </DocumentPage>
    )
  }

  if (!boq) return null

  const docProps: BaseDocument = {
    id: boq.id,
    number: boq.boq_number,
    title: 'Bill of Quantities',
    status: (boq.status || 'open') as any,
  }

  const rowCount = Array.isArray(boq.table_rows) ? boq.table_rows.length : 0
  const subtotal = (Array.isArray(boq.table_rows) ? boq.table_rows : []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)

  const metrics = [
    { label: 'Lines', value: `${rowCount} items` },
    { label: 'Subtotal', value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(subtotal), tone: 'blue' as const },
    { label: 'Status', value: boq.status || 'open', tone: boq.status === 'approved' ? 'green' as const : 'amber' as const },
  ]

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="BOQs"
            onBack={() => navigate('/boqs')}
            onShare={() => void handleShare()}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
            customizeIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={docProps.title}
            title={docProps.number}
            subtitle={boq.client_name || 'No client specified'}
            status={docProps.status}
            meta={<BoqHeroMeta threadTag={boq.project_title || 'Material Schedule'} />}
          />
        }
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize BOQ PDF"
              subtitle="The PDF design preset is reused by download to allow consistent branding across document types."
            >
              <div className="space-y-4">
                <div className="rounded-[24px] border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">PDF Design</div>
                  <DocumentTemplateDesignOverrides value={getPdfDesignPreset('boq')} onChange={(p) => setPdfDesignPreset('boq', p)} />
                </div>
                <button
                  type="button"
                  className="h-11 w-full rounded-[18px] bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={() => {
                    ui.closeSheet()
                    showToast('Customization saved', 'BOQ PDF design updated.', 'success')
                  }}
                >
                  Save Settings
                </button>
              </div>
            </DocumentSheet>

            <BoqMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsIssued={() => void handleUpdateStatus('approved', 'Marked as Approved')}
              onGenerateQuotation={() => ui.openModal(MODAL_GENERATE_QUOTE)}
              onCreateRevision={() => void handleDuplicate()}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExport={() => void handleDownload()}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_GENERATE_QUOTE)}
              title="Generate Quotation?"
              description="This will lock the current quantities and generate a new open quotation."
              cancelLabel="Cancel"
              confirmLabel={converting ? "Converting..." : "Generate Quote"}
              loading={converting}
              onConfirm={() => void handleConvertToQuotation()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive BOQ?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel={archiving ? "Archiving..." : "Archive"}
              loading={archiving}
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete BOQ?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel={deleting ? "Deleting..." : "Delete"}
              loading={deleting}
              destructive
              onConfirm={() => void handleDelete()}
              onCancel={ui.closeModal}
            />

            <ProjectLinkDialog
              open={projectLinkOpen}
              onOpenChange={setProjectLinkOpen}
              tableName="boqs"
              recordId={String(id || '')}
              documentLabel={docProps.number || 'BOQ'}
              onLinked={() => {}}
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
          onDuplicate={() => void handleDuplicate()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

    </>
  )
}
