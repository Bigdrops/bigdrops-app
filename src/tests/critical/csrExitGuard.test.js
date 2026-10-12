import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path) => readFileSync(resolve(path), 'utf8')

const pageSource = read('src/pages/CsrFormPage.tsx')
const guardSource = read('src/lib/native/androidBackGuard.ts')
const backHandlerSource = read('src/components/app/AndroidBackHandler.tsx')
const screenSource = read('src/components/csr/CsrFormScreen.tsx')
const presentationsSource = read('src/components/csr/CsrFormPresentations.tsx')

// ── Dialog contract ──

test('exit dialog offers Save & Exit, Keep Editing, and Discard & Exit', () => {
  assert.match(pageSource, /<AlertDialogTitle>Unsaved Changes<\/AlertDialogTitle>/)
  assert.match(
    pageSource,
    /You have unsaved changes to this Customer Service Report\. What would you like to do\?/,
  )
  assert.match(pageSource, /Save & Exit/)
  assert.match(pageSource, /Keep Editing/)
  assert.match(pageSource, /Discard &amp; Exit/)
})

test('Save is the primary visual action; Discard is restrained, never solid red', () => {
  // Save & Exit is a default (primary) Button, never the destructive variant.
  const saveButton = pageSource.slice(pageSource.indexOf('Save & Exit') - 900, pageSource.indexOf('Save & Exit'))
  assert.ok(!saveButton.includes('variant="destructive"'), 'Save must not be destructive')
  assert.ok(!saveButton.includes('variant="outline"'), 'Save must stay primary, not secondary')

  // Discard & Exit must not use the solid reddish primary treatment.
  const discardButton = pageSource.slice(pageSource.indexOf('Discard &amp; Exit') - 900, pageSource.indexOf('Discard &amp; Exit'))
  assert.ok(!discardButton.includes('variant="destructive"'), 'Discard must not use solid destructive styling')
  assert.match(discardButton, /text-bd-status-danger-text/, 'Discard keeps a restrained danger treatment')
  assert.match(discardButton, /hover:bg-bd-status-danger-bg/, 'Discard hovers a danger wash, not a solid fill')

  // Old two-action copy is gone.
  assert.ok(!pageSource.includes('Discard Changes?'), 'the old two-action title must be gone')
  assert.ok(
    !pageSource.includes('Your unsaved changes will be lost'),
    'the old two-action description must be gone',
  )
})

test('dialog actions are touch-friendly and keyboard-safe', () => {
  assert.match(pageSource, /min-h-11 w-full sm:order-3 sm:w-auto/, 'Save needs a 44px touch target')
  assert.match(pageSource, /min-h-11 w-full sm:order-2 sm:w-auto/, 'Keep Editing needs a 44px touch target')
  assert.match(pageSource, /min-h-11 w-full border-bd-status-danger-border/, 'Discard needs a 44px touch target')
  // Initial focus lands on the safe primary action, not on Discard.
  const saveIdx = pageSource.indexOf('Save & Exit')
  const keepIdx = pageSource.indexOf('Keep Editing')
  const discardIdx = pageSource.indexOf('Discard &amp; Exit')
  assert.ok(saveIdx < keepIdx && keepIdx < discardIdx, 'DOM order must be Save, Keep, Discard')
})

// ── Save & Exit reuses the authoritative handler ──

test('Save & Exit uses the same handler as the bottom Save button and the FAB', () => {
  assert.match(pageSource, /const handleSave = async \(\): Promise<boolean>/)
  assert.match(pageSource, /onSave=\{handleSave\}/, 'bottom Save and FAB keep the original handler')
  assert.match(pageSource, /await handleSave\(\)/, 'Save & Exit awaits the same handler')
  assert.ok(
    !pageSource.includes('createOfflineCsrDraft(csrData, tenantClient)') &&
      pageSource.includes('await createOfflineCsrDraft(csrData)'),
    'no second persistence pathway may exist',
  )
  for (const banned of [".from('csrs').insert", ".from('csrs').update"]) {
    const inPage = pageSource.includes(banned)
    assert.ok(!inPage, `CsrFormPage must not persist directly via ${banned}`)
  }
  // The only direct insert left is the pre-existing blank-number audit log,
  // which is not a CSR persistence pathway.
  assert.match(pageSource, /from\('blank_csr_logs'\)\.insert/)
})

test('save reports persistence so failures never navigate', () => {
  assert.ok(pageSource.includes('return true'), 'confirmed persistence must resolve true')
  const falses = pageSource.match(/return false/g) || []
  assert.ok(falses.length >= 5, 'validation and save failures must resolve false')
  // The exit dialog stays mounted during the save with conflicts disabled.
  assert.match(pageSource, /loading=\{saving\}/)
  assert.match(pageSource, /disabled=\{saving\}/)
})

test('Discard & Exit never saves', () => {
  const discardFn = pageSource.slice(
    pageSource.indexOf('const handleDiscardAndExit'),
    pageSource.indexOf('const handleSaveAndExit'),
  )
  for (const banned of ['handleSave', 'createCsr', 'updateCsr', 'createOfflineCsrDraft']) {
    assert.ok(!discardFn.includes(banned), `discard must not reach ${banned}`)
  }
})

test('offline saves stay honest in the success flow', () => {
  assert.match(pageSource, /setLastSaveOffline\(true\)/)
  assert.match(pageSource, /Draft Saved Offline/)
  assert.match(pageSource, /saved on this device only/)
})

// ── Navigation intent ──

test('explicit Cancel defaults to the CSR list through the unified guard', () => {
  assert.match(pageSource, /requestExit\(\{ kind: 'route', path: '\/csr' \}\)/)
  assert.ok(!pageSource.includes('setDiscardDialogOpen'), 'the old dialog flag must be gone')
})

test('one-time bypass is disarmed after every authorized exit', () => {
  assert.match(pageSource, /exitBypassRef\.current = false/)
  // Pass-through walks back entries without stacking dialogs or entries.
  assert.match(pageSource, /passThroughRef/)
  assert.match(pageSource, /consumePhaseRef/)
})

// ── Capacitor hardware Back ──

test('no competing backButton listener exists; the form registers a scoped guard', () => {
  assert.match(pageSource, /registerAndroidBackGuard\(\(\) => \{/)
  assert.match(guardSource, /export function registerAndroidBackGuard/)
  assert.match(guardSource, /export function consultAndroidBackGuards/)
  assert.match(backHandlerSource, /consultAndroidBackGuards\(\)/)
})

test('exactly one backButton subscription remains in the app', () => {
  const hits = backHandlerSource.match(/addListener\('backButton'/g) || []
  assert.equal(hits.length, 1, 'the central handler keeps the only backButton listener')
  assert.ok(!guardSource.includes('addListener'), 'the registry must not subscribe itself')
  assert.ok(!pageSource.includes('addListener'), 'the form must not subscribe itself')
})

test('hardware Back is swallowed mid-save and never stacks dialogs', () => {
  const guardFn = pageSource.slice(
    pageSource.indexOf('return registerAndroidBackGuard'),
    pageSource.indexOf('return registerAndroidBackGuard') + 900,
  )
  assert.match(guardFn, /if \(savingRef\.current\) return true/)
  assert.match(guardFn, /if \(exitRequestRef\.current\)/)
  assert.match(guardFn, /setExitRequest\(\{ kind: 'back' \}\)/)
})

// ── Browser / SPA navigation ──

test('browser history is guarded with a single sentinel, not a loop', () => {
  assert.match(pageSource, /pushExitSentinel/)
  assert.match(pageSource, /window\.addEventListener\('popstate', onPopState\)/)
  assert.match(pageSource, /window\.removeEventListener\('popstate', onPopState\)/)
  // Sentinel entries are marked so remounts adopt instead of stacking.
  assert.match(pageSource, /csrExitGuard: true/)
  const pushes = pageSource.match(/window\.history\.pushState/g) || []
  assert.ok(pushes.length <= 2, 'at most the mount and restore pushes may exist')
  assert.ok(!pageSource.includes('history.go('), 'no blind history jumps')
})

test('refresh and tab close keep the standard beforeunload protection', () => {
  assert.match(pageSource, /window\.addEventListener\('beforeunload', handler\)/)
  assert.match(pageSource, /window\.removeEventListener\('beforeunload', handler\)/)
})

// ── Preserved CSR surface ──

test('FAB, footer, header, and artwork are untouched', () => {
  assert.match(screenSource, /<MobileFab/)
  assert.match(screenSource, /ariaLabel="Save CSR"/)
  assert.match(presentationsSource, /function CsrFormActions/)
  assert.match(presentationsSource, /aria-label="CSR form actions"/)
  assert.match(presentationsSource, /CsrMobileFoldPresentation/)
  assert.match(presentationsSource, /CsrDesktopTabletPresentation/)
  assert.match(pageSource, /aria-hidden="true"/, 'decorative ambient artwork stays')
  assert.match(pageSource, /csrAmbientDrift/, 'ambient artwork animation stays')
  assert.match(pageSource, /onSave=\{handleSave\}/)
  assert.match(pageSource, /onCancel=\{handleCancel\}/)
})
