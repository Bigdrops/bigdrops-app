import { supabase } from '@/supabase'
import { getCurrentTenantId } from '@/lib/tenant'
import type { CreateLetterInput, UpdateLetterInput, LetterDocument } from './types'
import type { LetterRow, LetterInsertPayload, LetterUpdatePayload } from './persistence'
import { letterRowToDocument, documentToInsertPayload, documentToUpdatePayload } from './persistence'
import { getNextLetterNumber } from './numbering'
import { createLetterDraft, normalizeLetter } from './normalize'
import { createCorrespondenceIdentity } from './normalize'

export async function createLetter(input: CreateLetterInput): Promise<LetterDocument> {
  const tenantId = await getCurrentTenantId()

  const { data: existingRows } = await supabase
    .from('letters')
    .select('letter_number')
    .eq('tenant_id', tenantId)

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

  const { data, error } = await supabase
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
): Promise<LetterDocument> {
  const payload: LetterUpdatePayload = documentToUpdatePayload(input)

  const { data, error } = await supabase
    .from('letters')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as LetterRow
  return letterRowToDocument(row)
}

export async function getLetter(id: string): Promise<LetterDocument | null> {
  const tenantId = await getCurrentTenantId()

  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error
  return data ? letterRowToDocument(data as LetterRow) : null
}

export async function listLetters(): Promise<LetterDocument[]> {
  const tenantId = await getCurrentTenantId()

  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: LetterRow) => letterRowToDocument(row))
}

export async function deleteDraftLetter(id: string): Promise<void> {
  const tenantId = await getCurrentTenantId()

  const { error } = await supabase
    .from('letters')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')

  if (error) throw error
}
