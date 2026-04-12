import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Copy, Download, FileOutput, Images, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'

import Layout from '@/components/Layout'
import { CenteredSpinner, SkeletonCard } from '@/components/loading/AppLoadingStates'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import {
  DocumentActionGrid,
  DocumentActionSheet,
  DocumentBottomBar,
  DocumentFloatingFab,
  DocumentPdfSheet,
  DocumentSection,
  DocumentTopBar,
} from '@/components/document/DocumentViewShell'
import { RfqCustomizationPanel } from '@/components/rfq/RfqCustomizationPanel'
import { RfqExportController } from '@/components/rfq/RfqExportController'
import { RfqImagePreviewGrid } from '@/components/rfq/RfqImagePreviewGrid'
import { RfqPdfDocument } from '@/components/rfq/RfqPdfDocument'
import { RfqPreview } from '@/components/rfq/RfqPreview'
import { normalizeDbRfq, denormalizeToDbRfq } from '@/domain/rfq/normalize'
import type { Rfq } from '@/domain/rfq/types'
import type { TableTemplateId } from '@/domain/table-document/types'
import { SHARED_TABLE_TEMPLATES, getTemplateLabel } from '@/domain/table-document/templateRegistry'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/supabase'

export default function ViewRfq() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [rfq, setRfq] = useState<Rfq | null>(null)
  const [loading, setLoading] = useState(true)
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showExportSheet, setShowExportSheet] = useState(false)
  const [savingCustomize, setSavingCustomize] = useState(false)
  const [exportState, setExportState] = useState<'idle' | 'capturing' | 'reviewing'>('idle')
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const loadRfq = useCallback(async () => {
    setLoading(true)

    const [rfqResult, itemsResult] = await Promise.all([
      supabase.from('rfqs').select('*').eq('id', id).single(),
      supabase.from('rfq_items').select('*').eq('rfq_id', id).order('sort_order'),
    ])

    if (!rfqResult.data) {
      toast({ title: 'RFQ not found', variant: 'destructive' })
      navigate('/rfqs')
      return
    }

    setRfq(normalizeDbRfq(rfqResult.data, itemsResult.data || []))
    setLoading(false)
  }, [id, navigate])

  useEffect(() => {
    void loadRfq()
  }, [loadRfq])

  const applyRfqUpdates = useCallback(
    async (updates: Partial<Rfq>, options?: { successTitle?: string; successDescription?: string }) => {
      if (!rfq || !id) return

      const previousRfq = rfq
      const nextRfq = { ...rfq, ...updates }

      setRfq(nextRfq)
      setSavingCustomize(true)

      const { error } = await supabase
        .from('rfqs')
        .update(denormalizeToDbRfq(nextRfq))
        .eq('id', id)

      setSavingCustomize(false)

      if (error) {
        setRfq(previousRfq)
        toast({
          title: 'Update failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      if (options?.successTitle) {
        toast({
          title: options.successTitle,
          description: options.successDescription,
        })
      }
    },
    [id, rfq],
  )

  const handleDelete = async () => {
    setShowDeleteConfirm(false)

    const { error } = await supabase.from('rfqs').delete().eq('id', id)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'RFQ deleted' })
    navigate('/rfqs')
  }

  const handleExportImage = () => {
    setShowActions(false)
    setShowExportSheet(false)
    setExportState('capturing')
  }

  const handleExportPdf = async () => {
    if (!rfq || pdfGenerating) return

    setShowActions(false)
    setShowExportSheet(false)
    setPdfGenerating(true)
    toast({ title: 'Exporting...', description: 'Generating RFQ PDF document.' })

    try {
      const blob = await pdf(<RfqPdfDocument rfq={rfq} items={rfq.items || []} rows={rfq.table_rows} columns={rfq.table_columns} />).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `RFQ_${rfq.rfq_number}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      toast({ title: 'PDF Ready', description: 'Document downloaded successfully.' })
    } catch (error) {
      console.error('RFQ PDF generation failed', error)
      toast({
        title: 'Export failed',
        description: 'Could not generate PDF.',
        variant: 'destructive',
      })
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleDownloadAllImages = () => {
    if (capturedImages.length === 0) return

    capturedImages.forEach((src, index) => {
      const anchor = document.createElement('a')
      anchor.href = src
      anchor.download = `RFQ_${rfq?.rfq_number}_Segment_${index + 1}.png`
      document.body.appendChild(anchor)
      setTimeout(() => {
        anchor.click()
        document.body.removeChild(anchor)
      }, index * 250)
    })

    toast({
      title: 'Download started',
      description: `Downloading ${capturedImages.length} image ${capturedImages.length === 1 ? 'segment' : 'segments'}.`,
    })
  }

  const handleCopyNumber = async () => {
    if (!rfq?.rfq_number) return

    try {
      await navigator.clipboard.writeText(rfq.rfq_number)
      toast({ title: 'Copied', description: 'RFQ number copied.' })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy RFQ number.',
        variant: 'destructive',
      })
    }
  }

  const handleConvertToQuotation = () => {
    if (!rfq) return

    navigate('/quotations/new', {
      state: {
        sourceRfq: {
          rfqId: rfq.id || '',
          rfqNumber: rfq.rfq_number || '',
          title: rfq.title || '',
          notes: rfq.notes || '',
          items: (rfq.items || []).map((item, index) => ({
            id: `rfq-item-${index}`,
            description: item.description || '',
            quantity: Number(item.quantity || 0),
            unit: item.unit || '',
            specification: item.specification || '',
            notes: item.notes || '',
          })),
        },
      },
    })
  }

  if (loading || !rfq) {
    return (
      <Layout title="RFQ" session={null} hidePageHeader>
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-32 pt-4 md:px-6 md:pt-6">
          <SkeletonCard className="h-[92px]" />
          <SkeletonCard className="h-[320px]" />
          <CenteredSpinner />
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title={rfq.rfq_number}
      session={null}
      hidePageHeader
      contentClassName="w-full px-4 pb-32 pt-4 md:px-6 md:pt-6"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <DocumentTopBar
          title={rfq.rfq_number || 'RFQ'}
          subtitle="Request for Quote"
          statusLabel={null}
          statusClassName=""
          onBack={() => navigate('/rfqs')}
          onMore={() => setShowActions(true)}
        />

        <DocumentActionGrid
          actions={[
            { key: 'pdf', label: 'Export', onClick: () => setShowExportSheet(true), variant: 'dark' },
            { key: 'image', label: 'Images', onClick: handleExportImage, variant: 'blue', icon: Images },
            { key: 'edit', label: 'Edit', onClick: () => navigate(`/rfqs/edit/${id}`), variant: 'outline', icon: Pencil },
            { key: 'more', label: 'More', onClick: () => setShowActions(true), variant: 'outline', icon: MoreHorizontal },
          ]}
        />

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">RFQ Preview</div>
            <div className="mt-1 text-sm text-slate-600">
              Table-first final document output with saved RFQ styling.
            </div>
          </div>
          <div className="bg-slate-100/60 p-3 sm:p-5">
            <RfqPreview rfq={rfq} items={rfq.items || []} rows={rfq.table_rows} columns={rfq.table_columns} />
          </div>
        </div>

        <DocumentSection
          title="Customize"
          defaultOpen
          summary="Saved presets, 4-slot document colors, identity toggles, and reshuffle."
        >
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">RFQ Output Controls</div>
                <div className="text-xs text-slate-500">
                  Changes here update the final RFQ view and export output.
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {savingCustomize ? 'Saving...' : 'Saved'}
              </div>
            </div>

            <RfqCustomizationPanel
              rfq={rfq}
              onUpdateRfq={(updates) => {
                void applyRfqUpdates(updates)
              }}
              onReshuffle={() => {
                void applyRfqUpdates(
                  { export_order_seed: Math.floor(Math.random() * 1000000) },
                  {
                    successTitle: 'Items reshuffled',
                    successDescription: 'The RFQ preview and exports now use a fresh order.',
                  },
                )
              }}
              showBrandOverride={false}
            />
          </div>
        </DocumentSection>

        <DocumentActionSheet
          open={showActions}
          onOpenChange={setShowActions}
          title="RFQ Actions"
          subtitle={rfq.rfq_number || 'Request for Quote'}
          actions={[
            {
              label: 'Edit RFQ',
              subtitle: 'Open the RFQ editor',
              onClick: () => navigate(`/rfqs/edit/${id}`),
              iconKey: 'open',
            },
            {
              label: 'Copy RFQ Number',
              subtitle: rfq.rfq_number || 'Copy the current RFQ number',
              onClick: () => void handleCopyNumber(),
              iconKey: 'copy',
            },
            {
              label: 'Export Images',
              subtitle: 'Generate segmented image output',
              onClick: handleExportImage,
              iconKey: 'export',
            },
            {
              label: pdfGenerating ? 'Preparing PDF...' : 'Download PDF',
              subtitle: 'Export the current RFQ as PDF',
              onClick: () => void handleExportPdf(),
              iconKey: 'pdf',
              disabled: pdfGenerating,
            },
            {
              label: 'Convert to Quotation',
              subtitle: 'Start a new quotation from this RFQ',
              onClick: handleConvertToQuotation,
              iconKey: 'convert',
            },
            {
              label: 'Delete RFQ',
              subtitle: 'Permanently remove this RFQ',
              onClick: () => setShowDeleteConfirm(true),
              iconKey: 'delete',
              danger: true,
            },
          ]}
        />

        <DocumentPdfSheet
          open={showExportSheet}
          onOpenChange={setShowExportSheet}
          title="Download & Export"
          subtitle={`Export ${rfq.rfq_number} using the saved ${getTemplateLabel(rfq.template_id || 'modern')} template.`}
          settingsNode={null}
          templateValue={rfq.template_id || 'modern'}
          onTemplateChange={(templateId) => {
            void applyRfqUpdates({ template_id: templateId as TableTemplateId })
          }}
          templates={SHARED_TABLE_TEMPLATES}
          actions={[
            {
              label: 'Export Images',
              onClick: handleExportImage,
              variant: 'outline',
            },
            {
              label: pdfGenerating ? 'Preparing...' : 'Download PDF',
              onClick: () => void handleExportPdf(),
              className: 'bg-slate-950 text-white hover:bg-slate-800',
              disabled: pdfGenerating,
            },
          ]}
        />

        <ConfirmActionDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete this RFQ?"
          description="This action is permanent and cannot be undone."
          confirmLabel="Delete RFQ"
          onConfirm={() => void handleDelete()}
        />

        {exportState === 'capturing' ? (
          <RfqExportController
            rfq={rfq}
            rows={rfq.table_rows || []}
            columns={rfq.table_columns || []}
            onDone={(images) => {
              setCapturedImages(images)
              setExportState('reviewing')
            }}
            onCancel={() => setExportState('idle')}
          />
        ) : null}

        {exportState === 'reviewing' ? (
          <RfqImagePreviewGrid
            images={capturedImages}
            rfqNumber={rfq.rfq_number}
            onClose={() => setExportState('idle')}
            onDownloadAll={handleDownloadAllImages}
          />
        ) : null}

        <DocumentFloatingFab onClick={() => setShowExportSheet(true)} label="Open export options" />

        <DocumentBottomBar
          actions={[
            { label: 'Back', onClick: () => navigate('/rfqs'), variant: 'outline' },
            { label: 'Edit', onClick: () => navigate(`/rfqs/edit/${id}`), variant: 'outline' },
            {
              label: pdfGenerating ? 'Preparing...' : 'Export',
              onClick: () => setShowExportSheet(true),
              className: 'bg-slate-950 text-white hover:bg-slate-800',
              disabled: pdfGenerating,
            },
          ]}
        />
      </div>
    </Layout>
  )
}
