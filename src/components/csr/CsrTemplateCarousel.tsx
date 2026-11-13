import React, { useMemo } from 'react'
import { FileCheck, Info } from 'lucide-react'
import TemplatePickerCarousel, {
  type TemplatePickerOption,
} from '@/components/document-view/shared/TemplatePickerCarousel'
import type { TemplateMiniTheme } from '@/components/document-view/shared/TemplateMiniPreview'
import { CSR_TEMPLATE_OPTIONS, CSR_TEMPLATE_VARIANTS } from './CSRPreviewContent'

type TemplateOption = {
  key: string
  label: string
  blurb: string
  accent: string
  badge?: string
}

function getCsrVariantKey(key: string) {
  if (key === '3') return 'zinc'
  if (key === '6') return 'minimal'
  if (key === '8') return 'industry'
  if (key === 'csr-blueprint-landscape' || key === 'csr-blueprint-technical-drawinglandscape.html') return 'blueprint'
  if (key === 'csr-reference-portrait' || key === 'csr-final-pdfcn-reference.html') return 'reference'
  return 'industry'
}

/**
 * High-fidelity miniature preview for the Landscape Blueprint template.
 * Conveys the CAD drawing frame, dark blueprint header, BOM table, and title block.
 */
function BlueprintMiniPreview() {
  return (
    <div className="flex h-[80px] w-full flex-col overflow-hidden rounded-[12px] border border-[#0c1e38] bg-[#f8fafc]">
      {/* Blueprint Header */}
      <div className="flex h-[17px] shrink-0 items-center justify-between bg-[#0c1e38] px-2">
        <div className="flex items-center gap-1">
          <div className="h-[3px] w-8 rounded-full bg-blue-300/80" />
          <span className="font-mono text-[7px] font-bold tracking-wider text-blue-200">CAD</span>
        </div>
        <div className="rounded-[2px] bg-blue-900/60 px-1 py-0.2 font-mono text-[6.5px] font-bold text-amber-300">
          REV 01
        </div>
      </div>

      {/* Blueprint Body: 2 Columns & Engineering BOM Grid */}
      <div className="flex flex-1 flex-col justify-between p-1.5 font-mono text-[6px]">
        {/* Upper Workspace: Left Plate + Right Dossier */}
        <div className="grid grid-cols-2 gap-1">
          <div className="space-y-1 rounded-[2px] border border-blue-200 bg-blue-50/50 p-1">
            <div className="h-[2.5px] w-3/4 rounded-full bg-[#0c1e38]/50" />
            <div className="h-[2px] w-1/2 rounded-full bg-[#0c1e38]/30" />
          </div>
          <div className="space-y-1 rounded-[2px] border border-blue-200 bg-blue-50/50 p-1">
            <div className="h-[2.5px] w-2/3 rounded-full bg-[#0c1e38]/50" />
            <div className="h-[2px] w-4/5 rounded-full bg-[#0c1e38]/30" />
          </div>
        </div>

        {/* 4-Column BOM Schedule Miniature Lines */}
        <div className="grid grid-cols-4 gap-0.5 rounded-[2px] border border-slate-300 bg-white p-0.5">
          <div className="h-[2px] rounded-xs bg-slate-300" />
          <div className="h-[2px] rounded-xs bg-slate-300" />
          <div className="h-[2px] rounded-xs bg-slate-300" />
          <div className="h-[2px] rounded-xs bg-slate-300" />
        </div>

        {/* Bottom Title Block */}
        <div className="flex items-center justify-between border-t border-blue-200 pt-0.5">
          <div className="h-[2px] w-1/3 rounded-full bg-[#0c1e38]/40" />
          <div className="h-[2px] w-1/4 rounded-full bg-[#0c1e38]/30" />
        </div>
      </div>
    </div>
  )
}

/**
 * High-fidelity miniature preview for the Portrait Reference template.
 * Conveys the master black header, golden amber docket bar, and structured table layout.
 */
function ReferenceMiniPreview() {
  return (
    <div className="flex h-[80px] w-full flex-col overflow-hidden rounded-[12px] border border-[#111111] bg-white">
      {/* Master Black Masthead */}
      <div className="flex h-[17px] shrink-0 items-center justify-between bg-[#111111] px-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-3 w-3 items-center justify-center rounded-[1px] bg-white font-mono text-[7px] font-extrabold text-[#111111]">
            SS
          </div>
          <div className="h-[3px] w-10 rounded-full bg-white/80" />
        </div>
        <div className="h-[3px] w-5 rounded-full bg-neutral-400" />
      </div>

      {/* Signal Amber Docket Bar */}
      <div className="h-[3px] w-full shrink-0 bg-[#f59e0b]" />

      {/* Structured Body: Customer & Equipment Details + Table Rows */}
      <div className="flex flex-1 flex-col justify-between p-1.5">
        <div className="space-y-1">
          <div className="flex gap-1">
            <div className="h-[3px] w-1/2 rounded-full bg-neutral-200" />
            <div className="h-[3px] w-1/3 rounded-full bg-neutral-200" />
          </div>
          <div className="h-[3px] w-4/5 rounded-full bg-neutral-100" />
        </div>

        {/* Readings Table Rows */}
        <div className="space-y-0.5 rounded-[2px] border border-neutral-200 bg-neutral-50 p-1">
          <div className="h-[2.5px] w-full rounded-xs bg-neutral-300" />
          <div className="h-[2px] w-2/3 rounded-xs bg-neutral-200" />
        </div>

        {/* Dual Sign-off Blocks */}
        <div className="flex justify-between border-t border-neutral-200 pt-0.5">
          <div className="h-[2px] w-1/3 rounded-full bg-neutral-300" />
          <div className="h-[2px] w-1/3 rounded-full bg-neutral-300" />
        </div>
      </div>
    </div>
  )
}

interface CsrTemplateCarouselProps {
  value: string
  onChange: (templateId: string) => void
}

export default function CsrTemplateCarousel({ value, onChange }: CsrTemplateCarouselProps) {
  const options = useMemo<TemplatePickerOption[]>(() => {
    const source = CSR_TEMPLATE_OPTIONS as TemplateOption[]
    const variants = CSR_TEMPLATE_VARIANTS as Record<string, TemplateMiniTheme>

    return source.map((option) => {
      const isBlueprint = option.key === 'csr-blueprint-landscape'
      const isReference = option.key === 'csr-reference-portrait'

      let customPreview: React.ReactNode = undefined
      if (isBlueprint) {
        customPreview = <BlueprintMiniPreview />
      } else if (isReference) {
        customPreview = <ReferenceMiniPreview />
      }

      return {
        id: option.key,
        label: option.label,
        blurb: option.blurb,
        layout: 'service' as const,
        theme: variants[getCsrVariantKey(option.key)],
        badge: option.badge,
        customPreview,
      }
    })
  }, [])

  const isCadStandard = value === 'csr-blueprint-landscape'
    || value === 'csr-blueprint-technical-drawinglandscape.html'
    || value === 'csr-reference-portrait'
    || value === 'csr-final-pdfcn-reference.html'

  return (
    <div className="space-y-2">
      <TemplatePickerCarousel value={value} onChange={onChange} options={options} />

      {/* Informative banner for PDFCN High-Precision CAD & Reference standards */}
      {isCadStandard ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
          <div className="flex items-start gap-2.5">
            <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-sky-900 dark:text-sky-100">
                <span>
                  {value === 'csr-blueprint-landscape'
                    ? 'A4 Landscape Technical Blueprint (Forme Engine)'
                    : 'A4 Portrait Reference Standard (Forme Engine)'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
                Built for physical on-site verification and print compliance. Typography is locked to the technical standard;
                fillable handwriting areas (print name, designation, date, signature block) honour your ink colour and handwriting font.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
