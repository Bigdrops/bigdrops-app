import * as React from 'react'
import { ArrowRight, BellRing, X, CircleDotDashed, Download, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isAndroidNative } from '@/lib/native/capacitor'
import { useOptionalAppUpdateContext } from '@/contexts/AppUpdateContext'
import { useWebAndroidApk } from '@/hooks/useWebAndroidApk'

const PAYMENT_REMINDER_KEY = 'bd:dashboard:payment-reminder-dismissed:v1'
const WEB_PROMO_KEY = 'bd:dashboard:android-promo-dismissed:v1'

function readDismissedState(key: string) {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.sessionStorage.getItem(key) === '1' ||
      window.localStorage.getItem(key) === '1'
    )
  } catch {
    return false
  }
}

export function PaymentReminderBanner() {
  const navigate = useNavigate()
  const appUpdate = useOptionalAppUpdateContext()
  const webApk = useWebAndroidApk()

  const [paymentReminderDismissed, setPaymentReminderDismissed] = React.useState(() =>
    readDismissedState(PAYMENT_REMINDER_KEY),
  )
  const [webPromoDismissed, setWebPromoDismissed] = React.useState(() =>
    readDismissedState(WEB_PROMO_KEY),
  )

  const isAndroid = isAndroidNative()

  const hasAndroidUpdate =
    isAndroid &&
    appUpdate &&
    (appUpdate.state.status === 'available' ||
      appUpdate.state.status === 'grace' ||
      appUpdate.state.status === 'blocked')

  const targetVersionName =
    appUpdate?.state.policy?.versionName || appUpdate?.release?.versionName
  const isMandatory =
    appUpdate?.state.policy?.mandatory === true || appUpdate?.state.status === 'blocked'

  const showWebPromo =
    !isAndroid &&
    !webPromoDismissed &&
    !webApk.loading &&
    Boolean(webApk.apkUrl)

  const bannerType: 'android-update' | 'web-promo' | 'payment-reminder' | 'hidden' =
    hasAndroidUpdate
      ? 'android-update'
      : showWebPromo
        ? 'web-promo'
        : paymentReminderDismissed
          ? 'hidden'
          : 'payment-reminder'

  if (bannerType === 'hidden') return null

  const handleDismiss = () => {
    if (bannerType === 'web-promo') {
      setWebPromoDismissed(true)
      try {
        window.sessionStorage.setItem(WEB_PROMO_KEY, '1')
        window.localStorage.setItem(WEB_PROMO_KEY, '1')
      } catch {}
    } else if (bannerType === 'payment-reminder') {
      setPaymentReminderDismissed(true)
      try {
        window.sessionStorage.setItem(PAYMENT_REMINDER_KEY, '1')
      } catch {}
    }
  }

  const eyebrow =
    bannerType === 'android-update'
      ? 'System update'
      : bannerType === 'web-promo'
        ? 'Mobile app'
        : 'Payment reminder'

  const title =
    bannerType === 'android-update'
      ? `Update available: BOUXRE ${targetVersionName ? 'v' + targetVersionName : ''}`
      : bannerType === 'web-promo'
        ? 'Get BOUXRE for Android'
        : 'Keep payments recorded as they land'

  const description =
    bannerType === 'android-update'
      ? 'A new release is available with performance boosts and security updates. Tap to install.'
      : bannerType === 'web-promo'
        ? 'Download the official Android APK for faster native performance and offline access.'
        : 'Record each invoice payment promptly so your books stay accurate.'

  const buttonText =
    bannerType === 'android-update'
      ? 'Update Now'
      : bannerType === 'web-promo'
        ? 'Download APK'
        : 'Record payments'

  const handleAction = () => {
    if (bannerType === 'android-update') {
      navigate('/settings?section=app-update')
    } else if (bannerType === 'web-promo') {
      if (webApk.apkUrl) {
        window.open(webApk.apkUrl, '_blank')
      }
    } else {
      navigate('/invoices')
    }
  }

  const badgeText =
    bannerType === 'android-update'
      ? isMandatory
        ? 'Required'
        : 'Recommended'
      : bannerType === 'web-promo'
        ? 'Android APK'
        : 'Evergreen'

  const icon =
    bannerType === 'android-update' ? (
      <Sparkles size={16} strokeWidth={1.9} />
    ) : bannerType === 'web-promo' ? (
      <Download size={16} strokeWidth={1.9} />
    ) : (
      <BellRing size={16} strokeWidth={1.9} />
    )

  return (
    <>
      <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))] md:mb-3 md:text-[10px]">
        {eyebrow}
      </h2>
      <section
        aria-label={eyebrow}
        className="relative overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] shadow-[0_12px_28px_color-mix(in_srgb,hsl(var(--primary))_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]"
        style={{
          animation: 'bannerSlideIn 0.35s cubic-bezier(0.23, 1, 0.32, 1) both',
        }}
      >
        <style>{`
          @keyframes bannerSlideIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes bannerSlideIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          }
        `}</style>

        {/* Decorative corner ring */}
        <div
          className="pointer-events-none absolute -right-[36px] -top-[48px] h-[120px] w-[120px] rounded-full border-[18px] border-transparent opacity-85"
          style={{
            background:
              'conic-gradient(from 180deg, hsl(var(--primary)/0.14), hsl(var(--secondary)/0.13), hsl(var(--primary)/0.14)) border-box',
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
          }}
        />

        <div className="relative z-10 flex items-start gap-[9px] p-3 md:p-4">
          {/* Gradient icon */}
          <div
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[12px] text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
            }}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))]">
              Smart banner
            </div>
            <h3 className="mt-[3px] text-[12px] font-[800] tracking-[-.045em] text-[hsl(var(--bd-ink))] md:text-[14px]">
              {title}
            </h3>
            <p className="mt-[2px] text-[9px] leading-[1.4] text-[hsl(var(--bd-ink-muted))] md:text-[11px]">
              {description}
            </p>

            <div className="mt-[9px] flex items-center gap-[6px]">
              <button
                type="button"
                onClick={handleAction}
                className="inline-flex items-center gap-[6px] rounded-[10px] px-[10px] py-[7px] text-[8px] font-[800] uppercase tracking-[0.065em] text-white transition active:scale-[0.96] md:px-4 md:py-2.5 md:text-[10px]"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                }}
              >
                {buttonText}
                <ArrowRight size={12} strokeWidth={1.9} />
              </button>
              <span className="inline-flex items-center gap-[3px] text-[7px] font-[700] text-[hsl(var(--ink-2))]">
                <CircleDotDashed size={11} strokeWidth={1.9} />
                {badgeText}
              </span>
            </div>
          </div>

          {bannerType !== 'android-update' && (
            <button
              type="button"
              aria-label={`Dismiss ${eyebrow}`}
              onClick={handleDismiss}
              className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.25)] transition hover:scale-105 active:scale-95"
              style={{
                color: 'hsl(var(--bd-ink-muted))',
              }}
            >
              <X size={14} strokeWidth={1.9} />
            </button>
          )}
        </div>
      </section>
    </>
  )
}
