import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

test('GooeyToast is completely replaced by ToastPill / ToastStack', () => {
  const mainSource = read('src/main.tsx')
  assert.doesNotMatch(mainSource, /goey-toast\/styles\.css/, 'main.tsx must not import goey-toast styles')

  const feedbackSource = read('src/lib/feedback.ts')
  assert.doesNotMatch(feedbackSource, /goeyToast/, 'feedback.ts must not reference goeyToast')
  assert.doesNotMatch(feedbackSource, /ExpandableErrorDetails/, 'feedback.ts must not render ExpandableErrorDetails')
  assert.match(feedbackSource, /toastStore\.add/, 'feedback.ts must route through toastStore')

  const toasterSource = read('src/components/ui/toaster.tsx')
  assert.match(toasterSource, /export function Toaster\(\)/, 'toaster.tsx must export Toaster')
  assert.match(toasterSource, /function ToastPill\(/, 'toaster.tsx must render ToastPill')
  assert.match(toasterSource, /min-h-\[36px\]/, 'ToastPill must have compact 36px height')
})

test('Quick Actions rows are unified with neutral surface and mergeQtyUnit is locked', () => {
  const helpersSource = read('src/components/invoice/mobileFormHelpers.js')
  assert.doesNotMatch(helpersSource, /qtyUnitMerge/, 'mobileFormHelpers.js must not expose qtyUnitMerge action')

  const actionsSheetSource = read('src/components/invoice/ActionsSheet.tsx')
  assert.doesNotMatch(actionsSheetSource, /mergeQtyUnit/, 'ActionsSheet.tsx must not have mergeQtyUnit toggle')

  const poFormSource = read('src/pages/PurchaseOrderFormPage.tsx')
  assert.match(poFormSource, /const \[mergeQtyUnit.*\] = useState\(true\)/, 'PO form must lock mergeQtyUnit to true')

  const unifiedActionSource = read('src/components/actions/UnifiedActionSheet.tsx')
  // Verify row class is neutral
  assert.match(unifiedActionSource, /bg-bd-surface-action/, 'UnifiedActionSheet must use neutral surface for all rows')
  assert.doesNotMatch(unifiedActionSource, /bg-emerald-500\/10/, 'Row background must not have neon green fill')
  assert.doesNotMatch(unifiedActionSource, /bg-rose-500\/10/, 'Row background must not have neon red/maroon fill')
})

test('useNotifications and PaymentReminderBanner prioritize update and web APK promo', () => {
  const notificationsHook = read('src/hooks/useNotifications.ts')
  assert.match(notificationsHook, /synthetic-android-update/, 'useNotifications must synthesize Android update notification')
  assert.match(notificationsHook, /synthetic-web-apk-promo/, 'useNotifications must synthesize Web APK promo notification')

  const reminderBanner = read('src/components/dashboard/PaymentReminderBanner.tsx')
  assert.match(reminderBanner, /Update available|Update required/i, 'PaymentReminderBanner must prioritize Android update')
  assert.match(reminderBanner, /Get BOURXE for Android/, 'PaymentReminderBanner must prioritize Web APK promo')
})

test('Settings includes Diagnostic Logs Center with diagnostic export actions', () => {
  const settingsConfig = read('src/pages/settings/settings-config.ts')
  assert.match(settingsConfig, /id:\s*'system-logs'/, 'settings-config must register system-logs')

  const settingsPage = read('src/pages/Settings.tsx')
  assert.match(settingsPage, /<SystemLogsSettingsSection \/>/, 'Settings.tsx must mount SystemLogsSettingsSection')

  const logsSection = read('src/pages/settings/SystemLogsSettingsSection.tsx')
  assert.match(logsSection, /jaiyewisdom@gmail\.com/, 'Logs section must provide mailto developer contact')
  assert.match(logsSection, /2348150240192/, 'Logs section must provide WhatsApp developer contact')
  assert.match(logsSection, /handleDownload/, 'Logs section must support JSON export')
  assert.match(logsSection, /handleCopyAll/, 'Logs section must support copying all diagnostic logs')
})


