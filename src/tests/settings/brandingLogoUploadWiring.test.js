import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../../pages/settings/BrandingSettingsSection.tsx', import.meta.url), 'utf8')

test('branding logo upload uses the same ref-click trigger pattern as signatories', () => {
  assert.match(source, /useRef/)
  assert.match(source, /const logoInputRef = useRef<HTMLInputElement \| null>\(null\)/)
  assert.match(source, /onChange=\{\(event\) => \{/)
  assert.match(source, /console\.log\('\[BrandingSettings\] file input onChange fired:', file\)/)
  assert.match(source, /void handleUpload\(file\)/)
  assert.match(source, /logoInputRef\.current\?\.click\(\)/)
  assert.doesNotMatch(source, /htmlFor="company-logo-input"/)
  assert.doesNotMatch(source, /const UploadBox =/)
})
