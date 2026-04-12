import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Images, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

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
import { BoqCustomizationPanel } from '@/components/boq/BoqCustomizationPanel'
import { BoqPdfDocument } from '@/components/boq/BoqPdfDocument'
import { BoqPreview } from '@/components/boq/BoqPreview'
import type { Boq } from '@/domain/boq/types'
import { deleteBoq, getBoqById, saveBoq } from '@/domain/boq/storage'
import { getTemplateLabel, SHARED_TABLE_TEMPLATES } from '@/domain/table-document/templateRegistry'
import { TableDocumentExportController } from '@/components/table-document/TableDocumentExportController'
import { toast } from '@/hooks/use-toast'

export default function ViewBoq() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [boq, setBoq] = useState<Boq | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showExportSheet, setShowExportSheet] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [exportState, setExportState] = useState<'idle' | 'capturing' | 'reviewing'>('idle')
  const [capturedImages, setCapturedImages] = useState<string[]>([])

  useEffect(() => {
    const loaded = id ? getBoqById(id) : null
    if (!loaded) {
      toast({ title: 'BOQ not found', variant: 'destructive' })
      navigate('/boqs')
      return
    }
    setBoq(loaded)
  }, [id, navigate])

  if (!boq) {
    return (
      <Layout title="BOQ" session={null} hidePageHeader>
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-32 pt-4 md:px-6 md:pt-6">
          <SkeletonCard className="h-[92px]" />
          <SkeletonCard className="h-[320px]" />
          <CenteredSpinner />
        </div>
      </Layout>
    )
  }

  const persist = (patch: Partial<Boq>) => {
    const saved = saveBoq({ ...boq, ...patch })
    setBoq(saved)
  }

  const handleExportPdf = async () => {
    if (!boq || pdfGenerating) return
    setPdfGenerating(true)
    try {
      const blob = await pdf(<BoqPdfDocument boq={boq} />).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${boq.boq_number || 'boq'}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      toast({ title: 'PDF Ready', description: 'Document downloaded successfully.' })
    } catch (error) {
      console.error('BOQ PDF generation failed', error)
      toast({ title: 'Export failed', description: 'Could not generate PDF.', variant: 'destructive' })
    } finally {
      setPdfGenerating(false)
    }
  }

  return (
    <Layout title={boq.boq_number} session={null} hidePageHeader contentClassName="w-full px-4 pb-32 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <DocumentTopBar title={boq.boq_number || 'BOQ'} subtitle="Bill of Quantities" statusLabel={null} statusClassName="" onBack={() => navigate('/boqs')} onMore={() => setShowActions(true)} />

        <DocumentActionGrid
          actions={[
            { key: 'pdf', label: 'Export', onClick: () => setShowExportSheet(true), variant: 'dark' },
            { key: 'image', label: 'Images', onClick: () => setExportState('capturing'), variant: 'blue', icon: Images },
            { key: 'edit', label: 'Edit', onClick: () => navigate(`/boqs/edit/${boq.id}`), variant: 'outline', icon: Pencil },
            { key: 'more', label: 'More', onClick: () => setShowActions(true), variant: 'outline', icon: MoreHorizontal },
          ]}
        />

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">BOQ Preview</div>
            <div className="mt-1 text-sm text-slate-600">Shared template rendering with table-first BOQ structure.</div>
          </div>
          <div className="bg-slate-100/60 p-3 sm:p-5">
            <BoqPreview boq={boq} />
          </div>
        </div>

        <DocumentSection title="Customize" defaultOpen summary="Shared templates, visible columns, and preserved document colors.">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <BoqCustomizationPanel boq={boq} onChange={persist} />
          </div>
        </DocumentSection>

        <DocumentActionSheet
          open={showActions}
          onOpenChange={setShowActions}
          title="BOQ Actions"
          subtitle={boq.boq_number}
          actions={[
            { label: 'Edit BOQ', subtitle: 'Open the BOQ editor', onClick: () => navigate(`/boqs/edit/${boq.id}`), iconKey: 'open' },
            { label: pdfGenerating ? 'Preparing PDF...' : 'Download PDF', subtitle: 'Export the current BOQ as PDF', onClick: () => void handleExportPdf(), iconKey: 'pdf', disabled: pdfGenerating },
            { label: 'Delete BOQ', subtitle: 'Remove this local BOQ', onClick: () => setShowDeleteConfirm(true), iconKey: 'delete', danger: true },
          ]}
        />

        <DocumentPdfSheet
          open={showExportSheet}
          onOpenChange={setShowExportSheet}
          title="Download & Export"
          subtitle={`Export ${boq.boq_number} using the saved ${getTemplateLabel(boq.template_id)} template.`}
          settingsNode={null}
          templateValue={boq.template_id}
          onTemplateChange={(template_id) => persist({ template_id })}
          templates={SHARED_TABLE_TEMPLATES}
          actions={[
            { label: 'Export Images', onClick: () => setExportState('capturing'), variant: 'outline' },
            { label: pdfGenerating ? 'Preparing...' : 'Download PDF', onClick: () => void handleExportPdf(), className: 'bg-slate-950 text-white hover:bg-slate-800', disabled: pdfGenerating },
          ]}
        />

        <ConfirmActionDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete this BOQ?"
          description="This local BOQ will be removed from this device."
          confirmLabel="Delete BOQ"
          onConfirm={() => {
            deleteBoq(boq.id)
            toast({ title: 'BOQ deleted' })
            navigate('/boqs')
          }}
        />

        {exportState === 'capturing' ? (
          <TableDocumentExportController
            documentType="boq"
            templateId={boq.template_id}
            document={boq}
            rows={boq.table_rows}
            columns={boq.table_columns}
            onDone={(images) => {
              setCapturedImages(images)
              setExportState('reviewing')
            }}
            onCancel={() => setExportState('idle')}
          />
        ) : null}

        {exportState === 'reviewing' ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">{capturedImages.length} image export{capturedImages.length === 1 ? '' : 's'} ready</div>
            <div className="mt-3 flex gap-2">
              {capturedImages.map((src, index) => (
                <img key={src} src={src} alt={`BOQ segment ${index + 1}`} className="h-24 rounded-lg border border-slate-200 object-cover" />
              ))}
            </div>
          </div>
        ) : null}

        <DocumentFloatingFab onClick={() => setShowExportSheet(true)} label="Open export options" />

        <DocumentBottomBar
          actions={[
            { label: 'Back', onClick: () => navigate('/boqs'), variant: 'outline' },
            { label: 'Edit', onClick: () => navigate(`/boqs/edit/${boq.id}`), variant: 'outline' },
            { label: pdfGenerating ? 'Preparing...' : 'Export', onClick: () => setShowExportSheet(true), className: 'bg-slate-950 text-white hover:bg-slate-800', disabled: pdfGenerating },
          ]}
        />
      </div>
    </Layout>
  )
}
