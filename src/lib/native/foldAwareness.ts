import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type FoldInfo = {
  available: boolean
  widthDp: number
  heightDp: number
  widthClass: 'compact' | 'medium' | 'expanded' | 'large' | 'extra_large'
  heightClass: 'compact' | 'medium' | 'expanded'
  layoutMode: 'mobile' | 'tablet' | 'desktop'
  isFoldable: boolean
  hasSeparatingFold: boolean
  isFlat: boolean
  isHalfOpened: boolean
  isTabletop: boolean
  isBookPosture: boolean
  orientation: 'horizontal' | 'vertical' | null
  state: 'flat' | 'half_opened' | null
  occlusionType: string | null
  foldBounds:
    | {
        left: number
        top: number
        right: number
        bottom: number
        width: number
        height: number
      }
    | null
}

type FoldAwarenessPlugin = {
  getInfo(): Promise<FoldInfo>
  start(): Promise<FoldInfo>
  stop(): Promise<void>
  addListener(
    eventName: 'foldInfoChanged',
    listenerFunc: (info: FoldInfo) => void,
  ): Promise<PluginListenerHandle>
}

const FoldAwareness = registerPlugin<FoldAwarenessPlugin>('FoldAwareness')

function getWebFallback(): FoldInfo {
  const width = window.innerWidth
  const height = window.innerHeight

  const widthClass =
    width < 600 ? 'compact' : width < 840 ? 'medium' : width < 1200 ? 'expanded' : width < 1600 ? 'large' : 'extra_large'

  const heightClass = height < 480 ? 'compact' : height < 900 ? 'medium' : 'expanded'
  const layoutMode = width < 600 ? 'mobile' : width < 1200 ? 'tablet' : 'desktop'

  return {
    available: true,
    widthDp: width,
    heightDp: height,
    widthClass,
    heightClass,
    layoutMode,
    isFoldable: false,
    hasSeparatingFold: false,
    isFlat: false,
    isHalfOpened: false,
    isTabletop: false,
    isBookPosture: false,
    orientation: null,
    state: null,
    occlusionType: null,
    foldBounds: null,
  }
}

export function hasFoldAwarenessPlugin() {
  return Capacitor.isPluginAvailable('FoldAwareness')
}

export async function getFoldInfo(): Promise<FoldInfo> {
  if (!hasFoldAwarenessPlugin()) {
    return getWebFallback()
  }

  try {
    return await FoldAwareness.getInfo()
  } catch {
    return getWebFallback()
  }
}

export async function startFoldAwareness(): Promise<FoldInfo> {
  if (!hasFoldAwarenessPlugin()) {
    return getWebFallback()
  }

  try {
    return await FoldAwareness.start()
  } catch {
    return getWebFallback()
  }
}

export async function stopFoldAwareness(): Promise<void> {
  if (!hasFoldAwarenessPlugin()) return

  try {
    await FoldAwareness.stop()
  } catch {
    // no-op
  }
}

export async function onFoldInfoChanged(
  listener: (info: FoldInfo) => void,
): Promise<PluginListenerHandle | null> {
  if (!hasFoldAwarenessPlugin()) return null

  try {
    return await FoldAwareness.addListener('foldInfoChanged', listener)
  } catch {
    return null
  }
}