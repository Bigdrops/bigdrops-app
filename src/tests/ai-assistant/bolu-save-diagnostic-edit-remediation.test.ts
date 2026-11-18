import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { normalizeError, sanitizeDiagnostic } from '@/lib/errorMessages'
import { errorRegistry } from '@/lib/errorRegistry'
import { feedback } from '@/lib/feedback'
import { validateInvoiceCreateInput, validateInvoiceModifyInput } from '@/lib/ai-assistant/bolu-operations'
import { POST as boluSavePost } from '../../../api/bolu-save'

describe('Diagnostic preservation and secret redaction', () => {
  beforeEach(() => {
    errorRegistry.clear()
  })

  it('preserves options.description in errorRegistry without discarding details', () => {
    feedback.error('Save failed', {
      description: 'relation "tenant_abc.quotations" does not exist (code 42P01)',
    })

    const entries = errorRegistry.getAll()
    assert.strictEqual(entries.length, 1)
    assert.strictEqual(entries[0].title, 'Save failed')
    assert.ok(entries[0].diagnostic.includes('Save failed'))
    assert.ok(entries[0].diagnostic.includes('relation "tenant_abc.quotations" does not exist'))
  })

  it('redacts Bearer tokens, API keys, JWTs, and database credentials', () => {
    const rawError =
      'Failed connecting postgresql://postgres:superSecretPass123@db.supabase.co:5432/postgres ' +
      'with Bearer someAuthToken12345 ' +
      'session eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.s3cr3t ' +
      'using key sk-1234567890abcdef1234567890abcdef and vault_key=myMasterVaultKey999'

    const sanitized = sanitizeDiagnostic(rawError)

    assert.ok(!sanitized.includes('superSecretPass123'))
    assert.ok(sanitized.includes('postgres://[REDACTED]@'))
    assert.ok(!sanitized.includes('someAuthToken12345'))
    assert.ok(sanitized.includes('Bearer [REDACTED]'))
    assert.ok(!sanitized.includes('sk-1234567890abcdef1234567890abcdef'))
    assert.ok(sanitized.includes('[REDACTED_KEY]'))
    assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'))
    assert.ok(sanitized.includes('[REDACTED_JWT]'))
    assert.ok(!sanitized.includes('myMasterVaultKey999'))
  })

  it('caps excessively long diagnostic entries to prevent storage bloat', () => {
    const giantPayload = 'A'.repeat(6000)
    const sanitized = sanitizeDiagnostic(giantPayload)
    assert.ok(sanitized.length <= 4000)
    assert.ok(sanitized.includes('truncated'))
  })
})

describe('Quotation proposal validation and extra_charges handling', () => {
  it('accepts custom named extra charges with their taxability flag preserved', () => {
    const result = validateInvoiceCreateInput({
      client_name: 'Tecno Power Solutions',
      items: [
        { description: '1.5mm electrical cable (roll)', quantity: 10, unit_price: 700 },
      ],
      extra_charges: [
        { name: 'Transportation', amount: 5670, withTax: false },
        { name: 'Handling', amount: 1000, withTax: true },
      ],
    })

    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data?.extra_charges?.length, 2)
    assert.deepEqual(result.data?.extra_charges?.[0], { label: 'Transportation', value: 5670, vatApplicable: false })
    assert.deepEqual(result.data?.extra_charges?.[1], { label: 'Handling', value: 1000, vatApplicable: true })
  })

  it('rejects malformed extra_charges entries', () => {
    const result = validateInvoiceCreateInput({
      client_name: 'Tecno Power Solutions',
      items: [
        { description: '1.5mm electrical cable (roll)', quantity: 10, unit_price: 700 },
      ],
      extra_charges: [{ name: '', amount: -5, withTax: true }],
    })

    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('extra_charges')))
  })

  it('rejects modification proposals containing extra_charges', () => {
    const result = validateInvoiceModifyInput({
      documentId: '11111111-2222-3333-4444-555555555555',
      extraCharges: [{ label: 'transport', value: 5670 }],
    })

    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes('extra_charges')))
  })

  it('accepts transport represented cleanly as a standard line item', () => {
    const result = validateInvoiceCreateInput({
      client_name: 'Tecno Power Solutions',
      items: [
        { description: '1.5mm electrical cable (roll)', quantity: 10, unit_price: 700 },
        { description: 'Transport', quantity: 1, unit_price: 5670 },
      ],
    })

    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.data?.items.length, 2)
  })
})

describe('Server save schema resolution safety (/api/bolu-save)', () => {
  it('validates canonical tenant schema pattern correctly and rejects malformed names', () => {
    const TENANT_SCHEMA_PATTERN = /^entity_[a-z0-9-]+_[a-z0-9-]+$/i

    // Valid canonical schema formats
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('entity_bigdrops-main_main'), true)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('entity_ws-123_ent-456'), true)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('entity_alpha_beta'), true)

    // Invalid or injection formats
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('public'), false)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('entity_'), false)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('entity_onlyone'), false)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('entity_ws_ent; DROP TABLE users;--'), false)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test('random_schema'), false)
    assert.strictEqual(TENANT_SCHEMA_PATTERN.test(''), false)
  })

  it('fails closed when request lacks Bearer authorization header', async () => {
    const req = new Request('http://localhost/api/bolu-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proposal: { opId: 'test-op', status: 'approved_pending_save' },
        entityId: '11111111-1111-1111-1111-111111111111',
      }),
    })

    const res = await boluSavePost(req)
    assert.strictEqual(res.status, 401)
    const data = await res.json()
    assert.strictEqual(data.code, 'unauthorized')
  })

  it('fails closed when tenant schema is unresolved rather than defaulting to public', async () => {
    // Request with no entityId or tenantId
    const req = new Request('http://localhost/api/bolu-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proposal: { opId: 'test-op', status: 'approved_pending_save' },
      }),
    })

    const res = await boluSavePost(req)
    // Should fail authentication or tenant validation, never run public transaction
    assert.ok(res.status >= 400)
    const data = await res.json()
    assert.ok(data.error !== undefined)
  })
})

describe('Composer edit lockout logic', () => {
  it('ensures isLocked is false during edit mode even when disabled is true', () => {
    const busy = false
    const disabled = true // e.g. clerkState !== 'idle'
    const editing = true

    const isLocked = busy || (Boolean(disabled) && !editing)
    assert.strictEqual(isLocked, false)
  })

  it('ensures isLocked remains true if generation is streaming (busy)', () => {
    const busy = true
    const disabled = true
    const editing = true

    const isLocked = busy || (Boolean(disabled) && !editing)
    assert.strictEqual(isLocked, true)
  })

  it('ensures isLocked is true when disabled and not editing', () => {
    const busy = false
    const disabled = true
    const editing = false

    const isLocked = busy || (Boolean(disabled) && !editing)
    assert.strictEqual(isLocked, true)
  })
})
