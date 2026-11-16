import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createConnection,
} from '../../lib/ai-assistant/connection-vault.ts'
import {
  KEY_VERSION_DEDICATED,
  decryptVaultSecret,
  deriveMasterKey,
} from '../../lib/ai-assistant/bolu-secret-vault.ts'

/**
 * The key_version column names the master key that encrypted the secret.
 * A stamp that does not match the key in use makes the credential
 * undecryptable for every later read.
 */

const DEDICATED_KEY = 'a'.repeat(64)

function capturingClient(captured) {
  return {
    from: () => ({
      insert: (row) => {
        captured.push(row)
        return {
          select: () => ({
            single: async () => ({ data: { ...row, id: 'conn-1' }, error: null }),
          }),
        }
      },
    }),
  }
}

test('Bolu Connection Vault: a dedicated key is stamped as version 2 and decrypts', async () => {
  const previousDedicated = process.env.BOLU_ENCRYPTION_KEY
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.BOLU_ENCRYPTION_KEY = DEDICATED_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret'

  try {
    const captured = []
    await createConnection(
      capturingClient(captured),
      {
        providerId: 'plamo',
        name: 'Bolu PLaMo',
        protocol: 'openai',
        authScheme: 'bearer',
        baseUrl: 'https://api.platform.preferredai.jp/v1',
        apiKey: 'plamo-secret-key',
        model: 'plamo-3.1-prime',
        timeoutMs: 45000,
      },
      'user-1',
      deriveMasterKey(),
    )

    const row = captured[0]
    assert.equal(row.key_version, KEY_VERSION_DEDICATED, 'The stamp must name the dedicated key')
    assert.equal(
      decryptVaultSecret(
        {
          ciphertext: row.encrypted_key,
          nonce: row.key_nonce,
          tag: row.key_tag,
          version: row.key_version,
        },
        process.env,
      ),
      'plamo-secret-key',
      'A stored credential must decrypt with the stamped version',
    )
  } finally {
    if (previousDedicated === undefined) delete process.env.BOLU_ENCRYPTION_KEY
    else process.env.BOLU_ENCRYPTION_KEY = previousDedicated
    if (previousServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole
  }
})

test('Bolu Connection Vault: without a dedicated key the stamp stays version 1', async () => {
  const previousDedicated = process.env.BOLU_ENCRYPTION_KEY
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.BOLU_ENCRYPTION_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret'

  try {
    const captured = []
    await createConnection(
      capturingClient(captured),
      {
        providerId: 'plamo',
        name: 'Bolu PLaMo',
        protocol: 'openai',
        authScheme: 'bearer',
        baseUrl: 'https://api.platform.preferredai.jp/v1',
        apiKey: 'plamo-secret-key',
        model: 'plamo-3.1-prime',
        timeoutMs: 45000,
      },
      'user-1',
      deriveMasterKey(),
    )

    const row = captured[0]
    assert.equal(row.key_version, 1)
    assert.equal(
      decryptVaultSecret(
        {
          ciphertext: row.encrypted_key,
          nonce: row.key_nonce,
          tag: row.key_tag,
          version: row.key_version,
        },
        process.env,
      ),
      'plamo-secret-key',
    )
  } finally {
    if (previousDedicated === undefined) delete process.env.BOLU_ENCRYPTION_KEY
    else process.env.BOLU_ENCRYPTION_KEY = previousDedicated
    if (previousServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole
  }
})
