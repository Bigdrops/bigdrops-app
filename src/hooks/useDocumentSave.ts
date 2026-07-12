import { useCallback, useState } from 'react'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { createSaveTimer } from '@/lib/saveTiming'

export interface ValidationResult {
  valid: boolean
  error?: string
  errorDescription?: string
}

export interface DocumentSaveStrategy<TInput> {
  validate?(input: TInput): Promise<ValidationResult | null> | ValidationResult | null
  buildPayload(input: TInput, ctx: { status: string }): any
  persist(
    input: TInput,
    payload: any,
    ctx: { isCreate: boolean; isEdit: boolean; id?: string },
  ): Promise<{ data: any; error: any }>
  afterSave?(
    input: TInput,
    ctx: { effectiveId: string; isCreate: boolean; createResult?: any },
  ): Promise<void>
  getNavigationTarget(effectiveId: string): string
}

export function useDocumentSave<TInput>(options: {
  input: TInput
  strategy: DocumentSaveStrategy<TInput>
  isCreate: boolean
  isEdit: boolean
  id?: string
  navigate: (path: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const { input, strategy, isCreate, isEdit, id, navigate } = options

  const save = useCallback(
    async (status: string) => {
      if (strategy.validate) {
        const validation = await strategy.validate(input)
        if (validation && !validation.valid) {
          feedback.error(validation.error!, { description: validation.errorDescription })
          return
        }
      }

      setSaving(true)
      const timer = createSaveTimer('doc-save-total', {
        mode: isCreate ? 'new' : 'edit',
        status,
        id: id ?? null,
      })

      const payload = strategy.buildPayload(input, { status })

      let persistResult: { data: any; error: any }
      try {
        persistResult = await strategy.persist(input, payload, {
          isCreate,
          isEdit,
          id,
        })
      } catch (err) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(err, { action: 'save' }),
        })
        setSaving(false)
        return
      }

      const { data, error } = persistResult

      if (error || (isCreate && !data)) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(error, { action: 'save' }),
        })
        setSaving(false)
        return
      }

      const effectiveId = isCreate ? data!.id : id!

      if (strategy.afterSave) {
        try {
          await strategy.afterSave(input, { effectiveId, isCreate, createResult: data })
        } catch {
          setSaving(false)
          return
        }
      }

      setSaving(false)
      navigate(strategy.getNavigationTarget(effectiveId))
      timer.finish()
    },
    [input, strategy, isCreate, isEdit, id, navigate],
  )

  return { save, saving }
}
