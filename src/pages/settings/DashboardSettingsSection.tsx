import { useState } from 'react'
import DashboardQuickTilesSettings from '@/components/settings/DashboardQuickTilesSettings'
import {
  ALL_QUICK_TILE_IDS,
  QUICK_TILE_COUNT,
  QUICK_TILE_REGISTRY,
  loadStoredQuickTiles,
  saveStoredQuickTiles,
} from '@/config/quickTiles'

export function DashboardSettingsSection() {
  const [flashTile, setFlashTile] = useState<string | null>(null)
  const [activeTiles, setActiveTiles] = useState<string[]>(() => loadStoredQuickTiles())
  const quickTilesWindow = window as Window & { __quickTilesFlashTimeout?: number }

  const saveTiles = (nextTiles: string[]) => {
    const savedTiles = saveStoredQuickTiles(nextTiles)
    setActiveTiles(savedTiles)
    setFlashTile(savedTiles[savedTiles.length - 1] || 'saved')
    window.clearTimeout(quickTilesWindow.__quickTilesFlashTimeout)
    quickTilesWindow.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
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
    window.clearTimeout(quickTilesWindow.__quickTilesFlashTimeout)
    quickTilesWindow.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
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
    <DashboardQuickTilesSettings
      activeTiles={activeTiles.slice(0, QUICK_TILE_COUNT)}
      flashTile={flashTile}
      onSelectTile={updateTileAt}
      onMoveTile={moveTile}
      registry={QUICK_TILE_REGISTRY}
      optionIds={ALL_QUICK_TILE_IDS}
    />
  )
}
