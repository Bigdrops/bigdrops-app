import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { toast } from '@/hooks/use-toast'
import { isAndroidNative } from '@/lib/native/capacitor'

const ROOT_PATHS = new Set([
  '/',
  '/clients',
  '/csr',
  '/invoices',
  '/projects',
  '/quotations',
  '/reports',
  '/settings',
  '/waybills',
])

function isVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  if (element.hidden) return false
  if (element.getAttribute('aria-hidden') === 'true') return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false

  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function getLogicalBackTarget(pathname: string, state: unknown) {
  const routeState = (state && typeof state === 'object' ? state : {}) as Record<string, unknown>
  const projectId = typeof routeState.projectId === 'string' ? routeState.projectId : null

  const patterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^\/invoices\/new$/, () => (projectId ? `/projects/${projectId}` : '/invoices')],
    [/^\/invoices\/edit\/([^/]+)$/, (match) => `/invoices/${match[1]}`],
    [/^\/invoices\/([^/]+)$/, () => '/invoices'],

    [/^\/quotations\/new$/, () => (projectId ? `/projects/${projectId}` : '/quotations')],
    [/^\/quotations\/edit\/([^/]+)$/, (match) => `/quotations/${match[1]}`],
    [/^\/quotations\/([^/]+)$/, () => '/quotations'],

    [/^\/csr\/new$/, () => (projectId ? `/projects/${projectId}` : '/csr')],
    [/^\/csr\/edit\/([^/]+)$/, (match) => `/csr/${match[1]}`],
    [/^\/csr\/([^/]+)$/, () => '/csr'],

    [/^\/clients\/new$/, () => '/clients'],
    [/^\/clients\/edit\/([^/]+)$/, (match) => `/clients/${match[1]}`],
    [/^\/clients\/([^/]+)$/, () => '/clients'],

    [/^\/projects\/new$/, () => '/projects'],
    [/^\/projects\/([^/]+)\/documents\/([^/]+)$/, (match) => `/projects/${match[1]}`],
    [/^\/projects\/([^/]+)$/, () => '/projects'],

    [/^\/waybills\/new$/, () => (projectId ? `/projects/${projectId}` : '/waybills')],
    [/^\/waybills\/([^/]+)\/edit$/, (match) => `/waybills/${match[1]}`],
    [/^\/waybills\/([^/]+)$/, () => '/waybills'],
  ]

  for (const [pattern, resolver] of patterns) {
    const match = pathname.match(pattern)
    if (match) return resolver(match)
  }

  return null
}

function countOpenDialogs() {
  return Array.from(
    document.querySelectorAll(
      [
        '[role="dialog"]',
        '[data-slot="dialog-overlay"]',
        '[data-slot="sheet-overlay"]',
      ].join(','),
    ),
  ).filter(isVisible).length
}

async function tryCloseOverlay() {
  const openDialogsBefore = countOpenDialogs()

  if (openDialogsBefore > 0) {
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    })

    document.dispatchEvent(escapeEvent)
    window.dispatchEvent(escapeEvent)

    await new Promise((resolve) => window.setTimeout(resolve, 40))

    if (countOpenDialogs() < openDialogsBefore) {
      return true
    }
  }

  const dismissibleOverlay = Array.from(
    document.querySelectorAll('[data-back-close="true"]'),
  )
    .filter(isVisible)
    .pop()

  if (!dismissibleOverlay) return false

  const explicitCloseButton = dismissibleOverlay.querySelector(
    '[data-back-close-action="close"]',
  )

  if (explicitCloseButton instanceof HTMLButtonElement && !explicitCloseButton.disabled) {
    explicitCloseButton.click()
    return true
  }

  const fallbackCloseButton = Array.from(
    dismissibleOverlay.querySelectorAll('button'),
  ).find((button) => {
    if (!(button instanceof HTMLButtonElement)) return false
    if (button.disabled || !isVisible(button)) return false

    const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`
      .trim()
      .toLowerCase()

    return label.includes('close') || label.includes('cancel')
  })

  if (fallbackCloseButton instanceof HTMLButtonElement) {
    fallbackCloseButton.click()
    return true
  }

  if (
    dismissibleOverlay instanceof HTMLElement &&
    dismissibleOverlay.dataset.backCloseClickDismiss === 'true'
  ) {
    dismissibleOverlay.click()
    return true
  }

  return false
}

export default function AndroidBackHandler() {
  const location = useLocation()
  const navigate = useNavigate()

  const pathnameRef = useRef(location.pathname)
  const stateRef = useRef(location.state)
  const isRootRouteRef = useRef(ROOT_PATHS.has(location.pathname))

  useEffect(() => {
    pathnameRef.current = location.pathname
    stateRef.current = location.state
    isRootRouteRef.current = ROOT_PATHS.has(location.pathname)
  }, [location.pathname, location.state])

  useEffect(() => {
    if (!isAndroidNative()) return undefined

    let cancelled = false
    let listener: PluginListenerHandle | null = null

    const setup = async () => {
      listener = await CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
        if (cancelled) return

        if (await tryCloseOverlay()) {
          return
        }

        const pathname = pathnameRef.current
        const routeState = stateRef.current
        const isRootRoute = isRootRouteRef.current
        const historyIndex = Number(window.history.state?.idx ?? 0)

        if (canGoBack || historyIndex > 0) {
          navigate(-1)
          return
        }

        const logicalTarget = getLogicalBackTarget(pathname, routeState)
        if (logicalTarget && logicalTarget !== pathname) {
          navigate(logicalTarget, { replace: true })
          return
        }

        if (isRootRoute) {
          toast({
            title: 'Top level screen',
            description: 'Use the navigation bar to switch areas or your home button to minimize.',
          })
          return
        }

        navigate('/', { replace: true })
      })
    }

    void setup()

    return () => {
      cancelled = true
      void listener?.remove()
    }
  }, [navigate])

  return null
}