import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  DEFAULT_BOLU_INTERACTION_PREFERENCES,
  clampNarrationRate,
} from '@/lib/ai-assistant/bolu-preferences'
import {
  BOLU_HAPTIC_PATTERNS,
  isHapticFeedbackSupported,
  shouldPulseResponseComplete,
  shouldPulseResponseStart,
  triggerBoluHaptic,
} from '@/lib/ai-assistant/bolu-haptics'
import {
  buildNarrationText,
  isNarrationCancelCode,
  prepareNarrationText,
  spokenInlineText,
} from '@/lib/ai-assistant/bolu-narration'

const CHAT_DIR = 'src/components/ai-assistant/chat'
const read = (relative: string) => fs.readFileSync(path.resolve(relative), 'utf-8')

test('Bolu interaction preferences: haptics and narration are enabled by default and independent', () => {
  assert.equal(DEFAULT_BOLU_INTERACTION_PREFERENCES.hapticsEnabled, true)
  assert.equal(DEFAULT_BOLU_INTERACTION_PREFERENCES.completionHapticsEnabled, true)
  assert.equal(DEFAULT_BOLU_INTERACTION_PREFERENCES.narrationEnabled, true)
  assert.equal(DEFAULT_BOLU_INTERACTION_PREFERENCES.narrationRate, 1)
})

test('Bolu interaction preferences: speech rate is clamped to a restrained range', () => {
  assert.equal(clampNarrationRate(1.2), 1.2)
  assert.equal(clampNarrationRate(0), 0.6)
  assert.equal(clampNarrationRate(9), 1.6)
  assert.equal(clampNarrationRate('fast'), 1)
})

test('Bolu haptics: disabled preferences suppress every pulse', () => {
  const disabled = { ...DEFAULT_BOLU_INTERACTION_PREFERENCES, hapticsEnabled: false }
  assert.equal(triggerBoluHaptic('impact-light', disabled), false)
  assert.equal(triggerBoluHaptic('success', disabled), false)
})

test('Bolu haptics: the completion pulse has its own switch', () => {
  const noCompletion = { ...DEFAULT_BOLU_INTERACTION_PREFERENCES, completionHapticsEnabled: false }
  assert.equal(triggerBoluHaptic('success', noCompletion), false)
  // A device without the Haptics plugin must no-op, never throw.
  assert.equal(typeof triggerBoluHaptic('impact-light', DEFAULT_BOLU_INTERACTION_PREFERENCES), 'boolean')
  if (!isHapticFeedbackSupported()) {
    assert.equal(triggerBoluHaptic('impact-light', DEFAULT_BOLU_INTERACTION_PREFERENCES), false)
  }
})

test('Bolu haptics: patterns stay short and restrained', () => {
  for (const pattern of Object.values(BOLU_HAPTIC_PATTERNS)) {
    const values = Array.isArray(pattern) ? pattern : [pattern]
    const total = values.reduce((sum, value) => sum + value, 0)
    // The completion value documents the native SUCCESS waveform (121 ms total).
    assert.ok(total <= 150, `haptic pattern is too long: ${total}ms`)
  }
  assert.equal(BOLU_HAPTIC_PATTERNS['impact-light'], 90)
})

test('Bolu haptics: the start pulse fires once per response and needs visible output', () => {
  assert.equal(shouldPulseResponseStart(null, null, true), false)
  assert.equal(shouldPulseResponseStart('m1', null, false), false)
  assert.equal(shouldPulseResponseStart('m1', null, true), true)
  assert.equal(shouldPulseResponseStart('m1', 'm1', true), false)
  assert.equal(shouldPulseResponseStart('m2', 'm1', true), true)
})

test('Bolu haptics: the completion pulse is also once per response', () => {
  assert.equal(shouldPulseResponseComplete('m1', null, true), true)
  assert.equal(shouldPulseResponseComplete('m1', 'm1', true), false)
  assert.equal(shouldPulseResponseComplete('m1', null, false), false)
})

test('Bolu narration: Markdown symbols are not spoken', () => {
  const spoken = prepareNarrationText(
    '# Totals\n\n**Subtotal** is `₦5,000`.\n\n- first item\n- second item',
  )
  assert.ok(spoken.includes('Totals'))
  assert.ok(spoken.includes('Subtotal is ₦5,000'))
  assert.ok(spoken.includes('first item'))
  assert.ok(spoken.includes('second item'))
  assert.equal(spoken.includes('#'), false)
  assert.equal(spoken.includes('**'), false)
  assert.equal(spoken.includes('`'), false)
})

test('Bolu narration: fenced code is announced, not read line by line', () => {
  const spoken = prepareNarrationText(['Here is the code:', '```ts', 'const total = 5000;', '```', 'Done.'].join('\n'))
  assert.ok(spoken.includes('There is a code block in this response.'))
  assert.equal(spoken.includes('const total'), false)
  assert.ok(spoken.includes('Done.'))
})

test('Bolu narration: links keep their text and drop the URL', () => {
  const spoken = prepareNarrationText('Open [the invoice](https://example.com/invoice/1) now.')
  assert.ok(spoken.includes('Open the invoice now.'))
  assert.equal(spoken.includes('https://'), false)
  assert.equal(spokenInlineText('visit https://example.com'), 'visit link')
})

test('Bolu narration: table rows are read cell by cell in order', () => {
  const spoken = prepareNarrationText(['| Item | Qty |', '| --- | --- |', '| Lugs | 5 |'].join('\n'))
  assert.ok(spoken.includes('Item, Qty'))
  assert.ok(spoken.includes('Lugs, 5'))
  assert.equal(spoken.includes('---'), false)
})

test('Bolu narration: empty input produces no speech and cancel codes are not failures', () => {
  assert.equal(prepareNarrationText(''), '')
  assert.equal(prepareNarrationText('   \n\n'), '')
  assert.equal(isNarrationCancelCode('canceled'), true)
  assert.equal(isNarrationCancelCode('interrupted'), true)
  assert.equal(isNarrationCancelCode('synthesis-failed'), false)
})

test('Bolu narration: a proposal is summarised instead of read as a payload', () => {
  const spoken = buildNarrationText({ prose: 'I prepared a draft.', hasProposal: true })
  assert.ok(spoken.includes('I prepared a draft.'))
  assert.ok(spoken.includes('A document proposal is shown with this response.'))
  assert.equal(
    buildNarrationText({ prose: 'No card here.', hasProposal: false }).includes('document proposal'),
    false,
  )
})

test('Bolu thread: user actions are Edit and Copy only, assistant actions are Regenerate, Copy and Read aloud', () => {
  const thread = read(`${CHAT_DIR}/assistant-chat-thread.tsx`)
  assert.ok(thread.includes('label="Edit message"'), 'user messages must offer an edit action')
  assert.ok(thread.includes('ariaLabel="Copy message"'), 'user messages must offer a copy action')
  assert.ok(thread.includes('label="Regenerate response"'), 'assistant messages must offer regeneration')
  assert.ok(thread.includes('ariaLabel="Copy response"'), 'assistant messages must offer a copy action')
  assert.ok(thread.includes('label="Read response aloud"'), 'assistant messages must offer narration')
  assert.ok(thread.includes("'Pause reading'"))
  assert.ok(thread.includes("'Resume reading'"))
  assert.ok(thread.includes('label="Stop reading"'))
  // Icons only: no visible action words are rendered next to the icons.
  assert.equal(thread.includes('label="Edit response"'), false, 'assistant messages must not be editable')
  assert.equal(thread.includes('</IconAction>Edit'), false)
  assert.ok(thread.includes('iconOnly'), 'copy actions must render icon-only')
})

test('Bolu composer: editing is an explicit state with a cancel path', () => {
  const composer = read(`${CHAT_DIR}/assistant-chat-composer.tsx`)
  assert.ok(composer.includes('editing?: boolean'))
  assert.ok(composer.includes('onCancelEdit?: () => void'))
  assert.ok(composer.includes('ac-edit-banner'))
  assert.ok(composer.includes('aria-label="Cancel editing"'))
  assert.ok(composer.includes("aria-label={editing ? 'Save edited message' : 'Send message'}"))
})

test('Bolu thread: editing and regeneration replace in place and supersede dependent turns', () => {
  const hook = read('src/lib/ai-assistant/hooks/useBoluThread.ts')
  const actions = read('src/lib/ai-assistant/bolu-thread-actions.ts')
  const generation = read('src/lib/ai-assistant/bolu-generation.ts')
  assert.ok(hook.includes('editUserMessage'), 'the hook must expose user-message editing')
  assert.ok(hook.includes('regenerateResponse'), 'the hook must expose response regeneration')
  assert.ok(hook.includes('editBoluUserMessage') && hook.includes('regenerateBoluResponse'))
  assert.ok(actions.includes('markBoluTurnsSuperseded'), 'dependent turns must be superseded')
  assert.ok(generation.includes('superseded: true'), 'superseded turns must be marked, not deleted')
  assert.ok(generation.includes('replaceAssistantId'), 'regeneration must reuse the existing assistant row')
  // The edited user row is updated, never inserted again.
  assert.ok(actions.includes(".update({ content: clean, status: 'completed', updated_at: updatedAt })"))
  assert.equal(actions.includes('.insert('), false, 'an edit must not insert a duplicate user message')
  assert.ok(actions.includes('replaceAssistantId: assistantMessageId'))
})

test('Bolu settings: haptics and narration toggles live in the existing Bolu settings surface', () => {
  const section = read('src/pages/settings/BoluProviderSettingsSection.tsx')
  assert.ok(section.includes('BoluInteractionPreferencesCard'))
  const card = read('src/pages/settings/bolu-provider/BoluInteractionPreferencesCard.tsx')
  assert.ok(card.includes('Haptic feedback'))
  assert.ok(card.includes('Completion pulse'))
  assert.ok(card.includes('Read responses aloud'))
  assert.ok(card.includes('Speaking speed'))
})

test('Bolu haptics and narration never require a cloud voice or audio backend', () => {
  const narration = read('src/lib/ai-assistant/bolu-narration.ts')
  const hook = read('src/lib/ai-assistant/hooks/useBoluNarration.ts')
  assert.equal(narration.includes('fetch('), false)
  assert.equal(hook.includes('fetch('), false)
  assert.ok(hook.includes('speechSynthesis'))
  assert.ok(hook.includes('isNarrationCancelCode'))
})
