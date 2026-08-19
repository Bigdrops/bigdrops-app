import { getCurrentTenantId } from '@/lib/tenant'
import type { TenantClient } from '@/lib/tenantClient'
import type { CreateLetterInput, UpdateLetterInput, LetterDocument } from './types'
import type { LetterRow, LetterInsertPayload, LetterUpdatePayload } from './persistence'
import { letterRowToDocument, documentToInsertPayload, documentToUpdatePayload } from './persistence'
import { getNextLetterNumber } from './numbering'
import { createLetterDraft, normalizeLetter } from './normalize'
import { createCorrespondenceIdentity } from './normalize'

export async function createLetter(input: CreateLetterInput, tenantClient: TenantClient): Promise<LetterDocument> {
  const tenantId = await getCurrentTenantId()

  const { data: existingRows } = await tenantClient
    .from('letters')
    .select('letter_number')

  const letterNumber = getNextLetterNumber(existingRows ?? [])

  const draft = createLetterDraft(input)
  const identity = createCorrespondenceIdentity(
    '', // assigned by DB
    letterNumber,
    'letter',
  )
  const doc: LetterDocument = { ...draft, identity }
  const normalized = normalizeLetter(doc)

  const payload: LetterInsertPayload = documentToInsertPayload(normalized, tenantId)

  const { data, error } = await tenantClient
    .from('letters')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  const row = data as LetterRow
  return letterRowToDocument(row)
}

export async function updateLetter(
  id: string,
  input: UpdateLetterInput,
  tenantClient: TenantClient,
): Promise<LetterDocument> {
  const payload: LetterUpdatePayload = documentToUpdatePayload(input)

  const { data, error } = await tenantClient
    .from('letters')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as LetterRow
  return letterRowToDocument(row)
}

export async function getLetter(id: string, tenantClient: TenantClient): Promise<LetterDocument | null> {
  const { data, error } = await tenantClient
    .from('letters')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? letterRowToDocument(data as LetterRow) : null
}

export async function listLetters(tenantClient: TenantClient): Promise<LetterDocument[]> {
  const { data, error } = await tenantClient
    .from('letters')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: LetterRow) => letterRowToDocument(row))
}

export async function deleteDraftLetter(id: string, tenantClient: TenantClient): Promise<void> {
  const { error } = await tenantClient
    .from('letters')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')

  if (error) throw error
}
