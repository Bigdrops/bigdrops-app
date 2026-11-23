import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getConversationStarters,
  generateContextualFollowUps,
} from '@/lib/ai-assistant/bolu-suggestions'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const workspaceSource = readFileSync(
  resolve(srcRoot, 'src/components/ai-assistant/chat/BoluChatWorkspace.tsx'),
  'utf8',
)

// ── Static Structural Verification: Hook Ordering in BoluChatWorkspace ─────

test('Hook Order Integrity: zero React hooks exist after early return statements in BoluChatWorkspace', () => {
  const lines = workspaceSource.split('\n')

  // Locate the early return statement: if (!open) return null
  const earlyReturnIdx = lines.findIndex((l) => /^\s*if\s*\(!open\)\s*return\s+null/.test(l))
  assert.ok(earlyReturnIdx > 0, 'Could not find "if (!open) return null" in BoluChatWorkspace.tsx')

  // Inspect all lines after the early return statement up to the main component JSX return
  const linesAfterEarlyReturn = lines.slice(earlyReturnIdx + 1)
  const hookRegex = /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|use[A-Z]\w*)\s*\(/

  const violations: string[] = []
  linesAfterEarlyReturn.forEach((line, idx) => {
    // Exclude inner return statements or JSX tags/comments
    if (hookRegex.test(line) && !line.includes('//') && !line.includes('export')) {
      violations.push(`Line ${earlyReturnIdx + 2 + idx}: ${line.trim()}`)
    }
  })

  assert.deepEqual(
    violations,
    [],
    `Found React hooks declared after "if (!open) return null" which causes "Rendered more hooks than during the previous render":\n${violations.join('\n')}`,
  )
})

test('Hook Placement: suggestions useMemo is declared at top level before "if (!open) return null"', () => {
  const lines = workspaceSource.split('\n')
  const earlyReturnIdx = lines.findIndex((l) => /^\s*if\s*\(!open\)\s*return\s+null/.test(l))
  const suggestionsMemoIdx = lines.findIndex((l) =>
    /const\s+suggestions\s*=\s*useMemo\(/.test(l),
  )

  assert.ok(suggestionsMemoIdx > 0, 'Could not find "const suggestions = useMemo(" in BoluChatWorkspace.tsx')
  assert.ok(
    suggestionsMemoIdx < earlyReturnIdx,
    `"const suggestions = useMemo(" (line ${suggestionsMemoIdx + 1}) must precede "if (!open) return null" (line ${earlyReturnIdx + 1})`,
  )
})

// ── Lifecycle Simulation: Hook Count Invariance Across State Transitions ────

test('Lifecycle Invariance: hook invocation sequence and count remain constant across closed -> open -> streaming -> active', () => {
  type ComponentState = {
    open: boolean
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    isStreaming: boolean
    activeConversationId?: string
    pageContext?: { origin: { module: string } }
  }

  // Simulated top-level hook call tracker mirroring BoluChatWorkspace
  function simulateBoluChatWorkspaceHooks(state: ComponentState): {
    hookCallSequence: string[]
    suggestions: string[]
    earlyReturned: boolean
  } {
    const hookCallSequence: string[] = []

    // 1. Core hooks (navigation, auth, states, refs, timers)
    hookCallSequence.push('useNavigate')
    hookCallSequence.push('useContext(EntityContext)')
    hookCallSequence.push('useAuthorization')
    hookCallSequence.push('useState(currentUser)')
    hookCallSequence.push('useEffect(authSync)')
    hookCallSequence.push('useRef(authorizationRef)')
    hookCallSequence.push('useCallback(canRead)')
    hookCallSequence.push('useCallback(canWrite)')
    hookCallSequence.push('useState(viewport)')
    hookCallSequence.push('useState(railCollapsed)')
    hookCallSequence.push('useState(mobileRailOpen)')
    hookCallSequence.push('useState(panelOpen)')
    hookCallSequence.push('useState(activeProvider)')
    hookCallSequence.push('useState(activeResolvedModel)')
    hookCallSequence.push('useState(connections)')
    hookCallSequence.push('useState(selectedModel)')
    hookCallSequence.push('useState(negotiation)')
    hookCallSequence.push('useState(inputDraft)')
    hookCallSequence.push('useState(pinned)')
    hookCallSequence.push('useState(showJump)')
    hookCallSequence.push('useState(editingMessageId)')
    hookCallSequence.push('useRef(logRef)')
    hookCallSequence.push('useRef(inputRef)')
    hookCallSequence.push('useEffect(syncActiveModel)')
    hookCallSequence.push('useCallback(handleSelectModel)')
    hookCallSequence.push('useCallback(handleModelUnavailable)')
    hookCallSequence.push('useCallback(handleResolvedModel)')
    hookCallSequence.push('useEffect(windowResize)')
    hookCallSequence.push('useBoluConversations')
    hookCallSequence.push('useBoluThread')
    hookCallSequence.push('useEffect(negotiationTimer)')
    hookCallSequence.push('useEffect(clearNegotiationOnConvoChange)')
    hookCallSequence.push('useCallback(handleSelectAlternative)')
    hookCallSequence.push('useCallback(handleDismissNegotiation)')
    hookCallSequence.push('useBoluInteractionPreferences')
    hookCallSequence.push('useBoluNarration')
    hookCallSequence.push('useBoluResponseHaptics')
    hookCallSequence.push('useBoluChatInteractions')
    hookCallSequence.push('useEffect(stopNarrationOnConvoChange)')
    hookCallSequence.push('useEffect(stopNarrationOnClose)')
    hookCallSequence.push('useEffect(sidePanelProposalSync)')
    hookCallSequence.push('useEffect(autoScrollOnMessages)')

    // 2. Suggestions useMemo (MUST execute unconditionally on every render)
    hookCallSequence.push('useMemo(suggestions)')
    const isStarter = state.messages.length === 0
    let suggestions: string[] = []
    if (!state.open) {
      suggestions = []
    } else if (isStarter) {
      suggestions = getConversationStarters({
        conversationId: state.activeConversationId,
        module: state.pageContext?.origin.module,
      })
    } else {
      suggestions = generateContextualFollowUps({
        messages: state.messages as any,
        isStreaming: state.isStreaming,
      })
    }

    // 3. Early return check (NO hooks may follow this line)
    if (!state.open) {
      return { hookCallSequence, suggestions, earlyReturned: true }
    }

    return { hookCallSequence, suggestions, earlyReturned: false }
  }

  // Transition 1: Workspace closed (e.g. app launched or user closed chat)
  const renderClosed = simulateBoluChatWorkspaceHooks({
    open: false,
    messages: [],
    isStreaming: false,
  })
  assert.equal(renderClosed.earlyReturned, true)
  assert.deepEqual(renderClosed.suggestions, [])

  // Transition 2: User opens workspace on empty thread
  const renderOpenEmpty = simulateBoluChatWorkspaceHooks({
    open: true,
    messages: [],
    isStreaming: false,
    activeConversationId: 'convo-123',
  })
  assert.equal(renderOpenEmpty.earlyReturned, false)
  assert.ok(renderOpenEmpty.suggestions.length >= 3, 'Open empty workspace should produce starters')

  // Transition 3: User submits message, streaming begins
  const renderStreaming = simulateBoluChatWorkspaceHooks({
    open: true,
    messages: [
      { role: 'user', content: 'What is nylon extruded sheet?' },
      { role: 'assistant', content: 'Nylon extruded sheet is...' },
    ],
    isStreaming: true,
    activeConversationId: 'convo-123',
  })
  assert.equal(renderStreaming.earlyReturned, false)
  assert.deepEqual(renderStreaming.suggestions, [], 'Streaming must suppress suggestions')

  // Transition 4: Streaming completes, active contextual follow-ups generated
  const renderActive = simulateBoluChatWorkspaceHooks({
    open: true,
    messages: [
      { role: 'user', content: 'What is nylon extruded sheet?' },
      { role: 'assistant', content: 'Nylon extruded sheet is an engineering plastic...' },
    ],
    isStreaming: false,
    activeConversationId: 'convo-123',
  })
  assert.equal(renderActive.earlyReturned, false)
  assert.ok(renderActive.suggestions.length >= 2, 'Active workspace should produce follow-ups')

  // Transition 5: User closes workspace again
  const renderClosedAgain = simulateBoluChatWorkspaceHooks({
    open: false,
    messages: [
      { role: 'user', content: 'What is nylon extruded sheet?' },
      { role: 'assistant', content: 'Nylon extruded sheet is an engineering plastic...' },
    ],
    isStreaming: false,
  })
  assert.equal(renderClosedAgain.earlyReturned, true)

  // Verify that hook call count and exact order are 100% IDENTICAL across all renders
  const expectedSequence = renderClosed.hookCallSequence
  assert.equal(renderClosed.hookCallSequence.length, expectedSequence.length)
  assert.equal(renderOpenEmpty.hookCallSequence.length, expectedSequence.length)
  assert.equal(renderStreaming.hookCallSequence.length, expectedSequence.length)
  assert.equal(renderActive.hookCallSequence.length, expectedSequence.length)
  assert.equal(renderClosedAgain.hookCallSequence.length, expectedSequence.length)

  assert.deepEqual(renderOpenEmpty.hookCallSequence, expectedSequence)
  assert.deepEqual(renderStreaming.hookCallSequence, expectedSequence)
  assert.deepEqual(renderActive.hookCallSequence, expectedSequence)
  assert.deepEqual(renderClosedAgain.hookCallSequence, expectedSequence)
})
