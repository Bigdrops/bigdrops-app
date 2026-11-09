import { useCallback, useEffect, useRef, useState } from 'react'

import { GRACE_PERIOD_MS } from '@/domain/appUpdate/updateStateMachine'

export type SimPhase = 'idle' | 'downloading' | 'downloaded' | 'installing' | 'installed' | 'failed'

export interface ReleaseNote {
  title: string
  detail: string
}

export interface PreviewRelease {
  versionName: string | null
  versionCode: number | null
  sizeBytes: number
  assetName: string
  notes: ReleaseNote[]
  graceRemainingHours: number
}

export const PREVIEW_RELEASE: PreviewRelease = {
  versionName: '1.0.26',
  versionCode: 1026,
  sizeBytes: Math.round(28.4 * 1024 * 1024),
  assetName: 'bouxre-latest.apk',
  notes: [
    { title: 'Faster document sync', detail: 'Edits now save quietly in the background.' },
    { title: 'Stronger sign-in', detail: 'Biometric unlock on supported devices.' },
    { title: 'Lighter install', detail: 'The update package is 12 percent smaller.' },
  ],
  graceRemainingHours: 71,
}

export const GRACE_TOTAL_HOURS = GRACE_PERIOD_MS / (60 * 60 * 1000)

export function formatGraceShort(hours: number): string {
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  if (days <= 0) return `${rest} hours`
  if (rest === 0) return `${days} ${days === 1 ? 'day' : 'days'}`
  return `${days} ${days === 1 ? 'day' : 'days'}, ${rest} hours`
}

export function useSimulatedDownload(totalBytes: number) {
  const [phase, setPhase] = useState<SimPhase>('idle')
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const bytesRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const stopTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => stopTimers, [stopTimers])

  const reset = useCallback(() => {
    stopTimers()
    bytesRef.current = 0
    setDownloadedBytes(0)
    setPhase('idle')
  }, [stopTimers])

  const start = useCallback(
    (options: { fail?: boolean } = {}) => {
      stopTimers()
      bytesRef.current = 0
      setDownloadedBytes(0)
      setPhase('downloading')
      const failAt = options.fail ? totalBytes * 0.4 : null
      intervalRef.current = window.setInterval(() => {
        bytesRef.current = Math.min(
          totalBytes,
          bytesRef.current + totalBytes * (0.025 + Math.random() * 0.035),
        )
        setDownloadedBytes(bytesRef.current)
        if (failAt !== null && bytesRef.current >= failAt) {
          stopTimers()
          setPhase('failed')
          return
        }
        if (bytesRef.current >= totalBytes) {
          stopTimers()
          setPhase('downloaded')
        }
      }, 140)
    },
    [totalBytes, stopTimers],
  )

  const install = useCallback(() => {
    stopTimers()
    setPhase('installing')
    timeoutRef.current = window.setTimeout(() => setPhase('installed'), 1400)
  }, [stopTimers])

  const progressPercent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))

  return { phase, downloadedBytes, progressPercent, start, install, reset }
}

export type SimulatedDownload = ReturnType<typeof useSimulatedDownload>