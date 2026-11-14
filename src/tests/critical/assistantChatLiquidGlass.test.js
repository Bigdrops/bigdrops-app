import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const previewCss = read('../../components/design-lab/assistant-chat-preview.css')
const workspaceCss = read('../../components/design-lab/assistant-chat-workspace.css')
const layouts = read('../../components/design-lab/assistant-chat-layouts.tsx')
const theme = read('../../components/onboarding/photo-hero-v2-theme.ts')

const ruleFor = (css, selector) => {
  const start = css.indexOf(selector)
  assert.notEqual(start, -1, `missing CSS rule: ${selector}`)
  const end = css.indexOf('}', start)
  return css.slice(start, end + 1)
}

test('assistant chat glass uses the scoped surface and primary theme tokens', () => {
  assert.match(previewCss, /--ac-ambient-primary:\s*var\(--field-a,\s*var\(--ac-accent\)\)/)
  assert.match(previewCss, /--ac-ambient-secondary:\s*var\(--field-c,\s*var\(--primary-bright,\s*var\(--ac-accent\)\)\)/)
  assert.match(previewCss, /--ac-glass-bg:\s*var\(--glass-bg/)
  assert.match(previewCss, /--glass-bg/)
  assert.match(theme, /'--glass-bg'/)
})

test('liquid glass DOM is mounted before screen content in each viewport shell', () => {
  assert.equal((layouts.match(/<LiquidGlassBackground \/>/g) ?? []).length, 4)
  assert.match(layouts, /<div className="ac-screen(?: ac-screen--fold| ac-screen--tablet| ac-screen--desktop)?">\s*<LiquidGlassBackground \/>/)
  assert.match(layouts, /className="ac-liquid-bg" aria-hidden="true"/)
  assert.match(layouts, /className="lg-orb lg-orb--1"/)
  assert.match(layouts, /className="lg-orb lg-orb--2"/)
  assert.match(layouts, /className="lg-orb lg-orb--3"/)
  assert.match(layouts, /className="lg-frost"/)
})

test('ambient orbs use the scoped two-color theme and drift with reduced-motion pause', () => {
  assert.match(workspaceCss, /\.lg-orb\s*\{[\s\S]*?filter: blur\(70px\)/)
  assert.match(workspaceCss, /\.lg-orb--1[\s\S]*?animation: lgFloat1 18s/)
  assert.match(workspaceCss, /\.lg-orb--2[\s\S]*?animation: lgFloat2 22s/)
  assert.match(workspaceCss, /\.lg-orb--3[\s\S]*?animation: lgFloat3 15s/)
  assert.match(workspaceCss, /@keyframes lgFloat1/)
  assert.match(workspaceCss, /@keyframes lgFloat2/)
  assert.match(workspaceCss, /@keyframes lgFloat3/)
  assert.match(workspaceCss, /prefers-reduced-motion: reduce[\s\S]*?\.lg-orb\s*\{\s*animation-play-state: paused/)
})

test('frost is localized and does not blur the scrolling log or invoice surfaces', () => {
  assert.match(ruleFor(previewCss, '.ac-screen {'), /background-color: color-mix/)
  assert.match(ruleFor(previewCss, '.ac-head {'), /background: color-mix/)
  assert.match(ruleFor(previewCss, '.ac-compose {'), /background: color-mix/)
  assert.match(ruleFor(workspaceCss, '.ac-panel {'), /background: color-mix/)
  assert.match(ruleFor(workspaceCss, '.ac-doc {'), /background: color-mix/)
  assert.match(ruleFor(previewCss, '.ac-suggest {'), /background: color-mix/)
  assert.doesNotMatch(ruleFor(previewCss, '.ac-log {'), /backdrop-filter/)
  assert.match(workspaceCss, /\.ac-screen > :not\(\.ac-liquid-bg\)/)
  assert.match(workspaceCss, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/)
})
