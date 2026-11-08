import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

test('index.html contains 0ms synchronous pre-paint theme bootstrap script in head', () => {
  const indexHtml = read('index.html')

  assert.match(indexHtml, /<script>/)
  assert.match(indexHtml, /bigdrops_active_theme/)
  assert.match(indexHtml, /bigdrops_user_theme_/)
  assert.match(indexHtml, /root\.classList\.add\('dark'\)/)
  assert.match(indexHtml, /root\.setAttribute\('data-theme'/)
  assert.match(indexHtml, /root\.style\.backgroundColor/)
})

test('useUserThemePreferences initializes synchronously from cache and mirrors active theme', () => {
  const hookSource = read('src/hooks/useUserThemePreferences.ts')

  assert.match(hookSource, /ACTIVE_THEME_STORAGE_KEY\s*=\s*'bigdrops_active_theme'/)
  assert.match(hookSource, /readActiveThemeCache/)
  assert.match(hookSource, /writeActiveThemeCache/)
  // Synchronous initialization inside useState initializer function
  assert.match(hookSource, /useState<UserThemePreference>\(\(\)\s*=>/)
  assert.match(hookSource, /readLocalCache\(userId\)/)
  assert.match(hookSource, /readActiveThemeCache\(\)/)
})

test('ColdLaunchTenantTreePresentation derives ambient theme without prohibited hooks or localStorage', () => {
  const presentationSource = read('src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx')

  // Ambient family resolution reads data-theme from documentElement
  assert.match(presentationSource, /function resolveAmbientFamily\(\)/)
  assert.match(presentationSource, /getAttribute\('data-theme'\)/)
  assert.match(presentationSource, /propFamily \?\? ambientFamily/)
  assert.match(presentationSource, /data-family=\{family\}/)

  // Web loader does not hardcode static slate navy background
  assert.doesNotMatch(presentationSource, /bg-\[#0d1624\]/)
  assert.match(presentationSource, /var\(--scene-intro, var\(--bg, #0d1624\)\)/)

  // Critical isolation: MUST NOT contain banned tokens
  for (const banned of ['localStorage', 'useUserThemePreferences', 'AppThemeManager']) {
    assert.ok(!presentationSource.includes(banned), `Must not contain ${banned}`)
  }
})

test('Web Android app promo banner exists and is mounted in App.tsx without violating isolation', () => {
  const bannerSource = read('src/components/app/WebAppPromoBanner.tsx')
  const appSource = read('src/App.tsx')

  assert.match(bannerSource, /bouxre_web_apk_promo_dismissed_v1/)
  assert.match(bannerSource, /useWebAndroidApk/)
  assert.match(bannerSource, /download="bouxre-latest\.apk"/)
  assert.match(bannerSource, /Download APK/)

  // App.tsx mounts WebAppPromoBanner on web
  assert.match(appSource, /import WebAppPromoBanner from '@\/components\/app\/WebAppPromoBanner'/)
  assert.match(appSource, /\{!isAndroidNative\(\) && <WebAppPromoBanner \/>\}/)

  // App.tsx must not violate the critical isolation rule
  for (const banned of ['localStorage', 'useUserThemePreferences', 'AppThemeManager']) {
    assert.doesNotMatch(appSource, new RegExp(banned), `App.tsx must not contain ${banned}`)
  }
})

test('Settings AppUpdateSection renders permanent BOUXRE for Android card on web', () => {
  const settingsSectionSource = read('src/pages/settings/AppUpdateSettingsSection.tsx')
  const settingsConfigSource = read('src/pages/settings/settings-config.ts')

  // Web Android download card rendered when !isAndroidNative()
  assert.match(settingsSectionSource, /WebAndroidDownloadSection/)
  assert.match(settingsSectionSource, /if \(!isAndroidNative\(\)\) \{\s*return <WebAndroidDownloadSection \/>/)
  assert.match(settingsSectionSource, /BOUXRE for Android/)
  assert.match(settingsSectionSource, /Download Android APK/)
  assert.match(settingsSectionSource, /download="bouxre-latest\.apk"/)

  // settings-config.ts makes app-update available on web with 'Android App' label
  assert.match(settingsConfigSource, /id:\s*'app-update'/)
  assert.match(settingsConfigSource, /label:\s*'Android App'/)
})
