import React from 'react';
import { BackgroundMode, RFQ_PALETTES, Rfq } from '@/domain/rfq/types'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'
import { Check, Palette, Brush, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RfqStyleControlsProps {
  rfq: Rfq;
  onUpdate: (updates: Partial<Rfq>) => void;
}

export const RfqStyleControls: React.FC<RfqStyleControlsProps> = ({ rfq, onUpdate }) => {
  const modes: { label: string; value: BackgroundMode; icon: any }[] = [
    { label: 'Palette', value: 'palette', icon: Palette },
    { label: 'Solid', value: 'solid', icon: Brush },
    { label: 'Gradient', value: 'gradient', icon: Plus },
  ];

  const handlePaletteSelect = (paletteName: string) => {
    const palette = RFQ_PALETTES.find((p) => p.name === paletteName);
    if (palette) {
      onUpdate({
        palette_name: paletteName,
        background_primary: palette.colors[1],
        background_secondary: palette.colors[3],
        accent_color: palette.colors[2],
        text_color: palette.colors[3],
        background_mode: 'palette',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Label className={pageFormLabelClassName}>Style Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((mode) => (
            <Button
              key={mode.value}
              variant={rfq.background_mode === mode.value ? 'default' : 'outline'}
              className="flex flex-col h-14 gap-1 p-2"
              onClick={() => onUpdate({ background_mode: mode.value })}
            >
              <mode.icon className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold">{mode.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {rfq.background_mode === 'palette' && (
        <div className="space-y-4">
          <Label className={pageFormLabelClassName}>Preset Palettes</Label>
          <div className="grid grid-cols-2 gap-3">
            {RFQ_PALETTES.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePaletteSelect(p.name)}
                className={cn(
                  "relative h-12 rounded-lg border flex flex-col overflow-hidden text-left transition-all hover:ring-2 hover:ring-primary/20",
                  rfq.palette_name === p.name ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
              >
                <div className="flex-1 flex w-full">
                  {p.colors.map((c, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className={cn(
                  "px-2 py-1 text-[9px] font-bold uppercase truncate bg-background/80 backdrop-blur-sm",
                  rfq.palette_name === p.name ? "text-primary" : "text-muted-foreground"
                )}>
                  {p.name}
                </div>
                {rfq.palette_name === p.name && (
                  <div className="absolute top-1 right-1 h-3 w-3 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-2 w-2 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {(rfq.background_mode === 'solid' || rfq.background_mode === 'gradient') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={pageFormLabelClassName}>Primary Color</Label>
            <div className="flex gap-2">
              <div
                className="h-10 w-10 shrink-0 rounded-lg border"
                style={{ backgroundColor: rfq.background_primary }}
              />
              <Input
                value={rfq.background_primary}
                onChange={(e) => onUpdate({ background_primary: e.target.value })}
                className="h-10 text-xs font-mono"
                placeholder="#HEXCODE"
              />
            </div>
          </div>

          {rfq.background_mode === 'gradient' && (
            <div className="space-y-2">
              <Label className={pageFormLabelClassName}>Secondary Color</Label>
              <div className="flex gap-2">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border"
                  style={{ backgroundColor: rfq.background_secondary }}
                />
                <Input
                  value={rfq.background_secondary}
                  onChange={(e) => onUpdate({ background_secondary: e.target.value })}
                  className="h-10 text-xs font-mono"
                  placeholder="#HEXCODE"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={pageFormLabelClassName}>Accent Color</Label>
          <div className="flex gap-2">
            <div
              className="h-10 w-10 shrink-0 rounded-lg border"
              style={{ backgroundColor: rfq.accent_color }}
            />
            <Input
              value={rfq.accent_color}
              onChange={(e) => onUpdate({ accent_color: e.target.value })}
              className="h-10 text-xs font-mono"
              placeholder="#HEXCODE"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className={pageFormLabelClassName}>Text Color</Label>
          <div className="flex gap-2">
            <div
              className="h-10 w-10 shrink-0 rounded-lg border"
              style={{ backgroundColor: rfq.text_color }}
            />
            <Input
              value={rfq.text_color}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="h-10 text-xs font-mono"
              placeholder="#HEXCODE"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
