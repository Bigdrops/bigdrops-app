import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '@/components/Layout'
import { BoqEditor } from '@/components/boq/BoqEditor'
import type { Boq } from '@/domain/boq/types'
import { denormalizeToDbBoq, denormalizeToDbBoqRow, normalizeDbBoq } from '@/domain/boq/normalize'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'

export default function EditBoq() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const [boq, setBoq] = useState<Boq | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!tenantClient.isReady) return
    const load = async () => {
      setLoading(true)
      const [boqResult, rowsResult] = await Promise.all([
        tenantClient.from('boqs').select('*').eq('id', id).single(),
        tenantClient.from('boq_rows').select('*').eq('boq_id', id).order('sort_order'),
      ])

      if (boqResult.data) {
        setBoq(normalizeDbBoq(boqResult.data, rowsResult.data || []))
      } else {
        feedback.error('BOQ not found')
        navigate('/boqs')
      }
      setLoading(false)
    }
    load()
  }, [id, tenantClient.isReady, navigate])

  const handleSave = async (nextBoq: Boq) => {
    setSaving(true)
    const dbBoq = denormalizeToDbBoq(nextBoq)
    const { error: boqError } = await tenantClient
      .from('boqs')
      .update(dbBoq)
      .eq('id', id)

    if (boqError) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(boqError, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    // Upsert rows (delete and re-insert for simplicity)
    const { error: deleteError } = await tenantClient.from('boq_rows').delete().eq('boq_id', id)
    if (deleteError) {
      feedback.error('Item save failed', {
        description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const dbRows = nextBoq.table_rows
      .filter((row) => (row.row_type === 'section' ? row.section_title?.trim() : row.description?.trim()))
      .map((row, idx) => denormalizeToDbBoqRow({ ...row, sort_order: idx }, id!))

    if (dbRows.length > 0) {
      const { error: rowsError } = await tenantClient.from('boq_rows').insert(dbRows)
      if (rowsError) {
        feedback.error('Item save failed', { description: rowsError.message })
      }
    }

    setSaving(false)
    feedback.success('BOQ updated successfully')
    navigate(`/boqs/${id}`)
  }

  if (loading) {
    return <Layout title="Edit BOQ" session={null} hidePageHeader immersive><div className="p-12 text-center text-muted-foreground animate-pulse">Loading BOQ...</div></Layout>
  }

  return (
    <Layout title="Edit BOQ" session={null} hidePageHeader immersive>
      <BoqEditor
        initialBoq={boq!}
        saving={saving}
        onSave={handleSave}
      />
    </Layout>
  )
}