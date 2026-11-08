import { useState } from 'react'
import { Smartphone, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isAndroidNative } from '@/lib/native/capacitor'
import { useWebAndroidApk } from '@/hooks/useWebAndroidApk'

const PROMO_DISMISSED_KEY = 'bouxre_web_apk_promo_dismissed_v1'

export default function WebAppPromoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (isAndroidNative()) return true
    try {
      return localStorage.getItem(PROMO_DISMISSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  const { apkUrl, versionName } = useWebAndroidApk()

  if (isAndroidNative() || dismissed) return null

  const handleDismiss = () => {
    try {
      localStorage.setItem(PROMO_DISMISSED_KEY, 'true')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  return (
    <div
      role="banner"
      className="relative z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-card/95 px-4 py-2 text-xs text-card-foreground backdrop-blur-md transition-all shadow-xs"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Smartphone className="size-4" aria-hidden="true" />
        </div>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">Use BOUXRE on Android</strong>
          {' '}for faster native performance and biometric security.
          {versionName && (
            <span className="ml-2 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border/50">
              v{versionName}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" className="h-7 text-xs font-medium px-3 gap-1.5 shadow-xs">
          <a href={apkUrl} download="bouxre-latest.apk">
            <Download className="size-3.5" data-icon="inline-start" />
            Download APK
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss Android app promotion"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
