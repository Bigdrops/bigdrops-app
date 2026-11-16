import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import type { ProductionBoluMessage } from '@/lib/ai-assistant/hooks/types'
import { exportChatAsMarkdown, exportChatAsJson } from '@/lib/ai-assistant/bolu-export'

test('Bolu Operational Remediation: Chat Export Utility functions exist and produce clean payloads', () => {
  assert.equal(typeof exportChatAsMarkdown, 'function')
  assert.equal(typeof exportChatAsJson, 'function')

  const sampleMessages: ProductionBoluMessage[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      role: 'user',
      content: 'Create an invoice for Solwood with 5 cable lugs at ₦9,500 each',
      status: 'completed',
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      role: 'assistant',
      content: 'I have prepared a draft invoice for Solwood.',
      status: 'completed',
      proposal: {
        opId: 'op-123',
        operationType: 'create-document',
        documentFamily: 'invoice',
        schemaVersion: '1.0',
        requiredPermission: { resource: 'invoice', action: 'save' },
        sideEffect: 'persistence',
        gate1Required: true,
        gate2Required: true,
        status: 'approved_pending_save',
        createdAt: '2026-11-15T08:00:05Z',
        expiresAt: '2026-11-15T08:15:05Z',
        candidateNumber: 'INV-DRAFT',
        payload: {
          client_name: 'Solwood',
          client_id: 'client-123',
          items: [{ description: 'Cable lugs', quantity: 5, unit_price: 9500 }],
        },
        computedTotals: {
          subtotal: 47500,
          vat: 3562.5,
          total: 51062.5,
          wht: 0,
          items: [],
        },
      },
      createdAt: '2026-11-15T08:00:06Z',
      updatedAt: '2026-11-15T08:00:06Z',
    },
  ]

  // Mock document and URL for download simulation in Node/Bun environment
  const mockAnchor = { href: '', download: '', style: {}, click: () => {} }
  let createdBlob: Blob | null = null
  let createdFileName = ''

  const origDocument = globalThis.document
  const origUrl = globalThis.URL

  try {
    ;(globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'a') return mockAnchor
        return {}
      },
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    }
    ;(globalThis as any).URL = {
      createObjectURL: (blob: Blob) => {
        createdBlob = blob
        return 'blob:mock-url'
      },
      revokeObjectURL: () => {},
    }

    // Test Markdown Export
    exportChatAsMarkdown(sampleMessages, 'Solwood Invoice Conversation')
    assert.equal(mockAnchor.download.endsWith('.md'), true)
    assert.equal(mockAnchor.download.includes('solwood-invoice-conversation'), true)

    // Test JSON Export
    exportChatAsJson(sampleMessages, 'Solwood Invoice Conversation')
    assert.equal(mockAnchor.download.endsWith('.json'), true)
    assert.equal(mockAnchor.download.includes('solwood-invoice-conversation'), true)
  } finally {
    globalThis.document = origDocument
    globalThis.URL = origUrl
  }
})

test('Bolu Operational Remediation: BoluViewportStage is purged from BoluProviderSettingsSection.tsx', () => {
  const filePath = path.resolve('src/pages/settings/BoluProviderSettingsSection.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('BoluViewportStage'),
    false,
    'BoluViewportStage debugger must NOT be imported or used in BoluProviderSettingsSection.tsx',
  )
})

test('Bolu Operational Remediation: Redundant ModelSelectorModal and inline picker are purged from ConnectionCard.tsx', () => {
  const filePath = path.resolve('src/pages/settings/bolu-provider/ConnectionCard.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('ModelSelectorModal'),
    false,
    'ModelSelectorModal must NOT be rendered inside ConnectionCard.tsx',
  )
  assert.equal(
    content.includes('setModelPickerOpen'),
    false,
    'modelPickerOpen state must NOT exist inside ConnectionCard.tsx',
  )
  assert.equal(
    content.includes('Current'),
    false,
    'The redundant Current model pill button must NOT exist inside ConnectionCard.tsx',
  )
})

test('Bolu Operational Remediation: Close button in assistant-chat-chrome.tsx has unambiguous "Close" label and styling', () => {
  const filePath = path.resolve('src/components/ai-assistant/chat/assistant-chat-chrome.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('aria-label="Close Bolu Assistant"'),
    true,
    'Close button must have clear accessible aria-label',
  )
  assert.equal(
    content.includes('<span className="hidden sm:inline">Close</span>'),
    true,
    'Close button must render a visible "Close" label on sm viewports',
  )
  assert.equal(
    content.includes('MoreVertical'),
    true,
    'Export action menu must render MoreVertical ellipsis button',
  )
  assert.equal(
    content.includes('Export Markdown (.md)'),
    true,
    'Action menu must include Export Markdown (.md) option',
  )
  assert.equal(
    content.includes('Export JSON (.json)'),
    true,
    'Action menu must include Export JSON (.json) option',
  )
})

test('Bolu Operational Remediation: ProposalCardView handles "saving" state with disabled buttons and spinner', () => {
  const filePath = path.resolve('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('isSaving = proposal.status === \'saving\''),
    true,
    'ProposalCardView must detect proposal.status === "saving"',
  )
  assert.equal(
    content.includes('Saving to Database…'),
    true,
    'ProposalCardView must render "Saving to Database…" text while saving',
  )
  assert.equal(
    content.includes('disabled={isSaving}'),
    true,
    'Action buttons must be disabled while saving',
  )
})

test('Bolu Operational Remediation: useBoluThread.ts passes tenantClient and entityId for authoritative persistence', () => {
  const filePath = path.resolve('src/lib/ai-assistant/hooks/useBoluThread.ts')
  const content = fs.readFileSync(filePath, 'utf-8')
  // The provider turn moved to bolu-generation.ts to keep the hook under the
  // 600-line project limit; the behaviour is unchanged.
  const generation = fs.readFileSync(path.resolve('src/lib/ai-assistant/bolu-generation.ts'), 'utf-8')
  const turnSource = `${content}\n${generation}`

  assert.equal(
    turnSource.includes('validateBoluClient('),
    true,
    'the provider turn must validate the client against the database before emitting a create-document proposal',
  )
  assert.equal(
    content.includes('status: \'saving\''),
    true,
    'confirmGate2Save must set proposal.status = "saving" immediately for instant visual feedback',
  )
  assert.equal(
    content.includes('persistInvoiceCreation('),
    true,
    'confirmGate2Save must execute persistInvoiceCreation',
  )
})

test('Bolu Chat UX Polish: assistant-chat-thread.tsx strips raw JSON operations and em-dashes, and presents formal intro', () => {
  const filePath = path.resolve('src/components/ai-assistant/chat/assistant-chat-thread.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('Hello! I’m Bolu, your BOURXE business operations assistant'),
    true,
    'Empty state must render Bolu formal intro greeting',
  )
  assert.equal(
    content.includes('replace(/—/g, \' - \')'),
    true,
    'cleanAssistantProse must normalize em-dashes to standard spaced hyphens',
  )
  assert.equal(
    content.includes('bolu_operation'),
    true,
    'cleanAssistantProse must strip bolu_operation JSON blocks from prose',
  )
})

test('Bolu Chat UX Polish: assistant-chat-composer.tsx locks input during active inference and purges chip clutter', () => {
  const filePath = path.resolve('src/components/ai-assistant/chat/assistant-chat-composer.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('disabled?: boolean'),
    true,
    'AssistantComposer must accept a disabled prop',
  )
  assert.equal(
    content.includes('const isLocked = busy || Boolean(disabled)'),
    true,
    'Composer must compute isLocked based on busy or disabled prop',
  )
  assert.equal(
    content.includes('disabled={isLocked}'),
    true,
    'Textarea must be disabled when isLocked is true',
  )
  assert.equal(
    content.includes('suggestions.map'),
    false,
    'Composer bar must NOT render inline suggestion chips to prevent mobile clutter',
  )
})

test('Bolu Chat UX Polish: api/bolu-chat.ts explicitly forbids em-dashes in system instructions', () => {
  const filePath = path.resolve('api/bolu-chat.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(
    content.includes('NEVER use em-dashes ("—") or en-dashes ("–")'),
    true,
    'api/bolu-chat.ts must forbid em-dashes in SYSTEM_PREFIX and operational instructions',
  )
})
