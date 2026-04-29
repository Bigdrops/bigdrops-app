import * as React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import type { Session, AuthChangeEvent, Subscription } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'
import AppShell from '@/components/app/AppShell'
import PageLoader from '@/components/app/PageLoader'
import OfflineAccessBlocked from '@/components/app/OfflineAccessBlocked'
import SplashOverlay from '@/components/app/SplashOverlay'
import { useSyncBootstrap } from '@/app/useSyncBootstrap'
import { useSafeAsyncTask } from '@/hooks/useSafeAsyncTask'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isInvalidSessionError } from '@/auth/sessionErrors'
import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'
import AndroidBackHandler from '@/components/app/AndroidBackHandler'
import NativeAuthRedirect from '@/components/app/NativeAuthRedirect'
import { isAndroidNative } from '@/lib/native/capacitor'
import type { OfflineAccessState } from '@/lib/native/offlineAccess'

const Login = lazy(() => import('./pages/Login'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const SPLASH_TIPS = [
  'Arranging your papers and records...',
  'Preparing your workspace...',
  'Getting documents and projects in order...',
]

const RECOVERY_COOLDOWN_MS = 1500

const AUTH_DEBUG = import.meta.env.DEV

let offlineAccessModulePromise: Promise<typeof import('@/lib/native/offlineAccess')> | null = null
let deviceHydrationModulePromise: Promise<typeof import('@/lib/native/deviceHydration')> | null = null

const loadOfflineAccessModule = () => {
  if (!offlineAccessModulePromise) {
    offlineAccessModulePromise = import('@/lib/native/offlineAccess')
  }
  return offlineAccessModulePromise
}

const loadDeviceHydrationModule = () => {
  if (!deviceHydrationModulePromise) {
    deviceHydrationModulePromise = import('@/lib/native/deviceHydration')
  }
  return deviceHydrationModulePromise
}

function debugAuth(...args: any[]) {
  if (!AUTH_DEBUG) return
  console.log('[auth-debug]', ...args)
}

const withBoundary = (element: React.ReactNode) => <ErrorBoundary>{element}</ErrorBoundary>

export interface Profile {
  id: string
  has_password?: boolean | null
  is_approved?: boolean | null
  email?: string | null
  [key: string]: any
}

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [offlineAccessLoading, setOfflineAccessLoading] = useState(true)
  const [offlineAccessState, setOfflineAccessState] = useState<OfflineAccessState>({
    allowed: true,
    expiresAt: null,
    reason: 'not_native',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resolvedProfileUserId, setResolvedProfileUserId] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)

  const loadingRef = useRef(false)
  const splashStartRef = useRef(Date.now())
  const hasBootedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const recoveringRef = useRef(false)
  const lastRecoveryAtRef = useRef(0)
  const profileRef = useRef<Profile | null>(null)
  const sessionRef = useRef<Session | null>(null)

  const { runLatest: runLatestProfileTask, cancel: cancelProfileTask } = useSafeAsyncTask()

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const resetAuthState = () => {
    cancelProfileTask()
    lastUserIdRef.current = null
    sessionRef.current = null
    profileRef.current = null
    setSession(null)
    setProfile(null)
    setResolvedProfileUserId(null)
    setAuthLoading(false)
    setProfileLoading(false)
    loadingRef.current = false
  }

  const clearBadSession = async (reason: string, error: any) => {
    console.warn(`Clearing bad auth state during ${reason}:`, error)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (signOutError) {
      console.warn('Local sign-out cleanup failed:', signOutError)
    } finally {
      resetAuthState()
    }
  }

  const resolveSessionSafely = async (reason: string): Promise<Session | null> => {
    try {
      const {
        data: { session: nextSession },
        error,
      } = await supabase.auth.getSession()

      if (error) throw error
      return nextSession
    } catch (error) {
      if (isInvalidSessionError(error)) {
        await clearBadSession(reason, error)
        return null
      }

      console.error(`Session restore failed during ${reason}:`, error)

      // Preserve last known good session on transient failures.
      return sessionRef.current
    }
  }

  const refreshOfflineAccessState = async (): Promise<OfflineAccessState> => {
    if (!canUseAndroidNativeSqlite()) {
      const fallbackAccessState: OfflineAccessState = {
        allowed: true,
        expiresAt: null,
        reason: 'not_native',
      }
      setOfflineAccessState(fallbackAccessState)
      return fallbackAccessState
    }

    try {
      const { getOfflineAccessState } = await loadOfflineAccessModule()
      const nextAccessState = await getOfflineAccessState()
      setOfflineAccessState(nextAccessState)
      return nextAccessState
    } catch (error) {
      console.warn('Offline access state check failed:', error)
      const fallbackAccessState: OfflineAccessState = {
        allowed: true,
        expiresAt: null,
        reason: 'not_native',
      }
      setOfflineAccessState(fallbackAccessState)
      return fallbackAccessState
    }
  }

  const loadProfile = async (userId: string) => {
    if (!userId) return

    debugAuth('loadProfile:start', {
      userId,
      query: "supabase.from('profiles').select('*').eq('id', userId).single()",
    })

    setProfileLoading(true)
    setResolvedProfileUserId(null)

    await runLatestProfileTask<Profile | null>(
      async (signal) => {
        const { data, error } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single() as any)
          .abortSignal(signal)

        debugAuth('loadProfile:queryResult', { userId, data, error })

        if (error) throw error
        if (!data) return null

        const { data: authData } = await supabase.auth.getUser()
        const provider = authData.user?.app_metadata?.provider

        if (provider === 'email' && !data.has_password) {
          await supabase.from('profiles').update({ has_password: true }).eq('id', userId)
          return { ...data, has_password: true }
        }

        return data
      },
      {
        onSuccess: (nextProfile) => {
          debugAuth('loadProfile:onSuccess', { userId, nextProfile })
          profileRef.current = nextProfile
          setProfile(nextProfile)
          setResolvedProfileUserId(userId)

          if (canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine !== false) {
            void loadDeviceHydrationModule()
              .then(({ hydrateLocalDeviceProfile }) => hydrateLocalDeviceProfile({ userId }))
              .catch((error) => {
                console.warn('Local device hydration skipped:', error)
              })
          }
        },
        onError: (err) => {
          debugAuth('loadProfile:onError', { userId, error: err })

          if (isInvalidSessionError(err)) {
            void clearBadSession('profile load', err)
            return
          }

          console.error('Profile fetch error:', err)

          // Keep old profile for same user on transient failures.
          if (profileRef.current?.id === userId) {
            setProfile(profileRef.current)
          }

          // Mark profile as resolved so route gate does not hang forever.
          setResolvedProfileUserId(userId)
        },
        onSettled: () => {
          debugAuth('loadProfile:onSettled', { userId })
          setProfileLoading(false)
          loadingRef.current = false
        },
      }
    )
  }

  const recoverAppState = async (reason: string, options: { force?: boolean } = {}) => {
    const { force = false } = options
    const now = Date.now()

    if (recoveringRef.current) return
    if (!force && now - lastRecoveryAtRef.current < RECOVERY_COOLDOWN_MS) return

    recoveringRef.current = true
    lastRecoveryAtRef.current = now

    try {
      const nextSession = await resolveSessionSafely(`lifecycle recovery (${reason})`)
      const nextUserId = nextSession?.user?.id || null
      const currentProfileUserId = profileRef.current?.id || null

      debugAuth('recoverAppState', {
        reason,
        force,
        nextUserId,
        currentProfileUserId,
        authLoading,
        profileLoading,
      })

      sessionRef.current = nextSession
      setSession(nextSession)
      lastUserIdRef.current = nextUserId || null
      setAuthLoading(false)

      if (!nextUserId) {
        cancelProfileTask()
        profileRef.current = null
        setProfile(null)
        setResolvedProfileUserId(null)
        setProfileLoading(false)
        loadingRef.current = false
        return
      }

      const shouldReloadProfile =
        !profileRef.current ||
        currentProfileUserId !== nextUserId ||
        loadingRef.current

      if (shouldReloadProfile) {
        cancelProfileTask()
        loadingRef.current = true
        await loadProfile(nextUserId)
      } else {
        setProfileLoading(false)
        loadingRef.current = false
      }
    } catch (error) {
      console.error('Lifecycle recovery error:', error)
    } finally {
      setAuthLoading(false)
      recoveringRef.current = false
    }
  }

  const { runSyncBootstrap } = useSyncBootstrap({
    refreshOfflineAccessState,
    recoverAppState,
    debug: debugAuth,
  })

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes runnerMove {
        0% { transform: translateX(4px); }
        50% { transform: translateX(250px); }
        100% { transform: translateX(4px); }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SPLASH_TIPS.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let isActive = true
    let subscription: Subscription | null = null

    const handleAuthStateChange = async (event: AuthChangeEvent, nextSession: Session | null) => {
      if (!isActive) return

      const nextUserId = nextSession?.user?.id || null
      const previousUserId = lastUserIdRef.current
      const isSameUserSession = !!previousUserId && previousUserId === nextUserId

      debugAuth('onAuthStateChange', {
        event,
        sessionUserId: nextSession?.user?.id || null,
        sessionEmail: nextSession?.user?.email || null,
        previousUserId,
        nextUserId,
      })

      if (event === 'SIGNED_OUT') {
        resetAuthState()
        setShowSplash(false)
        return
      }

      if ((event as string) === 'INITIAL_SESSION') {
        sessionRef.current = nextSession
        setSession(nextSession)
        lastUserIdRef.current = nextUserId

        if (!nextUserId) {
          setAuthLoading(false)
          setProfileLoading(false)
          setResolvedProfileUserId(null)
        }

        return
      }

      if (event === 'TOKEN_REFRESHED') {
        sessionRef.current = nextSession
        setSession(nextSession)
        lastUserIdRef.current = nextUserId
        setAuthLoading(false)
        return
      }

      if ((event as string) === 'TOKEN_REFRESH_FAILED') {
        await clearBadSession('token refresh failure', new Error('Supabase token refresh failed'))
        return
      }

      if (event === 'SIGNED_IN') {
        sessionRef.current = nextSession
        setSession(nextSession)
        lastUserIdRef.current = nextUserId

        if (!nextUserId) {
          resetAuthState()
          return
        }

        const shouldHydrateProfile =
          !profileRef.current ||
          profileRef.current.id !== nextUserId ||
          loadingRef.current

        // Ignore same-session SIGNED_IN re-emits during resume/reconnect.
        if (isSameUserSession && !shouldHydrateProfile) {
          setAuthLoading(false)
          return
        }

        setResolvedProfileUserId(null)

        const isRealNewSignIn = !previousUserId && !!nextUserId
        if (isRealNewSignIn && hasBootedRef.current) {
          splashStartRef.current = Date.now()
          setShowSplash(true)
        }

        setAuthLoading(true)
        loadingRef.current = true
        await loadProfile(nextUserId)
        setAuthLoading(false)
        return
      }

      if (event === 'USER_UPDATED' && nextUserId) {
        sessionRef.current = nextSession
        setSession(nextSession)
        lastUserIdRef.current = nextUserId
        await loadProfile(nextUserId)
        return
      }

      sessionRef.current = nextSession
      setSession(nextSession)
      lastUserIdRef.current = nextUserId
    }

    const init = async () => {
      splashStartRef.current = Date.now()
      setAuthLoading(true)

      try {
        const nextAccessState = await refreshOfflineAccessState()
        if (!isActive || !nextAccessState.allowed) return

        const restoredSession = await resolveSessionSafely('app bootstrap')
        if (!isActive) return

        sessionRef.current = restoredSession
        setSession(restoredSession)
        lastUserIdRef.current = restoredSession?.user?.id || null

        if (restoredSession?.user?.id) {
          loadingRef.current = true
          await loadProfile(restoredSession.user.id)
        } else {
          profileRef.current = null
          setProfile(null)
          setResolvedProfileUserId(null)
        }

        await runSyncBootstrap('app bootstrap')
      } finally {
        if (isActive) {
          setAuthLoading(false)
          setOfflineAccessLoading(false)
        }
      }

      const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
        setTimeout(() => {
          void handleAuthStateChange(event, nextSession)
        }, 0)
      })

      subscription = data.subscription
    }

    void init()

    return () => {
      isActive = false
      cancelProfileTask()
      subscription?.unsubscribe()
    }
  }, [cancelProfileTask])

  useEffect(() => {
    hasBootedRef.current = true
  }, [])

  useEffect(() => {
    const loadingDone = !authLoading && !profileLoading && !offlineAccessLoading
    if (!loadingDone) return

    const elapsed = Date.now() - splashStartRef.current
    const minimumVisible = 600
    const remaining = Math.max(0, minimumVisible - elapsed)

    const timer = setTimeout(() => {
      setShowSplash(false)
    }, remaining)

    return () => clearTimeout(timer)
  }, [authLoading, offlineAccessLoading, profileLoading])

  useEffect(() => {
    debugAuth('profileState', profile)
  }, [profile])

  const currentSessionUserId = session?.user?.id || null
  const profileResolvedForCurrentSession =
    !currentSessionUserId || resolvedProfileUserId === currentSessionUserId
  const approved =
    profileResolvedForCurrentSession &&
    (profile?.is_approved === true ||
      (!profile && currentSessionUserId && offlineAccessState.reason === 'within_window'))
  const waitingForProfileResolution =
    !!currentSessionUserId && (!profileResolvedForCurrentSession || profileLoading)

  useEffect(() => {
    debugAuth('routeGate', {
      sessionUserId: currentSessionUserId,
      sessionEmail: session?.user?.email || null,
      resolvedProfileUserId,
      profile,
      approved,
      authLoading,
      profileLoading,
      waitingForProfileResolution,
    })
  }, [
    approved,
    authLoading,
    currentSessionUserId,
    profile,
    profileLoading,
    resolvedProfileUserId,
    session?.user?.email,
    waitingForProfileResolution,
  ])

  useEffect(() => {
    const inspectDB = async () => {
      console.log('[DB_INSPECTOR] Checking settings table status...')
      try {
        const { data, error } = await supabase.from('settings').select('*')
        if (error) {
          console.error('[DB_INSPECTOR] Error fetching all settings:', error)
          return
        }
        console.log('[DB_INSPECTOR] All rows in settings:', data)
        
        const row1 = (data as any[]).find(r => r.id === 1)
        if (row1) {
          console.log('[DB_INSPECTOR] Row ID=1 columns:', Object.keys(row1))
          console.log('[DB_INSPECTOR] Row ID=1 values:', {
            company_logo_url: row1.company_logo_url,
            footer_text: row1.footer_text,
            logo_url: row1.logo_url
          })
        } else {
          console.warn('[DB_INSPECTOR] No row with ID=1 found!')
        }
      } catch (e) {
        console.error('[DB_INSPECTOR] Failed to inspect DB:', e)
      }
    }
    inspectDB()
  }, [])

  usePushNotifications(profile?.id)

  return (
    <>
      <BrowserRouter>
        <Toaster />
        {isAndroidNative() && (
          <>
            <AndroidBackHandler />
            <NativeAuthRedirect />
          </>
        )}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/reset-password" element={withBoundary(<ResetPassword />)} />
            <Route
              path="/*"
              element={
                !session
                  ? !offlineAccessState.allowed
                    ? withBoundary(<OfflineAccessBlocked accessState={offlineAccessState as any} />)
                    : offlineAccessLoading
                      ? withBoundary(<PageLoader />)
                      : withBoundary(<Login />)
                  : waitingForProfileResolution
                    ? withBoundary(<PageLoader />)
                    : !offlineAccessState.allowed
                      ? withBoundary(<OfflineAccessBlocked accessState={offlineAccessState as any} />)
                      : !approved
                      ? withBoundary(<PendingApproval email={session?.user?.email || ''} />)
                      : withBoundary(
                          <AppShell
                            session={session}
                            profile={profile}
                            onProfileUpdate={() => loadProfile(session.user.id)}
                          />
                        )
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <SplashOverlay visible={showSplash} tip={SPLASH_TIPS[tipIndex]} />
    </>
  )
}

export default App