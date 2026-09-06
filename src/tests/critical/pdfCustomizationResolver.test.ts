import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
  PdfCustomizationSettings,
} from '../../domain/pdf/customization/types'
import { resolveSettings, resolvePdfCustomization, resolveFull } from '../../domain/pdf/customization/resolver'

const ALL_ENABLED: PdfCustomizationCapabilities = {
  accentColor: true,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}

const ALL_POLICY: PdfCustomizationPolicy = {
  accentColor: true,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}

const TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#0F172A',
  documentFont: 'Inter',
  handwritingFont: 'Patrick Hand',
  handwritingColor: '#000000',
}

// ── Scenario 1: Template defaults only → resolved object matches defaults ──

test('1. Template defaults only — resolved matches defaults', () => {
  const { customization } = resolveFull(TEMPLATE_DEFAULTS, ALL_ENABLED, ALL_POLICY, undefined)

  assert.equal(customization.accentColor, TEMPLATE_DEFAULTS.accentColor)
  assert.equal(customization.documentFont, TEMPLATE_DEFAULTS.documentFont)
  assert.equal(customization.handwritingFont, TEMPLATE_DEFAULTS.handwritingFont)
  assert.equal(customization.handwritingColor, TEMPLATE_DEFAULTS.handwritingColor)
})

// ── Scenario 2: Enabled capability + user override → user value wins ──

test('2. Enabled capability with user override — user value wins', () => {
  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#FF0000',
    documentFont: 'Roboto',
    inkFont: 'Caveat',
    inkColour: '#00FF00',
  }

  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, user, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(customization.accentColor, '#FF0000')
  assert.equal(customization.documentFont, 'Roboto')
  assert.equal(customization.handwritingFont, 'Caveat')
  assert.equal(customization.handwritingColor, '#00FF00')
})

// ── Scenario 3: Disabled capability + user setting → setting ignored, template default used ──

test('3. Disabled capability — user setting ignored, template default used', () => {
  const caps: PdfCustomizationCapabilities = {
    accentColor: false,
    documentFont: false,
    handwritingFont: false,
    handwritingColor: true,
  }

  const pol: PdfCustomizationPolicy = {
    accentColor: false,
    documentFont: false,
    handwritingFont: false,
    handwritingColor: true,
  }

  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#BADDAD',
    documentFont: 'Poppins',
    inkFont: 'Caveat',
    inkColour: '#003399',
  }

  const settings = resolveSettings(caps, pol, user, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  // Disabled capabilities → template defaults
  assert.equal(customization.accentColor, TEMPLATE_DEFAULTS.accentColor, 'accentColor should be template default (capability disabled)')
  assert.equal(customization.documentFont, TEMPLATE_DEFAULTS.documentFont, 'documentFont should be template default (capability disabled)')
  assert.equal(customization.handwritingFont, TEMPLATE_DEFAULTS.handwritingFont, 'handwritingFont should be template default (capability disabled)')

  // Enabled capability → user value
  assert.equal(customization.handwritingColor, '#003399', 'handwritingColor should be user value (capability enabled)')
})

// ── Scenario 4: Policy disables capability → user setting ignored ──

test('4. Policy disables capability — user setting ignored even if capability supported', () => {
  const caps: PdfCustomizationCapabilities = {
    accentColor: true,
    documentFont: true,
    handwritingFont: true,
    handwritingColor: true,
  }

  const pol: PdfCustomizationPolicy = {
    accentColor: true,
    documentFont: false, // policy disables
    handwritingFont: true,
    handwritingColor: true,
  }

  const user: PdfCustomizationSettings = {
    version: 1,
    documentFont: 'Montserrat',
  }

  const settings = resolveSettings(caps, pol, user, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(customization.documentFont, TEMPLATE_DEFAULTS.documentFont, 'documentFont should be template default (policy disabled)')
})

// ── Scenario 5: Missing version in saved settings → migration path applied ──

test('5. Missing version — migration path applied (version 0 → version 1)', () => {
  // Simulate corrupted/old settings with no version field
  const corrupted = { accentColor: '#123456' } as unknown as PdfCustomizationSettings

  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, corrupted, TEMPLATE_DEFAULTS)

  assert.equal(settings.version, 1, 'version should be set to 1 after migration')
  assert.equal(settings.accentColor, '#123456', 'user value should be preserved through migration')
})

// ── Scenario 6: Empty saved settings (null) → template defaults used ──

test('6. Null saved settings — template defaults used', () => {
  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, undefined, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(customization.accentColor, TEMPLATE_DEFAULTS.accentColor)
  assert.equal(customization.documentFont, TEMPLATE_DEFAULTS.documentFont)
  assert.equal(customization.handwritingFont, TEMPLATE_DEFAULTS.handwritingFont)
  assert.equal(customization.handwritingColor, TEMPLATE_DEFAULTS.handwritingColor)
})

// ── Scenario 7: Partial saved settings → defaults fill the gaps ──

test('7. Partial saved settings — defaults fill missing fields', () => {
  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#AABBCC',
    // documentFont, inkFont, inkColour omitted
  }

  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, user, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(customization.accentColor, '#AABBCC', 'accentColor should be user value')
  assert.equal(customization.documentFont, TEMPLATE_DEFAULTS.documentFont, 'documentFont should fall back to template default')
  assert.equal(customization.handwritingFont, TEMPLATE_DEFAULTS.handwritingFont, 'handwritingFont should fall back to template default')
  assert.equal(customization.handwritingColor, TEMPLATE_DEFAULTS.handwritingColor, 'handwritingColor should fall back to template default')
})

// ── Scenario 8: Disabled capabilities strip user settings entirely ──

test('8. All capabilities disabled — all user settings stripped', () => {
  const caps: PdfCustomizationCapabilities = {
    accentColor: false,
    documentFont: false,
    handwritingFont: false,
    handwritingColor: false,
  }

  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#FFFFFF',
    documentFont: 'Lato',
    inkFont: 'Architects Daughter',
    inkColour: '#112233',
  }

  const settings = resolveSettings(caps, ALL_POLICY, user, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(customization.accentColor, TEMPLATE_DEFAULTS.accentColor)
  assert.equal(customization.documentFont, TEMPLATE_DEFAULTS.documentFont)
  assert.equal(customization.handwritingFont, TEMPLATE_DEFAULTS.handwritingFont)
  assert.equal(customization.handwritingColor, TEMPLATE_DEFAULTS.handwritingColor)
})

// ── Scenario 10: Explicit accentEnabled=false → disabled, color value preserved ──

test('10. Accent explicitly disabled — flag false, template default renders', () => {
  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#FF0000',
    accentEnabled: false,
  }

  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, user, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(settings.accentEnabled, false, 'accentEnabled should be false')
  assert.equal(customization.accentEnabled, false, 'customization should carry the disabled flag')
  assert.equal(customization.accentColor, '#FF0000', 'stored color value is preserved but gated by the flag')
})

// ── Scenario 11: Stored custom color without flag → migration enables ──

test('11. Stored custom color without flag — migration treats as enabled', () => {
  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#FF0000',
  }

  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, user, TEMPLATE_DEFAULTS)

  assert.equal(settings.accentEnabled, true, 'pre-switch custom color migrates to enabled')
})

// ── Scenario 12: No stored color and no flag → disabled (template default) ──

test('12. Fresh settings — accent disabled, template default renders', () => {
  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, undefined, TEMPLATE_DEFAULTS)
  const customization = resolvePdfCustomization(TEMPLATE_DEFAULTS, settings)

  assert.equal(settings.accentEnabled, false, 'fresh settings resolve to disabled')
  assert.equal(customization.accentEnabled, false, 'customization should carry the disabled flag')
})

// ── Scenario 13: Explicit accentEnabled=true with no stored color → enabled ──

test('13. Explicit enabled without stored color — enabled with template default color', () => {
  const user: PdfCustomizationSettings = {
    version: 1,
    accentEnabled: true,
  }

  const settings = resolveSettings(ALL_ENABLED, ALL_POLICY, user, TEMPLATE_DEFAULTS)

  assert.equal(settings.accentEnabled, true, 'explicit flag wins')
  assert.equal(settings.accentColor, TEMPLATE_DEFAULTS.accentColor, 'color falls back to template default')
})

// ── Scenario 9: Determinism — same input produces identical output ──

test('9. Determinism — same input produces identical output', () => {
  const user: PdfCustomizationSettings = {
    version: 1,
    accentColor: '#DEADBEEF',
    inkFont: 'Caveat',
  }

  const a = resolveFull(TEMPLATE_DEFAULTS, ALL_ENABLED, ALL_POLICY, user)
  const b = resolveFull(TEMPLATE_DEFAULTS, ALL_ENABLED, ALL_POLICY, user)

  assert.deepStrictEqual(a, b)
})
