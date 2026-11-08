import { isNativePlatform } from '@/lib/native/capacitor'

export const PRODUCTION_CANONICAL_ORIGIN = 'https://bouxre.com'

function isLoopbackOrLocal(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.localhost')
  )
}

function normalizeUrlWithoutTrailingSlash(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '')
}

/**
 * Returns the canonical public origin/base URL for the application.
 * Precedence:
 * 1. Explicit environment variable: VITE_PUBLIC_URL or VITE_APP_URL (if valid public http/https URL and not loopback)
 * 2. Native Capacitor runtime: PRODUCTION_CANONICAL_ORIGIN ('https://bouxre.com')
 * 3. In browser: window.location.origin, UNLESS it is localhost/loopback or capacitor://
 * 4. Fallback: PRODUCTION_CANONICAL_ORIGIN ('https://bouxre.com')
 */
export function getPublicBaseUrl(): string {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) ||
    ''
  ).trim()

  if (envUrl) {
    try {
      const parsed = new URL(envUrl)
      if (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        !isLoopbackOrLocal(parsed.hostname)
      ) {
        return normalizeUrlWithoutTrailingSlash(envUrl)
      }
    } catch {
      // ignore invalid URL
    }
  }

  // If running inside Capacitor native container (Android / iOS)
  if (typeof isNativePlatform === 'function' && isNativePlatform()) {
    return PRODUCTION_CANONICAL_ORIGIN
  }

  // If in browser window
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin
    const protocol = window.location.protocol
    const hostname = window.location.hostname

    // Capacitor or file or custom protocol
    if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
      return PRODUCTION_CANONICAL_ORIGIN
    }

    // Localhost or loopback in dev -> default to production canonical for publicly shared links
    if (isLoopbackOrLocal(hostname)) {
      return PRODUCTION_CANONICAL_ORIGIN
    }

    if (origin && (protocol === 'https:' || protocol === 'http:')) {
      return normalizeUrlWithoutTrailingSlash(origin)
    }
  }

  return PRODUCTION_CANONICAL_ORIGIN
}

/**
 * Transforms an optional path or URL into a canonical public shareable URL.
 * - If omitted/empty: uses current browser path + search + hash on top of canonical base URL.
 * - If relative path: prepends canonical base URL.
 * - If localhost / loopback / capacitor URL: rewrites host/origin to canonical base URL.
 * - If external third-party URL (e.g. payment gateway, external partner): leaves it untouched.
 */
export function toPublicShareUrl(pathOrUrl?: string): string {
  const baseUrl = getPublicBaseUrl()

  if (!pathOrUrl || pathOrUrl.trim() === '') {
    if (typeof window !== 'undefined' && window.location) {
      const pathWithSearchAndHash = `${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`
      const cleanPath = pathWithSearchAndHash.startsWith('/')
        ? pathWithSearchAndHash
        : `/${pathWithSearchAndHash}`
      return `${baseUrl}${cleanPath}`
    }
    return baseUrl
  }

  const trimmed = pathOrUrl.trim()

  // Relative path
  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`
  }

  // Check if it's an absolute URL
  try {
    const parsed = new URL(trimmed)
    const isLocal = isLoopbackOrLocal(parsed.hostname)
    const isLocalScheme =
      parsed.protocol === 'capacitor:' ||
      parsed.protocol === 'ionic:' ||
      parsed.protocol === 'file:'

    if (isLocal || isLocalScheme) {
      const searchAndHash = `${parsed.pathname}${parsed.search}${parsed.hash}`
      const cleanPath = searchAndHash.startsWith('/') ? searchAndHash : `/${searchAndHash}`
      return `${baseUrl}${cleanPath}`
    }

    // External URL: preserve unchanged
    return trimmed
  } catch {
    // If not a valid URL (e.g., "invoices/123" without leading slash)
    return `${baseUrl}/${trimmed}`
  }
}
