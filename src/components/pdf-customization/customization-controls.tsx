import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PDF_ACCENT_SWATCHES, PDF_FONT_OPTIONS, PDF_FILLABLE_FONT_OPTIONS } from '@/lib/pdfDesignPreset'

export function AccentColorSection({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Accent Color</Label>
      <div className="flex flex-wrap gap-2">
        {PDF_ACCENT_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            className={`h-6 w-6 rounded-full border-2 transition-all ${
              value === swatch ? 'border-bd-accent scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer"
      />
    </div>
  )
}

export function DocumentFontSection({
  value,
  onChange,
}: {
  value: string
  onChange: (font: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Document Font</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PDF_FONT_OPTIONS.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function HandwritingFontSection({
  value,
  onChange,
}: {
  value: string
  onChange: (font: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Handwriting Font</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PDF_FILLABLE_FONT_OPTIONS.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function HandwritingColorSection({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Handwriting Color</Label>
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer"
      />
    </div>
  )
}
