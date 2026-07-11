import { feedback } from '@/lib/feedback'
import { useDocumentSave } from './useDocumentSave'
import type { DocumentSaveStrategy } from './useDocumentSave'
import { createLetter, updateLetter } from '@/domain/correspondence/letter/letterRepository'
import type { LetterBody, CreateLetterInput } from '@/domain/correspondence/letter/types'

export interface LetterFormFields {
  subject: string
  date: string
  recipientId: string
  recipientName: string
  senderName: string
  bodyText: string
}

interface UseLetterSaveParams {
  fields: LetterFormFields
  isCreate: boolean
  isEdit: boolean
  id?: string
  navigate: (path: string) => void
}

function bodyBlocksFromText(text: string): LetterBody {
  return {
    blocks: text
      ? text.split('\n').map((line) => ({ type: 'paragraph' as const, text: line }))
      : [{ type: 'paragraph', text: '' }],
  }
}

const letterStrategy: DocumentSaveStrategy<UseLetterSaveParams> = {
  validate(input) {
    if (!input.fields.subject?.trim()) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Subject is required' }
    }
    if (!input.fields.recipientId) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Select a recipient' }
    }
    if (!input.fields.date) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Date is required' }
    }
    return { valid: true }
  },

  buildPayload() {
    return null
  },

  async persist(input, _payload, { isCreate, id }) {
    const body = bodyBlocksFromText(input.fields.bodyText)

    if (isCreate) {
      const createInput: CreateLetterInput = {
        recipient: {
          companyName: input.fields.recipientName,
          clientId: input.fields.recipientId || undefined,
        },
        sender: { companyName: input.fields.senderName || input.fields.recipientName },
        subject: input.fields.subject,
        date: input.fields.date,
        body,
      }
      const doc = await createLetter(createInput)
      return { data: { id: doc.identity.id }, error: null }
    }

    await updateLetter(id!, {
      recipient: { companyName: input.fields.recipientName, clientId: input.fields.recipientId || undefined },
      sender: { companyName: input.fields.senderName },
      subject: input.fields.subject,
      date: input.fields.date,
      body,
      status: 'draft',
    })
    return { data: null, error: null }
  },

  getNavigationTarget(effectiveId) {
    return '/letters/' + effectiveId
  },
}

export function useLetterSave(params: UseLetterSaveParams) {
  return useDocumentSave({
    input: params,
    strategy: letterStrategy,
    isCreate: params.isCreate,
    isEdit: params.isEdit,
    id: params.id,
    navigate: params.navigate,
  })
}
