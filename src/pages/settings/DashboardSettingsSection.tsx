import { useState } from 'react'
import { BarChart3, Pencil, Check } from 'lucide-react'
import DashboardKpiCardsSettings from '@/components/settings/DashboardKpiCardsSettings'
import {
  KPI_CARD_COUNT_DESKTOP,
  KPI_METRIC_REGISTRY,
  loadStoredKpiCards,
  saveStoredKpiCards,
  type KpiMetricId,
} from '@/config/kpiCards'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function DashboardSettingsSection() {
  const [flashMetric, setFlashMetric] = useState<string | null>(null)
  const [activeMetrics, setActiveMetrics] = useState<KpiMetricId[]>(() => loadStoredKpiCards())
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const saveMetrics = (nextMetrics: KpiMetricId[]) => {
    const savedMetrics = saveStoredKpiCards(nextMetrics)
    setActiveMetrics(savedMetrics)
    setFlashMetric(savedMetrics[savedMetrics.length - 1] || 'saved')
    feedback.success('Dashboard KPIs updated')
  }

  const updateMetricAt = (metricIndex: number, nextMetricId: KpiMetricId) => {
    const currentMetricId = activeMetrics[metricIndex]
    if (!nextMetricId || currentMetricId === nextMetricId) return

    const existingIndex = activeMetrics.indexOf(nextMetricId)
    const nextMetrics = [...activeMetrics]

    if (existingIndex >= 0) {
      nextMetrics[existingIndex] = currentMetricId
    }

    nextMetrics[metricIndex] = nextMetricId
    saveMetrics(nextMetrics)
    setFlashMetric(nextMetricId)
  }

  const moveMetric = (metricIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? metricIndex - 1 : metricIndex + 1
    if (targetIndex < 0 || targetIndex >= activeMetrics.length) return
    const nextMetrics = [...activeMetrics]
    const [movedMetric] = nextMetrics.splice(metricIndex, 1)
    nextMetrics.splice(targetIndex, 0, movedMetric)
    saveMetrics(nextMetrics)
    setFlashMetric(movedMetric)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Interface Layout
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Configure KPIs
        </Button>
      </div>

      <SettingsSummaryCard
        title="Dashboard KPIs"
        description="The metrics pinned to your dashboard overview."
      >
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeMetrics.slice(0, KPI_CARD_COUNT_DESKTOP).map((metricId) => {
              const metric = KPI_METRIC_REGISTRY[metricId]
              if (!metric) return null
              return (
                <div
                  key={metricId}
                  className="flex flex-col items-center gap-2 p-3 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)/0.3)] bg-[hsl(var(--bd-surface-muted)/0.1)] transition-all hover:bg-[hsl(var(--bd-surface-muted)/0.2)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm">
                    <BarChart3 size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-bd-text">
                    {metric.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </SettingsSummaryCard>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Configure Dashboard</SheetTitle>
            <SheetDescription>
              Choose which four KPI metrics appear on your dashboard.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-6">
              <DashboardKpiCardsSettings
                activeMetrics={activeMetrics.slice(0, KPI_CARD_COUNT_DESKTOP)}
                flashMetric={flashMetric}
                onSelectMetric={updateMetricAt}
                onMoveMetric={moveMetric}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-8 border-t border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg)/0.95)] px-6 py-4 backdrop-blur-sm flex items-center justify-end">
            <Button
              onClick={() => setIsEditorOpen(false)}
              className="min-w-[120px] bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90 rounded-xl font-bold"
            >
              <Check className="mr-2 h-4 w-4" />
              Finish
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
