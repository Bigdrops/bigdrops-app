import { useState, type RefObject, type UIEvent } from 'react'
import { ArrowDown, Sparkles } from 'lucide-react'

import { SAMPLE_SENTENCE, SUGGESTION, type ChangeCard, type Reply, type TurnId } from './assistant-chat-script'
import { ChangeCardView, StatusRow } from './assistant-chat-parts'
import { ClerkAvatar, type ClerkState } from './assistant-chat-clerk'
import { BoluOrbIdentity, BoluOrbInline } from './bolu-thinking-orb'

export type UserMessage = { id: string; role: 'user'; text: string }
export type StatusBlock = { id: string; kind: 'status'; label: string; done: boolean }
export type TextBlock = { id: string; kind: 'text'; text: string }
export type CardsBlock = { id: string; kind: 'cards'; cards: ChangeCard[] }
export type Block = StatusBlock | TextBlock | CardsBlock

export type AssistantMessage = {
  id: string
  role: 'assistant'
  blocks: Block[]
  replies: Reply[]
  thinking: boolean
}

export type ChatMessage = UserMessage | AssistantMessage

export function AssistantThread({
  messages,
  busy,
  clerkState,
  tone,
  showJump,
  logRef,
  onScroll,
  onJump,
  onDecide,
  onSend,
  onReset,
}: {
  messages: ChatMessage[]
  busy: boolean
  clerkState: ClerkState
  /** Current appearance — drives the ThinkingOrb theme prop. */
  tone: 'light' | 'dark'
  showJump: boolean
  logRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onJump: () => void
  onDecide: (messageId: string, cardId: string, accepted: boolean) => void
  onSend: (text: string, turn?: TurnId) => void
  onReset: () => void
}) {
  const [readerAway, setReaderAway] = useState(false)

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget
    setReaderAway(scrollHeight - scrollTop - clientHeight > 48)
    onScroll(event)
  }

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
            <div className="ac-empty-clerk-slot">
              {/* Show the ThinkingOrb while active; avatar when idle/success.
                  The orb carries its own aria-label; the avatar's label is
                  suppressed when the orb is showing to avoid duplication. */}
              <BoluOrbIdentity
                state={clerkState}
                tone={tone}
                paused={false}
              />
              <ClerkAvatar
                size={96}
                state={clerkState}
                phase={2}
                className={`ac-empty-clerk${clerkState !== 'idle' && clerkState !== 'success' ? ' ac-empty-clerk--orb-active' : ''}`}
                label={clerkState === 'idle' || clerkState === 'success' ? `BOURXE clerk, ${clerkState}` : undefined}
              />
            </div>
            <p className="ac-empty-title">Draft an invoice by talking</p>
            <p className="ac-empty-copy">
              The assistant reads what you say, fills the form, and asks before each change. The app
              does the arithmetic.
            </p>
            <button
              type="button"
              className="ac-suggest"
              onClick={() => onSend(SUGGESTION.text ?? SUGGESTION.label, SUGGESTION.turn)}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              {SUGGESTION.label}
            </button>
            <p className="ac-empty-sample">“{SAMPLE_SENTENCE}”</p>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const latest = index === messages.length - 1
          return message.role === 'user' ? (
            <div key={message.id} className="ac-row ac-row--user">
              <p className="ac-bubble">{message.text}</p>
            </div>
          ) : (
            <div key={message.id} className="ac-turn">
              <ClerkAvatar
                size={32}
                state={latest ? clerkState : 'idle'}
                animated={latest}
                phase={index}
                className="ac-turn-avatar"
              />
              <div className="ac-turn-body">
                {message.blocks.map((block) => {
                  if (block.kind === 'status') {
                    return <StatusRow key={block.id} label={block.label} done={block.done} />
                  }
                  if (block.kind === 'text') {
                    return (
                      <p key={block.id} className="ac-text">
                        {block.text}
                        {message.thinking && block.id === message.blocks[message.blocks.length - 1].id ? (
                          <span className="ac-caret" aria-hidden="true" />
                        ) : null}
                      </p>
                    )
                  }
                  return (
                    <div key={block.id} className="ac-cards">
                      {block.cards.map((card) => (
                        <ChangeCardView
                          key={card.id}
                          card={card}
                          onDecide={(accepted) => onDecide(message.id, card.id, accepted)}
                        />
                      ))}
                    </div>
                  )
                })}
                {message.thinking && message.blocks.length === 0 ? (
                  <div className="ac-status" data-done={false}>
                    <span className="ac-status-icon" aria-hidden="true">
                      <BoluOrbInline
                        state={clerkState}
                        tone={tone}
                        paused={!latest}
                      />
                    </span>
                    <span>Working</span>
                  </div>
                ) : null}

                {!busy && message.replies.length > 0 ? (
                  <div className="ac-replies" aria-label="Suggested replies">
                    {message.replies.map((reply) => (
                      <button
                        key={reply.label}
                        type="button"
                        className="ac-reply"
                        onClick={() => (reply.reset ? onReset() : onSend(reply.text ?? reply.label, reply.turn))}
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {showJump || readerAway ? (
        <button type="button" className="ac-jump" onClick={onJump} aria-label="Jump to latest messages">
          <ArrowDown className="size-3.5" aria-hidden="true" />
          <span>Jump to latest</span>
          {busy ? <span className="ac-jump-live" aria-label="New activity streaming">Streaming</span> : null}
        </button>
      ) : null}
    </div>
  )
}
