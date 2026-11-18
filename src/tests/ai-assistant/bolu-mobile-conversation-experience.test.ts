import { describe, it } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isGenericTitle, deriveConversationTitle } from '@/lib/ai-assistant/bolu-titles'

describe('Bolu 2.0 Mobile Conversation Experience & Title Derivation', () => {
  it('isGenericTitle correctly flags generic and empty titles', () => {
    assert.strictEqual(isGenericTitle(''), true)
    assert.strictEqual(isGenericTitle(null), true)
    assert.strictEqual(isGenericTitle(undefined), true)
    assert.strictEqual(isGenericTitle('New Conversation'), true)
    assert.strictEqual(isGenericTitle('new conversation'), true)
    assert.strictEqual(isGenericTitle('Untitled'), true)
    assert.strictEqual(isGenericTitle('bolu chat'), true)

    assert.strictEqual(isGenericTitle('Tecno Power Quotation'), false)
    assert.strictEqual(isGenericTitle('Add Transport ₦5,670'), false)
    assert.strictEqual(isGenericTitle('Outstanding Invoices'), false)
    assert.strictEqual(isGenericTitle('Cable supply inquiry'), false)
  })

  it('deriveConversationTitle derives topic-specific titles from user intents', () => {
    // 1. Transport addition intent
    const transportTitle = deriveConversationTitle('add transport 5670')
    assert.ok(transportTitle.includes('Transport'))
    assert.strictEqual(isGenericTitle(transportTitle), false)

    // 2. Quotation creation intent
    const quoteTitle = deriveConversationTitle('Create a quotation for Tecno Power')
    assert.strictEqual(quoteTitle, 'Tecno Power Quotation')

    // 3. Outstanding invoices intent
    const invTitle = deriveConversationTitle('Show me outstanding invoices')
    assert.strictEqual(invTitle, 'Outstanding Invoices')

    // 4. Balances intent
    const balanceTitle = deriveConversationTitle('Check recent client balances')
    assert.strictEqual(balanceTitle, 'Client Balances')

    // 5. Code & markdown cleanup in user message
    const messyTitle = deriveConversationTitle('```json\n{"op": 1}\n``` Create an invoice for ABC Logistics')
    assert.strictEqual(messyTitle, 'ABC Logistics Invoice')
  })

  it('deriveConversationTitle truncates long messages cleanly at word boundaries', () => {
    const longMsg = 'Please help me review our current monthly receivables from all retail distributors in Ikeja branch'
    const title = deriveConversationTitle(longMsg)
    assert.ok(title.length <= 48, `Title length ${title.length} exceeds 48 chars`)
    assert.ok(!title.endsWith(' '), 'Title should not have trailing whitespace')
    assert.strictEqual(isGenericTitle(title), false)
  })

  it('AssistantRail.tsx uses approved BxLogo and purges standalone "B" text avatar', () => {
    const railPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-rail.tsx')
    const railSrc = readFileSync(railPath, 'utf8')

    // BxLogo must be imported from '@/components/layout/bx-logo'
    assert.ok(railSrc.includes("import { BxLogo } from '@/components/layout/bx-logo'"))
    assert.ok(railSrc.includes('<BxLogo'))

    // The standalone "B" text avatar block must NOT exist
    assert.ok(!railSrc.includes('<span\n            className="size-7 rounded-lg bg-[var(--ac-accent)]/15 text-[var(--ac-accent)] flex items-center justify-center font-bold text-xs shrink-0 select-none"\n            aria-hidden="true"\n          >\n            B\n          </span>'))

    // Date grouping includes "Previous 7 days" and "Older"
    assert.ok(railSrc.includes("'Previous 7 days'"))
    assert.ok(railSrc.includes("'Older'"))

    // User avatar component with fallback must be rendered in account footer
    assert.ok(railSrc.includes('<Avatar'))
    assert.ok(railSrc.includes('<AvatarImage'))
    assert.ok(railSrc.includes('<AvatarFallback'))
  })

  it('InvoicePanel.tsx exposes Gate 1 Reject and Approve actions with shared handlers', () => {
    const panelPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-panel.tsx')
    const panelSrc = readFileSync(panelPath, 'utf8')

    // Gate 1 actions present
    assert.ok(panelSrc.includes('Reject Changes'))
    assert.ok(panelSrc.includes('Approve Changes (Gate 1)'))
    assert.ok(panelSrc.includes('onApproveGate1'))
    assert.ok(panelSrc.includes('onRejectGate1'))

    // Gate 2 actions present
    assert.ok(panelSrc.includes('Cancel Save'))
    assert.ok(panelSrc.includes('Confirm & Save (Gate 2)'))
    assert.ok(panelSrc.includes('onConfirmGate2'))
    assert.ok(panelSrc.includes('onCancelGate2'))

    // Duplicate submission prevention via submitting guard
    assert.ok(panelSrc.includes('const [submitting, setSubmitting] = useState(false)'))
    assert.ok(panelSrc.includes('if (!proposal || submitting) return'))
  })

  it('BoluChatWorkspace.tsx passes two-gate approval handlers to InvoicePanel', () => {
    const workspacePath = join(process.cwd(), 'src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
    const workspaceSrc = readFileSync(workspacePath, 'utf8')

    assert.ok(workspaceSrc.includes('onApproveGate1={approveGate1}'))
    assert.ok(workspaceSrc.includes('onRejectGate1={rejectGate1}'))
    assert.ok(workspaceSrc.includes('onConfirmGate2={confirmGate2Save}'))
    assert.ok(workspaceSrc.includes('onCancelGate2={cancelGate2Save}'))

    // Mobile sheet container uses max-h-[85dvh] instead of rigid h-[85%]
    assert.ok(workspaceSrc.includes('max-h-[85dvh]'))
    assert.ok(!workspaceSrc.includes('h-[85%] max-h-[640px]'))
  })

  it('assistant-chat.css & thread enforce compact avatar gutter and full text width', () => {
    const cssPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat.css')
    const css = readFileSync(cssPath, 'utf8')

    assert.ok(css.includes('.ac-turn {'))
    assert.ok(css.includes('display: flow-root;'))
    assert.ok(css.includes('width: 100%;'))
    assert.ok(css.includes('.ac-turn-avatar {'))
    assert.ok(css.includes('float: left;'))
    assert.ok(css.includes('.ac-turn-body {'))
    assert.ok(css.includes('min-width: 0;'))
    assert.ok(css.includes('.ac-md {'))
    assert.ok(css.includes('display: block;'))
    assert.ok(css.includes('.ac-card {'))
    assert.ok(css.includes('clear: both;'))
    assert.ok(css.includes('.ac-md-table-wrap {'))

    const threadPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-thread.tsx')
    const threadSrc = readFileSync(threadPath, 'utf8')

    // Compact avatar size-7 (28px) shrink-0
    assert.ok(threadSrc.includes('ac-turn-avatar flex items-center justify-center size-7 rounded-full'))
    assert.ok(threadSrc.includes('<Sparkles className="size-3.5 text-[var(--ac-accent)]"'))
  })

  it('BoluFloatingActionButton provides draggable positioning with boundary clamping, persistence, and tap disambiguation', () => {
    const fabPath = join(process.cwd(), 'src/components/ai-assistant/BoluFloatingActionButton.tsx')
    const fabSrc = readFileSync(fabPath, 'utf8')

    assert.ok(fabSrc.includes("STORAGE_KEY = 'bolu_fab_position:v1'"))
    assert.ok(fabSrc.includes('DRAG_THRESHOLD = 6'))
    assert.ok(fabSrc.includes('clampPosition('))
    assert.ok(fabSrc.includes('handlePointerDown'))
    assert.ok(fabSrc.includes('handlePointerMove'))
    assert.ok(fabSrc.includes('handlePointerUp'))
    assert.ok(fabSrc.includes('handleKeyDown'))
    assert.ok(fabSrc.includes("open('future-fab')"))
  })

  it('Gate 1 & Gate 2 operations provide visible feedback and double-submission protection', () => {
    const partsPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-parts.tsx')
    const partsSrc = readFileSync(partsPath, 'utf8')

    assert.ok(partsSrc.includes('const [submittingGate1, setSubmittingGate1] = useState(false)'))
    assert.ok(partsSrc.includes('disabled={submittingGate1}'))

    const hookPath = join(process.cwd(), 'src/lib/ai-assistant/hooks/useBoluThread.ts')
    const hookSrc = readFileSync(hookPath, 'utf8')

    assert.ok(hookSrc.includes("import { feedback } from '@/lib/feedback'"))
    assert.ok(hookSrc.includes("feedback.success('Changes approved (Gate 1)'"))
    assert.ok(hookSrc.includes("feedback.info('Changes rejected'"))
    assert.ok(hookSrc.includes("feedback.success('Document saved'"))
  })

  it('Drawer geometry eliminates blank white gap and styles active thread', () => {
    const railPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat-rail.tsx')
    const railSrc = readFileSync(railPath, 'utf8')

    assert.ok(railSrc.includes("data-mobile-drawer={isMobileDrawer ? 'true' : undefined}"))
    assert.ok(railSrc.includes('isMobileDrawer'))
    assert.ok(railSrc.includes('border border-[var(--ac-accent-line)]'))

    const workspacePath = join(process.cwd(), 'src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
    const workspaceSrc = readFileSync(workspacePath, 'utf8')

    assert.ok(workspaceSrc.includes('bg-[var(--ac-muted-surface)] shadow-2xl flex flex-col border-r border-[var(--ac-line)] overflow-hidden'))

    const cssPath = join(process.cwd(), 'src/components/ai-assistant/chat/assistant-chat.css')
    const css = readFileSync(cssPath, 'utf8')
    assert.ok(css.includes(".ac-rail[data-mobile-drawer='true'] {"))
  })

  it('ConnectionDialog.tsx enforces mobile viewport geometry, structural responsive layout and intrinsic sizing', () => {
    const dialogPath = join(process.cwd(), 'src/pages/settings/bolu-provider/ConnectionDialog.tsx')
    const dialogSrc = readFileSync(dialogPath, 'utf8')

    // Dialog container must have viewport calculation, min-w-0, box-border, and max-h-[90dvh]
    assert.ok(dialogSrc.includes('w-[calc(100vw-2rem)] max-w-lg min-w-0 box-border'))
    assert.ok(dialogSrc.includes('max-h-[90dvh]'))
    assert.ok(dialogSrc.includes('overflow-y-auto'))
    assert.ok(dialogSrc.includes('overflow-x-hidden'))
    assert.ok(dialogSrc.includes('overscroll-contain'))

    // DialogHeader must reserve clearance for the close button
    assert.ok(dialogSrc.includes('pr-8 sm:pr-10'))
    assert.ok(dialogSrc.includes('break-words'))

    // Target Model header must wrap on narrow mobile viewports
    assert.ok(dialogSrc.includes('flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 min-w-0 w-full'))

    // Form grids must collapse to single column on mobile (grid-cols-1 sm:grid-cols-2)
    assert.ok(dialogSrc.includes('grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-bd-border/50 min-w-0 w-full box-border'))
    assert.ok(dialogSrc.includes('grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full box-border'))

    // Provider select and select triggers must constrain min-w-0 and prevent blowout
    assert.ok(dialogSrc.includes('SelectTrigger className="w-full min-w-0 max-w-full box-border [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"'))
    assert.ok(dialogSrc.includes('Custom endpoint (OpenAI / Anthropic compatible)'))

    // Footer actions must be responsive and stack full-width on mobile
    assert.ok(dialogSrc.includes('flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center pt-3 min-w-0 w-full box-border'))
  })

  it('shared dialog.tsx and select.tsx enforce min-w-0 and truncation at component root', () => {
    const dialogUiPath = join(process.cwd(), 'src/components/ui/dialog.tsx')
    const dialogUiSrc = readFileSync(dialogUiPath, 'utf8')
    assert.ok(dialogUiSrc.includes('w-full min-w-0 box-border'))

    const selectUiPath = join(process.cwd(), 'src/components/ui/select.tsx')
    const selectUiSrc = readFileSync(selectUiPath, 'utf8')
    assert.ok(selectUiSrc.includes('w-full min-w-0 items-center justify-between'))
    assert.ok(selectUiSrc.includes('*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'))
  })
})
