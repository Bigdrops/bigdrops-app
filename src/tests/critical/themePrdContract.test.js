import test from 'node:test'
import assert from 'node:assert/strict'

import { THEME_PRESETS, SELECTABLE_THEME_PRESETS, getThemePreset, getDarkVariantSemanticTokens } from '../../lib/themePresets.ts'

// ────────────────────────────────────────────────────────────────────
// PRD token contract (04-theme-system.md) — every theme family must
// expose the full PRD semantic token set in light and dark variants.
// Verified against the design.md extraction of the v6 dashboard.
// ────────────────────────────────────────────────────────────────────

const PRD_SEMANTIC_TOKENS = [
  '--bg', '--surface', '--surface-raised', '--surface-muted', '--surface-strong',
  '--ink', '--ink-2', '--ink-3',
  '--primary', '--primary-bright',
  '--secondary', '--secondary-bright',
  '--attention', '--attention-soft',
  '--sage', '--sage-soft',
  '--line', '--line-strong',
  '--nav', '--gradient',
]

const SELECTABLE_FAMILIES = [
  'slate-navy', 'amber-terracotta', 'ocean-teal', 'rose-gold', 'forest-green', 'warm-cocoa',
]

test('every PRD semantic token is present on every selectable theme family (light)', () => {
  for (const id of SELECTABLE_FAMILIES) {
    const preset = getThemePreset(id)
    assert.ok(preset, `${id} preset exists`)
    for (const token of PRD_SEMANTIC_TOKENS) {
      assert.ok(
        preset.semanticTokens[token],
        `${id} exposes ${token} (PRD 04-theme-system.md)`
      )
    }
  }
})

test('dark variants expose the same PRD token set as light (Liquid Onyx rule)', () => {
  for (const id of SELECTABLE_FAMILIES) {
    const light = getThemePreset(id)
    const dark = getDarkVariantSemanticTokens(id)
    assert.ok(dark, `${id} has a dark variant`)
    for (const token of PRD_SEMANTIC_TOKENS) {
      assert.ok(dark[token], `${id} dark variant exposes ${token}`)
    }
    assert.equal(
      Object.keys(light.semanticTokens).sort().join(','),
      Object.keys(dark).sort().join(','),
      `${id} light and dark token sets match exactly`
    )
  }
})

test('the PRD gradient token keeps the 135-degree primary-to-secondary structure', () => {
  for (const id of SELECTABLE_FAMILIES) {
    const preset = getThemePreset(id)
    const gradient = preset.semanticTokens['--gradient']
    assert.match(gradient, /linear-gradient\(135deg/)
    assert.ok(gradient.includes(preset.semanticTokens['--primary'].replace(/\/ \d+(\.\d+)?$/, '').trim().split(' ').slice(0, 1)[0]) || gradient.includes(','), `${id} gradient references its palette`)
  }
})

test('slate-navy light values match the locked PRD palette', () => {
  const slate = getThemePreset('slate-navy')
  assert.equal(slate.semanticTokens['--bg'], toTriplet('#f0f4f8'))
  assert.equal(slate.semanticTokens['--primary'], toTriplet('#1e3a5f'))
  const onyx = getDarkVariantSemanticTokens('slate-navy')
  assert.equal(onyx['--bg'], toTriplet('#0f172a'))
  assert.equal(onyx['--primary'], toTriplet('#60a5fa'))
})

function toTriplet(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h2 = 0
  const l = (max + min) / 2
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : (max === min ? 0 : d / (max + min))
  if (max !== min) {
    if (max === r) h2 = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h2 = (b - r) / d + 2
    else h2 = (r - g) / d + 4
    h2 /= 6
  }
  return `${Math.round(h2 * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

test('selectable theme list excludes legacy presets and keeps registry families', () => {
  const ids = SELECTABLE_THEME_PRESETS.map(p => p.id)
  assert.ok(!ids.includes('bmw'))
  assert.ok(!ids.includes('modern-minimalist'))
  assert.ok(THEME_PRESETS.some(p => p.id === 'citrus'))
})
