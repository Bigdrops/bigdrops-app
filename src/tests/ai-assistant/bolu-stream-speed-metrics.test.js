import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeStreamMetrics,
  createUsageScanner,
} from '../../lib/ai-assistant/bolu-usage-ledger.ts'

/**
 * Speed metrics must be measured, never invented. Every unusable
 * measurement returns null so the panel can show a dash instead of a
 * number that was never observed.
 */

test('Speed Metrics: a normal stream yields time to first token and a token rate', () => {
  const metrics = computeStreamMetrics({
    requestStartedAtMs: 1_000,
    firstContentAtMs: 1_516,
    lastContentAtMs: 3_516,
    completionTokens: 200,
  })
  assert.equal(metrics.ttftMs, 516)
  assert.equal(metrics.generationMs, 2_000)
  // 200 tokens over 2 seconds.
  assert.equal(metrics.tokensPerSecond, 100)
})

test('Speed Metrics: a missing timestamp yields no measurement', () => {
  const metrics = computeStreamMetrics({
    requestStartedAtMs: null,
    firstContentAtMs: null,
    lastContentAtMs: null,
    completionTokens: 100,
  })
  assert.equal(metrics.ttftMs, null)
  assert.equal(metrics.generationMs, null)
  assert.equal(metrics.tokensPerSecond, null)
})

test('Speed Metrics: a single content chunk has no measurable generation window', () => {
  const metrics = computeStreamMetrics({
    requestStartedAtMs: 1_000,
    firstContentAtMs: 1_200,
    lastContentAtMs: 1_200,
    completionTokens: 5,
  })
  assert.equal(metrics.ttftMs, 200)
  assert.equal(metrics.generationMs, 0)
  assert.equal(metrics.tokensPerSecond, null, 'A zero length window must not divide')
})

test('Speed Metrics: no completion tokens means no token rate', () => {
  const metrics = computeStreamMetrics({
    requestStartedAtMs: 1_000,
    firstContentAtMs: 1_100,
    lastContentAtMs: 2_100,
    completionTokens: 0,
  })
  assert.equal(metrics.ttftMs, 100)
  assert.equal(metrics.tokensPerSecond, null)
})

test('Speed Metrics: a clock that runs backwards yields no measurement', () => {
  const metrics = computeStreamMetrics({
    requestStartedAtMs: 5_000,
    firstContentAtMs: 1_000,
    lastContentAtMs: 900,
    completionTokens: 50,
  })
  assert.equal(metrics.ttftMs, null)
  assert.equal(metrics.generationMs, null)
  assert.equal(metrics.tokensPerSecond, null)
})

test('Speed Scanner: content frames set the first and last token times', () => {
  const scanner = createUsageScanner()
  assert.equal(scanner.timing().firstContentAtMs, null)
  assert.equal(scanner.timing().lastContentAtMs, null)

  scanner.push('data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n')
  assert.equal(
    scanner.timing().firstContentAtMs,
    null,
    'A role-only delta is not a content token',
  )

  scanner.push('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
  const afterFirst = scanner.timing()
  assert.notEqual(afterFirst.firstContentAtMs, null)
  assert.notEqual(afterFirst.lastContentAtMs, null)

  scanner.push('data: {"choices":[{"delta":{"content":" world"}}]}\n\n')
  assert.equal(scanner.timing().firstContentAtMs, afterFirst.firstContentAtMs)
  // The clock has millisecond resolution, so the second frame can land in the
  // same millisecond. The invariant is that the last time never moves back.
  assert.ok(scanner.timing().lastContentAtMs >= afterFirst.lastContentAtMs)
  assert.equal(scanner.text(), 'Hello world')
})

test('Speed Scanner: the provider usage frame is still read', () => {
  const scanner = createUsageScanner()
  scanner.push(
    'data: {"choices":[{"delta":{"content":"abc"}}],"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}\n\n',
  )
  const counts = scanner.result()
  assert.equal(counts?.completionTokens, 3)
  assert.equal(counts?.promptTokens, 12)
})

test('Speed Scanner: a reasoning model streams its tokens in the reasoning field', () => {
  const scanner = createUsageScanner()
  scanner.push('data: {"choices":[{"delta":{"content":"","role":"assistant","reasoning":"Let"}}]}\n\n')
  assert.notEqual(
    scanner.timing().firstContentAtMs,
    null,
    'A reasoning token is a generated token and starts the clock',
  )

  scanner.push('data: {"choices":[{"delta":{"content":"","reasoning":" me think"}}]}\n\n')
  assert.equal(scanner.text(), '', 'The answer text stays separate from the reasoning')
  assert.equal(scanner.generatedText(), 'Let me think')
})

test('Speed Scanner: an empty final frame does not move the clock', () => {
  const scanner = createUsageScanner()
  scanner.push('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n')
  const afterContent = scanner.timing()
  scanner.push('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n')
  assert.equal(scanner.timing().firstContentAtMs, afterContent.firstContentAtMs)
  assert.equal(scanner.timing().lastContentAtMs, afterContent.lastContentAtMs)
})
