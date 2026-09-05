import test from 'node:test'
import assert from 'node:assert/strict'

import { buildInitialWorkspaceInput } from '../../domain/tenant/tenantGate.ts'

const USER_ID = 'a1b2c3d4-1111-2222-3333-444455556666'

test('initial workspace input derives a name from the email and a stable user slug', () => {
  assert.deepEqual(buildInitialWorkspaceInput('tunde@example.com', USER_ID), {
    name: "Tunde's Workspace",
    slug: 'ws-a1b2c3d4',
  })
})

test('initial workspace input falls back when the email is blank', () => {
  assert.deepEqual(buildInitialWorkspaceInput('', USER_ID), {
    name: 'My Workspace',
    slug: 'ws-a1b2c3d4',
  })
  assert.deepEqual(buildInitialWorkspaceInput(null, USER_ID), {
    name: 'My Workspace',
    slug: 'ws-a1b2c3d4',
  })
  assert.deepEqual(buildInitialWorkspaceInput(undefined, USER_ID), {
    name: 'My Workspace',
    slug: 'ws-a1b2c3d4',
  })
})

test('initial workspace slug is stable per user for repeated bootstrap calls', () => {
  const first = buildInitialWorkspaceInput('tunde@example.com', USER_ID)
  const second = buildInitialWorkspaceInput('tunde@example.com', USER_ID)
  assert.equal(first.slug, second.slug)
  assert.match(first.slug, /^ws-[a-z0-9-]+$/)
})
