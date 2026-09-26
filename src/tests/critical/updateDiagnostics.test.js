import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDiagnosticLogLine,
} from '../../lib/appUpdate/updateDiagnostics.ts'

test('log line carries reason codes only, never secrets', () => {
  const line = buildDiagnosticLogLine({
    reason: 'policy-fetch-error',
    forced: true,
    joinedInFlight: false,
    policy: 'transport-error',
    discovery: 'not-attempted',
    errorCode: 'PGRST301',
  })
  assert.equal(
    line,
    '[AppUpdate] check reason=policy-fetch-error forced=yes joined=no policy=transport-error discovery=not-attempted code=PGRST301',
  )
  for (const secret of ['eyJhbGciOi', 'sb_secret_', 'Authorization', 'cookie', 'apikey']) {
    assert.ok(!line.includes(secret), `log line must not contain ${secret}`)
  }
})
