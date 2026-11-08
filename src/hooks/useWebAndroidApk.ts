import { useState, useEffect } from 'react'
import { fetchReleasePolicy } from '@/lib/appUpdate/releasePolicyClient'
import { isDirectApkUrl } from '@/lib/appUpdate/releaseDiscovery'

const FALLBACK_APK_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/app-releases/bigdrops-latest.apk`

export interface WebAndroidApkInfo {
  apkUrl: string
  versionName: string | null
  versionCode: number | null
  releaseNotes: string | null
  loading: boolean
}

export function useWebAndroidApk(): WebAndroidApkInfo {
  const [info, setInfo] = useState<WebAndroidApkInfo>({
    apkUrl: FALLBACK_APK_URL,
    versionName: null,
    versionCode: null,
    releaseNotes: null,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    void fetchReleasePolicy().then((result) => {
      if (!mounted) return

      if (result.available && result.policy) {
        const policy = result.policy
        const directUrl =
          policy.webReleaseUrl && isDirectApkUrl(policy.webReleaseUrl)
            ? policy.webReleaseUrl.trim()
            : FALLBACK_APK_URL

        setInfo({
          apkUrl: directUrl,
          versionName: policy.versionName ?? null,
          versionCode: policy.versionCode ?? null,
          releaseNotes: policy.releaseNotes ?? null,
          loading: false,
        })
      } else {
        setInfo((prev) => ({ ...prev, loading: false }))
      }
    }).catch(() => {
      if (mounted) {
        setInfo((prev) => ({ ...prev, loading: false }))
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  return info
}
