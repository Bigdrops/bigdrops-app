import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'

import { TableDocumentExportSegment } from './TableDocumentExportSegment'
import { feedback } from '@/lib/feedback'
import { chunkTableRows } from '@/domain/rfq/exportHelpers'
import { useLoadingTip } from '@/hooks/useLoadingTip'
import QuickTipCard from '@/components/app/QuickTipCard'
import type { TableDocumentColumn, TableDocumentRow, TableDocumentType, TableTemplateId } from '@/domain/table-document/types'

type DocumentLike = {
  title?: string
  notes?: string
  issue_date?: string
  rfq_number?: string
  boq_number?: string
  vendor_name?: string
  vendor_contact?: string
  show_vendor_identity?: boolean
  show_brand_name?: boolean
  brand_name_override?: string
  background_color?: string
  text_color?: string
  border_color?: string
  accent_color?: string
}

type Props = {
  documentType: TableDocumentType
  templateId: TableTemplateId
  document: DocumentLike | null
  rows: TableDocumentRow[]
  columns: TableDocumentColumn[]
  onDone: (images: string[]) => void
  onCancel: () => void
}

export function TableDocumentExportController({
  documentType,
  templateId,
  document,
  rows,
  columns,
  onDone,
  onCancel,
}: Props) {
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([])
  const [capturing, setCapturing] = useState(false)
  const chunks = useMemo(() => chunkTableRows(rows, 10), [rows])

  const captureAll = useCallback(async () => {
    if (!document || chunks.length === 0) return
    setCapturing(true)
    await new Promise((resolve) => setTimeout(resolve, 800))

    try {
      const images: string[] = []
      for (let index = 0; index < chunks.length; index += 1) {
        const element = segmentRefs.current[index]
        if (!element) continue
        const dataUrl = await toPng(element, { pixelRatio: 2, quality: 0.95, skipFonts: false })
        images.push(dataUrl)
      }
      onDone(images)
    } catch (error) {
      console.error('Capture failed', error)
      feedback.error('Export failed', { description: 'Could not capture segments.' })
      onCancel()
    } finally {
      setCapturing(false)
    }
  }, [chunks, document, onCancel, onDone])

  useEffect(() => {
    if (document && chunks.length > 0) {
      void captureAll()
    }
  }, [captureAll, chunks.length, document])

  const { tip } = useLoadingTip({
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    active: capturing,
  })

  if (!document) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
      <div className="text-center p-8 bg-card rounded-[32px] border border-border/50 shadow-2xl flex flex-col items-center gap-4">
        <div className="p-4 bg-primary/10 rounded-full animate-spin-slow">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight">Generating Output</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Preparing {chunks.length} segmented {chunks.length === 1 ? 'image' : 'images'}...
          </p>
        </div>
        {tip ? <QuickTipCard message={tip.message} className="mt-2 w-full max-w-[280px] rounded-[18px] border border-border bg-card/80 px-3 py-2.5" /> : null}
      </div>

      <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none opacity-0">
        {chunks.map((chunk, index) => (
          <TableDocumentExportSegment
            key={`table-document-segment-${index}`}
            documentType={documentType}
            templateId={templateId}
            document={document}
            rows={chunk}
            columns={columns}
            onRef={(element) => {
              segmentRefs.current[index] = element
            }}
          />
        ))}
      </div>
      {capturing ? null : null}
    </div>
  )
}
