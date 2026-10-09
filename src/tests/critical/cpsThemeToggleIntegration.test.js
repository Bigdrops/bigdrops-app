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

// This suite verifies the CPS New/Edit GLOBAL THEME TOGGLE integration:
//   - the mobile/fold `tb-btn` and the desktop TopBar control both drive the
//     SAME global user theme preference (no second authority);
//   - the resolved global mode drives the icon, the label and the CPS root
//     `data-theme`;
//   - no local theme state, no theme-dependent key, no remount, no submit;
//   - the existing CPS save/back/import/markup wiring is untouched.
//
// Toggle logic is exercised directly (behaviour). The React wiring and
// placement are asserted against source text because these components rely on
// runtime providers that are out of scope for the critical harness.

const read = (relative) => fs.readFileSync(path.resolve(relative), 'utf8')
const count = (source, pattern) => (source.match(pattern) || []).length

const editorPath = 'src/components/cps/CostPricingSheetEditor.tsx'
const formPath = 'src/components/cps/CostPricingSheetForm.tsx'
const desktopPath = 'src/components/cps/CostPricingSheetFormPresentations.tsx'
const desktopCssPath = 'src/components/cps/cost-pricing-sheet-form.css'
const sharedTogglePath = 'src/components/theme/ThemeToggleButton.tsx'

// ── Behaviour parity with the shared/Dashboard toggle ──────────────────────

test('CPS uses the same resolved-mode semantics as the shared toggle', () => {
  // The CPS editor and the shared helpers must agree on light/dark resolution.
  assert.equal(resolveIsDark('dark', false), true)
  assert.equal(resolveIsDark('light', true), false)
  assert.equal(resolveIsDark('system', true), true)
  assert.equal(resolveIsDark('system', false), false)
})

test('icon orientation is the shared convention: moon in light, sun in dark', () => {
  assert.equal(themeToggleIcon(false), 'moon')
  assert.equal(themeToggleIcon(true), 'sun')
  assert.equal(themeToggleAriaLabel(false), 'Switch to dark mode')
  assert.equal(themeToggleAriaLabel(true), 'Switch to light mode')
})

test('a tap always asks for the opposite explicit mode', () => {
  assert.equal(nextThemeMode(false), 'dark')
  assert.equal(nextThemeMode(true), 'light')
})

// ── Objective 1 & 6: mobile/fold uses global preference state + icons ──────

test('mobile CPS resolves its theme from the global preference (no local authority)', () => {
  const editor = read(editorPath)

  assert.match(editor, /useThemePreferenceContext\(\)/)
  assert.match(editor, /resolveIsDark\(/)
  assert.match(editor, /nextThemeMode\(isDarkTheme\)/)
  // The existing preference id is carried through, not replaced.
  assert.match(editor, /themePresetId:\s*themePreference\.themePresetId/)
  // No second store, no direct persistence in the CPS path.
  assert.doesNotMatch(editor, /localStorage/)
  assert.doesNotMatch(editor, /createContext/)
})

test('the mobile form keeps exactly one theme button and drops local theme state', () => {
  const form = read(formPath)

  assert.equal(count(form, /id="themeBtn"/g), 1, 'exactly one mobile theme button')
  // No independent local theme write remains in the active path.
  assert.doesNotMatch(form, /setInternalTheme/)
  assert.doesNotMatch(form, /setThemeIcon/)
  assert.doesNotMatch(form, /useState<'light' \| 'dark'>/)
})

test('the mobile icon and label follow the resolved global mode', () => {
  const form = read(formPath)

  assert.match(form, /const theme = controlledTheme \?\? defaultTheme;/)
  assert.match(form, /const isDarkTheme = theme === 'dark';/)
  assert.match(
    form,
    /\{themeToggleIcon\(isDarkTheme\) === 'sun' \? <IconSun \/> : <IconMoon \/>\}/,
  )
  assert.match(form, /aria-label=\{themeToggleAriaLabel\(isDarkTheme\)\}/)
})

// ── Objective 2 & 3: one control per presentation, no double toggles ───────

test('the desktop CPS TopBar exposes exactly one shared theme control', () => {
  const desktop = read(desktopPath)

  assert.match(desktop, /import \{ ThemeToggleButton \}/)
  assert.equal(count(desktop, /<ThemeToggleButton/g), 1, 'exactly one desktop theme button')
  // Back, title and Save remain in the same TopBar.
  assert.match(desktop, /className="cps-tb-btn"[^>]*onClick=\{onCancel\}/)
  assert.match(desktop, /className="cps-save cps-tb-save" onClick=\{onSave\}/)
  assert.match(desktop, /<div className="cps-tb-title">/)
})

test('the shared toggle is reused, so its single authority is preserved', () => {
  const shared = read(sharedTogglePath)

  assert.match(shared, /const \{ preference, save \} = useThemePreferenceContext\(\)/)
  assert.match(shared, /themeMode: nextThemeMode\(isDark\)/)
  assert.match(shared, /themePresetId: preference\.themePresetId/)
  assert.match(shared, /type="button"/)
  // The adapter class only aligns geometry with the CPS top bar.
  assert.match(read(desktopCssPath), /\.cps-form \.cps-tb-theme \{/)
})

// ── Objective 4: CPS root data-theme is synchronized to the global mode ────

test('CPS root data-theme follows the resolved global mode', () => {
  const editor = read(editorPath)
  const form = read(formPath)

  assert.match(editor, /const resolvedTheme: 'light' \| 'dark' = isDarkTheme \? 'dark' : 'light'/)
  assert.match(editor, /resolvedTheme=\{resolvedTheme\}/)
  assert.match(editor, /theme=\{resolvedTheme\}/)
  // The attribute is preserved for the existing CSS dependencies.
  assert.match(form, /className="cps-form-root wrap" data-theme=\{theme\}/)
})

// ── Objective 9-12: no second authority, no remount, no submit ─────────────

test('clicking the mobile button reports to the shared save handler only', () => {
  const editor = read(editorPath)
  const form = read(formPath)

  // The form reports the requested next mode; it never persists or mutates DOM.
  assert.match(form, /onToggleTheme\?\.\(isDarkTheme \? 'light' : 'dark'\)/)
  assert.doesNotMatch(form, /localStorage|supabase/)
  // The host handler is the only writer and goes through the shared context.
  assert.match(editor, /void saveThemePreference\(\{/)
  assert.doesNotMatch(editor, /localStorage|supabase/)
})

test('the theme buttons cannot submit a form', () => {
  const form = read(formPath)
  const mobileButton = form.slice(
    form.indexOf('className="tb-btn"'),
    form.indexOf('{themeToggleIcon(isDarkTheme)'),
  )

  assert.match(mobileButton, /type="button"/, 'mobile theme button is type=button')
  assert.doesNotMatch(form, /type="submit"/)
  assert.doesNotMatch(form, /\.submit\(/)
})

test('no theme-dependent key and no conditional remount on theme', () => {
  const editor = read(editorPath)

  // The mobile host key depends on the document id only.
  assert.match(editor, /key=\{`cps-mobile-\$\{cps\.id\}`\}/)
  assert.doesNotMatch(editor, /key=\{[^}]*[Tt]heme[^}]*\}/)
  // The branch that chooses the presentation does not depend on theme.
  assert.match(editor, /const useDesktopComposition = isDesktop && !hasFold && !isTablet/)
  assert.doesNotMatch(editor, /useDesktopComposition[^\n]*[Tt]heme/)
})

test('the toggle cannot trigger save or navigation', () => {
  const editor = read(editorPath)
  const form = read(formPath)

  // The theme button never calls onSave / navigate.
  assert.doesNotMatch(form.slice(form.indexOf('id="themeBtn"'), form.indexOf('id="themeBtn"') + 400), /onSave|navigate/)
  // Existing Back and Save handlers remain unchanged.
  assert.match(form, /onClick=\{handleBack\}/)
  assert.match(form, /onClick=\{save\}/)
  // The editor still forwards the existing save/cancel contract.
  assert.match(editor, /onSave=\{\(payload\) => onCommit\(mergeMobilePayload\(cpsRef\.current, payload\)\)\}/)
  assert.match(editor, /onBack=\{onCancel\}/)
})

// ── Objective 7: single persistence path unchanged ────────────────────────

test('theme persistence keeps the one existing storage path', () => {
  const persistence = read('src/hooks/useUserThemePreferences.ts')

  assert.match(persistence, /bigdrops_user_theme_/)
  assert.match(persistence, /from\('user_preferences'\)/)
  assert.match(persistence, /theme_preset_id/)
  assert.match(persistence, /theme_mode/)
  // The CPS components must not introduce a second path.
  assert.doesNotMatch(read(formPath), /bigdrops_user_theme_/)
  assert.doesNotMatch(read(editorPath), /bigdrops_user_theme_/)
})
