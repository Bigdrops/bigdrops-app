import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { BoqEditor } from '@/components/boq/BoqEditor'
import { createEmptyBoq } from '@/domain/boq/factories'
import { saveBoq } from '@/domain/boq/storage'
import { feedback } from '@/lib/feedback'

export default function NewBoq() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  return (
    <Layout title="New BOQ" session={null} hidePageHeader>
      <BoqEditor
        initialBoq={createEmptyBoq()}
        saving={saving}
        onSave={async (boq) => {
          setSaving(true)
          const saved = saveBoq(boq)
          setSaving(false)
          feedback.success('BOQ created successfully')
          navigate(`/boqs/${saved.id}`)
        }}
      />
    </Layout>
  )
}
