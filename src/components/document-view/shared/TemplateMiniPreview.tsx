/**
 * TemplateMiniPreview — shared lightweight thumbnail for template pickers.
 *
 * Renders a deterministic miniature document from theme tokens only.
 * Uses no live business data and generates no PDFs.
 *
 * Layouts:
 * - `service` — header bar, section title, content lines (CSR, Waybill).
 * - `commercial` — header bar, meta chips, table rows, totals block
 *   (Invoice, Quotation).
 *
 * Footprint is fixed at 80px height to match the established
 * CSR/Waybill picker cards.
 */

export interface TemplateMiniTheme {
  pageBg: string
  headerBg: string
  headerFg: string
  accent: string
  border: string
  mutedBg: string
  /** Optional section-title bar color (CSR variants). Falls back to accent. */
  sectionTitleBg?: string
}

interface TemplateMiniPreviewProps {
  theme: TemplateMiniTheme
  layout?: 'service' | 'commercial'
  /** Waybill-style accent rule between header and body. */
  accentRule?: boolean
}

export default function TemplateMiniPreview({
  theme,
  layout = 'service',
  accentRule = false,
}: TemplateMiniPreviewProps) {
  return (
    <div
      className="flex h-[80px] flex-col overflow-hidden rounded-[12px] border"
      style={{ backgroundColor: theme.pageBg, borderColor: theme.border }}
    >
      {/* Header bar */}
      <div
        className="flex h-[18px] shrink-0 items-center gap-1.5 px-2"
        style={{ backgroundColor: theme.headerBg }}
      >
        <div
          className="h-[4px] w-[40%] rounded-full"
          style={{ backgroundColor: theme.headerFg, opacity: 0.8 }}
        />
      </div>

      {accentRule ? (
        <div className="h-[3px] shrink-0" style={{ backgroundColor: theme.accent }} />
      ) : null}

      {layout === 'commercial' ? (
        <CommercialMiniBody theme={theme} />
      ) : (
        <ServiceMiniBody theme={theme} />
      )}
    </div>
  )
}

function ServiceMiniBody({ theme }: { theme: TemplateMiniTheme }) {
  return (
    <>
      {/* Section title */}
      <div className="px-2 pt-1.5">
        <div
          className="h-[6px] w-[55%] rounded-sm"
          style={{ backgroundColor: theme.sectionTitleBg || theme.accent }}
        />
      </div>
      {/* Content lines */}
      <div className="flex flex-1 flex-col justify-center gap-1 px-2 pb-1.5">
        <div className="h-[3px] w-full rounded-full" style={{ backgroundColor: theme.border }} />
        <div className="h-[3px] w-[75%] rounded-full" style={{ backgroundColor: theme.border, opacity: 0.6 }} />
        <div className="h-[3px] w-[60%] rounded-full" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
      </div>
    </>
  )
}

function CommercialMiniBody({ theme }: { theme: TemplateMiniTheme }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-[3px] px-2 pb-1.5 pt-1">
      {/* Meta chips */}
      <div className="flex gap-1">
        <div className="h-[5px] w-[30%] rounded-full" style={{ backgroundColor: theme.mutedBg }} />
        <div className="h-[5px] w-[22%] rounded-full" style={{ backgroundColor: theme.mutedBg }} />
      </div>
      {/* Table header + rows */}
      <div className="h-[7px] w-full rounded-[3px]" style={{ backgroundColor: theme.mutedBg }} />
      <div className="h-[3px] w-full rounded-full" style={{ backgroundColor: theme.border }} />
      <div className="h-[3px] w-[70%] rounded-full" style={{ backgroundColor: theme.border, opacity: 0.6 }} />
      {/* Totals block */}
      <div className="flex justify-end">
        <div
          className="h-[7px] w-[38%] rounded-[3px]"
          style={{ backgroundColor: theme.accent, opacity: 0.75 }}
        />
      </div>
    </div>
  )
}
