import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyDownloadFailure,
  describeDownloadFailure,
} from '../../domain/appUpdate/downloadFailure.ts'
import { formatVersionLabel } from '../../domain/appUpdate/updateStateMachine.ts'

test('legacy raw enqueue crash classifies as a start failure', () => {
  assert.equal(
    classifyDownloadFailure('Could not enqueue download: Invalid value for visibility: 2'),
    'start',
  )
  assert.equal(classifyDownloadFailure('Could not start download: bad uri'), 'start')
  assert.equal(
    classifyDownloadFailure('The download could not start on this device. Use the web download instead.'),
    'start',
  )
  assert.equal(classifyDownloadFailure('Download service unavailable.'), 'start')
})

test('transfer failures and unknown errors classify safely', () => {
  assert.equal(classifyDownloadFailure('Download failed (status 16). You can retry safely.'), 'transfer')
  assert.equal(classifyDownloadFailure(null), 'unknown')
  assert.equal(classifyDownloadFailure(''), 'unknown')
  assert.equal(classifyDownloadFailure('java.lang.IllegalStateException: boom'), 'unknown')
})

test('failure copy never echoes raw native exception text', () => {
  const raw = 'Could not enqueue download: Invalid value for visibility: 2'
  for (const webFallbackAvailable of [true, false]) {
    const message = describeDownloadFailure(raw, { webFallbackAvailable })
    assert.ok(!message.includes('visibility'), 'must not leak the Java visibility value')
    assert.ok(!message.includes('Invalid value'), 'must not leak the Java exception text')
    assert.ok(!message.includes('enqueue'), 'must not leak native plumbing terms')
    assert.ok(message.length > 0)
  }
})

test('failure copy announces the web fallback only when it is available', () => {
  const withFallback = describeDownloadFailure(null, { webFallbackAvailable: true })
  assert.match(withFallback, /web download page is opening instead/)
  const withoutFallback = describeDownloadFailure(null, { webFallbackAvailable: false })
  assert.match(withoutFallback, /try again/)
  assert.ok(!withoutFallback.includes('web download page'))
})

test('version label prefers the name and never renders a lonely v', () => {
  assert.equal(formatVersionLabel('1.0.26', 1026), 'v1.0.26')
  assert.equal(formatVersionLabel('v1.0.26', 1026), 'v1.0.26')
  assert.equal(formatVersionLabel(null, 1026), 'v1026')
  assert.equal(formatVersionLabel('   ', 1026), 'v1026')
  assert.equal(formatVersionLabel(null, null), 'Latest')
  assert.equal(formatVersionLabel(undefined, undefined), 'Latest')
  assert.equal(formatVersionLabel('', 0), 'Latest')
  assert.equal(formatVersionLabel(null, -3), 'Latest')
  assert.equal(formatVersionLabel(null, Number.NaN), 'Latest')
})