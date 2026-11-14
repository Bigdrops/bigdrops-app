/**
 * bolu-reducer.ts — State Management and Reducer for Bolu Assistant
 */

import { getBoluSuggestions, getBoluWelcome, type BoluPageContext } from './bolu-context'
import { getAvailableBoluCapabilities } from './bolu-capabilities'
import { readBoluContextFacts, type BoluRecord } from './bolu-data'
import type { BoluProposal } from './bolu-operations'
import type { BoluOperationExecutionResult } from './bolu-document-service'

export type BoluMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  records?: Awaited<ReturnType<typeof readBoluContextFacts>>
  proposal?: BoluProposal
}

export type BoluRuntimeStatus =
  | 'idle'
  | 'sending'
  | 'searching'
  | 'proposing'
  | 'awaiting_approval'
  | 'applying'
  | 'awaiting_save'
  | 'saving'
  | 'persisted'
  | 'failed'

export type BoluRuntimeState = {
  messages: BoluMessage[]
  status: BoluRuntimeStatus
  error: string | null
  context: BoluPageContext
  pendingContext: BoluPageContext | null
  welcomeShown: boolean
  activeRequestId: number | null
  streamingContent: string
  activeProposal: BoluProposal | null
  changeCard: {
    field: string
    oldValue: string | number | null
    newValue: string | number | null
  } | null
  draftForSave: BoluRecord | null
}

export type BoluRuntimeAction =
  | { type: 'REOPEN'; context: BoluPageContext }
  | { type: 'APPLY_CONTEXT' }
  | { type: 'SUBMIT'; text: string; requestId?: number }
  | { type: 'SUGGEST'; suggestionId: string; requestId?: number }
  | { type: 'STATUS'; status: BoluRuntimeStatus }
  | { type: 'DELTA'; requestId: number; delta: string }
  | { type: 'RESULT'; requestId: number; content: string; records?: BoluMessage['records']; proposal?: BoluProposal }
  | { type: 'ERROR'; requestId: number; message: string }
  | { type: 'STOP' }
  | { type: 'PICKER_RESULTS'; records: Extract<Awaited<ReturnType<typeof readBoluContextFacts>>, { kind: 'records' }>['records']; hasMore: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_PROPOSAL'; proposal: BoluProposal }
  | { type: 'GATE1_APPROVE'; opId?: string }
  | { type: 'GATE1_REJECT'; opId?: string }
  | { type: 'GATE2_START_SAVE'; opId?: string }
  | { type: 'GATE2_SAVE_SUCCESS'; result: BoluOperationExecutionResult }
  | { type: 'GATE2_SAVE_FAILURE'; error: string }
  | { type: 'GATE2_CANCEL_SAVE' }
  | { type: 'APPLY_CHANGE'; field: string; oldValue: string | number | null; newValue: string | number | null }
  | { type: 'ACCEPT_CHANGE' }
  | { type: 'REJECT_CHANGE' }
  | { type: 'INITIATE_SAVE' }
  | { type: 'CONFIRM_SAVE' }
  | { type: 'CANCEL_SAVE' }

let messageSequence = 0
let requestSequence = 0

export function nextRequestId(): number {
  return ++requestSequence
}

export function createBoluMessage(role: BoluMessage['role'], content: string, proposal?: BoluProposal): BoluMessage {
  return { id: `bolu-${messageSequence++}`, role, content, proposal }
}

export function createBoluConversationState(context: BoluPageContext): BoluRuntimeState {
  return {
    messages: [createBoluMessage('assistant', getBoluWelcome(context))],
    status: 'idle',
    error: null,
    context,
    pendingContext: null,
    welcomeShown: true,
    activeRequestId: null,
    streamingContent: '',
    activeProposal: null,
    changeCard: null,
    draftForSave: null,
  }
}

export function boluConversationReducer(state: BoluRuntimeState, action: BoluRuntimeAction): BoluRuntimeState {
  switch (action.type) {
    case 'REOPEN':
      return {
        ...state,
        pendingContext: JSON.stringify(state.context) === JSON.stringify(action.context) ? null : action.context,
        error: null,
      }
    case 'APPLY_CONTEXT':
      return state.pendingContext
        ? { ...state, context: state.pendingContext, pendingContext: null }
        : state
    case 'SUBMIT': {
      const requestId = action.requestId ?? ++requestSequence
      return {
        ...state,
        messages: [...state.messages, createBoluMessage('user', action.text)],
        status: 'sending',
        error: null,
        activeRequestId: requestId,
        streamingContent: '',
      }
    }
    case 'SUGGEST': {
      const suggestion = getBoluSuggestions(state.context).find((item) => item.id === action.suggestionId)
      if (!suggestion || !(getAvailableBoluCapabilities(state.context) as readonly string[]).includes(suggestion.capability)) return state
      const requestId = action.requestId ?? ++requestSequence
      return {
        ...state,
        messages: [...state.messages, createBoluMessage('user', suggestion.prompt)],
        status: 'sending',
        error: null,
        activeRequestId: requestId,
        streamingContent: '',
      }
    }
    case 'STATUS':
      return { ...state, status: action.status }
    case 'DELTA':
      return state.activeRequestId === action.requestId
        ? { ...state, streamingContent: state.streamingContent + action.delta }
        : state
    case 'RESULT': {
      if (state.activeRequestId !== action.requestId) return state
      return {
        ...state,
        messages: [
          ...state.messages,
          { ...createBoluMessage('assistant', action.content), records: action.records, proposal: action.proposal },
        ],
        status: action.proposal ? 'awaiting_approval' : 'idle',
        activeRequestId: null,
        streamingContent: '',
        activeProposal: action.proposal ?? state.activeProposal,
      }
    }
    case 'ERROR':
      if (state.activeRequestId !== action.requestId) return state
      return { ...state, status: 'idle', error: action.message, activeRequestId: null, streamingContent: '' }
    case 'STOP':
      return { ...state, status: 'idle', error: 'Request stopped.', activeRequestId: null, streamingContent: '' }
    case 'PICKER_RESULTS':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            ...createBoluMessage(
              'assistant',
              action.records.length ? 'Select a record to use in this conversation.' : 'No matching records were found.',
            ),
            records: { kind: 'records', records: action.records, hasMore: action.hasMore },
          },
        ],
        status: 'idle',
      }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'SET_PROPOSAL':
      return {
        ...state,
        activeProposal: action.proposal,
        status: 'awaiting_approval',
        error: null,
      }
    case 'GATE1_APPROVE': {
      if (!state.activeProposal) return state
      const approved: BoluProposal = {
        ...state.activeProposal,
        status: 'approved_pending_save',
      }
      return {
        ...state,
        activeProposal: approved,
        status: 'awaiting_save',
        error: null,
        messages: [
          ...state.messages,
          createBoluMessage('user', 'Approved proposed changes. Ready for save confirmation (Gate 2).'),
        ],
      }
    }
    case 'GATE1_REJECT': {
      return {
        ...state,
        activeProposal: null,
        status: 'idle',
        error: null,
        messages: [
          ...state.messages,
          createBoluMessage('user', 'Rejected proposal. No changes were applied.'),
        ],
      }
    }
    case 'GATE2_START_SAVE': {
      if (!state.activeProposal) return state
      return {
        ...state,
        status: 'saving',
        error: null,
      }
    }
    case 'GATE2_SAVE_SUCCESS': {
      const persistedNum = action.result.documentNumber || 'Document'
      return {
        ...state,
        status: 'idle',
        activeProposal: null,
        error: null,
        messages: [
          ...state.messages,
          createBoluMessage('assistant', `✓ Successfully saved ${persistedNum} to your business records.`),
        ],
      }
    }
    case 'GATE2_SAVE_FAILURE': {
      return {
        ...state,
        status: 'awaiting_save',
        error: action.error,
        messages: [
          ...state.messages,
          createBoluMessage('assistant', `Failed to save document: ${action.error}`),
        ],
      }
    }
    case 'GATE2_CANCEL_SAVE': {
      return {
        ...state,
        status: 'idle',
        activeProposal: null,
        error: null,
        messages: [
          ...state.messages,
          createBoluMessage('user', 'Save cancelled. Document was not persisted.'),
        ],
      }
    }
    // Legacy support handlers
    case 'APPLY_CHANGE':
      return {
        ...state,
        changeCard: {
          field: action.field,
          oldValue: action.oldValue,
          newValue: action.newValue,
        },
        status: 'proposing',
      }
    case 'ACCEPT_CHANGE':
      if (!state.changeCard) return state
      return {
        ...state,
        messages: [
          ...state.messages,
          createBoluMessage('user', `Changed ${state.changeCard.field} from ${state.changeCard.oldValue} to ${state.changeCard.newValue}`),
        ],
        changeCard: null,
        status: 'idle',
      }
    case 'REJECT_CHANGE':
      return {
        ...state,
        messages: [...state.messages, createBoluMessage('user', 'Change rejected. No changes applied.')],
        changeCard: null,
        status: 'idle',
      }
    case 'INITIATE_SAVE':
      if (!state.context.record || state.status !== 'idle') return state
      return {
        ...state,
        status: 'awaiting_save',
        draftForSave: {
          id: state.context.record.id,
          kind: state.context.record.kind,
          number: 'DRAFT',
          title: null,
          clientName: null,
          date: null,
          status: null,
          total: null,
          balanceDue: null,
          route: `/${state.context.record.kind}s/${state.context.record.id}`,
        },
      }
    case 'CONFIRM_SAVE':
      if (!state.draftForSave || state.status !== 'awaiting_save') return state
      return {
        ...state,
        messages: [...state.messages, createBoluMessage('assistant', 'Document saved successfully.')],
        status: 'idle',
        draftForSave: null,
      }
    case 'CANCEL_SAVE':
      return {
        ...state,
        status: 'idle',
        draftForSave: null,
      }
    default:
      return state
  }
}
