import { useState, type RefObject, type UIEvent } from 'react'
import { AlertCircle, ArrowDown, Pause, Pencil, Play, RefreshCw, Sparkles, Square, Volume2 } from 'lucide-react'

import { ProposalCardView, StatusRow } from './assistant-chat-parts'
import { AssistantMarkdown } from './assistant-chat-markdown'
import { CopyButton } from './assistant-chat-copy-button'
import { IconAction } from './assistant-chat-icon-action'
import { MessageWarnings, readMessageWarnings } from './assistant-chat-warnings'
import { AssistantAttachments, readMessageAttachments } from './assistant-chat-attachments'
import { BoluOrbIdentity, BoluOrbInline } from './bolu-thinking-orb'
import type { ClerkState, ProductionBoluMessage, ThreadNarrationControls } from './types'
import type {
  BoluClientCreateInput,
  BoluClientCreationOutcome,
  BoluClientMatch,
  BoluClientSearchResult,
} from '@/lib/ai-assistant/bolu-data'

/**
 * Strips raw bolu_operation JSON blocks and removes em-dashes from user-facing assistant prose.
 * The structured ProposalCardView renders the operation visually; raw JSON envelopes
 * must never leak into the chat bubbles.
 */
export function cleanAssistantProse(text: string): string {
  if (!text) return ''

  // 1. Strip any markdown code blocks containing bolu_operation (```json ... ``` or ``` ... ```)
  let cleaned = text.replace(/```(?:json)?(?::bolu_operation)?[\s\S]*?"bolu_operation"[\s\S]*?```/gi, '')

  // 2. Also strip any remaining ```json:bolu_operation ... ``` blocks
  cleaned = cleaned.replace(/```json:bolu_operation[\s\S]*?```/gi, '')

  // 3. Strip any generic operation block envelope: ```json\s*\{\s*"operationType"[\s\S]*?```
  cleaned = cleaned.replace(/```(?:json)?\s*\{[\s\S]*?"operationType"[\s\S]*?```/gi, '')

  // 4. Strip any raw top-level JSON operation envelope if printed without markdown fences
  cleaned = cleaned.replace(/\{\s*"bolu_operation"[\s\S]*?\n\}/gi, '')

  // 5. Replace any em-dashes (—) or en-dashes with standard hyphen or clean punctuation
  cleaned = cleaned.replace(/—/g, ' - ').replace(/–/g, '-')

  // 6. Clean up multiple blank lines and trim
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

export function AssistantThread({
  messages,
  busy,
  isStreaming = false,
  clerkState,
  tone = 'light',
  showJump,
  logRef,
  onScroll,
  onJump,
  onSend,
  onApproveGate1,
  onRejectGate1,
  onConfirmGate2,
  onCancelGate2,
  onSearchClients,
  onSelectClient,
  onCreateClient,
  onAnswerClarification,
  onReturnToReview,
  onEditMessage,
  onRegenerateMessage,
  narration,
  suggestions = [],
}: {
  messages: ProductionBoluMessage[]
  busy: boolean
  isStreaming?: boolean
  clerkState: ClerkState
  tone?: 'light' | 'dark'
  showJump: boolean
  logRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onJump: () => void
  onSend: (text: string) => void
  onApproveGate1?: (opId: string) => void
  onRejectGate1?: (opId: string) => void
  onConfirmGate2?: (opId: string) => void
  onCancelGate2?: (opId: string) => void
  onSearchClients?: (opId: string, term: string) => Promise<BoluClientSearchResult>
  onSelectClient?: (opId: string, client: BoluClientMatch) => void | Promise<unknown>
  onCreateClient?: (
    opId: string,
    input: BoluClientCreateInput,
  ) => Promise<BoluClientCreationOutcome>
  onAnswerClarification?: (
    opId: string,
    questionId: string,
    answer: { optionId?: string; text?: string },
  ) => void | Promise<unknown>
  /** Reopens Gate 1 review; the earlier approval no longer authorizes a save. */
  onReturnToReview?: (opId: string) => void | Promise<unknown>
  onEditMessage?: (message: ProductionBoluMessage) => void
  onRegenerateMessage?: (message: ProductionBoluMessage) => void
  narration: ThreadNarrationControls
  suggestions?: string[]
}) {
  const [readerAway, setReaderAway] = useState(false)

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget
    setReaderAway(scrollHeight - scrollTop - clientHeight > 48)
    onScroll(event)
  }

  const defaultSuggestions = suggestions.length > 0 ? suggestions : [
    'Show outstanding invoices',
    'Create an invoice for a customer',
    'Draft a new quotation',
    'Check recent client balances',
  ]

  return (
    <div className="ac-stream">
      <div
        className="ac-log"
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={busy}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty-clerk-slot flex items-center justify-center">
              <BoluOrbIdentity
                state={clerkState}
                tone={tone}
                paused={false}
              />
            </div>
            <p className="ac-empty-title">Hello! I’m Bolu, your BOUXRE business operations assistant</p>
            <p className="ac-empty-copy">
              I help you manage business documents, draft invoices and quotations, check customer balances, and track outstanding payments. Select an action below or describe what you need.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-2 mt-5 w-full max-w-lg">
              {defaultSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ac-suggest text-left sm:text-center flex items-center justify-center gap-2 max-w-full"
                  onClick={() => onSend(sug)}
                >
                  <Sparkles className="size-3.5 shrink-0 text-[var(--ac-accent)]" aria-hidden="true" />
                  <span className="truncate">{sug}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const latest = index === messages.length - 1
          const isUser = message.role === 'user'

          if (isUser) {
            return (
              <div key={message.id} className="ac-row ac-row--user">
                <div className="ac-user-block">
                  <p className="ac-bubble">{message.content}</p>
                  {/* User messages: Edit and Copy only, icon-only. */}
                  <div className="ac-actions ac-actions--user">
                    <IconAction
                      icon={Pencil}
                      label="Edit message"
                      onClick={() => onEditMessage?.(message)}
                      disabled={busy}
                    />
                    <CopyButton value={message.content} label="Copy" ariaLabel="Copy message" iconOnly />
                  </div>
                </div>
              </div>
            )
          }

          const prose = cleanAssistantProse(message.content)
          const attachments = readMessageAttachments(message.metadata)
          // Copy is offered for a finished response only, never mid-stream.
          const canCopy =
            (message.status === 'completed' || message.status === 'stopped') && prose.trim().length > 0
          const isThisSpeaking = narration.messageId === message.id && narration.status === 'speaking'
          const isThisPaused = narration.messageId === message.id && narration.status === 'paused'
          const narrationBlocked = !narration.supported || !narration.enabled
          const narrationHint = !narration.supported
            ? 'Narration is not available on this device'
            : !narration.enabled
              ? 'Narration is turned off in settings'
              : 'Read response aloud'

          return (
            <div key={message.id} className="ac-turn">
              <div className="ac-turn-avatar flex items-center justify-center size-7 rounded-full bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] shrink-0">
                {latest && clerkState !== 'idle' ? (
                  <BoluOrbInline
                    state={clerkState}
                    tone={tone}
                    paused={false}
                  />
                ) : (
                  <Sparkles className="size-3.5 text-[var(--ac-accent)]" aria-hidden="true" />
                )}
              </div>
              <div className="ac-turn-body">
                {/* Streaming placeholder with orb */}
                {message.status === 'streaming' && !prose && !message.proposal ? (
                  <div className="ac-status" data-done={false}>
                    <span className="ac-status-icon" aria-hidden="true">
                      <BoluOrbInline
                        state={clerkState}
                        tone={tone}
                        paused={!latest}
                      />
                    </span>
                    <span>Checking business rules…</span>
                  </div>
                ) : null}

                {/* Failed Message Error Card */}
                {message.status === 'failed' ? (
                  <div className="p-3 my-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 text-rose-500 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-rose-700 dark:text-rose-300">Request Failed</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed break-words">{message.content || 'Inference request could not be completed.'}</p>
                    </div>
                  </div>
                ) : null}

                {/* Assistant Prose — one Markdown renderer for streamed and persisted messages */}
                {message.status !== 'failed' && prose ? (
                  <div className="ac-text">
                    <AssistantMarkdown
                      text={prose}
                      streaming={message.status === 'streaming'}
                      caret={isStreaming && latest && message.status === 'streaming'}
                    />
                  </div>
                ) : null}

                {/* Retrieved Records List */}
                {message.records && message.records.kind === 'records' && message.records.records.length > 0 ? (
                  <div className="my-2 space-y-1.5" aria-label="Retrieved business records">
                    <p className="text-[11px] font-semibold text-[var(--ac-muted)] uppercase tracking-wider">
                      Authorized Records
                    </p>
                    <div className="grid gap-1.5">
                      {message.records.records.map((rec) => (
                        <div
                          key={`${rec.kind}-${rec.id}`}
                          className="flex items-center justify-between p-2 rounded-xl border border-[var(--ac-line)] bg-[var(--ac-surface)] text-xs"
                        >
                          <span className="font-semibold text-[var(--ac-ink)]">{rec.number}</span>
                          <span className="text-[var(--ac-muted)] truncate max-w-[40%]">{rec.clientName}</span>
                          <span className="font-medium text-[var(--ac-ink)]">
                            ₦{Number(rec.total || 0).toLocaleString('en-NG')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Two-Gate Proposal Card */}
                {message.proposal ? (
                  <div className="ac-cards my-2">
                    <ProposalCardView
                      proposal={message.proposal}
                      onApproveGate1={() => onApproveGate1?.(message.proposal!.opId)}
                      onRejectGate1={() => onRejectGate1?.(message.proposal!.opId)}
                      onConfirmGate2={() => onConfirmGate2?.(message.proposal!.opId)}
                      onCancelGate2={() => onCancelGate2?.(message.proposal!.opId)}
                      onSearchClients={
                        onSearchClients
                          ? (term) => onSearchClients(message.proposal!.opId, term)
                          : undefined
                      }
                      onSelectClient={
                        onSelectClient
                          ? (client) => onSelectClient(message.proposal!.opId, client)
                          : undefined
                      }
                      onCreateClient={
                        onCreateClient
                          ? (input) => onCreateClient(message.proposal!.opId, input)
                          : undefined
                      }
                      onAnswerClarification={
                        onAnswerClarification
                          ? (questionId, answer) =>
                              onAnswerClarification(message.proposal!.opId, questionId, answer)
                          : undefined
                      }
                      onReturnToReview={
                        onReturnToReview
                          ? () => onReturnToReview(message.proposal!.opId)
                          : undefined
                      }
                    />
                  </div>
                ) : null}

                {/* Executor warnings, verbatim, associated with this execution message */}
                {(() => {
                  const warnings = readMessageWarnings(message.metadata)
                  return warnings.length > 0 ? <MessageWarnings warnings={warnings} /> : null
                })()}

                {/* Typed attachments only — no derived or invented files */}
                <AssistantAttachments attachments={attachments} />

                {/* Response action row: Regenerate, Copy, Read aloud — icon-only. */}
                {canCopy ? (
                  <div className="ac-actions">
                    {onRegenerateMessage ? (
                      <IconAction
                        icon={RefreshCw}
                        label="Regenerate response"
                        onClick={() => onRegenerateMessage(message)}
                        disabled={busy}
                      />
                    ) : null}
                    <CopyButton value={prose} label="Copy" ariaLabel="Copy response" iconOnly />
                    {isThisSpeaking || isThisPaused ? (
                      <>
                        <IconAction
                          icon={isThisPaused ? Play : Pause}
                          label={isThisPaused ? 'Resume reading' : 'Pause reading'}
                          onClick={isThisPaused ? narration.onResume : narration.onPause}
                        />
                        <IconAction icon={Square} label="Stop reading" onClick={narration.onStop} />
                      </>
                    ) : (
                      <IconAction
                        icon={Volume2}
                        label="Read response aloud"
                        title={narrationHint}
                        onClick={() => narration.onSpeak(message, prose)}
                        disabled={narrationBlocked}
                        active={narration.messageId === message.id && narration.status === 'completed'}
                      />
                    )}
                    {narration.messageId === message.id && narration.error ? (
                      <span className="ac-sr" role="status" aria-live="polite">
                        {narration.error}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {showJump || readerAway ? (
        <button
          type="button"
          className="ac-jump"
          onClick={onJump}
          aria-label="Jump to latest messages"
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
          <span>Jump to latest</span>
          {busy ? <span className="ac-jump-live" aria-label="New activity streaming">Live</span> : null}
        </button>
      ) : null}
    </div>
  )
}
