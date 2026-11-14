import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const composer = read('../../components/design-lab/assistant-chat-composer.tsx')
const preview = read('../../components/design-lab/assistant-chat-preview.tsx')
const thread = read('../../components/design-lab/assistant-chat-thread.tsx')
const modelPill = read('../../components/design-lab/assistant-chat-model-pill.tsx')
const parts = read('../../components/design-lab/assistant-chat-parts.tsx')
const settings = read('../../components/design-lab/assistant-chat-settings.tsx')
const layouts = read('../../components/design-lab/assistant-chat-layouts.tsx')
const panel = read('../../components/design-lab/assistant-chat-panel.tsx')
const decisionLog = read('../../../docs/prd/conversational-document-assistant/decision-log.md')

test('assistant composer resizes to 160px and resets after controlled value clears', () => {
  assert.match(composer, /scrollHeight/)
  assert.match(composer, /160/)
  assert.match(composer, /useLayoutEffect/)
  assert.match(preview, /isComposing/)
  assert.match(preview, /keyCode === 229/)
})

test('assistant thread announces unread messages and offers a labeled latest action', () => {
  assert.match(thread, /Jump to latest/i)
  assert.match(thread, /aria-live="polite"/)
  assert.match(thread, /busy/)
  assert.match(thread, /aria-busy=\{busy\}/)
  assert.match(thread, /scrollHeight - scrollTop - clientHeight > 48/)
  assert.match(preview, /setPinned\(distance < 48\)/)
})

test('invoice changes apply only once after explicit acceptance', () => {
  assert.match(preview, /card\.status !== 'pending'/)
  assert.match(preview, /if \(accepted\)[\s\S]*?applyCard\(invoiceRef\.current, card\)/)
})

test('model menu supports provider search, configured-first ordering, and status labels', () => {
  assert.match(modelPill, /type="search"/)
  assert.match(modelPill, /configured/i)
  assert.match(modelPill, /needs key/i)
  assert.match(modelPill, /manage providers/i)
})

test('change cards expose a named group and announce resolved states', () => {
  assert.match(parts, /role="group"/)
  assert.match(parts, /aria-live="polite"/)
  assert.match(parts, /aria-labelledby/)
})

test('settings identify connection and model discovery actions as simulated', () => {
  assert.match(settings, /simulation/i)
  assert.match(settings, /simulate test/i)
  assert.match(settings, /simulate model list/i)
})

test('provider settings render only in explicit responsive overlays', () => {
  assert.match(layouts, /props\.settingsOpen\s*\?\s*\([\s\S]*WideSettingsOverlay[\s\S]*props\.settings[\s\S]*\)\s*:\s*null/)
  assert.match(layouts, /function WideSettingsOverlay/)
  assert.equal((layouts.match(/<div className="ac-side-body">\{props\.panel\}<\/div>/g) ?? []).length, 2)
  assert.doesNotMatch(panel, /Provider|API key|onManageProviders/)
})

test('decision log records the local primitives architecture choice', () => {
  assert.match(decisionLog, /DEC-27/)
  assert.match(decisionLog, /assistant-ui/i)
})
