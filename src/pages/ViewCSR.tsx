import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { BaseDocument } from '@/components/document-view/types/documentView'
import CsrHeroMeta from '@/components/document-view/csr/CsrHeroMeta'
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
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { supabase } from '@/supabase'
import CSRPreviewPanel from '@/components/csr/CSRPreviewPanel'
import { buildCsrPreviewData, getCsrBranding } from '@/components/csr/csrUtils'
import { getCsrPdfDocument } from '@/components/csr/CSRPreviewTemplates'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import { getPdfDesignPreset, setPdfDesignPreset, type PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useSettings } from '@/hooks/useSettings'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'
const MODAL_COMPLETE = 'complete'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const CSR_TEMPLATE_KEY = 'csr_view_template'

function getStoredTemplate() {
  if (typeof window === 'undefined') return '3'
  return window.localStorage.getItem(CSR_TEMPLATE_KEY) || '3'
}

export default function ViewCSR() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()
  const { settings } = useSettings()

  const [loading, setLoading] = useState(true)
  const [csr, setCsr] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [designPreset, setDesignPreset] = useState<PdfDesignPreset>(() => getPdfDesignPreset('csr'))
  const [template, setTemplate] = useState(getStoredTemplate)

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

    void loadCsr()
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

  const previewData = csr ? buildCsrPreviewData(csr) : null
  const branding = getCsrBranding(settings || {})

  const handleDownload = async () => {
    if (!previewData || downloading) return
    setDownloading(true)
    try {
      await downloadPdfFromElement({
        fileName: previewData.csr_number || 'csr',
        subdirectory: 'csr',
        element: getCsrPdfDocument({ csr: previewData, branding, template, designPreset }) as any,
      })
      showToast('Download ready', `${previewData.csr_number || 'CSR'} exported as PDF.`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the CSR PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Loading..." backLabel="Service Reports" onBack={() => navigate('/csr')} />}>
        <CenteredSpinner />
      </DocumentPage>
    )
  }

  if (!csr || !previewData) return null

  const docProps: BaseDocument = {
    id: csr.id,
    number: csr.csr_number,
    title: 'Customer Service Report',
    status: (csr.status || 'draft') as any,
  }

  const metrics = [
    { label: 'Equipment', value: csr.equipment_type || 'N/A' },
    { label: 'Date', value: csr.date || 'N/A', tone: 'amber' as const },
    { label: 'Status', value: csr.status || 'draft', tone: csr.status === 'completed' ? 'green' as const : 'amber' as const },
  ]

  const handleDuplicate = () => {
    showToast('Duplicate pending', 'This CSR can be viewed and exported, but duplicate logic is not wired yet.')
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="Service Reports"
            onBack={() => navigate('/csr')}
            onShare={() => showToast('Share pending', 'Share flow is not wired on CSR view yet.')}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
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
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize CSR PDF"
              subtitle="Template choice is stored locally for the CSR view, and the PDF design preset is reused by download."
            >
              <div className="space-y-4">
                <div className="rounded-[24px] border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">Template</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '1', label: 'Pulse Frame' },
                      { id: '2', label: 'Signal Bands' },
                      { id: '3', label: 'Zinc' },
                      { id: '4', label: 'Crimson' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`rounded-[16px] border px-3 py-3 text-sm font-medium ${template === option.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-border bg-white text-foreground'}`}
                        onClick={() => setTemplate(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">PDF Design</div>
                  <DocumentTemplateDesignOverrides value={designPreset} onChange={setDesignPreset} />
                </div>
                <button
                  type="button"
                  className="h-11 w-full rounded-[18px] bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(CSR_TEMPLATE_KEY, template)
                    }
                    setPdfDesignPreset('csr', designPreset)
                    ui.closeSheet()
                    showToast('Customization saved', 'CSR preview and PDF settings updated.', 'success')
                  }}
                >
                  Save Settings
                </button>
              </div>
            </DocumentSheet>

            <CsrMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkInProgress={() => showToast('Marked In Progress', '', 'success')}
              onMarkAsCompleted={() => ui.openModal(MODAL_COMPLETE)}
              onReopenRecord={() => showToast('Record Reopened', '', 'info')}
              onLinkProject={() => showToast('Project link pending', 'Project-link wiring is not finished for CSR view.')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExport={() => void handleDownload()}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_COMPLETE)}
              title="Close Service Record?"
              description="This will mark the service record as completed."
              cancelLabel="Cancel"
              confirmLabel="Mark as Completed"
              onConfirm={() => showToast('Completion pending', 'CSR status update is not wired from CSR view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive CSR?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Archive pending', 'Archive handling is not wired for CSR view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete CSR?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Delete pending', 'Delete handling is not wired for CSR view yet.')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <CsrViewPage
          document={docProps}
          metrics={metrics}
          preview={<CSRPreviewPanel csr={previewData} template={template} onTemplateChange={setTemplate} branding={branding} designPreset={designPreset} />}
          onComplete={() => ui.openModal(MODAL_COMPLETE)}
          onEdit={() => navigate(`/csr/edit/${id}`)}
          onDuplicate={handleDuplicate}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}
