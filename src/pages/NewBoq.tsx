import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { BoqEditor } from '@/components/boq/BoqEditor'
import { createEmptyBoq } from '@/domain/boq/factories'
import type { Boq } from '@/domain/boq/types'
import { denormalizeToDbBoq, denormalizeToDbBoqRow, getNextBoqNumber } from '@/domain/boq/normalize'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { supabase } from '@/supabase'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'

export default function NewBoq() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { tenantClient } = useEntity()
  const [saving, setSaving] = useState(false)

  const handleSave = async (boq: Boq) => {
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      feedback.error('Save failed', { description: 'You must be signed in to create a BOQ.' })
      setSaving(false)
      return
    }

    // Get next BOQ number
    const { data: existingBoqs } = await tenantClient.from('boqs').select('boq_number')
    const boqPrefix = resolvePrefix(settings?.document_prefixes, 'boq')
    const initialBoqNumber = boq.boq_number || getNextBoqNumber(existingBoqs || [], boqPrefix)

    const { data: createdBoq, error: boqError } = await withUniqueRetry(
      async (candidateNumber: string) => {
        const dbBoq = denormalizeToDbBoq({ ...boq, boq_number: candidateNumber });
        return tenantClient.from('boqs').insert([{ ...dbBoq, user_id: user.id }]).select().single();
      },
      async () => {
        const { data: rows } = await tenantClient.from('boqs').select('boq_number')
        return getNextBoqNumber(rows || [], boqPrefix)
      },
    )

    if (boqError || !createdBoq) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(boqError, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const { id: boqId } = createdBoq
    const dbRows = boq.table_rows
      .filter((row) => (row.row_type === 'section' ? row.section_title?.trim() : row.description?.trim()))
      .map((row, idx) => denormalizeToDbBoqRow({ ...row, sort_order: idx }, boqId))

    if (dbRows.length > 0) {
      const { error: rowsError } = await tenantClient.from('boq_rows').insert(dbRows)
      if (rowsError) {
        feedback.error('Item save failed', { description: rowsError.message })
      }
    }

    setSaving(false)
    feedback.success('BOQ created successfully')
    navigate(`/boqs/${boqId}`)
  }

  return (
    <Layout title="New BOQ" session={null} hidePageHeader immersive>
      <BoqEditor
        initialBoq={createEmptyBoq()}
        saving={saving}
        onSave={handleSave}
      />
    </Layout>
  )
}