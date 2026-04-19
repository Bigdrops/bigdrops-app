import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { PluginListenerHandle } from '@capacitor/core'
import { supabase } from '@/supabase'
import { toast } from '@/hooks/use-toast'
import { isAndroidNative } from '@/lib/native/capacitor'

const NATIVE_AUTH_SCHEME = 'com.bigdrops.app'
const NATIVE_AUTH_HOST = 'auth'
const NATIVE_AUTH_PATH = '/callback'
export const NATIVE_AUTH_REDIRECT_URL = `${NATIVE_AUTH_SCHEME}://${NATIVE_AUTH_HOST}${NATIVE_AUTH_PATH}`

function isNativeAuthCallback(url: string) {
  return url.startsWith(NATIVE_AUTH_REDIRECT_URL)
}

async function consumeAuthRedirect(url: string) {
  const parsed = new URL(url)

  const query = parsed.searchParams
  const hash = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash)

  const code = query.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return true
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) throw error
    return true
  }

  return false
}

export default function NativeAuthRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAndroidNative()) return undefined

    let active = true
    let listener: PluginListenerHandle | null = null

    const handleUrl = async (url: string) => {
      if (!active || !isNativeAuthCallback(url)) return

      try {
        await consumeAuthRedirect(url)
        await Browser.close().catch(() => {})
        navigate('/', { replace: true })
      } catch (error) {
        console.error('Native auth redirect failed', error)
        toast({
          title: 'Google sign-in failed',
          description: error instanceof Error ? error.message : 'Could not complete sign-in.',
          variant: 'destructive',
        })
      }
    }

    const setup = async () => {
      const launchData = await CapacitorApp.getLaunchUrl()
      if (launchData?.url) {
        await handleUrl(launchData.url)
      }

      listener = await CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        await handleUrl(url)
      })
    }

    void setup()

    return () => {
      active = false
      void listener?.remove()
    }
  }, [navigate])

  return null
}