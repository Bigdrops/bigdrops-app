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
import { feedback } from '@/lib/feedback'
import { getPdfDesignPreset, setPdfDesignPreset, type PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useSettings } from '@/hooks/useSettings'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'

import WaybillPDF from '@/components/waybill/WaybillPDF'
import { archiveWaybillRecord, deleteWaybillRecord, duplicateWaybillRecord, updateWaybillStatus } from './viewWaybillActions'
import { STANDARD_ITEM_COLUMNS } from '@/domain/waybill/contracts/waybillContract'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'


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
  const [template, setTemplate] = useState<'green' | 'minimal' | 'thermal' | 'classic' | 'split' | 'premium' | 'industry'>('green')

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
  const companyLines = [
    settings?.company_address,
    settings?.company_city,
    settings?.company_phone,
    settings?.company_email,
  ].filter(Boolean) as string[]

  const preview = {
    companyName: String(settings?.company_name || ''),
    companyLines,
    documentNumber: waybill.waybill_number || '',
    dispatchDate: waybill.date || '',
    consigneeName: waybill.receiver_name || waybill.client_name || '',
    consigneeLines: [waybill.delivery_location, waybill.client_name].filter(Boolean),
    vehicleReg: waybill.vehicle_plate || '',
    deliveryReference: customFields.references?.linkedInvoiceNumber || waybill.po_number || '',
    driverName: waybill.sender_name || '',
    driverPhone: '',
    notes: waybill.notes || '',
    items: waybill.items || [],
  }

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
                  <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                    {([
                      { id: 'green', label: 'Green', desc: 'Clean green header' },
                      { id: 'minimal', label: 'Minimal', desc: 'Bare minimum layout' },
                      { id: 'thermal', label: 'Thermal', desc: 'Receipt-style' },
                      { id: 'classic', label: 'Classic', desc: 'Traditional layout' },
                      { id: 'split', label: 'Split', desc: 'Split-panel design' },
                      { id: 'premium', label: 'Premium', desc: 'Gold-accent premium' },
                      { id: 'industry', label: 'Industry', desc: 'Industrial style' },
                    ] as const).map((opt) => {
                      const active = template === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTemplate(opt.id)}
                          className={cn(
                            'relative flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[20px] border p-1.5 transition-all duration-300',
                            active
                              ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text ring-2 ring-bd-button-primary-bg ring-offset-2'
                              : 'border-bd-border bg-bd-card-bg text-bd-text hover:border-bd-border hover:bg-bd-surface-muted/50',
                          )}
                        >
                          <div className="mb-2 flex h-[80px] flex-col justify-end rounded-[16px] bg-white p-2 shadow-inner">
                            <div className="space-y-1.5">
                              <div className={cn('h-1.5 w-full rounded-full', active ? 'bg-slate-800' : 'bg-slate-300')} />
                              <div className={cn('h-1 w-3/5 rounded-full', active ? 'bg-slate-400' : 'bg-slate-200')} />
                              <div className={cn('h-1 w-4/5 rounded-full', active ? 'bg-slate-300' : 'bg-slate-100')} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 px-1">
                            <span className="truncate text-xs font-bold tracking-tight">{opt.label}</span>
                            {active && (
                              <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-bd-button-primary-bg">
                                <CheckCircle2 className="size-2.5 text-bd-button-primary-text" />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-bd-border bg-bd-card-bg p-4">
                  <div className="mb-3 text-sm font-semibold text-bd-text">PDF Design</div>
                  <DocumentTemplateDesignOverrides value={designPreset} onChange={setDesignPreset} />
                </div>
                <button
                  type="button"
                  className="h-11 w-full rounded-[18px] bg-bd-button-primary-bg text-sm font-semibold text-bd-button-primary-text transition hover:bg-bd-button-primary-bg/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    try {
                      setPdfDesignPreset('waybill', designPreset)

                      const nextCustomFields = buildWaybillCustomFields(waybill.custom_fields, { pdfTemplateId: template })
                      const { error } = await supabase.from('waybills').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', id)

                      if (error) {
                        showToast('Save failed', 'Could not save template selection.')
                        return
                      }

                      setWaybill((curr: any) => ({ ...curr, custom_fields: nextCustomFields }))
                      ui.closeSheet()
                      showToast('Customization saved', 'Waybill PDF design updated.', 'success')
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
          preview={<WaybillDocumentPreview preview={preview} />}
          onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
          onEdit={() => navigate(`/waybills/${id}/edit`)}
          onDuplicate={() => void handleDuplicate()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

    </>
  )
}
