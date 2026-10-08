import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  resolveIsDark,
  nextThemeMode,
  themeToggleIcon,
  themeToggleAriaLabel,
} from '../../lib/themeToggle.ts'

// This suite verifies the theme-toggle EXPOSURE change:
//   - the shared control reuses the existing preference/state + save handler;
//   - icon orientation (moon in light, sun in dark) and labels are unchanged;
//   - forms, lists, document views and More Options all expose the control;
//   - the control cannot submit, save, or navigate;
//   - the existing sidebar/Back controls and theme persistence are intact.
//
// The toggle logic is exercised directly (behaviour); the React wiring and
// placement are asserted against source text because these components rely on
// runtime providers that are out of scope for the critical harness.

const read = (relative) => fs.readFileSync(path.resolve(relative), 'utf8')
const count = (source, pattern) => (source.match(pattern) || []).length

const componentPath = 'src/components/theme/ThemeToggleButton.tsx'
const helpersPath = 'src/lib/themeToggle.ts'
const dashboardPath = 'src/components/dashboard/DashboardOverview.tsx'
const mobileHeaderPath = 'src/components/layout/MobilePageHeader.tsx'
const moduleShellPath = 'src/components/layout/ModuleShell.tsx'
const formTopBarPath = 'src/components/document/DocumentFormPresentation.tsx'
const viewNavPath = 'src/components/document-view/shared/DocumentTopNav.tsx'
const moreOptionsPath = 'src/pages/MoreOptions.tsx'
const rfqEditorPath = 'src/components/rfq/RfqEditor.tsx'
const csrFormScreenPath = 'src/components/csr/CsrFormScreen.tsx'
const persistencePath = 'src/hooks/useUserThemePreferences.ts'
const formHeaderPath = 'src/components/document/FormHeader.tsx'
const sharedFormPath = 'src/components/document/SharedDocumentForm.tsx'

// ── Objective 1: behaviour parity with the Dashboard control ───────────────

test('resolveIsDark matches the Dashboard dark-mode resolution', () => {
  assert.equal(resolveIsDark('dark', false), true)
  assert.equal(resolveIsDark('dark', true), true)
  assert.equal(resolveIsDark('light', true), false)
  assert.equal(resolveIsDark('light', false), false)
  assert.equal(resolveIsDark('system', true), true)
  assert.equal(resolveIsDark('system', false), false)
})

test('tapping the toggle always resolves to an explicit light/dark mode', () => {
  assert.equal(nextThemeMode(true), 'light')
  assert.equal(nextThemeMode(false), 'dark')
  // A toggle must never fall back to system mode.
  assert.notEqual(nextThemeMode(true), 'system')
  assert.notEqual(nextThemeMode(false), 'system')
})

test('icon orientation is unchanged: moon in light, sun in dark', () => {
  assert.equal(themeToggleIcon(false), 'moon')
  assert.equal(themeToggleIcon(true), 'sun')
})

test('accessible label announces the action, matching the Dashboard control', () => {
  assert.equal(themeToggleAriaLabel(false), 'Switch to dark mode')
  assert.equal(themeToggleAriaLabel(true), 'Switch to light mode')
})

test('shared helpers mirror the Dashboard inline expressions exactly', () => {
  const dashboard = read(dashboardPath)
  // Dashboard still derives isDark the same way resolveIsDark does.
  assert.match(
    dashboard,
    /preference\.themeMode === 'dark'\s*\|\|\s*\(preference\.themeMode === 'system'/,
  )
  // Dashboard still flips to the opposite explicit mode.
  assert.match(dashboard, /themeMode:\s*isDark \? 'light' : 'dark'/)
  // Dashboard still shows sun when dark and moon when light.
  assert.match(dashboard, /\{isDark \? <Sun[\s\S]*?<Moon/)
})

// ── Objective 1: reuse the existing preference/state + handler ─────────────

test('the shared toggle reuses the existing theme preference context and save handler', () => {
  const source = read(componentPath)

  assert.match(source, /useThemePreferenceContext/)
  assert.match(source, /const \{ preference, save \} = useThemePreferenceContext\(\)/)
  // Persists through the existing handler with the existing fields only.
  assert.match(source, /save\(\{/)
  assert.match(source, /themeMode: nextThemeMode\(isDark\)/)
  assert.match(source, /themePresetId: preference\.themePresetId/)
  // No new theme state / provider.
  assert.doesNotMatch(source, /createContext/)
  assert.doesNotMatch(source, /useState/)
})

test('the shared toggle is a safe button: no submit, no save, no navigation', () => {
  const source = read(componentPath)

  assert.match(source, /type="button"/)
  assert.doesNotMatch(source, /type=\{[^}]*submit/)
  assert.doesNotMatch(source, /\bonSave\b/)
  assert.doesNotMatch(source, /useNavigate/)
  assert.doesNotMatch(source, /navigate\(/)
  assert.doesNotMatch(source, /window\.location/)
  assert.doesNotMatch(source, /\.submit\(/)
})

test('theme persistence is unchanged (same hook + storage path)', () => {
  const source = read(persistencePath)

  assert.match(source, /bigdrops_user_theme_/)
  assert.match(source, /from\('user_preferences'\)/)
  assert.match(source, /theme_preset_id/)
  assert.match(source, /theme_mode/)
  // The toggle helpers must not have introduced a second persistence path.
  assert.doesNotMatch(read(helpersPath), /localStorage|supabase/)
  assert.doesNotMatch(read(componentPath), /localStorage|supabase/)
})

// ── Objective 2: forms expose the control (via the shared form top bar) ────

test('the shared document form top bar exposes the theme toggle exactly once', () => {
  const source = read(formTopBarPath)

  assert.match(source, /import \{ ThemeToggleButton \}/)
  assert.equal(count(source, /<ThemeToggleButton/g), 1)
  // Back + Save remain intact.
  assert.match(source, /onClick=\{onBack\}/)
  assert.match(source, /onClick=\{onSave\}/)
})

test('the theme toggle is not placed inside form content', () => {
  // The form body header section must not host a theme control.
  assert.doesNotMatch(read(formHeaderPath), /ThemeToggleButton/)
  // SharedDocumentForm hosts it only through DocumentTopBar.
  assert.doesNotMatch(read(sharedFormPath), /ThemeToggleButton/)
})

test('bespoke RFQ and CSR form headers expose the theme toggle exactly once', () => {
  const rfq = read(rfqEditorPath)
  const csr = read(csrFormScreenPath)

  assert.match(rfq, /import \{ ThemeToggleButton \}/)
  assert.match(csr, /import \{ ThemeToggleButton \}/)
  assert.equal(count(rfq, /<ThemeToggleButton/g), 1)
  assert.equal(count(csr, /<ThemeToggleButton/g), 1)
})

// ── Objective 3: list pages expose BOTH sidebar and theme toggles ──────────

test('the shared mobile header keeps the sidebar toggle and adds the theme toggle', () => {
  const source = read(mobileHeaderPath)

  assert.match(source, /import \{ ThemeToggleButton \}/)
  assert.equal(count(source, /<ThemeToggleButton/g), 1)
  // Sidebar toggle + Back remain intact.
  assert.match(source, /onClick=\{onMenuClick\}/)
  assert.match(source, /aria-label="Open navigation menu"/)
  assert.match(source, /aria-label="Go back"/)
})

test('the desktop list header also exposes the theme toggle (sidebar covered by chrome)', () => {
  const source = read(moduleShellPath)

  assert.match(source, /import \{ ThemeToggleButton \}/)
  assert.equal(count(source, /<ThemeToggleButton/g), 1)
  // List affordances remain intact.
  assert.match(source, /onPrimaryAction/)
  assert.match(source, /primaryActionLabel/)
  assert.match(source, /records\.map\(renderRow\)/)
})

// ── Objective 4: document view pages expose the control ───────────────────

test('the shared document view nav exposes the theme toggle exactly once', () => {
  const source = read(viewNavPath)

  assert.match(source, /import \{ ThemeToggleButton \}/)
  assert.equal(count(source, /<ThemeToggleButton/g), 1)
  // Back / Share / More actions remain intact.
  assert.match(source, /onClick=\{onBack\}/)
  assert.match(source, /aria-label="Go back"/)
  assert.match(source, /onShare/)
  assert.match(source, /onMore/)
})

// ── Objective 5: More Options exposes the control ─────────────────────────

test('More Options exposes the theme toggle exactly once without redesign', () => {
  const source = read(moreOptionsPath)

  assert.match(source, /import \{ ThemeToggleButton \}/)
  assert.equal(count(source, /<ThemeToggleButton/g), 1)
  // Existing header controls + IA remain intact.
  assert.match(source, /onClick=\{openSidebar\}/)
  assert.match(source, /aria-label="Open navigation menu"/)
  assert.match(source, /navigate\('\/settings'\)/)
})

// ── Cross-cutting: no duplicate controls, Dashboard untouched ─────────────

test('every header exposes at most one theme control', () => {
  for (const file of [
    mobileHeaderPath,
    moduleShellPath,
    formTopBarPath,
    viewNavPath,
    moreOptionsPath,
    rfqEditorPath,
    csrFormScreenPath,
  ]) {
    assert.equal(
      count(read(file), /<ThemeToggleButton/g),
      1,
      `${file} must render exactly one theme toggle`,
    )
  }
})

test('the Dashboard theme control is unchanged and not duplicated', () => {
  const source = read(dashboardPath)

  // The authoritative inline control is still present.
  assert.match(source, /aria-label=\{isDark \? 'Switch to light mode' : 'Switch to dark mode'\}/)
  assert.match(source, /onClick=\{toggleDark\}/)
  // The shared component was not swapped into the Dashboard.
  assert.doesNotMatch(source, /ThemeToggleButton/)
})
