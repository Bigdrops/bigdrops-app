import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  initialProviderEntries,
  seedProviderEntries,
  syncEntriesWithBackend,
  providerStatus,
} from '@/components/ai-assistant/chat/assistant-chat-providers'
import type { ProviderStatusResponse } from '@/pages/settings/bolu-provider/api'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Bolu UI State Remediation & Lazy Threading', () => {
  it('initialProviderEntries and seedProviderEntries contain zero mock API keys', () => {
    const initial = initialProviderEntries()
    const seeded = seedProviderEntries()

    for (const entry of initial) {
      assert.strictEqual(entry.key, '')
      assert.strictEqual(entry.tested.status, 'idle')
    }

    for (const entry of seeded) {
      assert.strictEqual(entry.key, '')
      assert.notStrictEqual(entry.key, 'rc-token-configured')
      assert.notStrictEqual(entry.key, 'sk-or-active')
    }
  })

  it('syncEntriesWithBackend sets active provider and configured keys from backend status', () => {
    const mockStatus: ProviderStatusResponse = {
      connections: [
        {
          id: 'conn-1',
          providerId: 'openrouter',
          name: 'Main OpenRouter',
          protocol: 'openai',
          authScheme: 'bearer',
          baseUrl: 'https://openrouter.ai/api/v1',
          model: 'openrouter/free',
          timeoutMs: 30000,
          maskedKey: 'sk-or-••••••••1234',
          isEnabled: true,
          verificationStatus: 'verified',
          lastVerifiedAt: new Date().toISOString(),
          lastTestStatus: 200,
          lastTestMessage: 'Connected & active',
          discoveredModels: [{ id: 'openrouter/free', label: 'Free Router' }],
          modelsFetchedAt: new Date().toISOString(),
          allowedModels: [],
          inPool: true,
          priority: 1,
          isPaidTier: false,
          healthStatus: 'healthy',
          accountCooldownUntil: null,
          modelCooldowns: {},
          consecutiveFailures: 0,
          lastErrorCode: null,
          lastErrorMessage: null,
          lastSuccessAt: null,
          lastFailureAt: null,
          lastSelectedAt: null,
          totalSelections: 0,
          totalRequestsStarted: 0,
          totalSuccessfulRequests: 0,
          totalTokens: 0,
          knownBalanceAmount: null,
          knownBalanceCurrency: 'USD',
          knownBalanceUsd: null,
          balanceSource: 'unsupported',
          balanceUpdatedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      routing: {
        primaryConnectionId: 'conn-1',
        fallbackEnabled: false,
        fallbackConnectionIds: [],
      },
      schemaReady: true,
      runtime: {
        source: 'connection',
        primaryConnectionId: 'conn-1',
        provider: 'openrouter',
        model: 'openrouter/free',
      },
      inApp: { configured: true },
      activeSource: 'connection',
      envFallback: { configured: false },
    }

    const initial = initialProviderEntries()
    const { entries, activeId } = syncEntriesWithBackend(initial, mockStatus)

    assert.strictEqual(activeId, 'openrouter')
    const openRouterEntry = entries.find((e) => e.id === 'openrouter')
    assert.ok(openRouterEntry)
    assert.strictEqual(openRouterEntry?.key, 'sk-or-••••••••1234')
    assert.strictEqual(openRouterEntry?.tested.status, 'ok')

    const status = providerStatus(openRouterEntry!, activeId)
    assert.strictEqual(status, 'active')
  })

  it('assistant-chat.css suppresses scrollbars on suggestion chips', () => {
    const cssPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat.css')
    const css = readFileSync(cssPath, 'utf8')

    assert.ok(css.includes('.ac-compose-pills'))
    assert.ok(css.includes('scrollbar-width: none;'))
    assert.ok(css.includes('::-webkit-scrollbar'))
  })

  it('assistant-chat-thread.tsx removes human vector portrait from empty state and message turns', () => {
    const threadPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-thread.tsx')
    const threadSrc = readFileSync(threadPath, 'utf8')

    // ClerkAvatar must not be imported or rendered in assistant-chat-thread
    assert.ok(!threadSrc.includes('<ClerkAvatar'))
    assert.ok(!threadSrc.includes('import { ClerkAvatar }'))

    // BoluOrbIdentity and BoluOrbInline must be present
    assert.ok(threadSrc.includes('<BoluOrbIdentity'))
    assert.ok(threadSrc.includes('<BoluOrbInline'))
  })

  it('BoluChatWorkspace.tsx enforces h-[100dvh] dynamic mobile viewport sizing', () => {
    const workspacePath = join(process.cwd(), 'src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
    const workspaceSrc = readFileSync(workspacePath, 'utf8')

    assert.ok(workspaceSrc.includes('h-[100dvh]'))
    assert.ok(workspaceSrc.includes('max-h-[100dvh]'))
    assert.ok(workspaceSrc.includes('md:max-h-[96vh]'))
  })

  it('BoluChatWorkspace.tsx purges ViewportPicker debugger and inline ProviderSettings', () => {
    const workspacePath = join(process.cwd(), 'src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
    const workspaceSrc = readFileSync(workspacePath, 'utf8')

    // ViewportPicker debugger bar must be deleted
    assert.ok(!workspaceSrc.includes('<ViewportPicker'))
    assert.ok(!workspaceSrc.includes('Viewport Mode (DEC-26)'))
    assert.ok(!workspaceSrc.includes('Reset to Auto'))

    // ProviderSettings inline modal must be deleted
    assert.ok(!workspaceSrc.includes('<ProviderSettings'))
    assert.ok(!workspaceSrc.includes('settingsOpen'))
  })

  it('useBoluThread.ts preserves failed assistant turn with status "failed" instead of dropping it', () => {
    const threadHookPath = join(process.cwd(), 'src/lib/ai-assistant/hooks/useBoluThread.ts')
    const threadHookSrc = readFileSync(threadHookPath, 'utf8')

    // Must NOT drop the assistant turn by filtering it out
    assert.ok(!threadHookSrc.includes('prev.filter((m) => m.id !== tempAssistantId)'))

    // Must mark with status: 'failed'. The stream loop lives in
    // bolu-generation.ts so the hook stays under the 600-line limit.
    const generationSrc = readFileSync(
      join(process.cwd(), 'src/lib/ai-assistant/bolu-generation.ts'),
      'utf8',
    )
    assert.ok(generationSrc.includes("status: 'failed'"))
    assert.ok(!generationSrc.includes('prev.filter((m) => m.id !== tempAssistantId)'))
  })

  it('assistant-chat-thread.tsx renders visible error alert for failed messages', () => {
    const threadPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-thread.tsx')
    const threadSrc = readFileSync(threadPath, 'utf8')

    assert.ok(threadSrc.includes("message.status === 'failed'"))
    assert.ok(threadSrc.includes('border-rose-500/30'))
    assert.ok(threadSrc.includes('Request Failed'))
  })
})
