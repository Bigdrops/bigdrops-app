import { cn } from '@/lib/utils'
import bxLogoSrc from '../../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png'

export { bxLogoSrc }

/**
 * Official BX product logo (approved artwork, 192px source).
 * Do not restyle, recolour, or distort the artwork — size only via className.
 */
export function BxLogo({ className }: { className?: string }) {
  return (
    <img
      src={bxLogoSrc}
      alt="BOURXE"
      draggable={false}
      className={cn('h-8 w-8 shrink-0 rounded-[11px]', className)}
    />
  )
}
