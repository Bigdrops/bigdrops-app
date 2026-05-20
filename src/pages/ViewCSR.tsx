import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { BaseDocument } from '@/components/document-view/types/documentView'
import CsrHeroMeta from '@/components/document-view/csr/CsrHeroMeta'
import CsrViewPage from '@/components/document-view/csr/CsrViewPage'
import CsrMoreSheet from '@/components/document-view/csr/CsrMoreSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { supabase } from '@/supabase'
import CsrDocumentPreview from '@/components/document-view/csr/CsrDocumentPreview'
import { buildCsrPreviewData, getCsrBranding, getCsrPdfDocument } from '@/components/csr/csrUtils'
import { feedback } from '@/lib/feedback'
import { getPdfDesignPreset, setPdfDesignPreset, type PdfDesignPreset, type PdfFillableFontChoice } from '@/lib/pdfDesignPreset'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useSettings } from '@/hooks/useSettings'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import CsrTemplateCarousel from '@/components/csr/CsrTemplateCarousel'
import { Input } from '@/components/ui/input'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { archiveCSRRecord, deleteCSRRecord, duplicateCSRRecord, updateCSRStatus } from './viewCSRActions'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'
const MODAL_COMPLETE = 'complete'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'
const CSR_TEMPLATE_KEY = 'csr_view_template'
const CSR_CUSTOM_FONT_KEY = 'csr_custom_font'
const CSR_CUSTOM_COLOR_KEY = 'csr_custom_color'

const CSR_COLOR_SWATCHES = ['#000000', '#374151', '#1e3a5f', '#064e3b', '#7f1d1d']

const CSR_HANDWRITING_FONTS: { value: PdfFillableFontChoice; label: string }[] = [
  { value: 'Reenie Beanie', label: 'Reenie Beanie' },
  { value: 'Caveat', label: 'Caveat' },
  { value: 'Kalam', label: 'Kalam' },
  { value: 'Patrick Hand', label: 'Patrick Hand' },
]

const CSR_TEMPLATE_DEFAULTS: Record<string, { font: PdfFillableFontChoice; color: string }> = {
  '1': { font: 'Inter', color: '#111827' },
  '2': { font: 'Inter', color: '#0f172a' },
  '3': { font: 'Inter', color: '#3b82f6' },
  '4': { font: 'Inter', color: '#1e293b' },
}

function getStoredTemplate() {
  if (typeof window === 'undefined') return '3'
  return window.localStorage.getItem(CSR_TEMPLATE_KEY) || '3'
}

function getStoredCustomFont(): 'auto' | PdfFillableFontChoice {
  if (typeof window === 'undefined') return 'auto'
  return (window.localStorage.getItem(CSR_CUSTOM_FONT_KEY) as any) || 'auto'
}

function getStoredCustomColor(): 'auto' | string {
  if (typeof window === 'undefined') return 'auto'
  return window.localStorage.getItem(CSR_CUSTOM_COLOR_KEY) || 'auto'
}

export default function ViewCSR() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const { settings } = useSettings()

  const [loading, setLoading] = useState(true)
  const [csr, setCsr] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [designPreset, setDesignPreset] = useState<PdfDesignPreset>(() => getPdfDesignPreset('csr'))
  const [template, setTemplate] = useState(getStoredTemplate)
  const [customFont, setCustomFont] = useState<'auto' | PdfFillableFontChoice>(getStoredCustomFont)
  const [customColor, setCustomColor] = useState<'auto' | string>(getStoredCustomColor)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)

  // Compute effective preset based on auto/custom toggles
  const getEffectivePreset = (tmpl: string, font: 'auto' | PdfFillableFontChoice, color: 'auto' | string) => {
    const defaults = CSR_TEMPLATE_DEFAULTS[tmpl] || CSR_TEMPLATE_DEFAULTS['3']
    return {
      ...designPreset,
      fillableFont: font === 'auto' ? defaults.font : font,
      fillableColor: color === 'auto' ? defaults.color : color,
      fillableFontMode: 'custom' as const,
    }
  }

  // Keep designPreset in sync with toggle state
  useEffect(() => {
    setDesignPreset((prev) => getEffectivePreset(template, customFont, customColor))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, customFont, customColor])

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
    const options = { description }

    if (tone === 'success') {
      feedback.success(title, options)
      return
    }

    feedback.info(title, options)
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

  const handleShare = async () => {
    try {
      await shareDocument({
        title: csr?.csr_number || 'Service Report',
        text: 'Customer Service Report',
      })
      showToast('Share successful', 'Record link handled.', 'success')
    } catch (err) {
      showToast('Share failed', 'Could not share this record.')
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

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id) return
    try {
      await updateCSRStatus(id, status)
      setCsr((curr: any) => ({ ...curr, status }))
      showToast(successLabel, `Record marked as ${status}.`, 'success')
      ui.closeModal()
    } catch (error) {
      showToast('Update failed', error instanceof Error ? error.message : 'Could not update status.')
    }
  }

  const handleDuplicate = async () => {
    if (!id) return
    try {
      const created = await duplicateCSRRecord(id)
      navigate(`/csr/${created.id}`)
      showToast('Record Cloned', 'A new service report has been created.', 'success')
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate.')
    }
  }

  const handleArchive = async () => {
    if (!id) return
    try {
      await archiveCSRRecord(id)
      navigate('/csr')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive.')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteCSRRecord(id)
      navigate('/csr')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete.')
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
    status: (csr.status || 'in_progress') as any,
  }

  const metrics = [
    { label: 'Equipment', value: csr.equipment_type || 'N/A' },
    { label: 'Date', value: csr.date || 'N/A', tone: 'amber' as const },
    { label: 'Status', value: csr.status || 'in_progress', tone: csr.status === 'completed' ? 'green' as const : 'amber' as const },
  ]

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="Service Reports"
            onBack={() => navigate('/csr')}
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
              subtitle="Choose a template and customize fillable text appearance."
            >
              <div className="space-y-5">
                <div>
                  <div className="mb-3 text-sm font-semibold text-foreground">Template</div>
                  <CsrTemplateCarousel value={template} onChange={(next) => setTemplate(next)} />
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <PenLine className="h-4 w-4 text-muted-foreground" />
                    Customize text appearance
                  </div>

                  <div className="mb-3 text-xs font-medium text-muted-foreground">Ink Color</div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setCustomColor('auto')}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-bold border transition',
                        customColor === 'auto'
                          ? 'bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] border-[hsl(var(--bd-button-primary-bg))]'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
                      )}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = CSR_TEMPLATE_DEFAULTS[template] || CSR_TEMPLATE_DEFAULTS['3']
                        setCustomColor(defaults.color)
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-bold border transition',
                        customColor !== 'auto'
                          ? 'bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] border-[hsl(var(--bd-button-primary-bg))]'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
                      )}
                    >
                      Custom
                    </button>
                  </div>
                  {customColor !== 'auto' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {CSR_COLOR_SWATCHES.map((swatch) => {
                          const active = customColor.toLowerCase() === swatch.toLowerCase()
                          return (
                            <button
                              key={swatch}
                              type="button"
                              onClick={() => setCustomColor(swatch)}
                              className={cn(
                                'h-8 w-8 rounded-lg border-2 shadow-sm transition',
                                active ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-transparent hover:border-muted-foreground/40',
                              )}
                              style={{ backgroundColor: swatch }}
                              aria-label={`Color ${swatch}`}
                            />
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => {}}
                          className={cn(
                            'h-8 w-8 rounded-lg border-2 shadow-sm transition',
                            !CSR_COLOR_SWATCHES.includes(customColor) ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-transparent',
                          )}
                          style={{ backgroundColor: customColor }}
                          aria-label="Current color"
                        />
                      </div>
                      <Input
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="h-9 rounded-[10px] font-mono text-xs"
                        placeholder="#0f172a"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-3 text-xs font-medium text-muted-foreground">Handwriting Font</div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setCustomFont('auto')}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-bold border transition',
                        customFont === 'auto'
                          ? 'bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] border-[hsl(var(--bd-button-primary-bg))]'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
                      )}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (customFont === 'auto') setCustomFont('Caveat')
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-bold border transition',
                        customFont !== 'auto'
                          ? 'bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] border-[hsl(var(--bd-button-primary-bg))]'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
                      )}
                    >
                      Custom
                    </button>
                  </div>
                  {customFont !== 'auto' ? (
                    <div className="flex flex-wrap gap-2">
                      {CSR_HANDWRITING_FONTS.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => setCustomFont(font.value)}
                          className={cn(
                            'rounded-full px-4 py-2 text-sm border transition',
                            customFont === font.value
                              ? 'bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] border-[hsl(var(--bd-button-primary-bg))]'
                              : 'bg-transparent text-foreground border-border hover:border-foreground/30',
                          )}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="h-11 w-full rounded-[18px] bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(CSR_TEMPLATE_KEY, template)
                      window.localStorage.setItem(CSR_CUSTOM_FONT_KEY, customFont)
                      window.localStorage.setItem(CSR_CUSTOM_COLOR_KEY, customColor)
                    }
                    setPdfDesignPreset('csr', designPreset)
                    ui.closeSheet()
                    showToast('Customization saved', 'CSR template and fillable settings updated.', 'success')
                  }}
                >
                  Save Settings
                </button>
              </div>
            </DocumentSheet>

            <CsrMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkInProgress={() => void handleUpdateStatus('in_progress', 'Marked In Progress')}
              onMarkAsCompleted={() => ui.openModal(MODAL_COMPLETE)}
              onReopenRecord={() => void handleUpdateStatus('in_progress', 'Record Reopened')}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
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
              onConfirm={() => void handleUpdateStatus('completed', 'Record Completed')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive CSR?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete CSR?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => void handleDelete()}
              onCancel={ui.closeModal}
            />

            <ProjectLinkDialog
              open={projectLinkOpen}
              onOpenChange={setProjectLinkOpen}
              tableName="csrs"
              recordId={String(id || '')}
              documentLabel={docProps.number || 'Service Report'}
              onLinked={() => {}}
            />
          </>
        }
      >
        <CsrViewPage
          document={docProps}
          metrics={metrics}
          documentPreview={<CsrDocumentPreview csr={csr} previewModel={previewData} settingsData={settings} />}
          onComplete={() => ui.openModal(MODAL_COMPLETE)}
          onEdit={() => navigate(`/csr/edit/${id}`)}
          onDownload={() => void handleDownload()}
          downloading={downloading}
          onDuplicate={() => void handleDuplicate()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

    </>
  )
}
