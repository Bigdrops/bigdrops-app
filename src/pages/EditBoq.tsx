import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '@/components/Layout'
import { BoqEditor } from '@/components/boq/BoqEditor'
import type { Boq } from '@/domain/boq/types'
import { getBoqById, saveBoq } from '@/domain/boq/storage'
import { feedback } from '@/lib/feedback'

export default function EditBoq() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [boq, setBoq] = useState<Boq | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loaded = id ? getBoqById(id) : null
    if (!loaded) {
      feedback.error('BOQ not found')
      navigate('/boqs')
      return
    }
    setBoq(loaded)
  }, [id, navigate])

  if (!boq) {
    return <Layout title="Edit BOQ" session={null} hidePageHeader immersive><div className="p-12 text-center text-muted-foreground animate-pulse">Loading BOQ...</div></Layout>
  }

  return (
    <Layout title="Edit BOQ" session={null} hidePageHeader immersive>
      <BoqEditor
        initialBoq={boq}
        saving={saving}
        onSave={async (nextBoq) => {
          setSaving(true)
          const saved = saveBoq(nextBoq)
          setSaving(false)
          feedback.success('BOQ updated successfully')
          navigate(`/boqs/${saved.id}`)
        }}
      />
    </Layout>
  )
}
