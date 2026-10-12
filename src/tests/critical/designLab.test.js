import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import {
  PHOTO_HERO_FAMILIES,
  getPhotoHeroVars,
} from '../../components/onboarding/photo-hero-v2-theme.ts'

const designLabSource = readFileSync(resolve('src/pages/DesignLab.tsx'), 'utf8')
const appShellSource = readFileSync(resolve('src/components/app/AppShell.tsx'), 'utf8')

// Vars consumed by the compact Design Lab shell, thumbnail, cards, and the
// scoped atmospheric navigation tokens mirrored as `--dlab-nav-*`.
const LAB_KEYS = [
  '--scene-intro',
  '--chrome-ink',
  '--copy',
  '--glass-bg',
  '--glass-line',
  '--glass-shadow',
  '--field-a',
  '--field-b',
  '--hero-accent',
  '--surface',
  '--ink',
  '--ink-2',
  '--ink-3',
  '--surface-muted',
  '--surface-raised',
  '--primary',
  '--line',
  '--line-strong',
]

test('registry entries carry a complete typed contract', () => {
  assert.ok(DESIGN_LAB_PREVIEWS.length >= 1, 'registry must list at least one preview')
  for (const preview of DESIGN_LAB_PREVIEWS) {
    assert.ok(typeof preview.id === 'string' && preview.id.length > 0, 'entry needs an id')
    assert.ok(typeof preview.name === 'string' && preview.name.length > 0, 'entry needs a name')
    assert.ok(
      typeof preview.eyebrow === 'string' && preview.eyebrow.length > 0,
      `${preview.id} needs an eyebrow`,
    )
    assert.ok(
      typeof preview.description === 'string' && preview.description.length > 0,
      `${preview.id} needs a description`,
    )
    assert.match(preview.route, /^\//, `${preview.id} route must be app-relative`)
    assert.ok(
      Array.isArray(preview.capabilities) && preview.capabilities.length > 0,
      `${preview.id} needs capability metadata`,
    )
  }
})

test('onboarding entry keeps its internal identity with the public label', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === 'onboarding-v2')
  assert.ok(entry, 'registry must keep the onboarding-v2 entry')
  assert.equal(entry.name, 'Onboarding Experience')
  assert.ok(!entry.name.includes('V2'), 'user-facing name must not carry the V2 suffix')
  assert.equal(entry.description, 'Themes, appearance, login and signup.')
  assert.equal(entry.route, '/photohero-preview')
})

test('every theme family resolves the full Design Lab material set', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark']) {
      const vars = getPhotoHeroVars(family, appearance)
      for (const key of LAB_KEYS) {
        assert.ok(
          typeof vars[key] === 'string' && vars[key].length > 0,
          `${family}/${appearance} must define ${key}`,
        )
      }
    }
  }
})

test('amber light renders the atmospheric recipe, not a flat canvas', () => {
  const vars = getPhotoHeroVars('amber-terracotta', 'light')
  assert.match(vars['--scene-intro'], /linear-gradient/, 'amber light needs layered gradients')
  assert.match(vars['--scene-intro'], /color-mix/, 'amber light must stay theme-aware')
  assert.notEqual(vars['--field-a'], '#ffffff')
})

test('page follows the app preference with no picker of its own', () => {
  assert.match(designLabSource, /useThemePreferenceContext/)
  assert.match(designLabSource, /preference\.themePresetId/)
  assert.match(designLabSource, /preference\.themeMode/)
  assert.match(designLabSource, /getPhotoHeroVars\(family, appearance\)/)
  for (const banned of ['localStorage', 'ThemePreferenceContext.Provider', 'theme picker', 'ThemePicker']) {
    assert.ok(!designLabSource.includes(banned), `Design Lab must not contain ${banned}`)
  }
})

test('rejected statistics and hero structures are gone', () => {
  for (const banned of ['dlab-chip', 'dlab-summary', 'dlab-action', 'dlab-mini-doc', 'dlab-mini-card']) {
    assert.ok(!designLabSource.includes(banned), `Design Lab must not contain ${banned}`)
  }
  assert.ok(!designLabSource.includes('Active preview'), 'status badges must be gone')
  assert.ok(!designLabSource.includes('coming soon'), 'placeholder filler must be gone')
  assert.ok(!designLabSource.includes('Onboarding V2'), 'user-facing V2 label must be gone')
  assert.ok(!designLabSource.includes('cold-launch'), 'no Cold Launch sample may return')
})

test('mobile hamburger drives the real drawer and hides on desktop', () => {
  assert.match(designLabSource, /openSidebar/)
  assert.match(designLabSource, /MobileChromeContext/)
  assert.match(designLabSource, /dlab-menu md:hidden/)
  assert.match(designLabSource, /aria-expanded=\{sidebarOpen\}/)
  assert.match(designLabSource, /aria-label="Open navigation menu"/)
  // Tailwind's layered md:hidden loses to unlayered page CSS at equal
  // specificity, so the page carries its own deterministic desktop hide.
  assert.match(designLabSource, /@media \(min-width:768px\)[\s\S]*?\.dlab-menu\{display:none\}/)
  for (const banned of ['setSidebarOpen', '<Sheet', 'data-slot="sheet"']) {
    assert.ok(!designLabSource.includes(banned), `Design Lab must not build its own ${banned} drawer`)
  }
})

test('drawer trigger consumes context below the Layout provider', () => {
  // Root cause of the dead button: the page renders its own <Layout>, so a
  // useContext call at page level reads the default no-op value instead of
  // the provider. The trigger must live in a child rendered inside Layout.
  assert.match(designLabSource, /function DesignLabMenuButton\(\)/)
  const consumers = designLabSource.match(/useContext\(MobileChromeContext\)/g) || []
  assert.equal(consumers.length, 1, 'exactly one context read, inside the menu button')
  const layoutOpen = designLabSource.indexOf('<Layout')
  const buttonUse = designLabSource.indexOf('<DesignLabMenuButton />')
  assert.ok(layoutOpen !== -1 && buttonUse !== -1 && buttonUse > layoutOpen,
    'menu button must render inside the Layout subtree, below its provider')
})

test('header aligns controls with the title row', () => {
  assert.match(designLabSource, /dlab-headrow/)
  assert.match(designLabSource, /className="dlab-sub"/)
  assert.match(designLabSource, /\.dlab-sub\{\s*margin:6px 0 0 54px/)
})

test('decorative glow dot is removed from the thumbnail', () => {
  assert.ok(!designLabSource.includes('dlab-mark i'), 'thumbnail dot styles must be gone')
})

test('appearance toggle is the shared global control', () => {
  assert.match(designLabSource, /ThemeToggleButton/)
  assert.match(designLabSource, /from '@\/components\/theme\/ThemeToggleButton'/)
  assert.ok(!designLabSource.includes('<Sun') && !designLabSource.includes('<Moon'))
  assert.ok(!designLabSource.includes('isDark'))
  for (const banned of ['setAppearance', 'setFamily']) {
    assert.ok(!designLabSource.includes(banned), `Design Lab must not keep its own ${banned} state`)
  }
})

test('atmospheric navigation stays scoped to Design Lab', () => {
  assert.match(designLabSource, /setAttribute\('data-dlab-nav'/)
  assert.match(designLabSource, /removeAttribute\('data-dlab-nav'/)
  assert.match(designLabSource, /removeProperty\(name\)/)
  assert.match(designLabSource, /\[data-dlab-nav\] \[data-bd-shell="app"\] > aside/)
  assert.match(designLabSource, /\[data-dlab-nav\] \[data-slot="sheet-content"\]\[data-side="left"\]/)
  // Only `--dlab-nav-*` mirror tokens may be written to the document root.
  assert.ok(
    !designLabSource.match(/setProperty\(`--(?!dlab-nav-)/),
    'Design Lab must never write global theme tokens',
  )
  assert.ok(!designLabSource.includes('AppThemeManager'))
})

test('page renders registry entries without fake previews', () => {
  assert.match(designLabSource, /DESIGN_LAB_PREVIEWS\.map/)
  assert.match(designLabSource, /navigate\(preview\.route\)/)
  assert.match(designLabSource, /aria-label=\{`Open \$\{preview\.name\}`\}/)
  assert.match(designLabSource, /\{preview\.eyebrow\}/)
  assert.match(designLabSource, /\{preview\.capabilities\.map/)
})

test('responsive and safe-area contracts stay intact', () => {
  assert.match(designLabSource, /env\(safe-area-inset-/)
  assert.match(designLabSource, /@media \(min-width:600px\)/)
  assert.match(designLabSource, /@media \(min-width:768px\)/)
  assert.match(designLabSource, /@media \(min-width:1024px\)/)
  assert.ok(!designLabSource.includes('100vw'), 'page must not force viewport-width overflow')
  assert.match(designLabSource, /:focus-visible/)
})

test('registered routes exist in the app shell', () => {
  for (const preview of DESIGN_LAB_PREVIEWS) {
    assert.ok(
      appShellSource.includes(`<Route path="${preview.route}"`),
      `AppShell must register ${preview.route}`,
    )
  }
  assert.match(appShellSource, /<Route path="\/design-lab"/)
})
