import { useState } from 'react'
import { LayoutDashboard, Pencil, Check } from 'lucide-react'
import DashboardQuickTilesSettings from '@/components/settings/DashboardQuickTilesSettings'
import {
  ALL_QUICK_TILE_IDS,
  QUICK_TILE_COUNT,
  QUICK_TILE_REGISTRY,
  loadStoredQuickTiles,
  saveStoredQuickTiles,
} from '@/config/quickTiles'
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
import { cn } from '@/lib/utils'

export function DashboardSettingsSection() {
  const [flashTile, setFlashTile] = useState<string | null>(null)
  const [activeTiles, setActiveTiles] = useState<string[]>(() => loadStoredQuickTiles())
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const quickTilesWindow = window as Window & { __quickTilesFlashTimeout?: number }

  const saveTiles = (nextTiles: string[]) => {
    const savedTiles = saveStoredQuickTiles(nextTiles)
    setActiveTiles(savedTiles)
    setFlashTile(savedTiles[savedTiles.length - 1] || 'saved')
    window.clearTimeout(quickTilesWindow.__quickTilesFlashTimeout)
    quickTilesWindow.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
    feedback.success('Dashboard layout updated')
  }

  const updateTileAt = (tileIndex: number, nextTileId: string) => {
    const currentTileId = activeTiles[tileIndex]
    if (!nextTileId || currentTileId === nextTileId) return

    const existingIndex = activeTiles.indexOf(nextTileId)
    const nextTiles = [...activeTiles]

    if (existingIndex >= 0) {
      nextTiles[existingIndex] = currentTileId
    }

    nextTiles[tileIndex] = nextTileId
    saveTiles(nextTiles)
    setFlashTile(nextTileId)
  }

  const moveTile = (tileIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? tileIndex - 1 : tileIndex + 1
    if (targetIndex < 0 || targetIndex >= activeTiles.length) return
    const nextTiles = [...activeTiles]
    const [movedTile] = nextTiles.splice(tileIndex, 1)
    nextTiles.splice(targetIndex, 0, movedTile)
    saveTiles(nextTiles)
    setFlashTile(movedTile)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))] opacity-60">
            Interface Layout
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-xs font-bold shadow-sm hover:bg-[hsl(var(--bd-surface-muted))]"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Configure Layout
        </Button>
      </div>

      <SettingsSummaryCard 
        title="Quick Tiles"
        description="Priority shortcuts pinned to your dashboard for rapid access."
      >
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeTiles.slice(0, QUICK_TILE_COUNT).map((tileId, idx) => {
              const tile = QUICK_TILE_REGISTRY[tileId]
              if (!tile) return null
              const Icon = tile.icon
              return (
                <div key={tileId} className="flex flex-col items-center gap-2 p-3 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)/0.3)] bg-[hsl(var(--bd-surface-muted)/0.1)] transition-all hover:bg-[hsl(var(--bd-surface-muted)/0.2)]">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm", tile.iconBg)}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--bd-text))]">{tile.label}</span>
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
              Rearrange or swap quick tiles to optimize your daily workflow.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-6">
              <DashboardQuickTilesSettings
                activeTiles={activeTiles.slice(0, QUICK_TILE_COUNT)}
                flashTile={flashTile}
                onSelectTile={updateTileAt}
                onMoveTile={moveTile}
                registry={QUICK_TILE_REGISTRY}
                optionIds={ALL_QUICK_TILE_IDS}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-8 border-t border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg)/0.95)] px-6 py-4 backdrop-blur-sm flex items-center justify-end">
             <Button 
                onClick={() => setIsEditorOpen(false)}
                className="min-w-[120px] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] hover:opacity-90 rounded-xl font-bold"
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

