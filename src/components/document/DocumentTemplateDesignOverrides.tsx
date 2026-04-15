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
              Turn this on to override the template header and body fonts for exported PDFs.
            </div>
          </div>
          <OverrideToggle checked={value.useCustomFonts} onToggle={() => update({ useCustomFonts: !value.useCustomFonts })} />
        </div>
        {value.useCustomFonts ? (
          <div className="border-t border-slate-100 px-4 py-4">
            <DocumentDesignStyleEditor
              value={value}
              onChange={onChange}
              showAccentControls={false}
              showFontControls
              showFillableControls={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
