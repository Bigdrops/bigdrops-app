import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import {
  PHOTO_HERO_FAMILIES,
  getPhotoHeroVars,
} from '../../components/onboarding/photo-hero-v2-theme.ts'
import {
  getDarkVariantBundle,
  getDarkVariantSemanticTokens,
  getThemePreset,
} from '../../lib/themePresets.ts'

const previewSource = readFileSync(
  resolve('src/components/dashboard-theme/dashboard-theme-preview.tsx'),
  'utf8',
)
const pageSource = readFileSync(resolve('src/pages/DashboardThemeExperiment.tsx'), 'utf8')
const previewDataSource = readFileSync(
  resolve('src/components/dashboard-theme/preview-dashboard-data.ts'),
  'utf8',
)
const appShellSource = readFileSync(resolve('src/components/app/AppShell.tsx'), 'utf8')
const overviewSource = readFileSync(resolve('src/components/dashboard/DashboardOverview.tsx'), 'utf8')
const sharedViewportCss = readFileSync(
  resolve('src/components/design-lab/design-lab-viewport.css'),
  'utf8',
)
const sharedThemeSource = readFileSync(
  resolve('src/components/design-lab/design-lab-theme.ts'),
  'utf8',
)
const sharedViewportSource = readFileSync(
  resolve('src/components/design-lab/viewport-stage.tsx'),
  'utf8',
)
const productionDashboardSource = readFileSync(resolve('src/pages/Dashboard.tsx'), 'utf8')

const ROUTE = '/design-lab/dashboard-theme'

const HSL_TRIPLET = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%(\s*\/\s*[\d.]+)?\s*$/

// Dashboard tokens the experiment re-declares so the theme reaches every
// surface, navigation element, panel, and border inside the dashboard.
const MATERIAL_TOKENS = [
  '--surface',
  '--surface-raised',
  '--surface-muted',
  '--bd-surface',
  '--bd-card-bg',
  '--bd-surface-raised',
  '--bd-surface-muted',
  '--bd-surface-action',
  '--bd-surface-action-hover',
  '--bd-layout-sidebar',
  '--bd-overlay-bg',
  '--bd-overlay-section-bg',
  '--bd-overlay-input-bg',
  '--bd-overlay-footer-bg',
  '--bd-input-bg',
  '--bd-status-neutral-bg',
]
const LINE_TOKENS = ['--line', '--line-strong', '--border', '--input', '--bd-border']
const ATMOSPHERE_TOKENS = [
  '--scene-intro',
  '--field-a',
  '--field-b',
  '--glass-bg',
  '--glass-line',
  '--glass-shadow',
  '--glass-ink',
  '--chrome-ink',
  '--primary-ink',
  '--hero-accent',
  '--deep-a',
  '--deep-b',
]

function resolveRegistryToken(family, appearance, token) {
  const preset = getThemePreset(family)
  const bundle = appearance === 'dark' ? getDarkVariantBundle(family) : preset.bundle
  const semantic = appearance === 'dark' ? getDarkVariantSemanticTokens(family) : preset.semanticTokens
  return semantic[token] ?? bundle[token.replace(/^--/, '')]
}

test('registry exposes the dashboard theme experiment and keeps earlier previews', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === 'dashboard-theme')
  assert.ok(entry, 'registry must list the dashboard-theme preview')
  assert.equal(entry.name, 'Dashboard Theme Experiment')
  assert.equal(entry.eyebrow, 'Dashboard')
  assert.equal(entry.route, ROUTE)
  assert.ok(entry.capabilities.length >= 3, 'entry needs capability metadata')

  const routes = DESIGN_LAB_PREVIEWS.map((preview) => preview.route)
  assert.ok(routes.includes('/photohero-preview'), 'the onboarding preview must stay registered')
  assert.ok(!routes.includes('/onboarding-v2-preview'), 'the rejected Onboarding V2 preview must stay deleted')
  assert.ok(!routes.includes('/onboarding-v3-preview'), 'the rejected Onboarding V3 preview must stay deleted')
})

test('app shell registers the experiment route without touching production routes', () => {
  assert.ok(appShellSource.includes(`<Route path="${ROUTE}"`), `AppShell must register ${ROUTE}`)
  assert.ok(appShellSource.includes('<Route path="/design-lab"'), 'the Design Lab route must stay registered')
  assert.ok(appShellSource.includes('<Route path="/"'), 'the production dashboard route must stay registered')
})

test('page mounts the preview and nothing else', () => {
  assert.match(pageSource, /DashboardThemePreview/)
  assert.match(pageSource, /from '@\/components\/dashboard-theme\/dashboard-theme-preview'/)
  assert.ok(!pageSource.includes('Layout'), 'the experiment must not repaint the production layout itself')
})

test('full viewport shell: no header block, no device mockup, no scaling', () => {
  for (const banned of [
    'dte-bar',
    'dte-note',
    'dte-device',
    'dte-frame',
    'dte-kpiwrap',
    'dte-bottomnav',
    'transform:scale',
    'scale(',
    'viewBox',
    'ResizeObserver',
  ]) {
    assert.ok(!previewSource.includes(banned), `the experiment must not contain ${banned}`)
  }
  assert.match(previewSource, /\.dte-root\{position:relative;min-height:100dvh\}/)
  assert.match(previewSource, /contentClassName="!px-0 !py-0 bg-transparent"/)
  // The experiment never declares a device width itself: every simulated width
  // comes from the shared preset module.
  assert.ok(
    !/(^|[^-\w])width:\s*\d{3,4}px/m.test(previewSource),
    'the experiment must not hardcode a device width',
  )
  assert.match(previewSource, /useDesignLabViewport\(\)/)
})

test('viewport switching is restored inside the compact Customisation panel', () => {
  // The shared switcher is mounted in the same popover as theme and appearance.
  assert.match(previewSource, /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/)
  assert.match(previewSource, /import \{ ViewportStage, ViewportSwitcher \} from '@\/components\/design-lab\/viewport-stage'/)
  // The dashboard itself is wrapped in the viewport surface.
  assert.match(previewSource, /<ViewportStage viewport=\{viewport\}>/)
  assert.match(previewSource, /<\/ViewportStage>/)
  // The floating controls stay outside the simulated surface so they remain
  // reachable while the surface scrolls horizontally.
  const stageClose = previewSource.indexOf('</ViewportStage>')
  const dock = previewSource.indexOf('className="dte-dock"')
  assert.ok(stageClose > 0 && dock > stageClose, 'the palette dock must sit outside the viewport stage')
  // The default is the actual device, so the experiment opens at full size.
  assert.match(previewSource, /const \{ viewportId, viewport, setViewportId \} = useDesignLabViewport\(\)/)
  // Only the shared presets supply the mode list: no second preset table.
  assert.match(previewSource, /import \{ useDesignLabViewport \} from '@\/lib\/designLabViewports'/)
  assert.ok(
    !/\bid:\s*'(mobile|tablet|desktop|fold-open|fold-closed)'/.test(previewSource),
    'viewport presets must come from the shared module',
  )
})

test('simulated viewports restate the production tiers as container queries', () => {
  // Tier rules are keyed to the shared named container, so they can never match
  // a container from another surface.
  assert.match(previewSource, /@container dlv \(max-width: 767\.9px\)\{/)
  assert.match(previewSource, /@container dlv \(min-width: 768px\)\{/)
  assert.match(previewSource, /@container dlv \(min-width: 1024px\)\{/)
  // Each rule is gated to simulated mode: actual-device mode keeps production
  // media-query behaviour.
  const containerBlocks = previewSource.match(/@container dlv \([^)]*\)\{[\s\S]*?\n {2}\}/g) || []
  assert.equal(containerBlocks.length, 3, 'the three production tiers must be restated')
  for (const block of containerBlocks) {
    const declarations = block
      .split('\n')
      .filter((entry) => entry.includes('{') && entry.includes(':'))
      .filter((entry) => !entry.trim().startsWith('@'))
    assert.ok(declarations.length > 0, 'a tier block must restate at least one rule')
    for (const line of declarations) {
      assert.match(line, /\[data-dlv-sim\]/, `tier rule must be simulated-only: ${line.trim()}`)
    }
  }
  // Mobile tier: sidebar out, mobile chrome in, one flex direction switch.
  assert.match(previewSource, /\[data-dlv-sim\] \.dte-root \[data-bd-shell="app"\]\{flex-direction:column\}/)
  assert.match(previewSource, /\[data-dlv-sim\] \.dte-root \[data-bd-shell="app"\]\{flex-direction:row\}/)
  assert.match(previewSource, /> aside\{display:none\}/)
  assert.match(previewSource, /div\.md\\\\:hidden\{display:block\}/)
  assert.match(previewSource, /div\.hidden\.md\\\\:block\{display:none\}/)
  // The shared switcher renders the preset list and exposes selection state.
  assert.match(sharedViewportSource, /DESIGN_LAB_VIEWPORTS\.map\(\(viewport\) => \{/)
  assert.match(sharedViewportSource, /aria-pressed=\{selected\}/)
  assert.match(sharedViewportSource, /role="group" aria-label="Viewport"/)
  // The shared surface carries the container and the horizontal inspection path.
  assert.match(sharedViewportCss, /\.dlv-surface\s*\{/)
  assert.match(sharedViewportCss, /container: dlv \/ inline-size/)
  assert.match(sharedViewportCss, /overflow-x: auto/)
  assert.ok(!sharedViewportCss.includes('transform'), 'the shared surface must never scale')
})

test('the experiment mounts the real dashboard inside the real app chrome', () => {
  assert.match(previewSource, /import Layout from '@\/components\/Layout'/)
  assert.match(previewSource, /<Layout/)
  assert.match(previewSource, /data-bd-page="dashboard"/)
  assert.match(previewSource, /from '@\/components\/dashboard\/DashboardOverview'/)
  assert.match(previewSource, /<DashboardOverview/)
  assert.match(previewSource, /buildKpiCards\(PREVIEW_KPI_STATS, PREVIEW_KPI_SELECTION\)/)
  assert.match(previewSource, /PREVIEW_RECENT_DOCS/)
  // Production chrome owns the navigation; the preview must not duplicate it.
  for (const banned of ['MobileBottomNav', 'BxLogo', 'desktopNav', 'salesPicker']) {
    assert.ok(!previewSource.includes(banned), `the preview must not rebuild ${banned}`)
  }
})

test('provider-bound children arrive through the shared optional slots', () => {
  for (const slot of ['searchSlot', 'notificationSlot', 'paymentReminderSlot', 'alertsSlot', 'auditSlot']) {
    assert.match(previewSource, new RegExp(`${slot}=`), `the preview must pass ${slot}`)
    assert.match(overviewSource, new RegExp(`${slot}\\?: ReactNode`), `DashboardOverview must declare optional ${slot}`)
    assert.match(overviewSource, new RegExp(`${slot} \\?\\?`), `DashboardOverview must keep its default for ${slot}`)
  }
  // Production must not opt into the preview slots.
  for (const slot of ['searchSlot', 'notificationSlot', 'paymentReminderSlot', 'alertsSlot', 'auditSlot']) {
    assert.ok(!productionDashboardSource.includes(slot), `production dashboard must not pass ${slot}`)
  }
})

test('the preview never starts a production read or write', () => {
  // Provider-bound components may be named in prose, but never imported or mounted.
  for (const banned of [
    '@/components/notifications/NotificationBell',
    '@/components/layout/GlobalSearch',
    '@/components/dashboard/RecentAlertsCarousel',
    '@/components/dashboard/AuditTrailSkeleton',
    '@/components/dashboard/PaymentReminderBanner',
    '<NotificationBell',
    '<GlobalSearch',
    '<RecentAlertsCarousel',
    '<AuditTrailSkeleton',
    '<PaymentReminderBanner',
    'useNotifications(',
    'useDashboardData(',
    "from '@/supabase'",
    '.from(',
    'insert(',
    'update(',
    'delete(',
    'sessionStorage',
    'localStorage',
  ]) {
    assert.ok(!previewSource.includes(banned), `preview must not contain ${banned}`)
    assert.ok(!previewDataSource.includes(banned), `preview data must not contain ${banned}`)
  }
})

test('every interactive control stays in preview state', () => {
  assert.match(previewSource, /const \[family, setFamily\] = React\.useState/)
  assert.match(previewSource, /const \[appearance, setAppearance\] = React\.useState/)
  assert.match(previewSource, /const \[paletteOpen, setPaletteOpen\] = React\.useState/)
  assert.match(previewSource, /const \[createOpen, setCreateOpen\] = React\.useState/)
  assert.match(previewSource, /const \[readAlertIds, setReadAlertIds\] = React\.useState/)
  assert.match(previewSource, /Preview only — no record was created\./)
  assert.match(previewSource, /Preview only — no invoice or payment was recorded\./)
  for (const banned of ['preference.save', 'useUserThemePreferences(', 'document.documentElement', 'setProperty(']) {
    assert.ok(!previewSource.includes(banned), `preview must not contain ${banned}`)
  }
  // The context is read for the current preference only; the dashboard's own
  // appearance toggle writes preview state instead of the saved profile.
  assert.match(previewSource, /const \{ preference \} = useThemePreferenceContext\(\)/)
  assert.match(previewSource, /saveThemePref=\{handleThemePref\}/)
})

test('the only navigation leaves the experiment', () => {
  const calls = previewSource.match(/navigate\(\s*(['"`])([^'"`]+)\1\s*\)/g) || []
  assert.ok(calls.length >= 1, 'the preview must offer a way back to Design Lab')
  for (const call of calls) {
    assert.match(call, /navigate\('\/design-lab'\)/, `unexpected navigation: ${call}`)
  }
})

test('compact floating palette, dismissible, no permanent title', () => {
  assert.match(previewSource, /\.dte-dock\{/)
  assert.match(previewSource, /\.dte-dock-btn\{/)
  assert.match(previewSource, /aria-expanded=\{paletteOpen\}/)
  assert.match(previewSource, /aria-controls="dte-palette"/)
  assert.match(previewSource, /id="dte-palette"/)
  assert.match(previewSource, /\.dte-pop-close/)
  assert.match(previewSource, /aria-label="Close experiment and return to Design Lab"/)
  // Escape returns focus to the trigger; outside taps close the panel.
  assert.match(previewSource, /event\.key !== 'Escape'/)
  assert.match(previewSource, /paletteRef\.current\?\.focus\(\)/)
  assert.match(previewSource, /addEventListener\('pointerdown', onPointerDown\)/)
  // The page title is available to assistive technology only.
  assert.match(previewSource, /<h1 className="dte-vh">Dashboard Theme Experiment<\/h1>/)
  assert.ok(!previewSource.includes('dte-frame-head'), 'no metadata block may return')
})

test('the Design Lab theme drives the whole dashboard', () => {
  // The experiment root consumes the shared two-layer theme builder.
  assert.match(previewSource, /useExperimentThemeStyle\(family, appearance\)/)
  assert.match(sharedThemeSource, /getPhotoHeroVars\(family, appearance\)/)
  assert.match(sharedThemeSource, /getDarkVariantBundle/)
  assert.match(sharedThemeSource, /getDarkVariantSemanticTokens/)
  assert.match(sharedThemeSource, /MATERIAL_ALPHA/)
  assert.match(sharedThemeSource, /withAlpha/)
  assert.match(sharedThemeSource, /'--dlv-chrome'/) 
  assert.match(sharedThemeSource, /style\['--nav'\] = glass/)
  assert.match(sharedThemeSource, /'--primary-soft'/)
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META\.map/)
  // The atmospheric canvas replaces the flat app background inside the scope.
  assert.match(previewSource, /\.dte-root \[data-bd-shell="app"\]\{/)
  assert.match(previewSource, /background-image:var\(--scene-intro\)/)
  // Dashboard chrome and cards pick up the atmosphere.
  assert.match(previewSource, /\[data-bd-page="dashboard"\] header\{/)
  assert.match(previewSource, /\(--dlv-chrome,var\(--bd-app-bg\)\)/)
  assert.match(previewSource, /\[data-bd-page="dashboard"\] article\{/)
  // Root .dark cannot follow the preview; the hardcoded trend colours are fixed.
  assert.match(previewSource, /\[data-dte-appearance="dark"\] \.text-emerald-600/)
  assert.match(previewSource, /\[data-dte-appearance="light"\] \.dark/)
  for (const banned of ['amber-terracotta', '#f59e0b', 'amber']) {
    assert.ok(!previewSource.includes(banned), `no family may be hardcoded: ${banned}`)
  }
})

test('theme coverage: five families x light and dark resolve for every layer', () => {
  assert.equal(PHOTO_HERO_FAMILIES.length, 5)

  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark']) {
      const vars = getPhotoHeroVars(family, appearance)
      for (const key of ATMOSPHERE_TOKENS) {
        assert.ok(
          typeof vars[key] === 'string' && vars[key].length > 0,
          `${family}/${appearance} atmosphere must define ${key}`,
        )
      }
      assert.match(vars['--scene-intro'], /gradient/, `${family}/${appearance} needs a scene gradient`)

      for (const token of [...MATERIAL_TOKENS, '--line', '--line-strong', '--bg', '--primary']) {
        const value = resolveRegistryToken(family, appearance, token)
        assert.ok(
          typeof value === 'string' && HSL_TRIPLET.test(value),
          `${family}/${appearance} must resolve ${token} as an HSL triplet, got ${String(value)}`,
        )
      }
    }
  }

  // The two appearances must not resolve to the same surface.
  const lightSurface = resolveRegistryToken('slate-navy', 'light', '--bg')
  const darkSurface = resolveRegistryToken('slate-navy', 'dark', '--bg')
  assert.notEqual(lightSurface, darkSurface, 'light and dark must differ')

  // The normalizer drops rgba line values, so the border family binds to the
  // semantic line triplets. The shared theme layer must keep that binding.
  assert.match(sharedThemeSource, /for \(const token of LINE_TOKENS\) style\[token\] = line/)
  assert.match(sharedThemeSource, /style\['--bd-border-strong'\] = lineStrong/)
})

test('material surfaces keep the atmosphere visible without washing out content', () => {
  const block = sharedThemeSource.match(/export const MATERIAL_ALPHA[\s\S]*?\n\}/)
  assert.ok(block, 'the material alpha table must exist')
  const alphas = [...block[0].matchAll(/: ([0-9.]+)/g)].map((match) => Number(match[1]))
  assert.equal(alphas.length, 8, 'the table needs four alphas for two appearances')
  for (const alpha of alphas) {
    assert.ok(alpha >= 0.45 && alpha < 1, `alpha ${alpha} must stay readable but translucent`)
  }
  // Text tokens stay opaque: ink is not in the material table.
  assert.ok(!MATERIAL_TOKENS.includes('--ink'), 'ink must stay opaque')
  assert.ok(!MATERIAL_TOKENS.includes('--bd-ink'), 'bd-ink must stay opaque')
})

test('responsive behaviour is natural, not scaled', () => {
  // Production responsive classes and safe areas are used directly.
  assert.match(previewSource, /lg:right-8 lg:top-24/)
  assert.match(previewSource, /env\(safe-area-inset-/)
  assert.match(previewSource, /@media \(min-width:768px\)/)
  assert.match(previewSource, /left:calc\(16rem \+ 16px\)/)
  // No fixed device width and no miniature viewport: the dashboard keeps the
  // production content maximum and its own scroll flow.
  assert.ok(!/(^|[^-\w])width:\s*\d{3,4}px/m.test(previewSource), 'no fixed device width may be used')
  assert.match(overviewSource, /max-w-\[var\(--bd-layout-content-max,1200px\)\]/)
  assert.match(overviewSource, /paddingBottom: 'max\(128px/)
})

test('experimental styling stays scoped to the experiment root', () => {
  assert.match(previewSource, /\.dte-root/)
  assert.ok(!previewSource.includes(':root{'), 'no global root rule may be declared')
  assert.ok(!previewSource.includes('@tailwind'), 'no global stylesheet directives')
  assert.ok(!/(^|\n)\s*(html|body)\s*\{/.test(previewSource), 'no global element rule may be declared')
  assert.ok(!previewSource.includes('data-dlab-nav'), 'the experiment must not reuse the Design Lab nav override')
  // Every production element rule is scoped: nothing starts at a raw attribute selector.
  assert.ok(!/(^|\n)\s*\[data-bd-/.test(previewSource), 'production element rules must be scoped to .dte-root')
  assert.ok(
    !/import[^\n]*AppThemeManager/.test(previewSource),
    'the preview must not import the production theme manager',
  )
})

test('every stylesheet selector in the experiment stays scoped', () => {
  const css = previewSource.match(/const PREVIEW_CSS = `([\s\S]*?)`\n/)
  assert.ok(css, 'the experiment stylesheet must be declared in PREVIEW_CSS')

  // At-rules (@media) are allowed; only plain selector rules are checked.
  const headers = [...css[1].matchAll(/(^|\n)\s*([^{}\n@][^{}\n]*)\{/g)]
    .map((match) => match[2])
    .filter((header) => !header.trim().startsWith('@'))
  assert.ok(headers.length > 20, 'the stylesheet must contain the experiment rules')

  for (const header of headers) {
    for (const selector of header.split(',')) {
      const trimmed = selector.trim()
      if (!trimmed) continue
      // Either a scoped experiment class, or a rule gated to simulated mode and
      // anchored at the experiment root.
      const scoped =
        trimmed.startsWith('.dte-') || /^\[data-dlv-sim\] \.dte-root\b/.test(trimmed)
      assert.ok(scoped, `unscoped selector found in the experiment stylesheet: ${trimmed}`)
    }
  }
})

test('accessibility and motion contracts hold', () => {
  assert.match(previewSource, /role="status"/)
  assert.match(previewSource, /aria-pressed=\{/)
  assert.match(previewSource, /aria-label=\{paletteOpen \? 'Close theme palette' : 'Open theme palette'\}/)
  assert.match(previewSource, /:focus-visible/)
  assert.match(previewSource, /prefers-reduced-motion:reduce/)
  assert.match(previewSource, /prefers-reduced-transparency:reduce/)
  assert.match(previewSource, /role="dialog"/)
  assert.match(previewSource, /aria-haspopup="true"/)
})
