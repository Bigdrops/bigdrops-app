/**
 * bolu-thread-actions.ts — user-message editing and response regeneration.
 *
 * Extracted from `useBoluThread` to keep the hook inside the project limit.
 * Both actions preserve row identity, supersede dependent turns and never touch
 * a business document, a saved proposal or an approval gate.
 */

import type { Dispatch, SetStateAction } from 'react'

import { supabase } from '@/supabase'
import type { BoluProposal } from './bolu-operations'
import type { BoluFactResult } from './bolu-data'
import { markBoluTurnsSuperseded } from './bolu-generation'
import type { ClerkState, ProductionBoluMessage } from './hooks/types'

export interface BoluThreadActionContext {
  messages: ProductionBoluMessage[]
  conversationId: string | null
  tenantId: string | null
  isStreaming: boolean
  activeProposalMessageId: string | null
  setMessages: Dispatch<SetStateAction<ProductionBoluMessage[]>>
  setError: (value: string | null) => void
  setClerkState: (value: ClerkState) => void
  setActiveProposal: (proposal: BoluProposal | null) => void
  setActiveProposalMessageId: (value: string | null) => void
  resolveFacts: (text: string) => Promise<BoluFactResult | null>
  runGeneration: (params: {
    targetConversationId: string
    tenantId: string
    history: { id: string; role: 'user' | 'assistant'; content: string }[]
    userText: string
    facts: BoluFactResult | null
    replaceAssistantId?: string
  }) => Promise<boolean>
}

function historyFor(messages: ProductionBoluMessage[], endIndex: number) {
  return messages
    .slice(0, endIndex)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))
}

function clearInvalidatedProposal(ctx: BoluThreadActionContext, invalidatedIds: Set<string>) {
  if (!ctx.activeProposalMessageId || !invalidatedIds.has(ctx.activeProposalMessageId)) return
  ctx.setActiveProposal(null)
  ctx.setActiveProposalMessageId(null)
  ctx.setClerkState('idle')
}

/**
 * Edits one user-authored message in place and regenerates the answer.
 * The row keeps its id and position, so no duplicate user message appears.
 */
export async function editBoluUserMessage(
  ctx: BoluThreadActionContext,
  messageId: string,
  text: string,
): Promise<boolean> {
  const clean = text.trim()
  if (!clean || ctx.isStreaming) return false

  const index = ctx.messages.findIndex((m) => m.id === messageId)
  const target = index >= 0 ? ctx.messages[index] : null
  if (!target || target.role !== 'user') {
    ctx.setError('Only your own messages can be edited.')
    return false
  }
  if (!ctx.conversationId || target.conversationId !== ctx.conversationId) {
    ctx.setError('This message belongs to another conversation.')
    return false
  }
  if (ctx.tenantId && target.tenantId !== ctx.tenantId) {
    ctx.setError('This message belongs to another business entity.')
    return false
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (target.senderId && user?.id && target.senderId !== user.id) {
    ctx.setError('You can only edit your own messages.')
    return false
  }

  // Write order matters. Store the edited request first, then invalidate the
  // dependent turns. If the branch write fails, restore the original text so a
  // stored request never disagrees with the active branch.
  const originalContent = target.content
  const updatedAt = new Date().toISOString()
  const { error: updateError } = await (supabase.from('bolu_messages') as any)
    .update({ content: clean, status: 'completed', updated_at: updatedAt })
    .eq('id', messageId)
  if (updateError) {
    ctx.setError(updateError.message)
    return false
  }

  const downstream = ctx.messages.slice(index + 1)
  const superseded = await markBoluTurnsSuperseded(downstream)
  if (!superseded) {
    const { error: restoreError } = await (supabase.from('bolu_messages') as any)
      .update({ content: originalContent, updated_at: new Date().toISOString() })
      .eq('id', messageId)
    if (restoreError) {
      console.warn('[bolu-thread-actions] Could not restore the original message:', restoreError.message)
    }
    ctx.setError('Could not update the conversation branch. Please try again.')
    return false
  }

  const downstreamIds = new Set(downstream.map((m) => m.id))
  clearInvalidatedProposal(ctx, downstreamIds)

  ctx.setMessages((prev) =>
    prev
      .filter((m) => !downstreamIds.has(m.id))
      .map((m) => (m.id === messageId ? { ...m, content: clean, updatedAt } : m)),
  )

  ctx.setError(null)
  ctx.setClerkState('thinking')

  const facts = await ctx.resolveFacts(clean)
  return ctx.runGeneration({
    targetConversationId: ctx.conversationId,
    tenantId: target.tenantId,
    history: historyFor(ctx.messages, index),
    userText: clean,
    facts,
  })
}

/**
 * Regenerates one assistant response from its original request.
 * The assistant row is replaced in place; later dependent turns are superseded.
 */
export async function regenerateBoluResponse(
  ctx: BoluThreadActionContext,
  assistantMessageId: string,
): Promise<boolean> {
  if (ctx.isStreaming) return false

  const index = ctx.messages.findIndex((m) => m.id === assistantMessageId)
  const target = index >= 0 ? ctx.messages[index] : null
  if (!target || target.role !== 'assistant') {
    ctx.setError('Select an assistant response to regenerate.')
    return false
  }
  if (!ctx.conversationId || target.conversationId !== ctx.conversationId) {
    ctx.setError('This response belongs to another conversation.')
    return false
  }
  if (ctx.tenantId && target.tenantId !== ctx.tenantId) {
    ctx.setError('This response belongs to another business entity.')
    return false
  }

  let userIndex = -1
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (ctx.messages[cursor].role === 'user') {
      userIndex = cursor
      break
    }
  }
  if (userIndex < 0) {
    ctx.setError('This response has no original request to regenerate from.')
    return false
  }
  const userMessage = ctx.messages[userIndex]

  const downstream = ctx.messages.slice(index + 1)
  const superseded = await markBoluTurnsSuperseded(downstream)
  if (!superseded) {
    ctx.setError('Could not update the conversation branch. Please try again.')
    return false
  }

  const downstreamIds = new Set(downstream.map((m) => m.id))
  downstreamIds.add(assistantMessageId)
  clearInvalidatedProposal(ctx, downstreamIds)

  const removableIds = new Set(downstream.map((m) => m.id))
  ctx.setMessages((prev) => prev.filter((m) => !removableIds.has(m.id)))

  ctx.setError(null)
  ctx.setClerkState('thinking')

  const facts = target.records ?? (await ctx.resolveFacts(userMessage.content))
  return ctx.runGeneration({
    targetConversationId: ctx.conversationId,
    tenantId: target.tenantId,
    history: historyFor(ctx.messages, userIndex),
    userText: userMessage.content,
    facts,
    replaceAssistantId: assistantMessageId,
  })
}
