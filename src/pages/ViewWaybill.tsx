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
import { buildWaybillCustomFields, mapDbWaybill, parseWaybillCustomFields } from '@/components/waybill/waybillUtils'
import { buildWaybillRenderModel } from '@/domain/waybill/engine/assembly'
import type { ResolvedColumn, CompanySettings } from '@/domain/waybill/engine/types'
import { feedback } from '@/lib/feedback'
import { getPdfDesignPreset, type PdfDesignPreset, type PdfFillableFontChoice } from '@/lib/pdfDesignPreset'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useSettings } from '@/hooks/useSettings'
import { useEntity } from '@/lib/tenant/contexts'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { usePdfCustomization } from '@/domain/pdf/customization/hooks'
import {
  WAYBILL_CAPABILITIES,
  WAYBILL_POLICY,
  WAYBILL_TEMPLATE_DEFAULTS,
  bridgeToDesignPreset,
} from '@/domain/pdf/customization/waybill'
import type { PdfCustomizationSettings } from '@/domain/pdf/customization/types'

import WaybillPDF from '@/components/waybill/WaybillPDF'
import { archiveWaybillRecord, deleteWaybillRecord, duplicateWaybillRecord, updateWaybillStatus } from './view-waybill-actions'
import { STANDARD_ITEM_COLUMNS } from '@/domain/waybill/contracts/waybillContract'
import WaybillTemplateSelector from '@/components/waybill/WaybillTemplateSelector'
import DocumentCustomizeCard from '@/components/document-view/shared/DocumentCustomizeCard'
import { WaybillActivityCard } from '@/components/document-view/waybill/sections/ActivityCard'
import { PDF_FILLABLE_FONT_OPTIONS } from '@/lib/pdfDesignPreset'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'

const WAYBILL_TEMPLATE_KEY = 'waybill_view_template'
const WAYBILL_CUSTOM_FONT_KEY = 'waybill_custom_font_stash'
const WAYBILL_CUSTOM_COLOR_KEY = 'waybill_custom_color_stash'

const WAYBILL_COLOR_SWATCHES = ['#000000', '#374151', '#0f172a', '#1e3a5f', '#7f1d1d']

function getStoredCustomFont(): 'auto' | PdfFillableFontChoice {
  if (typeof window === 'undefined') return 'auto'
  return (window.localStorage.getItem(WAYBILL_CUSTOM_FONT_KEY) as any) || 'auto'
}

function getStoredCustomColor(): 'auto' | string {
  if (typeof window === 'undefined') return 'auto'
  return window.localStorage.getItem(WAYBILL_CUSTOM_COLOR_KEY) || 'auto'
}

const WAYBILL_HANDWRITING_FONTS = PDF_FILLABLE_FONT_OPTIONS.filter(
  (f) => f.value === 'Patrick Hand' || f.value === 'Reenie Beanie' || f.value === 'Caveat' || f.value === 'Kalam' || f.value === 'Handlee' || f.value === 'Sue Ellen Francisco',
)

const MODAL_DELIVERED = 'delivered'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewWaybill() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const { settings } = useSettings()
  const { tenantClient } = useEntity()

  const [loading, setLoading] = useState(true)
  const [waybill, setWaybill] = useState<any>(null)
  const [rawWaybill, setRawWaybill] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [template, setTemplate] = useState<'evergreen' | 'minimal' | 'thermal' | 'classic' | 'premium' | 'slate'>(() => {
    if (typeof window === 'undefined') return 'classic'
    return (window.localStorage.getItem(WAYBILL_TEMPLATE_KEY) as any) || 'classic'
  })

  // Engine: customization state + persistence
  const {
    customization,
    setDocumentFont,
    setInkFont,
    setInkColour,
    reset: resetCustomization,
  } = usePdfCustomization({
    documentFamily: 'waybill',
    capabilities: WAYBILL_CAPABILITIES,
    policy: WAYBILL_POLICY,
    templateDefaults: WAYBILL_TEMPLATE_DEFAULTS,
  })
  // Bridge: ResolvedPdfCustomization → PdfDesignPreset for template consumption
  const basePreset = getPdfDesignPreset('waybill')
  const designPreset = bridgeToDesignPreset(basePreset, customization)

  const [customFont, setCustomFont] = useState<'auto' | PdfFillableFontChoice>(getStoredCustomFont)
  const [customColor, setCustomColor] = useState<'auto' | string>(getStoredCustomColor)

  useEffect(() => {
    setInkFont(customFont === 'auto' ? WAYBILL_TEMPLATE_DEFAULTS.handwritingFont : customFont)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFont])

  useEffect(() => {
    setInkColour(customColor === 'auto' ? WAYBILL_TEMPLATE_DEFAULTS.handwritingColor : customColor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customColor])

  // Migration: read old localStorage keys once and write to engine key
  useEffect(() => {
    if (typeof window === 'undefined') return
    const newKey = 'bigdrops_pdf_customization_waybill'
    if (window.localStorage.getItem(newKey)) return
    const oldFont = window.localStorage.getItem('waybill_custom_font')
    const oldColor = window.localStorage.getItem('waybill_custom_color')
    if (!oldFont && !oldColor) return
    const migrated: PdfCustomizationSettings = {
      version: 1,
      documentFont: 'Inter',
      inkFont: oldFont && oldFont !== 'auto' ? (oldFont as any) : 'Patrick Hand',
      inkColour: oldColor && oldColor !== 'auto' ? oldColor : '#0f172a',
    }
    window.localStorage.setItem(newKey, JSON.stringify(migrated))
    window.localStorage.removeItem('waybill_custom_font')
    window.localStorage.removeItem('waybill_custom_color')
    window.location.reload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist template to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WAYBILL_TEMPLATE_KEY, template)
    }
  }, [template])

  const [saving, setSaving] = useState(false)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)

  useEffect(() => {
    if (!tenantClient.isReady) return

    const loadWaybill = async () => {
      if (!id) return
      setLoading(true)
      try {
        const { data, error } = await tenantClient.from('waybills').select('*').eq('id', id).single()

        if (error || !data) {
          navigate('/waybills')
          return
        }

        setRawWaybill(data)
        setWaybill(mapDbWaybill(data))

        if (data.client_id) {
          const { data: clientData } = await tenantClient
            .from('clients')
            .select('address, city, state, phone, email')
            .eq('id', data.client_id)
            .single()
          if (clientData) {
            setRawWaybill((curr: any) => ({
              ...curr,
              client_address: clientData.address || curr.client_address,
              client_phone: clientData.phone || curr.client_phone,
              client_email: clientData.email || curr.client_email,
              client_city_state: [clientData.city, clientData.state].filter(Boolean).join(', ') || curr.client_city_state,
            }))
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
  }, [id, navigate, tenantClient.isReady])



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
        website: settings?.company_website || null,
        customInfo: settings?.custom_info ? JSON.parse(settings.custom_info) : null,
        city: settings?.company_city || null,
        state: settings?.company_state || null,
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
    if (!id || updatingStatus) return
    setUpdatingStatus(true)
    try {
      await updateWaybillStatus(id, status, tenantClient)
      setWaybill((curr: any) => ({ ...curr, status }))
      showToast(successLabel, `Waybill marked as ${status}.`, 'success')
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
      const created = await duplicateWaybillRecord(id, tenantClient)
      navigate(`/waybills/${created.id}`)
      showToast('Waybill Cloned', 'A new waybill has been created.', 'success')
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
      await archiveWaybillRecord(id, tenantClient)
      navigate('/waybills')
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
      await deleteWaybillRecord(id, tenantClient)
      navigate('/waybills')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Opening Waybill..." backLabel="Waybills" onBack={() => navigate('/waybills')} />}>
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
          website: settings?.company_website || null,
          customInfo: settings?.custom_info ? JSON.parse(settings.custom_info) : null,
          city: settings?.company_city || null,
          state: settings?.company_state || null,
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
              <DocumentCustomizeCard
                customization={customization}
                setDocumentFont={setDocumentFont}
                setInkFont={setInkFont}
                setInkColour={setInkColour}
                templatePicker={<WaybillTemplateSelector value={template} onChange={(id) => setTemplate(id as typeof template)} />}
                colorSwatches={WAYBILL_COLOR_SWATCHES}
                customColor={customColor}
                onCustomColorChange={setCustomColor}
                handwritingFonts={WAYBILL_HANDWRITING_FONTS}
                customFont={customFont}
                onCustomFontChange={setCustomFont}
                saving={saving}
                onSave={async () => {
                  setSaving(true)
                  try {
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(WAYBILL_TEMPLATE_KEY, template)
                      window.localStorage.setItem(WAYBILL_CUSTOM_FONT_KEY, customFont)
                      window.localStorage.setItem(WAYBILL_CUSTOM_COLOR_KEY, customColor)
                    }

                    const nextCustomFields = buildWaybillCustomFields(waybill.custom_fields, { pdfTemplateId: template })
                    const { error } = await tenantClient.from('waybills').update({ custom_fields: JSON.stringify(nextCustomFields) }).eq('id', id)

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
              />
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
              confirmLabel={updatingStatus ? "Updating..." : "Confirm"}
              loading={updatingStatus}
              onConfirm={() => void handleUpdateStatus('delivered', 'Waybill Delivered')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Waybill?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel={archiving ? "Archiving..." : "Archive"}
              loading={archiving}
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Waybill?"
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
