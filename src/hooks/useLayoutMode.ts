import { useFoldAwareness } from '@/hooks/useFoldAwareness'

export function useLayoutMode() {
  const info = useFoldAwareness()

  return {
    isMobile: info.layoutMode === 'mobile',
    isTablet: info.layoutMode === 'tablet',
    isDesktop: info.layoutMode === 'desktop',
    layoutMode: info.layoutMode,
    widthClass: info.widthClass,
    heightClass: info.heightClass,
    hasFold: info.hasSeparatingFold,
    isFoldable: info.isFoldable,
  }
}