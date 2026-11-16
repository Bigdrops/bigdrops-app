import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  isNarrationSupported,
  prepareNarrationText,
  selectNarrationEngine,
  splitNarrationChunks,
} from '@/lib/ai-assistant/bolu-narration'
import { BOLU_HAPTIC_PATTERNS } from '@/lib/ai-assistant/bolu-haptics'

const read = (relative: string) => fs.readFileSync(path.resolve(relative), 'utf-8')

test('Narration engine: native wins only when the bridge reports a working engine', () => {
  assert.equal(
    selectNarrationEngine({ nativeBridgeAvailable: true, nativeCapable: true, webSpeechAvailable: true }),
    'native',
  )
  assert.equal(
    selectNarrationEngine({ nativeBridgeAvailable: true, nativeCapable: true, webSpeechAvailable: false }),
    'native',
  )
})

test('Narration engine: an unavailable native bridge falls back to the browser engine', () => {
  assert.equal(
    selectNarrationEngine({ nativeBridgeAvailable: true, nativeCapable: false, webSpeechAvailable: true }),
    'browser',
  )
  assert.equal(
    selectNarrationEngine({ nativeBridgeAvailable: false, nativeCapable: false, webSpeechAvailable: true }),
    'browser',
  )
})

test('Narration engine: no engine reports none instead of a false success', () => {
  assert.equal(
    selectNarrationEngine({ nativeBridgeAvailable: true, nativeCapable: false, webSpeechAvailable: false }),
    'none',
  )
  assert.equal(
    selectNarrationEngine({ nativeBridgeAvailable: false, nativeCapable: false, webSpeechAvailable: false }),
    'none',
  )
})

test('Narration chunks: sentences are grouped under the limit without losing text', () => {
  const text =
    'Invoice INV-001 is overdue by fourteen days. The client owes 50,000 naira on this invoice. ' +
    'Send a payment reminder to the client today. Record the reminder in the audit trail.'
  const chunks = splitNarrationChunks(text, 140)
  assert.ok(chunks.length > 1)
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text)
  for (const chunk of chunks) assert.ok(chunk.length <= 140, `chunk too long: ${chunk.length}`)
})

test('Narration chunks: a long sentence is split on word boundaries', () => {
  const long = `${'word '.repeat(120).trim()}.`
  const chunks = splitNarrationChunks(long, 120)
  assert.ok(chunks.length > 1)
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 120)
    assert.equal(chunk.startsWith(' '), false)
  }
})

test('Narration chunks: empty text produces no chunks', () => {
  assert.deepEqual(splitNarrationChunks(''), [])
  assert.deepEqual(splitNarrationChunks('   \n\t '), [])
})

test('Narration text: hidden envelopes and code are excluded before chunking', () => {
  const raw = [
    'Here is the summary.',
    '```json:bolu_operation',
    '{"operationType":"create-document","payload":{"secret":"internal"}}',
    '```',
  ].join('\n')

  const prepared = prepareNarrationText(raw)
  const spoken = splitNarrationChunks(prepared).join(' ').toLowerCase()
  assert.ok(spoken.includes('summary'))
  assert.equal(spoken.includes('operationtype'), false)
  assert.equal(spoken.includes('internal'), false)
})

test('Haptics: only the response start and completion can pulse', () => {
  const kinds = Object.keys(BOLU_HAPTIC_PATTERNS)
  assert.deepEqual(kinds.sort(), ['impact-light', 'success'])
  assert.equal('impact-medium' in BOLU_HAPTIC_PATTERNS, false)
})

test('Haptics: no ordinary interaction triggers vibration', () => {
  const workspace = read('src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
  const interactions = read('src/hooks/useBoluChatInteractions.ts')
  const responseHaptics = read('src/hooks/useBoluResponseHaptics.ts')

  assert.equal(workspace.includes('triggerBoluHaptic'), false, 'send, copy and edit must stay silent')
  assert.equal(interactions.includes('triggerBoluHaptic'), false, 'edit, regenerate and narration must stay silent')
  assert.ok(responseHaptics.includes("triggerBoluHaptic('impact-light'"))
  assert.ok(responseHaptics.includes("triggerBoluHaptic('success'"))
})

test('Native bridge: the Android plugin implements TextToSpeech with no network call', () => {
  const source = read('android/app/src/main/java/com/bigdrops/app/plugins/BoluSpeechPlugin.java')
  assert.ok(source.includes('@CapacitorPlugin(name = "BoluSpeech")'))
  assert.ok(source.includes('import android.speech.tts.TextToSpeech;'))
  assert.ok(source.includes('UtteranceProgressListener'))
  assert.ok(source.includes('notifyListeners("boluSpeechState"'))
  assert.ok(source.includes('engine.shutdown()'), 'the engine must be released on destroy')
  assert.ok(source.includes('TextToSpeech.QUEUE_FLUSH'))
  assert.equal(source.includes('HttpURLConnection'), false, 'speech must never leave the device')
  assert.equal(source.includes('http://'), false)
})

test('Native bridge: the plugin is registered and the TTS service is visible on Android 11+', () => {
  const activity = read('android/app/src/main/java/com/bigdrops/app/MainActivity.java')
  const manifest = read('android/app/src/main/AndroidManifest.xml')

  assert.ok(activity.includes('registerPlugin(BoluSpeechPlugin.class);'))
  assert.ok(activity.includes('import com.bigdrops.app.plugins.BoluSpeechPlugin;'))
  assert.ok(manifest.includes('android.intent.action.TTS_SERVICE'))
  assert.equal(manifest.split('android.permission.VIBRATE').length - 1, 1, 'VIBRATE must be declared once')
})

test('Native wrapper: capability is probed and failures degrade safely', () => {
  const bridge = read('src/lib/native/boluSpeech.ts')
  assert.ok(bridge.includes("Capacitor.isPluginAvailable('BoluSpeech')"))
  assert.ok(bridge.includes('export async function getBoluSpeechCapability'))
  assert.ok(bridge.includes('export async function stopBoluSpeech'))
  assert.ok(bridge.includes("addListener('boluSpeechState'"))
  assert.ok(bridge.includes('return false'), 'a rejected speak call returns false')
})

test('Narration hook: selects an engine, chunks native speech and cleans up', () => {
  const hook = read('src/lib/ai-assistant/hooks/useBoluNarration.ts')
  assert.ok(hook.includes('selectNarrationEngine('))
  assert.ok(hook.includes('splitNarrationChunks('))
  assert.ok(hook.includes('startingRef'), 'rapid taps must not start a second session')
  assert.ok(hook.includes('sessionTokenRef'), 'stale callbacks must not update a closed conversation')
  assert.ok(hook.includes('void stopBoluSpeech()'), 'stop and unmount must release native speech')
  assert.ok(hook.includes('synth.cancel()'), 'the browser engine must be cancelled too')
})

test('Narration settings: support is engine-aware, not browser-only', () => {
  const card = read('src/pages/settings/bolu-provider/BoluInteractionPreferencesCard.tsx')
  assert.ok(card.includes('useBoluNarrationSupport'))
  assert.equal(card.includes('isNarrationSupported()'), false)
  const support = read('src/hooks/useBoluNarrationSupport.ts')
  assert.ok(support.includes('getBoluSpeechCapability'))
  assert.ok(support.includes('selectNarrationEngine'))
})

test('Editing: the request is stored before dependent turns are superseded', () => {
  const actions = read('src/lib/ai-assistant/bolu-thread-actions.ts')
  const updateIndex = actions.indexOf(".update({ content: clean, status: 'completed', updated_at: updatedAt })")
  const supersedeIndex = actions.indexOf('markBoluTurnsSuperseded(downstream)')

  assert.ok(updateIndex > 0)
  assert.ok(supersedeIndex > 0)
  assert.ok(updateIndex < supersedeIndex, 'the edited text must be stored before the branch changes')
  assert.ok(actions.includes('originalContent'), 'a failed branch write must restore the original text')
})

test('Supersession: reload and realtime paths use the filtered fetch', () => {
  const hook = read('src/lib/ai-assistant/hooks/useBoluThread.ts')
  assert.ok(hook.includes('.filter((message) => message.metadata?.superseded !== true)'))
  assert.ok(hook.includes("filter: `conversation_id=eq.${conversationId}`"))
  assert.ok(hook.includes('void fetchMessages()'), 'realtime changes must reload through the filter')
  assert.ok(hook.includes('void fetchMessages()\n  }, [fetchMessages])'), 'initial load must use the filter')
})

test('Narration support in this test environment does not claim a false engine', () => {
  // Bun has no speechSynthesis and no Capacitor bridge; the pure probe must say so.
  if (typeof window === 'undefined') {
    assert.equal(isNarrationSupported(), false)
  }
})
