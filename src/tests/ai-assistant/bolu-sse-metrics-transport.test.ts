import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createSseParserState,
  extractSseMetrics,
  extractSseText,
  feedSseChunk,
  flushSseBuffer,
} from '@/lib/ai-assistant/protocol'

// ============================================================================
// SSE METRICS TRANSPORT & PROTOCOL INTEGRITY (WAVE 2 CORRECTION 4.1)
// ============================================================================

test('Case 1: Metrics followed by [DONE] in separate chunks', () => {
  const state = createSseParserState()
  const deltas: string[] = []

  feedSseChunk(state, 'data: {"choices":[{"delta":{"content":"Hello world"}}]}\n\n', (d) => deltas.push(d))
  assert.equal(state.text, 'Hello world')
  assert.equal(state.serverMetrics, null)
  assert.equal(state.isDone, false)

  feedSseChunk(state, 'data: {"metrics":{"completedAt":"2026-11-22T10:00:00.000Z","durationMs":450,"ttftMs":120}}\n\n')
  assert.equal(state.text, 'Hello world')
  assert.ok(state.serverMetrics)
  assert.equal(state.serverMetrics.durationMs, 450)
  assert.equal(state.serverMetrics.ttftMs, 120)
  assert.equal(state.isDone, false)

  feedSseChunk(state, 'data: [DONE]\n\n')
  assert.equal(state.isDone, true)
  assert.equal(state.text, 'Hello world')
  assert.deepEqual(deltas, ['Hello world'])
})

test('Case 2: Metrics and [DONE] in the same chunk', () => {
  const state = createSseParserState()
  const chunk = [
    'data: {"choices":[{"delta":{"content":"Answer tokens"}}]}',
    '',
    'data: {"metrics":{"completedAt":"2026-11-22T10:00:00.000Z","durationMs":520,"ttftMs":110}}',
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\n')

  feedSseChunk(state, chunk)
  assert.equal(state.text, 'Answer tokens')
  assert.ok(state.serverMetrics)
  assert.equal(state.serverMetrics.durationMs, 520)
  assert.equal(state.serverMetrics.ttftMs, 110)
  assert.equal(state.isDone, true)
})

test('Case 3: [DONE] without metrics (legacy provider)', () => {
  const state = createSseParserState()
  const chunk = [
    'data: {"choices":[{"delta":{"content":"Standard response"}}]}',
    '',
    'data: [DONE]',
    '',
  ].join('\n')

  feedSseChunk(state, chunk)
  assert.equal(state.text, 'Standard response')
  assert.equal(state.serverMetrics, null)
  assert.equal(state.isDone, true)
})

test('Case 4: Stream closure without [DONE]', () => {
  const state = createSseParserState()
  feedSseChunk(state, 'data: {"choices":[{"delta":{"content":"Content without terminal done"}}]}\n\n')
  feedSseChunk(state, 'data: {"metrics":{"completedAt":"2026-11-22T10:00:00.000Z","durationMs":310,"ttftMs":85}}')
  
  // Stream closes without sending [DONE] or final newline
  flushSseBuffer(state)
  assert.equal(state.text, 'Content without terminal done')
  assert.ok(state.serverMetrics)
  assert.equal(state.serverMetrics.durationMs, 310)
  assert.equal(state.serverMetrics.ttftMs, 85)
})

test('Case 5: Malformed and incomplete metrics are ignored safely', () => {
  assert.equal(extractSseMetrics('data: {"metrics": "not an object"}'), null)
  assert.equal(extractSseMetrics('data: {"metrics": {"durationMs": "invalid"}}'), null)
  assert.equal(extractSseMetrics('data: {"metrics": {"durationMs": -50}}'), null)
  assert.equal(extractSseMetrics('data: {"metrics": {}}'), null)
  assert.equal(extractSseMetrics('data: {broken json}'), null)
  assert.equal(extractSseMetrics('not-a-data-line'), null)

  const state = createSseParserState()
  feedSseChunk(state, 'data: {"choices":[{"delta":{"content":"Valid content"}}]}\n\n')
  feedSseChunk(state, 'data: {"metrics":{"durationMs":"corrupt"}}\n\n')
  feedSseChunk(state, 'data: [DONE]\n\n')

  assert.equal(state.text, 'Valid content')
  assert.equal(state.serverMetrics, null)
  assert.equal(state.isDone, true)
})

test('Case 6: Arbitrary chunk boundaries within SSE event data', () => {
  const state = createSseParserState()
  const deltas: string[] = []

  // Split SSE line right in the middle of JSON payload across 4 chunks
  feedSseChunk(state, 'data: {"choices":[{"delta":{"content":"Part 1', (d) => deltas.push(d))
  assert.equal(state.text, '') // Incomplete line in buffer

  feedSseChunk(state, ' and Part 2"}}]}\n\ndata: {"met', (d) => deltas.push(d))
  assert.equal(state.text, 'Part 1 and Part 2')
  assert.equal(state.serverMetrics, null)

  feedSseChunk(state, 'rics":{"completedAt":"2026-11-22T10:00:00.000Z","durationMs":750,"ttftMs":180}}\n\nda')
  assert.equal(state.text, 'Part 1 and Part 2')
  assert.ok(state.serverMetrics)
  assert.equal(state.serverMetrics.durationMs, 750)
  assert.equal(state.serverMetrics.ttftMs, 180)

  feedSseChunk(state, 'ta: [DONE]\n\n')
  assert.equal(state.isDone, true)
  assert.equal(state.text, 'Part 1 and Part 2')
})

test('Case 7: Confirmation that metrics never enter the generated response prose', () => {
  const state = createSseParserState()
  const metricsPayload = JSON.stringify({
    metrics: {
      completedAt: '2026-11-22T10:00:00.000Z',
      durationMs: 999,
      ttftMs: 250,
    },
  })

  // Verify extractSseText specifically ignores metrics line
  assert.equal(extractSseText(`data: ${metricsPayload}`), null)

  feedSseChunk(state, 'data: {"choices":[{"delta":{"content":"Prose message."}}]}\n\n')
  feedSseChunk(state, `data: ${metricsPayload}\n\n`)
  feedSseChunk(state, 'data: [DONE]\n\n')

  assert.equal(state.text, 'Prose message.')
  assert.ok(!state.text.includes('metrics'))
  assert.ok(!state.text.includes('999'))
  assert.ok(!state.text.includes('completedAt'))
})

test('Case 8: Retry and interruption behavior', () => {
  // Scenario A: Interruption halfway through stream
  const state1 = createSseParserState()
  feedSseChunk(state1, 'data: {"choices":[{"delta":{"content":"Partial tokens before connection drop"}}]}\n\n')
  // Network drops without metrics or [DONE]
  assert.equal(state1.text, 'Partial tokens before connection drop')
  assert.equal(state1.serverMetrics, null)
  assert.equal(state1.isDone, false)

  // Scenario B: Retry initializes fresh state, ensuring no stale metrics or spliced text
  const state2 = createSseParserState()
  assert.equal(state2.text, '')
  assert.equal(state2.serverMetrics, null)
  assert.equal(state2.isDone, false)

  feedSseChunk(state2, 'data: {"choices":[{"delta":{"content":"Fresh retried answer"}}]}\n\n')
  feedSseChunk(state2, 'data: {"metrics":{"completedAt":"2026-11-22T10:05:00.000Z","durationMs":400,"ttftMs":95}}\n\n')
  feedSseChunk(state2, 'data: [DONE]\n\n')

  assert.equal(state2.text, 'Fresh retried answer')
  assert.ok(state2.serverMetrics)
  assert.equal(state2.serverMetrics.durationMs, 400)
  assert.equal(state2.isDone, true)
})
