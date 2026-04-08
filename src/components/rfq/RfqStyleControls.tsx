import React from 'react';
import { RFQ_PRESETS, Rfq } from '@/domain/rfq/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RfqStyleControlsProps {
  rfq: Rfq;
  onUpdate: (updates: Partial<Rfq>) => void;
}

export const RfqStyleControls: React.FC<RfqStyleControlsProps> = ({ rfq, onUpdate }) => {
  const handlePresetSelect = (presetName: string) => {
    const preset = RFQ_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      onUpdate({
        preset_name: presetName,
        background_color: preset.background,
        text_color: preset.text,
        border_color: preset.border,
        accent_color: preset.accent,
      });
    }
  };

  const slots = [
    { label: 'Background', key: 'background_color', value: rfq.background_color },
    { label: 'Text', key: 'text_color', value: rfq.text_color },
    { label: 'Border', key: 'border_color', value: rfq.border_color },
    { label: 'Accent', key: 'accent_color', value: rfq.accent_color },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label className={pageFormLabelClassName}>Saved Presets</Label>
        <div className="grid grid-cols-1 gap-2">
          {RFQ_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePresetSelect(p.name)}
              className={cn(
                "group relative flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left",
                rfq.preset_name === p.name ? "border-slate-900 bg-slate-50" : "border-border hover:border-slate-300"
              )}
            >
              <div className="flex gap-1 shrink-0">
                <div className="h-6 w-6 rounded-sm border" style={{ backgroundColor: p.background }} />
                <div className="h-6 w-6 rounded-sm border" style={{ backgroundColor: p.text }} />
                <div className="h-6 w-6 rounded-sm border" style={{ backgroundColor: p.border }} />
                <div className="h-6 w-6 rounded-sm border" style={{ backgroundColor: p.accent }} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-black uppercase tracking-widest">{p.name}</div>
              </div>
              {rfq.preset_name === p.name && (
                <Check className="h-4 w-4 text-slate-900" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-border space-y-4">
        <Label className={pageFormLabelClassName}>Manual Configuration</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {slots.map((slot) => (
            <div key={slot.key} className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{slot.label}</Label>
              <div className="flex gap-2">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border shadow-sm"
                  style={{ backgroundColor: slot.value }}
                />
                <Input
                  value={slot.value}
                  onChange={(e) => onUpdate({ [slot.key]: e.target.value })}
                  className="h-10 text-xs font-mono uppercase"
                  placeholder="#HEXCODE"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
