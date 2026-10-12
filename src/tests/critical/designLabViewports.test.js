import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  DESIGN_LAB_DEFAULT_VIEWPORT_ID,
  DESIGN_LAB_SIMULATED_VIEWPORTS,
  DESIGN_LAB_VIEWPORTS,
  DESIGN_LAB_VIEWPORT_DESKTOP_MIN,
  DESIGN_LAB_VIEWPORT_TABLET_MIN,
  getDesignLabViewport,
  isDesignLabViewportId,
} from '../../lib/designLabViewports.ts'

const designLabSource = readFileSync(resolve('src/pages/DesignLab.tsx'), 'utf8')
const viewportModuleSource = readFileSync(resolve('src/lib/designLabViewports.ts'), 'utf8')
const switcherSource = readFileSync(
  resolve('src/components/design-lab/viewport-stage.tsx'),
  'utf8',
)

test('the shared module exposes the five required viewport modes', () => {
  const ids = DESIGN_LAB_SIMULATED_VIEWPORTS.map((viewport) => viewport.id)
  assert.deepEqual(ids, ['desktop', 'fold-open', 'fold-closed', 'tablet', 'mobile'])

  const labels = DESIGN_LAB_SIMULATED_VIEWPORTS.map((viewport) => viewport.label)
  assert.deepEqual(labels, ['Desktop', 'Fold open', 'Fold closed', 'Tablet', 'Mobile'])

  for (const viewport of DESIGN_LAB_SIMULATED_VIEWPORTS) {
    assert.ok(
      typeof viewport.width === 'number' && viewport.width >= 320,
      `${viewport.id} needs a simulated layout width`,
    )
  }
})

test('every simulated width carries a documented project tier', () => {
  // Phone tier: production's phone range, and a folded foldable behaves as one.
  assert.equal(getDesignLabViewport('mobile').width, 430)
  assert.equal(getDesignLabViewport('fold-closed').width, 360)
  assert.equal(getDesignLabViewport('fold-open').width, 673)
  assert.equal(getDesignLabViewport('tablet').width, 834)
  assert.equal(getDesignLabViewport('desktop').width, 1440)

  for (const viewport of DESIGN_LAB_SIMULATED_VIEWPORTS) {
    if (viewport.width === null) continue
    if (viewport.width >= DESIGN_LAB_VIEWPORT_DESKTOP_MIN) {
      assert.equal(viewport.tier, 'desktop', `${viewport.id} must use the desktop tier`)
    } else if (viewport.width >= DESIGN_LAB_VIEWPORT_TABLET_MIN) {
      assert.equal(viewport.tier, 'tablet', `${viewport.id} must use the tablet tier`)
    } else {
      assert.equal(viewport.tier, 'phone', `${viewport.id} must use the phone tier`)
    }
  }

  // The tiers are the production CSS breakpoints (Tailwind md and lg).
  assert.equal(DESIGN_LAB_VIEWPORT_TABLET_MIN, 768)
  assert.equal(DESIGN_LAB_VIEWPORT_DESKTOP_MIN, 1024)

  // The tier thresholds must not contradict the documented fold/tablet ranges.
  assert.ok(getDesignLabViewport('fold-open').width < DESIGN_LAB_VIEWPORT_TABLET_MIN)
  assert.ok(getDesignLabViewport('tablet').width >= DESIGN_LAB_VIEWPORT_TABLET_MIN)
})

test('the default is the actual device, so experiments open at full size', () => {
  assert.equal(DESIGN_LAB_DEFAULT_VIEWPORT_ID, 'actual')
  assert.equal(DESIGN_LAB_VIEWPORTS[0].id, 'actual')
  assert.equal(getDesignLabViewport('actual').width, null)
  assert.equal(getDesignLabViewport('actual').tier, 'actual')
  assert.ok(isDesignLabViewportId('fold-closed'))
  assert.ok(!isDesignLabViewportId('folded'))
  // An unknown id falls back to the actual device instead of a simulated width.
  assert.equal(getDesignLabViewport('nope').id, 'actual')
})

test('the selection state is per-experiment, not global', () => {
  // The hook owns local React state and exposes a reset to the actual device.
  assert.match(viewportModuleSource, /export function useDesignLabViewport/)
  assert.match(viewportModuleSource, /useState<DesignLabViewportId>\(initialId\)/)
  assert.match(viewportModuleSource, /const resetViewport = useCallback\(\(\) => setViewportId\(DESIGN_LAB_DEFAULT_VIEWPORT_ID\), \[\]\)/)
  // No module-level mutable selection, no storage, no document write.
  for (const banned of ['localStorage', 'sessionStorage', 'document.documentElement', 'let viewportId']) {
    assert.ok(!viewportModuleSource.includes(banned), `the shared module must not contain ${banned}`)
  }
})

test('the swatch of presets is the only source of device widths', () => {
  // Widths live in the preset table only; the components read them.
  const widths = [...viewportModuleSource.matchAll(/width: (\d+),/g)].map((match) => Number(match[1]))
  assert.equal(widths.length, 5)
  assert.ok(!/width:\s*\d/.test(switcherSource), 'the switcher must not declare a width table')
})

test('Design Lab itself has no viewport switcher', () => {
  for (const banned of ['ViewportSwitcher', 'ViewportStage', 'designLabViewports', 'dlv-switch-btn']) {
    assert.ok(!designLabSource.includes(banned), `the Design Lab shell must not contain ${banned}`)
  }
})
