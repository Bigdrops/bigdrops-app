import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

/**
 * Installed app identity. versionCode is the update-comparison basis;
 * versionName is display only.
 */
export interface AppVersionInfo {
  versionCode: number | null
  versionName: string | null
}

type AppPluginLike = {
  getInfo(): Promise<{
    name: string
    id: string
    build: string
    version: string
  }>
  addListener(
    eventName: 'appStateChange',
    listenerFunc: (state: { isActive: boolean }) => void,
  ): Promise<PluginListenerHandle>
}

let cachedVersion: AppVersionInfo | null = null
let versionLoad: Promise<AppVersionInfo> | null = null

/**
 * Reads build/version through @capacitor/app's getInfo(). `build` maps to
 * Android versionCode, `version` to versionName. Cached after first load.
 * Returns nulls on web (no native build identity) or on plugin failure.
 */
export async function getAppVersionInfo(): Promise<AppVersionInfo> {
  if (cachedVersion) return cachedVersion
  if (!versionLoad) {
    versionLoad = (async () => {
      if (Capacitor.getPlatform() !== 'android') {
        return { versionCode: null, versionName: null }
      }
      try {
        const App = (await import('@capacitor/app')).App as unknown as AppPluginLike
        const info = await App.getInfo()
        const versionCode = Number(info.build)
        return {
          versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : null,
          versionName: info.version || null,
        }
      } catch {
        return { versionCode: null, versionName: null }
      }
    })()
  }
  cachedVersion = await versionLoad
  return cachedVersion
}

/** Android versionCode of the installed app, or null when unavailable. */
export async function getInstalledVersionCode(): Promise<number | null> {
  const info = await getAppVersionInfo()
  return info.versionCode
}
