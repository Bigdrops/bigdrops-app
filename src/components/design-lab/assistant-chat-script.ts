/**
 * Scripted invoice conversation for the Assistant Chat Design Lab preview.
 *
 * The script is deliberately app-owned: the assistant never computes money.
 * A card carries user inputs (quantity, unit price, charge) and the preview
 * recomputes every total, mirroring the production rule in the PRD.
 */

export type InvoiceLine = {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export type InvoiceState = {
  number: string
  client: string | null
  lines: InvoiceLine[]
  delivery: number
  dueDate: string | null
  filed: boolean
}

export const INITIAL_INVOICE: InvoiceState = {
  number: 'INV-000131',
  client: null,
  lines: [],
  delivery: 0,
  dueDate: null,
  filed: false,
}

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  currency: 'NGN',
  maximumFractionDigits: 0,
  style: 'currency',
})

export const naira = (value: number) => nairaFormatter.format(value)

export const lineAmount = (line: InvoiceLine) => line.quantity * line.unitPrice

export const invoiceTotal = (state: InvoiceState) =>
  state.lines.reduce((sum, line) => sum + lineAmount(line), 0) + state.delivery

export type ChangeCardKind =
  | 'set-client'
  | 'add-line'
  | 'set-delivery'
  | 'update-price'
  | 'set-due'
  | 'file'

export type ChangeCard = {
  id: string
  kind: ChangeCardKind
  title: string
  field?: string
  description?: string
  from?: string
  to?: string
  money?: string
  moneyLabel?: string
  note?: string
  accepts: string
  rejects: string
  status: 'pending' | 'accepted' | 'rejected'
  client?: string
  line?: InvoiceLine
  lineId?: string
  unitPrice?: number
  delivery?: number
  dueDate?: string
}

/** The only writer. It revalidates and refuses computed fields by design. */
export function applyCard(state: InvoiceState, card: ChangeCard): InvoiceState {
  switch (card.kind) {
    case 'set-client':
      return card.client ? { ...state, client: card.client } : state
    case 'add-line': {
      if (!card.line || card.line.quantity <= 0 || card.line.unitPrice < 0) return state
      return { ...state, lines: [...state.lines, card.line] }
    }
    case 'set-delivery':
      return typeof card.delivery === 'number' && card.delivery >= 0
        ? { ...state, delivery: card.delivery }
        : state
    case 'update-price': {
      if (typeof card.unitPrice !== 'number' || card.unitPrice < 0) return state
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.id === card.lineId ? { ...line, unitPrice: card.unitPrice as number } : line,
        ),
      }
    }
    case 'set-due':
      return card.dueDate ? { ...state, dueDate: card.dueDate } : state
    case 'file':
      return { ...state, filed: true }
    default:
      return state
  }
}

export type TurnId = 'draft' | 'correct' | 'due' | 'file' | 'saved' | 'kept' | 'fallback'

export type Reply = {
  label: string
  turn?: TurnId
  /** The user message the reply sends. Defaults to the label. */
  text?: string
  reset?: boolean
}

type PlannedBlock =
  | { kind: 'status'; label: string; ms: number }
  | { kind: 'text'; text: string }
  | { kind: 'cards'; cards: ChangeCard[] }

export type TurnPlan = {
  blocks: PlannedBlock[]
  replies: Reply[]
  followUp?: { accepted: TurnId; rejected: TurnId }
}

export const SAMPLE_SENTENCE =
  'Invoice for ABC Ltd, 5 pcs cable lug 10mm at 9500, delivery 5000, 50 percent advance'

export const SUGGESTION: Reply = {
  label: 'Try the sample invoice',
  turn: 'draft',
  text: SAMPLE_SENTENCE,
}

const baseCard = (id: string): Omit<ChangeCard, 'kind' | 'title' | 'accepts' | 'rejects'> => ({
  id,
  status: 'pending',
})

export function buildTurn(turn: TurnId, state: InvoiceState, prefix: string): TurnPlan {
  const id = (name: string) => `${prefix}-${name}`

  if (turn === 'draft') {
    const line: InvoiceLine = {
      description: 'cable lug 10mm',
      id: id('lug-line'),
      quantity: 5,
      unitPrice: 9500,
    }
    return {
      blocks: [
        { kind: 'status', label: 'Reading the form', ms: 420 },
        { kind: 'status', label: 'Adding a client, a line item and a charge', ms: 620 },
        {
          kind: 'text',
          text:
            'I read “5 pcs cable lug 10mm at 9500, delivery 5000”. The client, the line and the charge are below. I left the 50 percent advance alone: deposit terms are not writable by the assistant.',
        },
        {
          kind: 'cards',
          cards: [
            {
              ...baseCard(id('client')),
              accepts: 'Set client',
              client: 'ABC Ltd',
              description: 'Set the invoice client.',
              field: 'Client',
              from: 'Not set',
              kind: 'set-client',
              rejects: 'Skip',
              title: 'Client',
              to: 'ABC Ltd',
            },
            {
              ...baseCard(id('line')),
              accepts: 'Add line',
              description: 'Quantity and unit price are inputs. The app computes the amount.',
              field: 'cable lug 10mm',
              from: 'Not set',
              kind: 'add-line',
              line,
              money: naira(lineAmount(line)),
              moneyLabel: 'Computed amount',
              rejects: 'Reject',
              title: 'Line item',
              to: '5 pcs × ₦9,500',
            },
            {
              ...baseCard(id('delivery')),
              accepts: 'Add charge',
              delivery: 5000,
              description: 'An extra charge on the invoice.',
              field: 'Delivery',
              from: 'Not set',
              kind: 'set-delivery',
              money: naira(5000),
              moneyLabel: 'Charge',
              rejects: 'Reject',
              title: 'Extra charge',
              to: naira(5000),
            },
          ],
        },
      ],
      replies: [
        { label: 'Looks right', turn: 'due' },
        { label: 'No, price is 95000 not 9500', turn: 'correct' },
        { label: 'File it', turn: 'file' },
      ],
    }
  }

  if (turn === 'correct') {
    const line = state.lines[0]
    if (!line) {
      return {
        blocks: [
          { kind: 'status', label: 'Reading the form', ms: 400 },
          {
            kind: 'text',
            text: 'There is no cable lug line to correct. Ask me to add it again, or press Reset.',
          },
        ],
        replies: [{ label: 'Reset', reset: true }],
      }
    }
    return {
      blocks: [
        { kind: 'status', label: 'Correcting the cable lug line', ms: 520 },
        {
          kind: 'text',
          text: `Fixed. 5 × ${naira(95000)} = ${naira(475000)}. The app computed that amount; I did not.`,
        },
        {
          kind: 'cards',
          cards: [
            {
              ...baseCard(id('price')),
              accepts: 'Apply price',
              description: 'The amount changes because the app recalculates it.',
              field: 'Unit price',
              from: naira(line.unitPrice),
              kind: 'update-price',
              lineId: line.id,
              money: naira(5 * 95000),
              moneyLabel: 'New amount',
              rejects: 'Keep old price',
              title: 'Line item — cable lug 10mm',
              to: naira(95000),
              unitPrice: 95000,
            },
          ],
        },
      ],
      replies: [
        { label: 'Looks right', turn: 'due' },
        { label: 'File it', turn: 'file' },
      ],
    }
  }

  if (turn === 'due') {
    return {
      blocks: [
        { kind: 'status', label: 'Checking the invoice rules', ms: 420 },
        {
          kind: 'text',
          text: 'The client and the lines are set. The due date is the last required field.',
        },
        {
          kind: 'cards',
          cards: [
            {
              ...baseCard(id('due')),
              accepts: 'Set date',
              description: '14 days from today, the usual term for this business.',
              dueDate: '27 Nov 2026',
              field: 'Due date',
              from: 'Not set',
              kind: 'set-due',
              rejects: 'Leave empty',
              title: 'Due date',
              to: '27 Nov 2026',
            },
          ],
        },
      ],
      replies: [{ label: 'File it', turn: 'file' }],
    }
  }

  if (turn === 'file') {
    const total = invoiceTotal(state)
    return {
      blocks: [
        { kind: 'status', label: 'Preparing the confirmation', ms: 560 },
        {
          kind: 'text',
          text: `The total is ${naira(total)}. I will not save until you confirm.`,
        },
        {
          kind: 'cards',
          cards: [
            {
              ...baseCard(id('file')),
              accepts: 'File invoice',
              description: `${state.client ?? 'No client'} · ${state.lines.length} line ${
                state.lines.length === 1 ? 'item' : 'items'
              } · ${state.dueDate ?? 'no due date'}`,
              field: 'Status',
              from: 'Draft',
              kind: 'file',
              money: naira(total),
              moneyLabel: 'Invoice total',
              note: 'This runs the normal save path. The PDF uses the same invoice data as the manual form.',
              rejects: 'Not yet',
              title: `File ${state.number}`,
              to: 'Filed',
            },
          ],
        },
      ],
      followUp: { accepted: 'saved', rejected: 'kept' },
      replies: [],
    }
  }

  if (turn === 'saved') {
    return {
      blocks: [
        { kind: 'status', label: 'Saving through the normal save path', ms: 720 },
        {
          kind: 'text',
          text: `Saved. ${state.number} is filed. The totals came from the app, and the form never stopped working.`,
        },
      ],
      replies: [{ label: 'Start over', reset: true }],
    }
  }

  if (turn === 'kept') {
    return {
      blocks: [
        {
          kind: 'text',
          text: 'Nothing was saved. The draft is kept and the manual form still works.',
        },
      ],
      replies: [{ label: 'File it', turn: 'file' }],
    }
  }

  const hasDraft = Boolean(state.client) || state.lines.length > 0
  return {
    blocks: [
      {
        kind: 'text',
        text: hasDraft
          ? 'This sample only plays the scripted invoice conversation. Use a reply below, or press Reset.'
          : 'This sample plays one scripted invoice conversation. Use the suggestion below, or press Reset.',
      },
    ],
    replies: hasDraft
      ? [{ label: 'File it', turn: 'file' }, { label: 'Reset', reset: true }]
      : [SUGGESTION, { label: 'Reset', reset: true }],
  }
}

/** Map free text to the closest scripted turn. */
export function routeText(text: string, state?: InvoiceState): TurnId {
  const value = text.toLowerCase()
  if (/file|save/.test(value)) return 'file'
  if (/price|95[.,]?000/.test(value)) return 'correct'
  if (state && state.lines.length === 0 && /invoice|client|abc|lug|delivery/.test(value)) return 'draft'
  if (/right|looks|ok|yes|fine|good/.test(value)) return 'due'
  return 'fallback'
}
