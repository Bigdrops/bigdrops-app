import * as React from 'react'
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type QuickTileOption = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  iconBg: string
}

type DashboardQuickTilesSettingsProps = {
  activeTiles: string[]
  flashTile: string | null
  onSelectTile: (index: number, nextId: string) => void
  onMoveTile: (index: number, direction: 'up' | 'down') => void
  registry: Record<string, QuickTileOption>
  optionIds: string[]
}

function getTileCategory(tileId: string, label: string) {
  return tileId.startsWith('new_') ? 'Create' : label
}

export default function DashboardQuickTilesSettings({
  activeTiles,
  flashTile,
  onSelectTile,
  onMoveTile,
  registry,
  optionIds,
}: DashboardQuickTilesSettingsProps) {
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null)
  const selectedTileId = pickerIndex == null ? null : activeTiles[pickerIndex]
  const selectedTile = selectedTileId ? registry[selectedTileId] : null

  const closePicker = () => setPickerIndex(null)

  const chooseTile = (nextTileId: string) => {
    if (pickerIndex == null) return
    onSelectTile(pickerIndex, nextTileId)
    closePicker()
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-5">
        <h3 className="text-[22px] font-black tracking-[-0.04em] text-foreground">
          Quick Tiles
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Local mobile preference only. Keep exactly four dashboard tiles on this
          device and swap each slot to the feature or create-action you want.
        </p>
      </div>

      <div className="divide-y divide-border/70 px-3 py-2">
        {activeTiles.slice(0, 4).map((tileId, index) => {
          const tile = registry[tileId]
          if (!tile) return null

          const Icon = tile.icon

          return (
            <article
              key={`${tileId}-${index}`}
              className={cn(
                'rounded-3xl px-3 py-4 transition-colors',
                flashTile === tileId && 'bg-emerald-50/70'
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    'grid h-14 w-14 shrink-0 place-items-center rounded-[18px] shadow-sm',
                    tile.iconBg
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="text-[18px] font-black tracking-[-0.04em] text-foreground">
                      Tile {index + 1}
                    </h4>
                    <span className="inline-flex h-7 items-center rounded-full border border-border bg-muted/50 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
                      {getTileCategory(tileId, tile.label)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {tile.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-[minmax(0,1fr),auto]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPickerIndex(index)}
                  className="h-14 w-full min-w-0 justify-between rounded-[18px] border-border bg-muted/30 px-4 text-left text-sm font-semibold text-foreground shadow-none hover:bg-muted/50"
                >
                  <span className="min-w-0 truncate">{tile.label}</span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMoveTile(index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move tile ${index + 1} up`}
                    className="h-14 w-14 rounded-[18px] border-border bg-card text-slate-700 shadow-sm hover:bg-muted/50"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMoveTile(index, 'down')}
                    disabled={index === activeTiles.length - 1}
                    aria-label={`Move tile ${index + 1} down`}
                    className="h-14 w-14 rounded-[18px] border-border bg-card text-slate-700 shadow-sm hover:bg-muted/50"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="px-6 pb-5 pt-2 text-xs leading-5 text-muted-foreground">
        Tap a tile field to change the assigned action. Reorder with the arrow
        buttons.
      </p>

      <Sheet open={pickerIndex != null} onOpenChange={(open) => !open && closePicker()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-[28px] border-border bg-card px-0 pb-6 pt-0"
        >
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-200" />

          <SheetHeader className="flex-row items-start justify-between gap-4 px-5 pb-4 pt-5 text-left">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[22px] font-black tracking-[-0.04em] text-foreground">
                Choose tile
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                Select the dashboard action for
                {pickerIndex == null ? ' this slot.' : ` Tile ${pickerIndex + 1}.`}
              </SheetDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={closePicker}
              className="h-10 w-10 rounded-2xl border-border bg-muted/30"
              aria-label="Close tile picker"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="max-h-[60vh] overflow-y-auto px-4 pb-2">
            <div className="grid gap-2.5">
              {optionIds.map((optionId) => {
                const option = registry[optionId]
                if (!option) return null

                const OptionIcon = option.icon
                const isSelected = selectedTileId === optionId

                return (
                  <button
                    key={optionId}
                    type="button"
                    onClick={() => chooseTile(optionId)}
                    className={cn(
                      'grid w-full grid-cols-[48px,minmax(0,1fr),auto] items-center gap-3 rounded-[20px] border border-border bg-card px-3.5 py-3.5 text-left transition-colors hover:bg-muted/40',
                      isSelected && 'border-blue-200 bg-blue-50/60'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-12 w-12 place-items-center rounded-2xl',
                        option.iconBg
                      )}
                    >
                      <OptionIcon className="h-6 w-6 text-white" />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                        {option.description}
                      </span>
                    </span>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600">
                        <Check className="h-4 w-4" />
                        Selected
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
