import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { BaseDocument } from '@/components/document-view/types/documentView'
import WaybillHeroMeta from '@/components/document-view/waybill/WaybillHeroMeta'
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
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { supabase } from '@/supabase'
import { mapDbWaybill, parseWaybillCustomFields } from '@/components/waybill/waybillUtils'
import WaybillDocumentPreview from '@/components/document-view/waybill/WaybillDocumentPreview'
import WaybillPDF from '@/components/waybill/WaybillPDF'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import { getPdfDesignPreset, setPdfDesignPreset, type PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useSettings } from '@/hooks/useSettings'

const SHEET_MORE = 'more-actions'
const SHEET_CUSTOMIZE = 'customize-output'
const MODAL_DELIVERED = 'delivered'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewWaybill() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()
  const { settings } = useSettings()

  const [loading, setLoading] = useState(true)
  const [waybill, setWaybill] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [designPreset, setDesignPreset] = useState<PdfDesignPreset>(() => getPdfDesignPreset('waybill'))

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

    void loadWaybill()
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

  const handleDownload = async () => {
    if (!waybill || downloading) return
    setDownloading(true)
    try {
      await downloadPdfFromElement({
        fileName: waybill.waybill_number || 'waybill',
        subdirectory: 'waybill',
        element: <WaybillPDF waybill={waybill} settings={settings || {}} designPreset={designPreset} />,
      })
      showToast('Download ready', `${waybill.waybill_number || 'Waybill'} exported as PDF.`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the waybill PDF.'
      showToast('Download failed', message)
    } finally {
      setDownloading(false)
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
    status: (waybill.status || 'draft') as any,
  }

  const metrics = [
    { label: 'Dispatch From', value: waybill.sender_name || 'N/A' },
    { label: 'Vehicle', value: waybill.vehicle_plate || 'Self Pickup', tone: 'amber' as const },
    { label: 'Status', value: waybill.status || 'draft', tone: waybill.status === 'delivered' ? 'green' as const : 'amber' as const },
  ]

  const handleDuplicate = () => {
    showToast('Duplicate pending', 'This waybill can be viewed and exported, but duplicate logic is not wired yet.')
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={docProps.title}
            backLabel="Waybills"
            onBack={() => navigate('/waybills')}
            onShare={() => showToast('Share pending', 'Share flow is not wired on waybill view yet.')}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
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
                <div className="rounded-[24px] border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">PDF Design</div>
                  <DocumentTemplateDesignOverrides value={designPreset} onChange={setDesignPreset} />
                </div>
                <button
                  type="button"
                  className="h-11 w-full rounded-[18px] bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={() => {
                    setPdfDesignPreset('waybill', designPreset)
                    ui.closeSheet()
                    showToast('Customization saved', 'Waybill PDF design updated.', 'success')
                  }}
                >
                  Save Settings
                </button>
              </div>
            </DocumentSheet>

            <WaybillMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsDispatched={() => showToast('Marked as dispatched', '', 'success')}
              onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
              onMarkAsReturned={() => showToast('Marked as returned', '', 'info')}
              onLinkProject={() => showToast('Project link pending', 'Project-link wiring is not finished for waybill view.')}
              onDuplicate={handleDuplicate}
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
              onConfirm={() => showToast('Delivery pending', 'Delivery status update is not wired from waybill view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Waybill?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active lists.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Archive pending', 'Archive handling is not wired for waybill view yet.')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Waybill?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Delete pending', 'Delete handling is not wired for waybill view yet.')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <WaybillViewPage
          document={docProps}
          metrics={metrics}
          preview={<WaybillDocumentPreview preview={preview} />}
          onMarkAsDelivered={() => ui.openModal(MODAL_DELIVERED)}
          onEdit={() => navigate(`/waybills/edit/${id}`)}
          onDuplicate={handleDuplicate}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport toasts={toastStack.toasts} onDismiss={toastStack.dismissToast} />
    </>
  )
}
