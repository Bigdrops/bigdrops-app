/**
 * bolu-mock-provider.ts — Deterministic Mock Provider for Bolu
 *
 * Provides deterministic, reproducible responses for application-side testing
 * and development without any external AI provider, API key, or live network connection.
 *
 * Implements fixtures for:
 * 1. Authorized record retrieval
 * 2. Invoice creation intent
 * 3. Missing required fields
 * 4. Valid creation proposal
 * 5. Valid modification proposal
 * 6. Invalid operation payload
 * 7. Unauthorized record
 * 8. Stale proposal
 * 9. Rejected proposal
 * 10. Confirmed persistence
 * 11. Persistence failure
 * 12. Duplicate submission
 */

import type { BoluProviderMessage } from './bolu-provider.js'

export type MockScenario =
  | 'authorized-record-retrieval'
  | 'invoice-creation-intent'
  | 'missing-required-fields'
  | 'valid-creation-proposal'
  | 'valid-modification-proposal'
  | 'invalid-operation-payload'
  | 'unauthorized-record'
  | 'stale-proposal'
  | 'rejected-proposal'
  | 'confirmed-persistence'
  | 'persistence-failure'
  | 'duplicate-submission'

export interface MockProviderOptions {
  scenario?: MockScenario
  customResponse?: string
  streamDelayMs?: number
}

export const DETERMINISTIC_FIXTURES: Record<MockScenario, { text: string; description: string }> = {
  'authorized-record-retrieval': {
    description: 'Retrieval of authorized records',
    text: 'Here are the details for invoice INV-000100 for Dangote Group. Issue date: 2026-11-01, Total: ₦450,000.00, Balance due: ₦0.00 (Status: Paid).',
  },
  'invoice-creation-intent': {
    description: 'User expresses invoice creation intent; assistant prompts for missing details',
    text: 'I can help you create a new invoice. Please provide the customer name and at least one line item (including description, quantity, and unit price).',
  },
  'missing-required-fields': {
    description: 'Customer specified but missing line items or pricing',
    text: 'I have recorded the customer as "Dangote Industries Ltd". Please specify the line items: item description, quantity, and unit price so I can prepare the invoice proposal.',
  },
  'valid-creation-proposal': {
    description: 'Assistant produces a valid structured creation proposal',
    text: `I have prepared a draft invoice proposal for **Dangote Industries Ltd**.

\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "invoice",
    "payload": {
      "client_name": "Dangote Industries Ltd",
      "items": [
        {
          "description": "Premium Portland Cement (50kg)",
          "quantity": 100,
          "unit_price": 8500
        },
        {
          "description": "Transportation & Offloading",
          "quantity": 1,
          "unit_price": 50000
        }
      ],
      "issue_date": "2026-11-14",
      "due_date": "2026-12-14",
      "notes": "Delivery to Ikeja Warehouse",
      "payment_terms": "Net 30"
    }
  }
}
\`\`\`

Please review the proposed invoice and approve to update your working document.`,
  },
  'valid-modification-proposal': {
    description: 'Assistant produces a valid structured modification proposal for an existing document',
    text: `I have prepared a change proposal for invoice **INV-000100**.

\`\`\`json
{
  "bolu_operation": {
    "operationType": "modify-document",
    "documentFamily": "invoice",
    "payload": {
      "documentId": "123e4567-e89b-12d3-a456-426614174000",
      "field": "notes",
      "oldValue": "Standard terms",
      "newValue": "Urgent delivery requested by customer; payment on delivery."
    }
  }
}
\`\`\`

Please review the proposed change before applying it to the document.`,
  },
  'invalid-operation-payload': {
    description: 'Assistant returns an invalid payload (e.g., negative quantity, missing description)',
    text: `\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "invoice",
    "payload": {
      "client_name": "",
      "items": [
        {
          "description": "",
          "quantity": -5,
          "unit_price": -100
        }
      ]
    }
  }
}
\`\`\``,
  },
  'unauthorized-record': {
    description: 'Assistant attempting to access an unauthorized or isolated tenant record',
    text: 'Access Denied: You do not have permission to access or modify records from that business entity.',
  },
  'stale-proposal': {
    description: 'A proposal that has been superseded or expired',
    text: 'The proposal is stale because the underlying invoice has already been modified or the 15-minute review window has passed.',
  },
  'rejected-proposal': {
    description: 'Notification when proposal is rejected',
    text: 'The proposed operation was rejected. No changes were applied to your business document or working state.',
  },
  'confirmed-persistence': {
    description: 'Confirmation that the document was successfully persisted',
    text: 'Document has been successfully saved to your business records. Invoice number: INV-000101.',
  },
  'persistence-failure': {
    description: 'Persistence service encounters an error',
    text: 'Error saving document: Database constraint violation on invoice_number. Document was not saved.',
  },
  'duplicate-submission': {
    description: 'Attempting to re-submit an already persisted operation',
    text: 'Operation rejected: This proposal has already been executed. Duplicate submissions are not permitted.',
  },
}

/**
 * Creates a deterministic mock provider function compatible with `sendBoluProviderRequest`.
 */
export function createDeterministicMockProvider(options: MockProviderOptions = {}) {
  return async function mockProviderSend(params: {
    messages: BoluProviderMessage[]
    contextFacts?: string
    signal?: AbortSignal
    onDelta?: (delta: string) => void
  }): Promise<{ text: string }> {
    // Check abort signal
    if (params.signal?.aborted) {
      throw new Error('AbortError')
    }

    let scenario: MockScenario = options.scenario ?? 'authorized-record-retrieval'

    // If no explicit scenario was passed, infer from latest message text
    if (!options.scenario && params.messages.length > 0) {
      const lastUser = [...params.messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? ''

      if (lastUser.includes('invalid') || lastUser.includes('malformed')) {
        scenario = 'invalid-operation-payload'
      } else if (lastUser.includes('change') || lastUser.includes('modify') || lastUser.includes('update notes')) {
        scenario = 'valid-modification-proposal'
      } else if (lastUser.includes('create invoice') && (lastUser.includes('cement') || lastUser.includes('dangote'))) {
        scenario = 'valid-creation-proposal'
      } else if (lastUser.includes('create') && lastUser.includes('invoice')) {
        scenario = 'missing-required-fields'
      } else if (lastUser.includes('unauthorized')) {
        scenario = 'unauthorized-record'
      }
    }

    const responseText = options.customResponse ?? DETERMINISTIC_FIXTURES[scenario].text

    // Simulate streaming chunks if onDelta is provided
    if (params.onDelta) {
      const words = responseText.split(' ')
      for (const word of words) {
        if (params.signal?.aborted) throw new Error('AbortError')
        params.onDelta(`${word} `)
        if (options.streamDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, options.streamDelayMs))
        }
      }
    }

    return { text: responseText }
  }
}
