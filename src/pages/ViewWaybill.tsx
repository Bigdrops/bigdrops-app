import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { BaseDocument } from '@/components/document-view/types/documentView'
import WaybillHeroMeta from '@/components/document-view/waybill/WaybillHeroMeta'
import WaybillViewPage from '@/components/document-view/waybill/WaybillViewPage'
import WaybillMoreSheet from '@/components/document-view/waybill/WaybillMoreSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import WaybillDocumentPreview from '@/components/document-view/waybill/WaybillDocumentPreview'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { supabase } from '@/supabase'
import { buildWaybillCustomFields, mapDbWaybill, parseWaybillCustomFields } from '@/components/waybill/waybillUtils'
import { buildWaybillRenderModel } from '@/domain/waybill/engine/assembly'
import type { ResolvedColumn, CompanySettings } from '@/domain/waybill/engine/types'
import { cn } from '@/lib/utils'
import { PenLine, Type } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { feedback } from '@/lib/feedback'
import { getPdfDesignPreset, setPdfDesignPreset, type PdfDesignPreset, type PdfFillableFontChoice } from '@/lib/pdfDesignPreset'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useSettings } from '@/hooks/useSettings'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'

import WaybillPDF from '@/components/waybill/WaybillPDF'
import { archiveWaybillRecord, deleteWaybillRecord, duplicateWaybillRecord, updateWaybillStatus } from './viewWaybillActions'
import { STANDARD_ITEM_COLUMNS } from '@/domain/waybill/contracts/waybillContract'
import WaybillTemplateSelector from '@/components/waybill/WaybillTemplateSelector'
import { WaybillActivityCard } from '@/components/document-view/waybill/sections/ActivityCard'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'

const WAYBILL_TEMPLATE_KEY = 'waybill_view_template'

const WAYBILL_COLOR_SWATCHES = ['#000000', '#374151', '#1e3a5f', '#064e3b', '#7f1d1d']

const WAYBILL_HANDWRITING_FONTS: { value: PdfFillableFontChoice; label: string }[] = [
  { value: 'Reenie Beanie', label: 'Reenie Beanie' },
  { value: 'Caveat', label: 'Caveat' },
  { value: 'Kalam', label: 'Kalam' },
  { value: 'Patrick Hand', label: 'Patrick Hand' },
  { value: 'Handlee', label: 'Handlee' },
  { value: 'Sue Ellen Francisco', label: 'Sue Ellen Francisco' },
]

const MODAL_DELIVERED = 'delivered'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewWaybill() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const { settings } = useSettings()

  const [loading, setLoading] = useState(true)
  const [waybill, setWaybill] = useState<any>(null)
  const [rawWaybill, setRawWaybill] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [designPreset, setDesignPreset] = useState<PdfDesignPreset>(() => getPdfDesignPreset('waybill'))
  const [template, setTemplate] = useState<'evergreen' | 'minimal' | 'thermal' | 'classic' | 'premium' | 'slate'>(() => {
    if (typeof window === 'undefined') return 'classic'
    return (window.localStorage.getItem(WAYBILL_TEMPLATE_KEY) as any) || 'classic'
  })
  const [customFont, setCustomFont] = useState<'auto' | PdfFillableFontChoice>(() => {
    if (typeof window === 'undefined') return 'auto'
    return (window.localStorage.getItem('waybill_custom_font') as any) || 'auto'
  })
  const [customColor, setCustomColor] = useState<'auto' | string>(() => {
    if (typeof window === 'undefined') return 'auto'
    return window.localStorage.getItem('waybill_custom_color') || 'auto'
  })

  // Sync designPreset when font/color toggles change
  useEffect(() => {
    setDesignPreset((prev) => ({
      ...prev,
      fillableFont: customFont === 'auto' ? prev.fillableFont : customFont,
      fillableColor: customColor === 'auto' ? prev.fillableColor : customColor,
      fillableFontMode: 'custom' as const,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFont, customColor])

  // Persist template to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WAYBILL_TEMPLATE_KEY, template)
    }
  }, [template])

  const [saving, setSaving] = useState(false)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)

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

        setRawWaybill(data)
        setWaybill(mapDbWaybill(data))

        if (data.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('address')
            .eq('id', data.client_id)
            .single()
          if (clientData?.address) {
            setRawWaybill((curr: any) => ({ ...curr, client_address: clientData.address }))
          }
        }

        const loadedCustomFields = parseWaybillCustomFields(data.custom_fields)
        if (loadedCustomFields.pdfTemplateId) {
          setTemplate(loadedCustomFields.pdfTemplateId)
        }
      } catch (err) {
        console.error('Failed to load waybill', err)
      } finally {
        setLoading(false)
      }
    }

    void loadWaybill()
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
    if (!waybill?.waybill_number) return
    try {
      await navigator.clipboard.writeText(waybill.waybill_number)
      showToast('Waybill number copied', waybill.waybill_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  const handleShare = async () => {
    try {
      await shareDocument({
        title: waybill?.waybill_number || 'Waybill',
        text: waybill?.type === 'internal' ? 'Internal Waybill' : 'Waybill',
      })
      showToast('Share successful', 'Waybill link handled.', 'success')
    } catch (err) {
      showToast('Share failed', 'Could not share this waybill.')
    }
  }

  const handleDownload = async () => {
    if (!waybill || downloading) return
    setDownloading(true)
    try {
      const columnVisibility = customFields.columnVisibility || Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.defaultVisible]))
      const columnTitles = Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.label]))
      const standardColumns = STANDARD_ITEM_COLUMNS
        .filter(col => col.key !== 'quantity' && col.key !== 'unit')
        .filter(col => columnVisibility[col.key] !== false)
        .map(col => ({ key: col.key, label: columnTitles[col.key] || col.label }))
      const qtyLabelVisible = columnVisibility.quantity !== false && columnVisibility.unit !== false
      const qtyLabelCol = qtyLabelVisible ? [{ key: 'qtyLabel', label: 'Qty/Unit' }] : []
      const customColumns = (customFields.customColumns || [])
        .filter(col => !STANDARD_ITEM_COLUMNS.some(sc => sc.key === col.key))
        .filter(col => columnVisibility[col.key] !== false)
        .map(col => ({ key: col.key, label: col.label }))
      const columns = [...standardColumns, ...qtyLabelCol, ...customColumns]
      const companySettings: CompanySettings = {
        name: settings?.company_name || '',
        tagline: settings?.company_tagline || null,
        logo: settings?.company_logo_url || null,
        address: settings?.company_address || null,
        phone: settings?.company_phone || null,
        email: settings?.company_email || null,
      }
      const model = rawWaybill ? buildWaybillRenderModel({
        waybill: rawWaybill,
        columns,
        company: companySettings,
      }) : null
        await downloadPdfFromElement({
          fileName: waybill.waybill_number || 'waybill',
          subdirectory: 'waybill',
          element: <WaybillPDF model={model} designPreset={designPreset} template={template} />,
        })
      showToast('Download ready', `${waybill.waybill_number || 'Waybill'} exported as PDF.`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the waybill PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id) return
    try {
      await updateWaybillStatus(id, status)
      setWaybill((curr: any) => ({ ...curr, status }))
      showToast(successLabel, `Waybill marked as ${status}.`, 'success')
      ui.closeModal()
    } catch (error) {
      showToast('Update failed', error instanceof Error ? error.message : 'Could not update status.')
    }
  }

  const handleDuplicate = async () => {
    if (!id) return
    try {
      const created = await duplicateWaybillRecord(id)
      navigate(`/waybills/${created.id}`)
      showToast('Waybill Cloned', 'A new waybill has been created.', 'success')
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate.')
    }
  }

  const handleArchive = async () => {
    if (!id) return
    try {
      await archiveWaybillRecord(id)
      navigate('/waybills')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive.')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteWaybillRecord(id)
      navigate('/waybills')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete.')
    }
  }

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Loading..." backLabel="Waybills" onBack={() => navigate('/waybills')} />}>
        <CenteredSpinner />
      </DocumentPage>
    )
  }

  if (!waybill) return null

  const customFields = parseWaybillCustomFields(waybill.custom_fields)

  const model = rawWaybill && settings
    ? (() => {
        const columnVisibility = customFields.columnVisibility || Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.defaultVisible]))
        const columnTitles = Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.label]))
        const standardColumns = STANDARD_ITEM_COLUMNS
          .filter(col => col.key !== 'quantity' && col.key !== 'unit')
          .filter(col => columnVisibility[col.key] !== false)
          .map(col => ({ key: col.key, label: columnTitles[col.key] || col.label }))
        const qtyLabelVisible = columnVisibility.quantity !== false && columnVisibility.unit !== false
        const qtyLabelCol = qtyLabelVisible ? [{ key: 'qtyLabel', label: 'Qty/Unit' }] : []
        const customCols = (customFields.customColumns || [])
          .filter(col => !STANDARD_ITEM_COLUMNS.some(sc => sc.key === col.key))
          .filter(col => columnVisibility[col.key] !== false)
          .map(col => ({ key: col.key, label: col.label }))
        const columns: ResolvedColumn[] = [...standardColumns, ...qtyLabelCol, ...customCols]
        const company: CompanySettings = {
          name: settings?.company_name || '',
          tagline: settings?.company_tagline || null,
          logo: settings?.company_logo_url || null,
          address: settings?.company_address || null,
          phone: settings?.company_phone || null,
          email: settings?.company_email || null,
        }
        return buildWaybillRenderModel({ waybill: rawWaybill, columns, company })
      })()
    : null

  const docProps: BaseDocument = {
    id: waybill.id,
    number: waybill.waybill_number,
    title: waybill.type === 'internal' ? 'Internal Waybill' : 'External Waybill',
    status: (waybill.status || 'dispatched') as any,
  }

  const metrics = [
    { label: 'Dispatch From', value: waybill.sender_name || 'N/A' },
    { label: 'Vehicle', value: waybill.vehicle_plate || 'Self Pickup', tone: 'amber' as const },
    { label: 'Status', value: waybill.status || 'dispatched', tone: waybill.status === 'delivered' ? 'green' as const : 'amber' as const },
  ]

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="Waybills"
            onBack={() => navigate('/waybills')}
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
            subtitle={waybill.client_name || 'No client specified'}
            status={docProps.status}
            meta={<WaybillHeroMeta threadTag={waybill.receiver_name || 'Receiver'} />}
          />
        }
        floating={<FloatingDownloadButton onClick={() => void handleDownload()} disabled={downloading} />}
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize Waybill PDF"
              subtitle="These controls update the saved waybill PDF design preset used by download."
            >
              <div className="space-y-4">

                <div className="rounded-[24px] border border-bd-border bg-bd-card-bg p-4">
                  <div className="mb-3 text-sm font-semibold text-bd-text">Template Style</div>
                  <WaybillTemplateSelector value={template} onChange={(id) => setTemplate(id as typeof template)} />
                </div>

                <div className="rounded-[24px] border border-bd-border bg-bd-card-bg p-4">
                  <div className="mb-3 text-sm font-semibold text-bd-text">PDF Design</div>
                  <DocumentTemplateDesignOverrides value={designPreset} onChange={setDesignPreset} />
                </div>

                <div className="rounded-[24px] border border-bd-border bg-bd-card-bg p-4">
                  <div
                    className="flex cursor-pointer items-center justify-between select-none"
                    onClick={() => {
                      setCustomColor(customColor === 'auto' ? '#374151' : 'auto')
                    }}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-bd-text">
                        <PenLine className="h-4 w-4 text-bd-button-primary-bg" />
                        Ink Color
                      </div>
                      <p className="text-xs text-bd-text-muted">Override the fillable text color with a custom hex value.</p>
                    </div>
                    <Switch
                      checked={customColor !== 'auto'}
                      onCheckedChange={(checked) => {
                        setCustomColor(checked ? '#374151' : 'auto')
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {customColor !== 'auto' ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        {WAYBILL_COLOR_SWATCHES.map((swatch) => {
                          const active = customColor.toLowerCase() === swatch.toLowerCase()
                          return (
                            <button
                              key={swatch}
                              type="button"
                              onClick={() => setCustomColor(swatch)}
                              className={cn(
                                'h-8 w-8 rounded-lg border-2 shadow-sm transition',
                                active ? 'border-bd-text scale-110 ring-2 ring-bd-text/20' : 'border-transparent hover:border-bd-text-muted/40',
                              )}
                              style={{ backgroundColor: swatch }}
                              aria-label={`Color ${swatch}`}
                            />
                          )
                        })}
                      </div>
                      <input
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="h-9 w-full rounded-[12px] border border-bd-border bg-bd-surface px-3 font-mono text-xs text-bd-text placeholder:text-bd-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg/30"
                        placeholder="#374151"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-bd-border bg-bd-card-bg p-4">
                  <div
                    className="flex cursor-pointer items-center justify-between select-none"
                    onClick={() => {
                      setCustomFont(customFont === 'auto' ? 'Caveat' : 'auto')
                    }}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-bd-text">
                        <Type className="h-4 w-4 text-bd-button-primary-bg" />
                        Handwriting Font
                      </div>
                      <p className="text-xs text-bd-text-muted">Swap the handwriting script used for fillable data entries.</p>
                    </div>
                    <Switch
                      checked={customFont !== 'auto'}
                      onCheckedChange={(checked) => {
                        setCustomFont(checked ? 'Caveat' : 'auto')
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {customFont !== 'auto' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {WAYBILL_HANDWRITING_FONTS.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => setCustomFont(font.value)}
                          className={cn(
                            'rounded-[14px] px-4 py-2.5 text-sm font-medium border transition-all active:scale-95',
                            customFont === font.value
                              ? 'bg-bd-button-primary-bg text-bd-button-primary-text border-bd-button-primary-bg shadow-sm ring-2 ring-bd-button-primary-bg/20'
                              : 'bg-bd-surface-muted text-bd-text border-bd-border hover:border-bd-text-muted',
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
                  className="h-11 w-full rounded-[18px] bg-bd-button-primary-bg text-sm font-semibold text-bd-button-primary-text transition hover:bg-bd-button-primary-bg/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    try {
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem(WAYBILL_TEMPLATE_KEY, template)
                        window.localStorage.setItem('waybill_custom_font', customFont)
                        window.localStorage.setItem('waybill_custom_color', customColor)
                      }
                      setPdfDesignPreset('waybill', designPreset)

                      const nextCustomFields = buildWaybillCustomFields(waybill.custom_fields, { pdfTemplateId: template })
                      const { error } = await supabase.from('waybills').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', id)

                      if (error) {
                        showToast('Save failed', 'Could not save template selection.')
                        return
                      }

                      setWaybill((curr: any) => ({ ...curr, custom_fields: nextCustomFields }))
                      ui.closeSheet()
                      showToast('Customization saved', 'Waybill PDF design and fillable settings updated.', 'success')
                    } catch {
                      showToast('Save failed', 'Could not save customization.')
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </DocumentSheet>

            <WaybillMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsDispatched={() => void handleUpdateStatus('dispatched', 'Marked as Dispatched')}
              onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
              onMarkAsReturned={() => void handleUpdateStatus('returned', 'Marked as Returned')}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExport={() => void handleDownload()}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELIVERED)}
              title="Confirm Delivery?"
              description="This will lock the Waybill route status as successfully delivered."
              cancelLabel="Cancel"
              confirmLabel="Confirm"
              onConfirm={() => void handleUpdateStatus('delivered', 'Waybill Delivered')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Waybill?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Waybill?"
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
              tableName="waybills"
              recordId={String(id || '')}
              documentLabel={docProps.number || 'Waybill'}
              onLinked={() => {}}
            />
          </>
        }
      >
        <WaybillViewPage
          document={docProps}
          metrics={metrics}
          preview={<WaybillDocumentPreview model={model} />}
          activityHistory={<WaybillActivityCard documentId={docProps.id} />}
          onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
          onEdit={() => navigate(`/waybills/${id}/edit`)}
          onDuplicate={() => void handleDuplicate()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

    </>
  )
}
