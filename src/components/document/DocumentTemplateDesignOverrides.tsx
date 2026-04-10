import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { DocumentDesignStyleEditor } from '@/components/document/DocumentDesignControls'

type DocumentTemplateDesignOverridesProps = {
  value: PdfDesignPreset
  onChange: (next: PdfDesignPreset) => void
}

function OverrideToggle({
  checked,
  onToggle,
}: {
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-slate-950' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function DocumentTemplateDesignOverrides({
  value,
  onChange,
}: DocumentTemplateDesignOverridesProps) {
  const update = (patch: Partial<PdfDesignPreset>) => {
    onChange({
      ...value,
      ...patch,
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-border bg-card">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Custom colors</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Turn this on to override the template accent with the saved hex color controls.
            </div>
          </div>
          <OverrideToggle checked={value.useCustomColors} onToggle={() => update({ useCustomColors: !value.useCustomColors })} />
        </div>
        {value.useCustomColors ? (
          <div className="border-t border-slate-100 px-4 py-4">
            <DocumentDesignStyleEditor
              value={value}
              onChange={onChange}
              showAccentControls
              showFontControls={false}
              showFillableControls={false}
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-[20px] border border-border bg-card">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Custom fonts</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Downloaded invoice and quotation PDFs currently use safe built-in PDF fonts while custom export font rendering is temporarily unavailable.
            </div>
          </div>
          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
            Export fonts unavailable
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="rounded-[18px] border border-dashed border-amber-200 bg-amber-50/70 px-4 py-4 text-sm leading-6 text-amber-900">
            Header and body font pickers are hidden for now so the PDF settings panel does not promise custom typography in downloaded files. Accent color overrides still apply to the shared PDF templates.
          </div>
        </div>
      </div>
    </div>
  )
}
