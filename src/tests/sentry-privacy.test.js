import { describe, expect, it } from 'bun:test'
import {
  isSensitiveKey,
  normalizeKey,
  sanitizeUrl,
  scrubObject,
  scrubText,
  REDACTED_CIRCULAR_MARKER,
  REDACTED_DEPTH_MARKER,
} from '../lib/sentry'

describe('Sentry Frontend Privacy Hardening Test Suite', () => {
  // --------------------------------------------------------------------------
  // 1. Compound Sensitive Keys & Normalization
  // --------------------------------------------------------------------------
  describe('1. Compound Sensitive Keys', () => {
    const requiredKeys = [
      'invoice_number',
      'invoiceNumber',
      'invoice_id',
      'invoiceId',
      'quotation_number',
      'purchase_order_number',
      'po_number',
      'client_name',
      'clientName',
      'customer_name',
      'supplier_name',
      'total_amount',
      'subtotal_amount',
      'unit_price',
      'item_price',
      'bank_name',
      'bank_account_number',
      'account_name',
      'bolu_prompt',
      'bolu_response',
      'chat_message',
    ]

    for (const key of requiredKeys) {
      it(`identifies '${key}' as sensitive`, () => {
        expect(isSensitiveKey(key)).toBe(true)
      })
    }

    it('redacts compound keys in nested objects and arrays', () => {
      const payload = {
        meta: {
          invoiceNumber: 'INV-2026-999',
          clientName: 'Dangote Cement',
          bank_account_number: '0123456789',
        },
        items: [
          { item_price: 5000, unit_price: 2500, label: 'Standard Cable' },
          { po_number: 'PO-7788', supplier_name: 'CableCorp' },
        ],
      }

      const result = scrubObject(payload)
      expect(result.meta.invoiceNumber).toBe('[REDACTED]')
      expect(result.meta.clientName).toBe('[REDACTED]')
      expect(result.meta.bank_account_number).toBe('[REDACTED]')
      expect(result.items[0].item_price).toBe('[REDACTED]')
      expect(result.items[0].unit_price).toBe('[REDACTED]')
      expect(result.items[0].label).toBe('Standard Cable')
      expect(result.items[1].po_number).toBe('[REDACTED]')
      expect(result.items[1].supplier_name).toBe('[REDACTED]')
    })
  })

  // --------------------------------------------------------------------------
  // 2. False-Positive Controls
  // --------------------------------------------------------------------------
  describe('2. False-Positive Controls', () => {
    const safeTechnicalKeys = [
      'monkey',
      'keyboardLayout',
      'monkeyCount',
      'apiVersion',
      'keyboardShortcut',
      'componentName',
      'pathname',
      'timestamp',
      'status',
      'retryCount',
      'level',
      'viewMode',
    ]

    for (const key of safeTechnicalKeys) {
      it(`does NOT falsely redact technical key '${key}'`, () => {
        expect(isSensitiveKey(key)).toBe(false)
      })
    }

    it('preserves values under non-sensitive technical keys', () => {
      const technicalPayload = {
        monkey: 'playful',
        keyboardLayout: 'QWERTY',
        monkeyCount: 12,
        apiVersion: 'v1.4.2',
        keyboardShortcut: 'ctrl+s',
      }

      const result = scrubObject(technicalPayload)
      expect(result.monkey).toBe('playful')
      expect(result.keyboardLayout).toBe('QWERTY')
      expect(result.monkeyCount).toBe(12)
      expect(result.apiVersion).toBe('v1.4.2')
      expect(result.keyboardShortcut).toBe('ctrl+s')
    })
  })

  // --------------------------------------------------------------------------
  // 3. Recursive Depth Cutoff (Fail Closed)
  // --------------------------------------------------------------------------
  describe('3. Recursive Depth Cutoff', () => {
    it('replaces deeply nested structures with fail-closed redaction marker', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  innocentKey: 'should not pass raw',
                  secretKey: 'sensitive value',
                },
              },
            },
          },
        },
      }

      const result = scrubObject(deeplyNested)
      expect(result.level1.level2.level3.level4).toBe(REDACTED_DEPTH_MARKER)
    })

    it('fails closed on deep nested arrays', () => {
      const deepArray = [[[[['deep-value']]]]]
      const result = scrubObject(deepArray)
      expect(result[0][0][0][0]).toBe(REDACTED_DEPTH_MARKER)
    })
  })

  // --------------------------------------------------------------------------
  // 4. Circular References
  // --------------------------------------------------------------------------
  describe('4. Circular References', () => {
    it('handles self-referencing objects without stack overflow', () => {
      const cyclic = { id: 101, validName: 'TestCyclic' }
      cyclic.self = cyclic

      expect(() => {
        const result = scrubObject(cyclic)
        expect(result.id).toBe(101)
        expect(result.validName).toBe('TestCyclic')
        expect(result.self).toBe(REDACTED_CIRCULAR_MARKER)
      }).not.toThrow()
    })

    it('handles mutually referencing objects without stack overflow', () => {
      const a = { name: 'A' }
      const b = { name: 'B' }
      a.link = b
      b.link = a

      expect(() => {
        const result = scrubObject(a)
        expect(result.name).toBe('A')
        expect(result.link.name).toBe('B')
        expect(result.link.link).toBe(REDACTED_CIRCULAR_MARKER)
      }).not.toThrow()
    })
  })

  // --------------------------------------------------------------------------
  // 5. Event Contexts & Tags Scrubbing
  // --------------------------------------------------------------------------
  describe('5. Event Contexts & Tags Scrubbing', () => {
    it('redacts sensitive keys inside context objects', () => {
      const contexts = {
        react: { componentStack: '\n at InvoiceTable (InvoiceTable.tsx:20)' },
        invoiceContext: {
          client: 'Dangote',
          amount: 50000,
        },
        operationalContext: {
          invoice_number: 'INV-2026-0042',
          total_amount: 150000,
          status: 'pending',
        },
        clientContext: {
          client_name: 'Acme West Africa',
          industry: 'Manufacturing',
        },
      }

      const cleaned = scrubObject(contexts)
      // 1. Context key itself is sensitive
      expect(cleaned.invoiceContext).toBe('[REDACTED]')
      expect(cleaned.clientContext).toBe('[REDACTED]')

      // 2. Sensitive keys inside non-sensitive context are redacted
      expect(cleaned.operationalContext.invoice_number).toBe('[REDACTED]')
      expect(cleaned.operationalContext.total_amount).toBe('[REDACTED]')
      expect(cleaned.operationalContext.status).toBe('pending')
    })
  })

  // --------------------------------------------------------------------------
  // 6. Breadcrumbs Sanitization
  // --------------------------------------------------------------------------
  describe('6. Breadcrumbs Sanitization', () => {
    it('sanitizes navigation breadcrumbs (from and to URLs)', () => {
      const fromUrl = '/invoices/d3b07384-d113-4682-a080-45fa8f1212ab?search=Dangote#line2'
      const toUrl = '/invoices/INV-2026-0042?edit=true'

      expect(sanitizeUrl(fromUrl)).toBe('/invoices/:id')
      expect(sanitizeUrl(toUrl)).toBe('/invoices/:[doc_number]')
    })

    it('sanitizes fetch/XHR URLs and strips query strings', () => {
      const networkUrl = 'https://bouxre-api.cloudzyro.app/api/bolu-chat?token=secret123&session=999'
      expect(sanitizeUrl(networkUrl)).toBe('https://bouxre-api.cloudzyro.app/api/bolu-chat')
    })
  })

  // --------------------------------------------------------------------------
  // 7. Exception Messages Sanitization
  // --------------------------------------------------------------------------
  describe('7. Exception Messages Sanitization', () => {
    it('preserves technical error classification while redacting PII and commercial values', () => {
      const technicalMsg = "TypeError: Cannot read properties of undefined (reading 'map')"
      expect(scrubText(technicalMsg)).toBe(technicalMsg)

      const networkMsg = 'NetworkError: Failed to fetch at https://bouxre-api.cloudzyro.app/api/bolu-chat'
      expect(scrubText(networkMsg)).toBe(networkMsg)
    })

    it('redacts JWTs, Bearer tokens, emails, and Nigerian phone numbers', () => {
      const msg = 'Auth failure with token eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoxfQ.sig and Bearer sbp_abc123 for user admin@bouxre.ng (tel: 08031234567)'
      const cleaned = scrubText(msg)
      expect(cleaned).toContain('[REDACTED_JWT]')
      expect(cleaned).toContain('Bearer [REDACTED_TOKEN]')
      expect(cleaned).toContain('[REDACTED_EMAIL]')
      expect(cleaned).toContain('[REDACTED_PHONE]')
      expect(cleaned).not.toContain('admin@bouxre.ng')
      expect(cleaned).not.toContain('08031234567')
    })

    it('redacts document numbers, currency amounts, tenant schemas, and UUIDs', () => {
      const msg = 'Failed to persist invoice INV-2026-9900 totaling ₦250,000 for tenant_acme_corp with UUID 550e8400-e29b-41d4-a716-446655440000'
      const cleaned = scrubText(msg)
      expect(cleaned).toContain('[REDACTED_DOC_NUMBER]')
      expect(cleaned).toContain('[REDACTED_AMOUNT]')
      expect(cleaned).toContain('[REDACTED_TENANT]')
      expect(cleaned).toContain('[REDACTED_UUID]')
      expect(cleaned).not.toContain('INV-2026-9900')
      expect(cleaned).not.toContain('₦250,000')
      expect(cleaned).not.toContain('tenant_acme_corp')
    })
  })

  // --------------------------------------------------------------------------
  // 8. URL Privacy & Route Normalization
  // --------------------------------------------------------------------------
  describe('8. URL Privacy & Route Normalization', () => {
    it('normalizes UUID path segments to :id', () => {
      const path = '/clients/550e8400-e29b-41d4-a716-446655440000'
      expect(sanitizeUrl(path)).toBe('/clients/:id')
    })

    it('normalizes document identifiers in path to :[doc_number]', () => {
      const path = '/quotations/QTN-2026-0001'
      expect(sanitizeUrl(path)).toBe('/quotations/:[doc_number]')
    })

    it('normalizes tenant schemas in path to :[tenant]', () => {
      const path = '/tenant_manufacturing_corp/settings'
      expect(sanitizeUrl(path)).toBe('/:[tenant]/settings')
    })
  })
})
