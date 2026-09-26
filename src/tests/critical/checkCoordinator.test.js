import test from 'node:test'
import assert from 'node:assert/strict'

import { createCheckCoordinator } from '../../lib/appUpdate/checkCoordinator.ts'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('fresh start runs once and is not joined', async () => {
  const coordinator = createCheckCoordinator()
  let starts = 0
  const { promise, joined } = coordinator.submit(true, async () => {
    starts += 1
    return 'fresh-result'
  })
  assert.equal(joined, false)
  assert.equal(await promise, 'fresh-result')
  assert.equal(starts, 1)
})

test('second fresh caller joins the in-flight operation', async () => {
  const coordinator = createCheckCoordinator()
  const gate = deferred()
  let starts = 0
  const first = coordinator.submit(true, () => {
    starts += 1
    return gate.promise
  })
  const second = coordinator.submit(true, async () => {
    starts += 1
    return 'must-not-run'
  })
  assert.equal(first.joined, false)
  assert.equal(second.joined, true)
  gate.resolve('shared-result')
  assert.equal(await first.promise, 'shared-result')
  assert.equal(await second.promise, 'shared-result')
  assert.equal(starts, 1, 'only one authoritative operation runs')
})

test('fresh desire during stale operation chains one forced check', async () => {
  const coordinator = createCheckCoordinator()
  const gate = deferred()
  const seen = []
  const stale = coordinator.submit(false, () => {
    seen.push(false)
    return gate.promise
  })
  assert.equal(stale.joined, false)
  const manual = coordinator.submit(true, async (forced) => {
    seen.push(forced)
    return 'fresh-result'
  })
  assert.equal(manual.joined, false, 'manual work is new, not joined')
  assert.deepEqual(seen, [false], 'forced check waits for the stale operation')
  gate.resolve('stale-result')
  assert.equal(await stale.promise, 'stale-result')
  assert.equal(await manual.promise, 'fresh-result')
  assert.deepEqual(seen, [false, true], 'exactly one forced check follows')
})

test('non-fresh caller joins a stale operation', async () => {
  const coordinator = createCheckCoordinator()
  const gate = deferred()
  let starts = 0
  coordinator.submit(false, () => {
    starts += 1
    return gate.promise
  })
  const second = coordinator.submit(false, async () => {
    starts += 1
    return 'must-not-run'
  })
  assert.equal(second.joined, true)
  gate.resolve('stale-result')
  assert.equal(await second.promise, 'stale-result')
  assert.equal(starts, 1)
})

test('two rapid fresh callers cause a single start', async () => {
  const coordinator = createCheckCoordinator()
  const gate = deferred()
  let starts = 0
  const start = () => {
    starts += 1
    return gate.promise
  }
  const first = coordinator.submit(true, start)
  const second = coordinator.submit(true, start)
  gate.resolve('done')
  assert.equal(await first.promise, 'done')
  assert.equal(await second.promise, 'done')
  assert.equal(starts, 1)
})

test('slot clears after settle so later checks start anew', async () => {
  const coordinator = createCheckCoordinator()
  let starts = 0
  const first = coordinator.submit(true, async () => {
    starts += 1
    return 'one'
  })
  assert.equal(await first.promise, 'one')
  const second = coordinator.submit(true, async () => {
    starts += 1
    return 'two'
  })
  assert.equal(second.joined, false)
  assert.equal(await second.promise, 'two')
  assert.equal(starts, 2)
})
