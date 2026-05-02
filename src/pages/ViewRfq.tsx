import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import { downloadPdfFromElement } from '@/components/document-view/shared/downloadPdf'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import RfqHeroMeta from '@/components/document-view/rfq/RfqHeroMeta'
import RfqMoreSheet from '@/components/document-view/rfq/RfqMoreSheet'
import RfqViewPage from '@/components/document-view/rfq/RfqViewPage'
import '@/components/document-view/shared/documentViewTheme.css'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import { RfqCustomizationPanel } from '@/components/rfq/RfqCustomizationPanel'
import { RfqPdfDocument } from '@/components/rfq/RfqPdfDocument'
import { DocumentLivePreviewCard } from '@/components/document/DocumentViewShell'
import { denormalizeToDbRfq, normalizeDbRfq } from '@/domain/rfq/normalize'
import type { BaseDocument } from '@/components/document-view/types/documentView'
import { feedback } from '@/lib/feedback'
import { supabase } from '@/supabase'
import { shareDocument } from '@/components/document-view/shared/shareDocument'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
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

  const [loading, setLoading] = useState(true)
  const [rfq, setRfq] = useState<any>(null)
  const [draftRfq, setDraftRfq] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [savingCustomization, setSavingCustomization] = useState(false)
  const [projectLinkOpen, setProjectLinkOpen] = useState(false)

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
    const options = { description }

    if (tone === 'success') {
      feedback.success(title, options)
      return
    }

    feedback.info(title, options)
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

  const handleShare = async () => {
    try {
      await shareDocument({
        title: rfq?.rfq_number || 'RFQ',
        text: rfq?.title || 'Request for Quotation',
      })
      showToast('Share successful', 'RFQ link handled.', 'success')
    } catch (err) {
      showToast('Share failed', 'Could not share this RFQ.')
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

  const handleExportCsv = () => {
    if (!rfq) return

    const rows = (Array.isArray(rfq.table_rows) ? rfq.table_rows : []).filter((row: any) => row?.row_type !== 'section')
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [
      ['Description', 'Specification', 'Quantity', 'Unit', 'Make / Brand', 'CP', 'SP'].map(escapeCsv).join(','),
      ...rows.map((row: any) => [
        row.description,
        row.specification,
        row.quantity,
        row.unit,
        row.make_brand,
        row.cp,
        row.sp,
      ].map(escapeCsv).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${rfq.rfq_number || 'rfq'}.csv`
    anchor.click()
    window.URL.revokeObjectURL(url)
    showToast('CSV ready', 'RFQ items exported as CSV.', 'success')
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
      navigate(`/rfqs/${created.id}`)
      showToast('RFQ Cloned', 'A new open RFQ has been created.', 'success')
    } catch (error) {
      showToast('Clone failed', error instanceof Error ? error.message : 'Could not duplicate.')
    }
  }

  const handleArchive = async () => {
    if (!id) return
    try {
      await archiveRFQRecord(id)
      navigate('/rfqs')
    } catch (error) {
      showToast('Archive failed', error instanceof Error ? error.message : 'Could not archive.')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteRFQRecord(id)
      navigate('/rfqs')
    } catch (error) {
      showToast('Delete failed', error instanceof Error ? error.message : 'Could not delete.')
    }
  }

  const handleConvertToQuotation = async () => {
    if (!rfq) return
    try {
      const created = await convertRFQToQuotation({ rfq, items: rfq.table_rows })
      navigate(`/quotations/${created.id}`)
      showToast('Quotation Created', 'Linked quotation is ready.', 'success')
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
      const rows = Array.isArray(current?.table_rows) ? current.table_rows : []
      if (!rows.length) return current
      const itemRows = rows.filter((row: any) => row.row_type !== 'section')
      const sectionRows = rows.filter((row: any) => row.row_type === 'section')
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

  const rfqRows = Array.isArray(rfq.table_rows) ? rfq.table_rows : []
  const metrics = [
    { label: 'Requested Items', value: `${rfqRows.filter((row: any) => row.row_type !== 'section').length || 0} lines` },
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
            onBack={() => navigate('/rfqs')}
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
              onMarkAsClosed={() => void handleUpdateStatus('closed', 'Marked as Closed')}
              onConvertToQuotation={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExportCsv={handleExportCsv}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Generate Quotation?"
              description="This will generate a new open quotation supplying these requested items."
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

            <ProjectLinkDialog
              open={projectLinkOpen}
              onOpenChange={setProjectLinkOpen}
              tableName="rfqs"
              recordId={String(id || '')}
              documentLabel={docProps.number || 'RFQ'}
              onLinked={() => { }}
            />
          </>
        }
      >
        <RfqViewPage
          document={docProps}
          metrics={metrics}
          preview={
            <DocumentLivePreviewCard
              templateLabel="Live PDF"
              documentLabel="RFQ"
              documentNumber={rfq.rfq_number || 'RFQ'}
              companyName={rfq.identity_name || ''}
              companyTagline={rfq.identity_tagline || ''}
              companyLines={[rfq.identity_address, rfq.identity_phone, rfq.identity_email].filter(Boolean) as string[]}
              recipientLabel="Vendor Information"
              recipientName={rfq.vendor_name || 'Vendor not specified'}
              recipientLines={[rfq.vendor_address, rfq.vendor_contact].filter(Boolean) as string[]}
              meta={[
                { label: 'Issue Date', value: rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : 'Not set' },
                { label: 'Deadline', value: rfq.expiry_date || 'No deadline' },
                { label: 'Status', value: String(rfq.status || 'open').toUpperCase() },
              ]}
              detailRows={[
                { label: 'Project Ref', value: rfq.project_title || '—' },
                { label: 'Tender Type', value: rfq.tender_type || 'General Request' },
              ]}
              items={(rfq.table_rows || []).map((item: any) => {
                if (item.row_type === 'section') return { type: 'group' as const, label: item.description }
                return {
                  type: 'line' as const,
                  label: item.description || 'Item',
                  detail: item.specification || '',
                  value: String(item.quantity ?? '—'),
                  facts: [item.unit, item.make_brand].filter(Boolean) as string[],
                }
              })}
              notesSections={[
                { title: 'Tender Instructions', content: rfq.notes || 'No special instructions.' },
              ]}
              accentColor="#0f172a"
            />
          }
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/rfqs/edit/${id}`)}
          onDuplicate={() => void handleDuplicate()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

    </>
  )
}
