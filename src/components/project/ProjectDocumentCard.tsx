import { Copy, Download, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  formatProjectDocumentCurrency,
  getProjectDocumentFileName,
  getProjectDocumentImages,
  getProjectDocumentKeyFields,
  getProjectDocumentMainLabel,
  getProjectDocumentRawJson,
  getProjectDocumentSummaryParts,
  getProjectDocumentTypeMeta,
  type ProjectDocumentRecord,
} from '@/domain/projectDocuments'
import { useToast } from '@/hooks/use-toast'

type ProjectDocumentCardProps = {
  document: ProjectDocumentRecord
  onDelete: (id: string) => void
}

const typeConfig = {
  purchase_order: {
    label: 'PO',
    badge: 'bg-blue-500 text-white',
    border: 'border-l-blue-500',
  },
  receipt: {
    label: 'Receipt',
    badge: 'bg-emerald-500 text-white',
    border: 'border-l-emerald-500',
  },
  receiving_waybill: {
    label: 'Waybill',
    badge: 'bg-orange-500 text-white',
    border: 'border-l-orange-500',
  },
  other: {
    label: 'Other',
    badge: 'bg-slate-500 text-white',
    border: 'border-l-slate-500',
  },
}

export default function ProjectDocumentCard({ document, onDelete }: ProjectDocumentCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()

  const config = typeConfig[document.type as keyof typeof typeConfig] || typeConfig.other
  const summaryParts = getProjectDocumentSummaryParts(document)
  const keyFields = getProjectDocumentKeyFields(document)
  const mainLabel = getProjectDocumentMainLabel(document)
  const rawJson = getProjectDocumentRawJson(document)
  const totalField = keyFields.find((field) => field.label === 'Total' || field.label === 'Amount')
  const meta = getProjectDocumentTypeMeta(document)
  const images = getProjectDocumentImages(document)
  const previewImage = images.length > 0 ? images[0] : null

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(rawJson)
      toast({ title: 'Copied', description: 'Document JSON copied.' })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy JSON.', variant: 'destructive' })
    }
  }

  const handleExport = async () => {
    try {
      const [{ pdf }, { default: ProjectDocumentPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/project/ProjectDocumentPDF'),
      ])
      const blob = await pdf(<ProjectDocumentPDF document={document} />).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = getProjectDocumentFileName(document)
      window.document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => {
        window.document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      }, 100)
      toast({ title: 'PDF ready', description: `${meta.label} exported for internal use.` })
    } catch (error) {
      console.error(error)
      toast({ title: 'Export failed', description: 'Could not generate the PDF for this document.' })
    }
  }

  return (
    <div className={`rounded-[24px] border-l-4 border border-zinc-200 bg-card p-4 shadow-sm ${config.border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${config.badge}`}>
              {config.label}
            </span>
            <span className="text-sm font-bold text-zinc-900">{mainLabel}</span>
          </div>
          {summaryParts.length > 0 ? <div className="mt-2 text-sm text-zinc-600">{summaryParts.join('  |  ')}</div> : null}
        </div>

        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(document.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {keyFields.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {keyFields.slice(0, 4).map((field) => (
            <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{field.label}</div>
              <div className="mt-1 text-sm font-medium text-zinc-900">{field.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {previewImage ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
          <img
            src={previewImage.url}
            alt={previewImage.label || 'Document image'}
            className="h-28 w-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'
            }}
          />
          {previewImage.label ? (
            <div className="px-3 py-1.5 text-[11px] font-medium text-zinc-500">{previewImage.label}</div>
          ) : null}
        </div>
      ) : null}

      {totalField?.value ? (
        <div className="mt-3 text-sm font-semibold text-zinc-700">
          {totalField.label}: {totalField.value}
        </div>
      ) : Number(document.vat || 0) > 0 || Number(document.wht || 0) > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
          {Number(document.vat || 0) > 0 ? <span>VAT {formatProjectDocumentCurrency(document.vat)}</span> : null}
          {Number(document.wht || 0) > 0 ? <span>WHT {formatProjectDocumentCurrency(document.wht)}</span> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl border-zinc-200 bg-card text-zinc-700 hover:bg-zinc-50"
          onClick={() => navigate(`/projects/${document.project_id}/documents/${document.id}`)}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          View Document
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-xl border-zinc-200 bg-card text-zinc-700 hover:bg-zinc-50" onClick={handleCopyJson}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copy JSON
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-xl border-zinc-200 bg-card text-zinc-700 hover:bg-zinc-50" onClick={handleExport}>
          <Download className="mr-1.5 h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </div>
  )
}
