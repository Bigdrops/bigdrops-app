import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  DUPLICATE_NAME_CONSTRAINT,
  createConnection,
  isDuplicateNameError,
} from '../../lib/ai-assistant/connection-vault.ts'

const API_ROUTE = path.resolve('api/bolu-provider-config.ts')
const source = fs.readFileSync(API_ROUTE, 'utf8')

/**
 * The connection name carries a UNIQUE constraint. A second connection with
 * the same name must fail with an actionable message, not the generic
 * "The operation failed." that the shared catch block produces.
 */

test('Bolu Provider Config: a name collision is recognised as a collision', () => {
  const postgrestError = new Error(
    'Failed to create connection: duplicate key value violates unique constraint "uq_app_ai_provider_connections_name"',
  )
  assert.equal(isDuplicateNameError(postgrestError), true)
  assert.equal(isDuplicateNameError(new Error('Failed to create connection: network unreachable')), false)
  assert.equal(isDuplicateNameError(new Error(DUPLICATE_NAME_CONSTRAINT)), true)
})

test('Bolu Provider Config: create rejects a name that is already taken', () => {
  assert.ok(
    source.includes('existingConnections.some((c) => c.name === name)'),
    'handleCreate must check the name against existing connections before the insert',
  )
  assert.ok(
    source.includes('duplicate_name'),
    'The API must carry a dedicated duplicate_name error code',
  )
  assert.ok(
    /A connection named "\$\{name\}" already exists/.test(source),
    'The error must name the taken connection so the admin can rename it',
  )
  assert.ok(
    source.includes('409'),
    'A name collision must answer 409 Conflict',
  )
})

test('Bolu Provider Config: a collision is not swallowed by the generic failure handler', () => {
  assert.ok(
    source.includes('if (isDuplicateNameError(err)) return duplicateNameResponse(name)'),
    'A create failure that is a name collision must return the actionable error',
  )
  assert.ok(
    source.includes('if (isDuplicateNameError(err)) return duplicateNameResponse(patch.name ?? \'\')'),
    'An update failure that is a name collision must return the actionable error',
  )
})

test('Bolu Provider Config: a rename may keep its own name', () => {
  assert.ok(
    source.includes('c.name === name && c.id !== connectionId'),
    'A rename must not collide with the connection being renamed',
  )
})

test('Bolu Provider Config: the real insert failure is recognised as a name collision', async () => {
  // The exact error body PostgREST returns for a UNIQUE(name) violation.
  const postgrestError = {
    code: '23505',
    details: 'Key (name)=(Bolu) already exists.',
    message: 'duplicate key value violates unique constraint "uq_app_ai_provider_connections_name"',
  }

  const failingClient = {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: postgrestError }),
        }),
      }),
    }),
  }

  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey || 'test-service-role-key'

  try {
    await assert.rejects(
      () =>
        createConnection(
          failingClient,
          {
            providerId: 'plamo',
            name: 'Bolu',
            protocol: 'openai',
            authScheme: 'bearer',
            baseUrl: 'https://api.platform.preferredai.jp/v1',
            apiKey: 'test-key',
            model: 'plamo-3.1-prime',
            timeoutMs: 45000,
          },
          'user-1',
        ),
      (err) => {
        assert.ok(
          isDuplicateNameError(err),
          'The thrown error must be recognised as a name collision',
        )
        assert.match(err.message, /uq_app_ai_provider_connections_name/)
        return true
      },
    )
  } finally {
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  }
})
