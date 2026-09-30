import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { BoqEditor } from '@/components/boq/BoqEditor'
import { createEmptyBoq } from '@/domain/boq/factories'
import type { Boq } from '@/domain/boq/types'
import { getNextBoqNumber, normalizeDbBoq } from '@/domain/boq/normalize'
import { fetchAutoCursor } from '@/domain/documentNumbering'
import { resolvePrefix } from '@/domain/prefixConstants'
import { useBoqSave } from '@/hooks/useBoqSave'
import { useSettings } from '@/hooks/useSettings'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'

type BoqFormPageProps = {
  mode: 'create' | 'edit'
}

export default function BoqFormPage({ mode }: BoqFormPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { settings } = useSettings()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const [initialBoq, setInitialBoq] = useState<Boq | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState<Boq | null>(null)
  const [loading, setLoading] = useState(true)
  const currentBoqRef = useRef<Boq>(createEmptyBoq())
  const autoNumberRef = useRef('')

  useEffect(() => {
    if (!tenantClient.isReady) return
    let active = true

    async function loadCreate() {
      const next = createEmptyBoq()
      const prefix = resolvePrefix(settings?.document_prefixes, 'boq')
      const family = `${prefix}-`
      const [{ data: rows }, cursor] = await Promise.all([
        tenantClient.from('boqs').select('boq_number'),
        fetchAutoCursor(tenantClient, family),
      ])
      if (!active) return
      const number = getNextBoqNumber(rows || [], prefix, cursor)
      next.boq_number = number
      autoNumberRef.current = number
      currentBoqRef.current = next
      setInitialBoq(next)
      setInitialSnapshot(null)
      setLoading(false)
    }

    async function loadEdit() {
      if (!id) {
        navigate('/boqs')
        return
      }

      const [boqResult, rowsResult] = await Promise.all([
        tenantClient.from('boqs').select('*').eq('id', id).single(),
        tenantClient.from('boq_rows').select('*').eq('boq_id', id).order('sort_order'),
      ])

      if (!active) return
      if (!boqResult.data) {
        feedback.error('Cost & Pricing Sheet not found')
        navigate('/boqs')
        return
      }

      const normalized = normalizeDbBoq(boqResult.data, rowsResult.data || [])
      currentBoqRef.current = normalized
      setInitialBoq(normalized)
      setInitialSnapshot(normalized)
      setLoading(false)
    }

    setLoading(true)
    void (isCreate ? loadCreate() : loadEdit())

    return () => {
      active = false
    }
  }, [id, isCreate, navigate, settings?.document_prefixes, tenantClient, tenantClient.isReady])

  const { save, saving } = useBoqSave({
    getBoq: () => currentBoqRef.current,
    initialSnapshot,
    documentPrefixes: settings?.document_prefixes,
    isCreate,
    isEdit,
    id,
    numberIsManual:
      isCreate &&
      Boolean(currentBoqRef.current.boq_number?.trim()) &&
      currentBoqRef.current.boq_number !== autoNumberRef.current,
    navigate,
  })

  const handleSave = async (boq: Boq) => {
    currentBoqRef.current = boq
    await save('open')
  }

  const handleCancel = () => navigate(isCreate ? '/boqs' : `/boqs/${id}`)

  if (loading || !initialBoq) {
    return (
      <Layout title={isCreate ? 'New Cost & Pricing Sheet' : 'Edit Cost & Pricing Sheet'} hidePageHeader immersive>
        <div className="p-12 text-center text-sm text-bd-text-muted">Loading Cost & Pricing Sheet...</div>
      </Layout>
    )
  }

  return (
    <Layout title={isCreate ? 'New Cost & Pricing Sheet' : 'Edit Cost & Pricing Sheet'} hidePageHeader immersive>
      <BoqEditor
        initialBoq={initialBoq}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        mode={mode}
      />
    </Layout>
  )
}
