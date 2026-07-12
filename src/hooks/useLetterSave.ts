import { feedback } from '@/lib/feedback'
import { useDocumentSave } from './useDocumentSave'
import type { DocumentSaveStrategy } from './useDocumentSave'
import { createLetter, updateLetter } from '@/domain/correspondence/letter/letterRepository'
import type { LetterBody, CreateLetterInput } from '@/domain/correspondence/letter/types'

export interface LetterFormFields {
  subject: string
  date: string
  recipientType: 'client' | 'manual'
  recipientId: string
  recipientName: string
  recipientAddress: string
  recipientEmail: string
  recipientPhone: string
  senderType: 'profile' | 'manual'
  senderName: string
  senderAddress: string
  senderEmail: string
  senderPhone: string
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
    const { fields } = input
    if (!fields.subject?.trim()) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Subject is required' }
    }
    if (fields.recipientType === 'client' && !fields.recipientId) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Select a recipient' }
    }
    if (fields.recipientType === 'manual' && !fields.recipientName?.trim()) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Recipient name is required' }
    }
    if (!fields.date) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Date is required' }
    }
    return { valid: true }
  },

  buildPayload() {
    return null
  },

  async persist(input, _payload, { isCreate, id }) {
    const { fields } = input
    const body = bodyBlocksFromText(fields.bodyText)

    const recipient = {
      companyName: fields.recipientName,
      clientId: fields.recipientType === 'client' ? (fields.recipientId || undefined) : undefined,
      address: fields.recipientAddress || undefined,
      email: fields.recipientEmail || undefined,
      phone: fields.recipientPhone || undefined,
    }

    const sender = {
      companyName: fields.senderName,
      address: fields.senderAddress || undefined,
      email: fields.senderEmail || undefined,
      phone: fields.senderPhone || undefined,
    }

    if (isCreate) {
      const doc = await createLetter({ recipient, sender, subject: fields.subject, date: fields.date, body })
      return { data: { id: doc.identity.id }, error: null }
    }

    await updateLetter(id!, { recipient, sender, subject: fields.subject, date: fields.date, body, status: 'draft' })
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
