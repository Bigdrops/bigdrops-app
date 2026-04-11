import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '@/components/Layout'
import { BoqEditor } from '@/components/boq/BoqEditor'
import type { Boq } from '@/domain/boq/types'
import { getBoqById, saveBoq } from '@/domain/boq/storage'
import { toast } from '@/hooks/use-toast'

export default function EditBoq() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [boq, setBoq] = useState<Boq | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loaded = id ? getBoqById(id) : null
    if (!loaded) {
      toast({ title: 'BOQ not found', variant: 'destructive' })
      navigate('/boqs')
      return
    }
    setBoq(loaded)
  }, [id, navigate])

  if (!boq) {
    return <Layout title="Edit BOQ" session={null} hidePageHeader><div className="p-12 text-center text-muted-foreground animate-pulse">Loading BOQ...</div></Layout>
  }

  return (
    <Layout title="Edit BOQ" session={null} hidePageHeader>
      <BoqEditor
        initialBoq={boq}
        saving={saving}
        onSave={async (nextBoq) => {
          setSaving(true)
          const saved = saveBoq(nextBoq)
          setSaving(false)
          toast({ title: 'BOQ updated successfully' })
          navigate(`/boqs/${saved.id}`)
        }}
      />
    </Layout>
  )
}
