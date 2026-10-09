import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..')
const settingsCss = readFileSync(join(src, 'components', 'settings', 'settings.css'), 'utf8')
const mobileBottomNav = readFileSync(join(src, 'components', 'layout', 'MobileBottomNav.tsx'), 'utf8')
const settingsPage = readFileSync(join(src, 'pages', 'Settings.tsx'), 'utf8')

function settingsTsxFiles() {
  return readdirSync(join(src, 'pages', 'settings'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(src, 'pages', 'settings', f))
}

// 1. Every --su-* color alias resolves through the global theme authority.
test('settings color aliases resolve through --bd-* semantic tokens', () => {
  const defs = [...settingsCss.matchAll(/--su-[a-z0-9-]+:[^;]+;/gi)].map((m) => m[0])
  assert.ok(defs.length > 10, 'expected the settings alias block to exist')
  for (const def of defs) {
    const value = def.slice(def.indexOf(':') + 1)
    const isNonColor = value.includes('env(') || /^[\s\d().,%pxremcalcmax\-+;]+$/.test(value) || /Manrope|DM Mono|monospace|sans-serif/.test(value)
    if (isNonColor) continue
    assert.match(
      value,
      /var\(--(bd-[a-z-]+|accent|secondary|su-[a-z0-9-]+)\)/,
      `alias must resolve through the theme authority: ${def.trim()}`,
    )
  }
})

// 2. No independent fixed Settings palette remains in the alias block.
test('settings alias block contains no fixed hex or rgba palette', () => {
  const defs = [...settingsCss.matchAll(/--su-[a-z0-9-]+:[^;]+;/gi)].map((m) => m[0])
  for (const def of defs) {
    assert.doesNotMatch(def, /#[0-9a-fA-F]{3,8}/, `fixed hex palette remains: ${def.trim()}`)
    assert.doesNotMatch(def, /rgba?\(/, `fixed rgba palette remains: ${def.trim()}`)
  }
  assert.doesNotMatch(settingsCss, /\.dark\s+\.bd-settings-surface/, 'mode-specific palette block must go; --bd-* tokens already carry light/dark values')
})

// 3. Every consumed --su-* alias is defined (no dangling references).
test('every consumed settings alias is defined', () => {
  const defined = new Set([...settingsCss.matchAll(/--(su-[a-z0-9-]+):/gi)].map((m) => m[1]))
  const consumed = new Set([...settingsCss.matchAll(/var\(--(su-[a-z0-9-]+)\)/gi)].map((m) => m[1]))
  for (const name of consumed) {
    assert.ok(defined.has(name), `consumed alias has no definition: --${name}`)
  }
})

// 4. Status colors keep semantic roles via --bd-status-* tokens.
test('settings permission scope colors use semantic status tokens', () => {
  for (const role of ['info', 'success', 'warning', 'danger']) {
    assert.ok(
      settingsCss.includes(`var(--bd-status-${role}-text)`),
      `expected bd-status-${role} usage in settings.css`,
    )
  }
})

// 5. No fixed slate/gray palette or manual dark: overrides in Settings pages,
// except document-type identity colors (Archives) which are not Settings theming.
test('settings pages use semantic colors, not a fixed slate palette', () => {
  for (const file of settingsTsxFiles()) {
    const source = readFileSync(file, 'utf8')
    const lines = source.split('\n')
    lines.forEach((line, i) => {
      if (/docTypeConfig|color: 'text-/.test(line)) return // document-type identity colors
      assert.doesNotMatch(line, /slate-\d|gray-\d/, `${file.split('/').pop()}:${i + 1} still uses a fixed palette`)
      assert.doesNotMatch(line, /dark:(text|bg|border)-/, `${file.split('/').pop()}:${i + 1} still branches color by mode`)
    })
  }
  assert.doesNotMatch(settingsPage, /text-gray-\d|dark:text-gray/, 'Settings landing keeps a fixed gray')
})

// 6. Bottom navigation contract is untouched by the migration.
test('bottom navigation still owned and styled by the shared system', () => {
  for (const token of ['--bd-nav-active-bg', '--bd-nav-active-text', '--bd-nav-active-icon']) {
    assert.ok(mobileBottomNav.includes(token), `shared nav must keep using ${token}`)
  }
  assert.doesNotMatch(mobileBottomNav, /#[0-9a-fA-F]{3,8}/, 'shared nav must not gain hardcoded colors')
})

// 7. Theme changes need no remount: no theme-dependent React keys in Settings.
test('settings introduces no theme-dependent remount keys', () => {
  assert.doesNotMatch(settingsPage, /key=\{[^}]*(theme|mode|preset|dark)/i, 'theme-dependent key would force remounts')
})
