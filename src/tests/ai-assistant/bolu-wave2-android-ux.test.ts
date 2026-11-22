import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeModelDisplayName, resolveModelPillDisplay } from '@/components/ai-assistant/chat/assistant-chat-model-pill'
import { formatResponseTiming } from '@/components/ai-assistant/chat/assistant-chat-thread'
import {
  formatConversationAsPlainText,
  copyConversationToClipboard,
  ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT,
} from '@/lib/ai-assistant/bolu-export'
import type { ProductionBoluMessage } from '@/components/ai-assistant/chat/types'

function createMockMessage(partial: Partial<ProductionBoluMessage>): ProductionBoluMessage {
  return {
    id: 'msg-' + Math.random().toString(36).slice(2, 8),
    conversationId: 'test-conv-1',
    tenantId: 'test-tenant-1',
    role: 'user',
    content: '',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}

// ============================================================================
// 1. MODEL NAME NORMALIZATION (STAGE A)
// ============================================================================

test('normalizeModelDisplayName: strips Google API models/ path prefix', () => {
  const result = normalizeModelDisplayName('models/gemini-2.5-flash')
  assert.equal(result, 'gemini-2.5-flash')
})

test('normalizeModelDisplayName: strips vendor namespace prefixes (google/, anthropic/, deepseek/)', () => {
  assert.equal(normalizeModelDisplayName('google/gemini-2.5-flash'), 'gemini-2.5-flash')
  assert.equal(normalizeModelDisplayName('anthropic/claude-3-5-sonnet'), 'claude-3-5-sonnet')
  assert.equal(normalizeModelDisplayName('deepseek/deepseek-chat'), 'deepseek-chat')
  assert.equal(normalizeModelDisplayName('meta-llama/llama-3.3-70b-instruct'), 'llama-3.3-70b-instruct')
})

test('normalizeModelDisplayName: strips vendor prefix when providerName matches namespace', () => {
  const result = normalizeModelDisplayName('openrouter/qwen-2.5-72b', undefined, 'OpenRouter Provider')
  assert.equal(result, 'qwen-2.5-72b')
})

test('normalizeModelDisplayName: strictly preserves distinct model identities without collision', () => {
  const flash = normalizeModelDisplayName('models/gemini-2.5-flash')
  const pro = normalizeModelDisplayName('models/gemini-2.5-pro')
  const sonnet = normalizeModelDisplayName('anthropic/claude-3-5-sonnet')
  const haiku = normalizeModelDisplayName('anthropic/claude-3-5-haiku')

  assert.equal(flash, 'gemini-2.5-flash')
  assert.equal(pro, 'gemini-2.5-pro')
  assert.notEqual(flash, pro)

  assert.equal(sonnet, 'claude-3-5-sonnet')
  assert.equal(haiku, 'claude-3-5-haiku')
  assert.notEqual(sonnet, haiku)
})

test('normalizeModelDisplayName: prefers clean human-friendly label when available and distinct', () => {
  const result = normalizeModelDisplayName('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B Instruct')
  assert.equal(result, 'Llama 3.3 70B Instruct')
})

test('normalizeModelDisplayName: handles empty or raw non-namespaced model strings gracefully', () => {
  assert.equal(normalizeModelDisplayName(''), '')
  assert.equal(normalizeModelDisplayName('gpt-4o'), 'gpt-4o')
})

test('resolveModelPillDisplay: Auto mode with no resolved model shows "Automatic routing", never primary connection model', () => {
  const display = resolveModelPillDisplay({
    isAuto: true,
    activeResolvedModel: null,
    activeProvider: {
      id: 'google-conn',
      label: 'Google Gemini',
      model: 'models/gemini-2.5-flash',
      isConfigured: true,
    },
  })

  assert.equal(display.providerLabel, 'Auto')
  assert.equal(display.modelLabel, 'Automatic routing')
  assert.equal(display.title, 'Auto · Automatic routing')
  assert.notEqual(display.modelLabel, 'gemini-2.5-flash')
})

test('resolveModelPillDisplay: Auto mode with genuine resolved model shows "Auto" and normalized model', () => {
  const display = resolveModelPillDisplay({
    isAuto: true,
    activeResolvedModel: 'models/gemini-2.5-flash',
    activeProvider: {
      id: 'google-conn',
      label: 'Google Gemini',
      model: 'models/gemini-2.5-flash',
      isConfigured: true,
    },
  })

  assert.equal(display.providerLabel, 'Auto')
  assert.equal(display.modelLabel, 'gemini-2.5-flash')
  assert.equal(display.title, 'Auto · gemini-2.5-flash')
})

test('resolveModelPillDisplay: Auto mode after a failed request maintains "Automatic routing" without premature model claim', () => {
  // If resolution failed or returned no model
  const display = resolveModelPillDisplay({
    isAuto: true,
    activeResolvedModel: null,
    activeProvider: {
      id: 'openrouter',
      label: 'OpenRouter',
      model: 'deepseek/deepseek-chat',
      isConfigured: true,
    },
  })

  assert.equal(display.providerLabel, 'Auto')
  assert.equal(display.modelLabel, 'Automatic routing')
})

test('resolveModelPillDisplay: Manual selection displays explicit connection and model names', () => {
  const display = resolveModelPillDisplay({
    isAuto: false,
    selectedModel: {
      connectionId: 'conn-anthropic',
      connectionName: 'Anthropic Direct',
      modelId: 'anthropic/claude-3-5-sonnet',
      modelName: 'Claude 3.5 Sonnet',
    },
  })

  assert.equal(display.providerLabel, 'Anthropic Direct')
  assert.equal(display.modelLabel, 'Claude 3.5 Sonnet')
  assert.equal(display.title, 'Claude 3.5 Sonnet')
})

test('resolveModelPillDisplay: Preserves custom provider and custom model identifiers', () => {
  const display = resolveModelPillDisplay({
    isAuto: false,
    selectedModel: {
      connectionId: 'custom-vllm',
      connectionName: 'Local vLLM Server',
      modelId: 'qwen-2.5-72b-instruct-fp8',
      modelName: 'qwen-2.5-72b-instruct-fp8',
    },
  })

  assert.equal(display.providerLabel, 'Local vLLM Server')
  assert.equal(display.modelLabel, 'qwen-2.5-72b-instruct-fp8')
  assert.equal(display.title, 'qwen-2.5-72b-instruct-fp8')
})

// ============================================================================
// 2. RESPONSE TIMING FORMATTING (STAGE B)
// ============================================================================

test('formatResponseTiming: formats valid timestamp and duration into local HH:mm · Xs', () => {
  const metadata = {
    completedAt: '2026-11-22T20:48:00.000Z',
    durationMs: 2400,
  }
  const result = formatResponseTiming(metadata)
  assert.ok(result, 'Result should not be null')
  // Matches "HH:mm · 2.4s"
  assert.match(result, /^\d{2}:\d{2} · 2\.4s$/)
})

test('formatResponseTiming: formats sub-second duration correctly', () => {
  const metadata = {
    completedAt: '2026-11-22T14:30:15.000Z',
    durationMs: 650,
  }
  const result = formatResponseTiming(metadata)
  assert.ok(result)
  assert.match(result, /^\d{2}:\d{2} · 0\.7s$/)
})

test('formatResponseTiming: returns null for historical messages missing timing metadata', () => {
  assert.equal(formatResponseTiming(null), null)
  assert.equal(formatResponseTiming(undefined), null)
  assert.equal(formatResponseTiming({}), null)
  assert.equal(formatResponseTiming({ completedAt: '2026-11-22T14:30:15.000Z' }), null)
  assert.equal(formatResponseTiming({ durationMs: 1500 }), null)
})

test('formatResponseTiming: returns null for invalid date string', () => {
  const result = formatResponseTiming({
    completedAt: 'invalid-date-string',
    durationMs: 1500,
  })
  assert.equal(result, null)
})

// ============================================================================
// 3. PLAIN TEXT CONVERSATION EXPORT (STAGE C)
// ============================================================================

test('formatConversationAsPlainText: formats User and Bolu dialogue with clean separation', () => {
  const messages: ProductionBoluMessage[] = [
    createMockMessage({
      id: 'm1',
      role: 'user',
      content: 'Hello Bolu, what is my outstanding balance for Dangote?',
      status: 'completed',
      createdAt: '2026-11-22T10:00:00.000Z',
    }),
    createMockMessage({
      id: 'm2',
      role: 'assistant',
      content: 'Dangote currently has an outstanding balance of ₦1,250,000 across 2 invoices.',
      status: 'completed',
      createdAt: '2026-11-22T10:00:02.000Z',
    }),
  ]

  const text = formatConversationAsPlainText(messages, 'Dangote Balance Check')
  assert.ok(text.includes('Dangote Balance Check'))
  assert.ok(text.includes('User'))
  assert.ok(text.includes('Hello Bolu, what is my outstanding balance for Dangote?'))
  assert.ok(text.includes('Bolu'))
  assert.ok(text.includes('Dangote currently has an outstanding balance of ₦1,250,000 across 2 invoices.'))
})

test('formatConversationAsPlainText: excludes system roles and non-dialogue payloads', () => {
  const messages: any[] = [
    createMockMessage({
      id: 'sys1',
      role: 'system',
      content: 'You are Bolu, the enterprise business assistant.',
      status: 'completed',
    }),
    createMockMessage({
      id: 'm1',
      role: 'user',
      content: 'Draft an invoice for 5 laptops.',
      status: 'completed',
    }),
  ]

  const text = formatConversationAsPlainText(messages, 'System Filter Test')
  assert.ok(!text.includes('You are Bolu, the enterprise business assistant.'))
  assert.ok(text.includes('Draft an invoice for 5 laptops.'))
})

test('formatConversationAsPlainText: includes document proposal summary without raw JSON', () => {
  const messages: ProductionBoluMessage[] = [
    createMockMessage({
      id: 'm1',
      role: 'user',
      content: 'Prepare an invoice for 10 bags of cement.',
      status: 'completed',
    }),
    createMockMessage({
      id: 'm2',
      role: 'assistant',
      content: 'I have prepared the invoice draft for you.',
      status: 'completed',
      proposal: {
        operationType: 'create-document',
        documentFamily: 'invoice',
        status: 'pending_approval',
        computedTotals: {
          subtotal: 100000,
          total: 107500,
        },
      } as any,
    }),
  ]

  const text = formatConversationAsPlainText(messages, 'Proposal Summary Test')
  assert.ok(text.includes('[Draft invoice · pending_approval (Total: ₦107,500)]'))
  assert.ok(!text.includes('"operationType"'))
  assert.ok(!text.includes('"computedTotals"'))
})

// ============================================================================
// 4. ANDROID BINDER CLIPBOARD LIMIT & FALLBACK (STAGE C)
// ============================================================================

test('ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT: strictly configured to 250 KB (256,000 bytes)', () => {
  assert.equal(ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT, 250 * 1024)
  assert.equal(ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT, 256000)
})

test('copyConversationToClipboard: safely triggers fallbackToExport when exceeding 250 KB', async () => {
  // Generate a large transcript that exceeds 250 KB
  const largeChunk = 'A'.repeat(50000)
  const messages: ProductionBoluMessage[] = [
    createMockMessage({ id: '1', role: 'user', content: largeChunk, status: 'completed' }),
    createMockMessage({ id: '2', role: 'assistant', content: largeChunk, status: 'completed' }),
    createMockMessage({ id: '3', role: 'user', content: largeChunk, status: 'completed' }),
    createMockMessage({ id: '4', role: 'assistant', content: largeChunk, status: 'completed' }),
    createMockMessage({ id: '5', role: 'user', content: largeChunk, status: 'completed' }),
    createMockMessage({ id: '6', role: 'assistant', content: largeChunk, status: 'completed' }),
  ]

  const result = await copyConversationToClipboard(messages, 'Large Transcript')
  assert.equal(result.success, false)
  assert.equal(result.fallbackToExport, true)
  assert.ok(result.byteLength > ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT)
  assert.match(result.error ?? '', /exceeds device clipboard safe limit \(250 KB\)/)
})

test('copyConversationToClipboard: returns failure for empty conversation', async () => {
  const result = await copyConversationToClipboard([], 'Empty Transcript')
  assert.equal(result.success, false)
  assert.equal(result.byteLength, 0)
  assert.match(result.error ?? '', /has no message content to copy/)
})

// ============================================================================
// 5. STOPPED AND INTERRUPTED STATE PRESENTATION (STAGE D)
// ============================================================================

test('Stopped turn: metadata flags isStopped and preserves partial content', () => {
  const stoppedTurn: ProductionBoluMessage = createMockMessage({
    id: 'turn-stopped-1',
    role: 'assistant',
    content: 'Here is the summary of sales for Q3: Total revenue reached ₦45,000,000 across...',
    status: 'stopped',
    metadata: {
      isStopped: true,
      stopReason: 'user_abort',
      completedAt: '2026-11-22T12:00:00.000Z',
      durationMs: 1200,
    },
  })

  assert.equal(stoppedTurn.metadata?.isStopped, true)
  assert.ok(stoppedTurn.content.startsWith('Here is the summary'))
  // Check that response timing can still format if duration is present
  const timing = formatResponseTiming(stoppedTurn.metadata)
  assert.ok(timing?.includes('1.2s'))
})

test('Interrupted turn: metadata flags isInterrupted with error and preserves clean partial prose', () => {
  const interruptedTurn: ProductionBoluMessage = createMockMessage({
    id: 'turn-interrupted-1',
    role: 'assistant',
    content: 'The inventory reconciliation for the Ikeja warehouse indicates 45 units remaining',
    status: 'failed',
    metadata: {
      isInterrupted: true,
      error: 'Network connection reset by peer',
      completedAt: '2026-11-22T12:05:00.000Z',
    },
  })

  assert.equal(interruptedTurn.metadata?.isInterrupted, true)
  assert.equal(interruptedTurn.metadata?.error, 'Network connection reset by peer')
  // The content itself must not contain ugly brackets or corrupt markdown
  assert.ok(!interruptedTurn.content.includes('[Generation interrupted'))
  assert.equal(interruptedTurn.content, 'The inventory reconciliation for the Ikeja warehouse indicates 45 units remaining')
})
