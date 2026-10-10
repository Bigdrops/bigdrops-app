import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const read = (path) => readFileSync(pathResolve(root, path), 'utf8')

const appSource = read('src/App.tsx')
const gateSource = read('src/components/app/TenantGate.tsx')
const biometricGateSource = read('src/components/app/BiometricGate.tsx')
const appShellSource = read('src/components/app/AppShell.tsx')
const indexCssSource = read('src/index.css')
const previewSource = read('src/pages/ColdLaunchPreview.tsx')
const presentationSource = read('src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx')
const themePresetsSource = read('src/lib/themePresets.ts')

test('production startup renders approved Cold Launch V1 without preview controls', () => {
  assert.match(appSource, /ColdLaunchTenantTreePresentation/)
  assert.match(appSource, /const showColdLaunch =\s*authLoading \|\|\s*profileLoading \|\|\s*offlineAccessLoading \|\|\s*waitingForProfileResolution \|\|\s*tenantGateLoading \|\|\s*shouldAwaitTenantGateReport \|\|/s)
  assert.match(appSource, /isPassiveStartupPhase\(tenantGatePhase\)/)
  assert.match(appSource, /showColdLaunch \? <ColdLaunchTenantTreePresentation tipPathname="\/" \/> : null/)
  assert.doesNotMatch(appSource, /SplashOverlay|showSplash|runnerMove/)
  assert.doesNotMatch(appSource, /Tree Original|Tree \+ Beams|Connection Error|Replay|V2 - Paper/)

  assert.match(presentationSource, /PreviewTree/)
  assert.match(presentationSource, /BOURXE/)
  assert.match(presentationSource, /bigdropsLogo/)
  assert.match(presentationSource, /useLoadingTip/)
})

test('startup readiness remains owned by App and has no artificial splash delay', () => {
  assert.match(appSource, /authLoading/)
  assert.match(appSource, /profileLoading/)
  assert.match(appSource, /offlineAccessLoading/)
  assert.match(appSource, /tenantGateLoading/)
  assert.match(appSource, /shouldAwaitTenantGateReport/)
  assert.doesNotMatch(appSource, /setShowSplash|setShowColdLaunch|minimumVisible|setTimeout\(\(\) => \{\s*setShowSplash\(false\)/s)
})

test('tenant readiness coordinates one Cold Launch while ordinary route lazy loading stays separate', () => {
  assert.match(appSource, /onLoadingChange=\{setTenantGateLoading\}/)
  assert.match(appSource, /onPhaseChange=\{setTenantGatePhase\}/)
  assert.match(appSource, /tenantGatePhase === null/)
  assert.match(gateSource, /onLoadingChange\?: \(loading: boolean\) => void/)
  assert.match(gateSource, /onPhaseChange\?: \(phase: TenantGatePhase \| null\) => void/)
  assert.match(gateSource, /onLoadingChange\?\.\(phase === 'loading'\)/)
  assert.match(gateSource, /onPhaseChange\?\.\(phase\)/)
  assert.match(gateSource, /case 'loading':\s*return null/s)
  assert.doesNotMatch(gateSource, /ColdLaunchTenantTreePresentation/)
  assert.match(gateSource, /workspaceCtx\.refresh\(\)/)
  assert.match(gateSource, /entityCtx\.refresh\(\)/)

  assert.match(appSource, /<Suspense fallback=\{<PageLoader \/>\}>/)
  assert.match(appShellSource, /<Suspense fallback=\{<PageLoader \/>\}>/)
})

test('startup handoff does not hide terminal tenant destinations behind Cold Launch', () => {
  assert.match(appSource, /tenantGatePhase === null/)
  assert.doesNotMatch(appSource, /tenantGatePhase !== ['"]ready['"]/)
  assert.match(gateSource, /case 'pending-approval':\s*return <WorkspacePendingApproval \/>/s)
  assert.match(gateSource, /case 'provisioning':\s*return <ProvisioningProgress \/>/s)
  assert.match(gateSource, /case 'create-company':\s*return <CompanyCreation \/>/s)
})

test('biometric security gate remains an accessible destination outside Cold Launch', () => {
  assert.match(appSource, /onGatedChange=\{setBiometricGateActive\}/)
  assert.match(appSource, /!biometricGateActive/)
  assert.match(biometricGateSource, /onGatedChange\?: \(gated: boolean\) => void/)
  assert.match(biometricGateSource, /const gateActive = enabled && isNativePlatform\(\) && gated/)
  assert.match(biometricGateSource, /if \(gateActive\)\s*return \(\s*<PageLoader>/s)
})

test('theme isolation avoids preference mutation and rejected sixth theme registration', () => {
  for (const source of [appSource, gateSource, presentationSource, previewSource]) {
    assert.doesNotMatch(source, /useUserThemePreferences|AppThemeManager|localStorage/)
  }

  assert.doesNotMatch(themePresetsSource, /slate-amber-fusion|SLATE_AMBER_FUSION|Slate × Amber/)
  assert.match(presentationSource, /getPhotoHeroVars/)
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META/)
})

test('rejected Cold Launch V2 Paper and Delivery files are retired', () => {
  for (const path of [
    'src/components/app/SplashOverlay.tsx',
    'src/components/cold-launch/ColdLaunchPaperDeliveryPreview.tsx',
    'src/components/cold-launch/cold-launch-v2-theme.ts',
    'src/tests/critical/coldLaunchV2PaperDelivery.test.js',
  ]) {
    assert.equal(existsSync(pathResolve(root, path)), false, `${path} should be removed`)
  }

  assert.doesNotMatch(previewSource, /Paper & Delivery|ColdLaunchPaperDeliveryPreview|candidate/)
})

test('reduced motion and production Quick Tips remain available in shared presentation', () => {
  assert.match(presentationSource, /prefers-reduced-motion/)
  assert.match(presentationSource, /ColdLaunchTips/)
  assert.match(presentationSource, /Quick tip/)
  assert.match(presentationSource, /tip\?\.message\?\.trim\(\) \|\| 'Loading guidance\.\.\.'/)
  assert.match(presentationSource, /@keyframes clp-tip-fade\{0%\{opacity:1;/)
  assert.doesNotMatch(presentationSource, /@keyframes clp-tip-fade\{0%\{opacity:0/)
})

test('Tenant Tree reveal establishes once and holds visible geometry', () => {
  assert.match(presentationSource, /\.clp \.clp-ring\{[^}]*opacity:\.72/)
  assert.match(presentationSource, /\.clp \.clp-edge\{[^}]*opacity:\.78/)
  assert.match(presentationSource, /\.clp \.clp-node\{opacity:1\}/)
  assert.ok(
    presentationSource.includes(
      '@keyframes clp-draw{0%{stroke-dashoffset:1;opacity:0}8%{opacity:.92}28%,100%{stroke-dashoffset:0;opacity:.78}}',
    ),
  )
  assert.ok(
    presentationSource.includes(
      '@keyframes clp-pop{0%{opacity:0;transform:translate(var(--fx,0px),var(--fy,0px)) scale(.92)}12%{opacity:1}30%,100%{opacity:1;transform:none}}',
    ),
  )
  assert.doesNotMatch(presentationSource, /clp-(ring|edge|node)[^{]*\{[^}]*animation-direction:\s*alternate/)
  assert.doesNotMatch(presentationSource, /\.clp-run \.clp-(ring|edge|node)\{[^}]*infinite/)
})

test('production connection geometry does not run infinite signal travel', () => {
  assert.match(presentationSource, /\.clp\[data-variant="original"\] \.clp-signal\{display:none;/)
  assert.match(presentationSource, /\.clp\[data-variant="enhanced"\]\.clp-run \.clp-signal\{animation:clp-signal-travel 5\.8s linear infinite\}/)
  assert.doesNotMatch(presentationSource, /(^|\n)\s*\.clp-run \.clp-signal\{animation:clp-signal-travel 5\.8s linear infinite\}/)
  assert.match(presentationSource, /\.clp-run \.clp-edge\{stroke-dasharray:1;stroke-dashoffset:1;animation:clp-draw 6\.5s cubic-bezier\(\.23,1,\.32,1\) both\}/)
})

test('retired startup animation styles are removed while shared loading remains', () => {
  assert.doesNotMatch(indexCssSource, /bd-sheet-rear|bd-sheet-front|bd-mark|bd-halo|bd-progress/)
  assert.match(appSource, /<Suspense fallback=\{<PageLoader \/>\}>/)
  assert.match(appShellSource, /<Suspense fallback=\{<PageLoader \/>\}>/)
})

test('passive provisioning stays under Cold Launch while its operations continue', () => {
  const provisioningSource = read('src/pages/ProvisioningProgress.tsx')
  // Presentation ownership: App covers the provisioning phase with Cold Launch.
  assert.match(appSource, /isPassiveStartupPhase\(tenantGatePhase\)/)
  // Behavior preservation: TenantGate still mounts the owner, which keeps polling.
  assert.match(gateSource, /case 'provisioning':\s*return <ProvisioningProgress \/>/s)
  assert.match(provisioningSource, /setInterval\(\(\) => \{\s*entityCtx\.refresh\(\)\s*entityCtx\.recheckProvisioning\(\)/s)
  assert.match(provisioningSource, /POLL_INTERVAL_MS/)
  assert.match(provisioningSource, /clearInterval\(id\)/)
  // No competing passive visual is introduced by the ownership change.
  assert.doesNotMatch(appSource, /<ProvisioningProgress/)
})

test('pending approval keeps its actionable waiting screen', () => {
  const approvalSource = read('src/pages/WorkspacePendingApproval.tsx')
  assert.match(gateSource, /case 'pending-approval':\s*return <WorkspacePendingApproval \/>/s)
  assert.match(approvalSource, /Leave waiting room/)
  assert.match(approvalSource, /Sign Out/)
  assert.match(approvalSource, /workspaceCtx\.refresh\(\)/)
  // Approval is not a passive phase, so Cold Launch never covers it.
  assert.doesNotMatch(appSource, /pending-approval/)
})

test('provisioning failure and recovery remain accessible outside Cold Launch', () => {
  assert.match(gateSource, /case 'provisioning-failed':\s*return <ProvisioningFailed \/>/s)
  assert.match(gateSource, /case 'error':/)
  assert.match(gateSource, /workspaceCtx\.refresh\(\)/)
  assert.match(gateSource, /entityCtx\.refresh\(\)/)
})
