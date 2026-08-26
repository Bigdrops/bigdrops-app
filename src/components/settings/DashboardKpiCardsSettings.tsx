import * as React from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { KpiMetricId } from '@/config/kpiCards'
import { KPI_METRIC_REGISTRY, TONE_CHIP_CLASS } from '@/config/kpiCards'

type DashboardKpiCardsSettingsProps = {
  activeMetrics: KpiMetricId[]
  flashMetric: string | null
  onSelectMetric: (index: number, nextId: KpiMetricId) => void
  onMoveMetric: (index: number, direction: 'up' | 'down') => void
}

export default function DashboardKpiCardsSettings({
  activeMetrics,
  flashMetric,
  onSelectMetric,
  onMoveMetric,
}: DashboardKpiCardsSettingsProps) {
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null)
  const selectedMetricId = pickerIndex == null ? null : activeMetrics[pickerIndex]

  const closePicker = () => setPickerIndex(null)

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-700/80">
          Dashboard KPIs
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        <div className="border-b border-slate-200/80 bg-violet-50/40 px-4 py-3.5">
          <div className="text-sm font-bold text-slate-900">KPI Cards</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Choose the four metrics shown on your dashboard and reorder them.
          </div>
        </div>

        {activeMetrics.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No KPI metrics configured.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80">
            {activeMetrics.map((metricId, index) => {
              const metric = KPI_METRIC_REGISTRY[metricId]
              if (!metric) return null

              return (
                <div
                  key={`${metricId}-${index}`}
                  className={cn(
                    'px-4 py-4 transition-colors',
                    flashMetric === metricId && 'bg-emerald-50/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-black uppercase text-white',
                        TONE_CHIP_CLASS[metric.tone],
                      )}
                    >
                      {metric.label.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h4 className="truncate text-sm font-bold text-slate-900">{metric.label}</h4>
                        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                          Card {index + 1}
                        </span>
                      </div>

                      <p className="mt-0 text-[12px] leading-5 text-muted-foreground">
                        {metric.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPickerIndex(index)}
                          className="group inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-bd-surface px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-violet-50/50"
                        >
                          <span className="truncate">Change Metric</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400" />
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onMoveMetric(index, 'up')}
                            disabled={index === 0}
                            aria-label={`Move card ${index + 1} up`}
                            className="h-9 w-9 rounded-xl border-slate-200/80 bg-bd-surface p-0 text-slate-600 shadow-none hover:bg-slate-50"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onMoveMetric(index, 'down')}
                            disabled={index === activeMetrics.length - 1}
                            aria-label={`Move card ${index + 1} down`}
                            className="h-9 w-9 rounded-xl border-slate-200/80 bg-bd-surface p-0 text-slate-600 shadow-none hover:bg-slate-50"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={pickerIndex != null} onOpenChange={(open) => !open && closePicker()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-[24px] border-border bg-card px-0 pb-6 pt-0"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

          <SheetHeader className="flex-row items-start justify-between gap-4 px-4 pb-4 pt-5 text-left">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-extrabold tracking-[-0.03em] text-foreground">
                Choose Metric
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                {pickerIndex == null
                  ? 'Select a dashboard KPI.'
                  : `Select the metric for Card ${pickerIndex + 1}.`}
              </SheetDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={closePicker}
              className="h-9 w-9 rounded-xl border-slate-200/80 bg-bd-surface p-0 shadow-none"
              aria-label="Close metric picker"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="max-h-[var(--bd-overlay-sheet-max-height)] overflow-y-auto px-4 pb-2">
            <div className="space-y-2">
              {(Object.keys(KPI_METRIC_REGISTRY) as KpiMetricId[]).map((optionId) => {
                const option = KPI_METRIC_REGISTRY[optionId]
                const isSelected = selectedMetricId === optionId

                return (
                  <button
                    key={optionId}
                    type="button"
                    onClick={() => {
                      if (pickerIndex == null) return
                      onSelectMetric(pickerIndex, optionId)
                      closePicker()
                    }}
                    className={cn(
                      'grid w-full grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3 rounded-2xl border border-slate-200/80 bg-bd-surface px-3 py-3 text-left transition-colors hover:bg-violet-50/40',
                      isSelected && 'border-violet-200 bg-violet-50/50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-xl text-[15px] font-black uppercase text-white',
                        TONE_CHIP_CLASS[option.tone],
                      )}
                    >
                      {option.label.charAt(0)}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-0 block text-[12px] leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>

                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-slate-300 bg-bd-surface text-transparent',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
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
