import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'bouxre_cookie_consent'

type ConsentChoice = 'accepted' | 'declined'

function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

/**
 * Accessible, non-blocking cookie consent banner.
 * Renders nothing once a choice has been stored in
 * `localStorage['bouxre_cookie_consent']`. Does not gate any functionality;
 * analytics are not installed — we only record the preference and log nothing.
 */
export default function CookieConsentBanner() {
  // null until mounted so SSR/prerender never flashes the banner.
  const [consent, setConsent] = useState<ConsentChoice | null | 'unset'>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    setConsent(readConsent() ?? 'unset')
  }, [])

  if (consent !== 'unset') return null

  const choose = (choice: ConsentChoice) => {
    setLeaving(true)
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, choice)
      } catch {
        // Preference cannot persist (private mode) — dismiss for this session only.
      }
      setConsent(choice)
    }, 220)
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className={`fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-bd-border bg-bd-card-bg p-4 shadow-2xl transition-all duration-200 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 ${
        leaving ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-snug text-bd-text">
          We use necessary cookies to keep you signed in, plus anonymous telemetry to improve BOUXRE.{' '}
          <Link to="/privacy-policy" className="font-medium underline underline-offset-2 hover:opacity-80">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => choose('declined')}
            aria-label="Decline optional cookies"
          >
            Decline
          </Button>
          <Button size="sm" onClick={() => choose('accepted')} aria-label="Accept cookies">
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
