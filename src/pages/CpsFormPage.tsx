import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { CostPricingSheetEditor } from '@/components/cps/CostPricingSheetEditor'
import { createEmptyCps } from '@/domain/cps/factories'
import type { Cps } from '@/domain/cps/types'
import { getNextCpsNumber, normalizeDbCps } from '@/domain/cps/normalize'
import { fetchAutoCursor } from '@/domain/documentNumbering'
import { resolvePrefix } from '@/domain/prefixConstants'
import { useCpsSave } from '@/hooks/useCpsSave'
import { useSettings } from '@/hooks/useSettings'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'

type CpsFormPageProps = {
  mode: 'create' | 'edit'
}

export default function CpsFormPage({ mode }: CpsFormPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { settings } = useSettings()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const [initialCps, setInitialCps] = useState<Cps | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState<Cps | null>(null)
  const [loading, setLoading] = useState(true)
  const currentCpsRef = useRef<Cps>(createEmptyCps())
  const autoNumberRef = useRef('')

  useEffect(() => {
    if (!tenantClient.isReady) return
    let active = true

    async function loadCreate() {
      const next = createEmptyCps()
      const prefix = resolvePrefix(settings?.document_prefixes, 'cps_sheets')
      const family = `${prefix}-`
      const [{ data: rows }, cursor] = await Promise.all([
        tenantClient.from('cps_sheets').select('cps_number'),
        fetchAutoCursor(tenantClient, family),
      ])
      if (!active) return
      const number = getNextCpsNumber(rows || [], prefix, cursor)
      next.cps_number = number
      autoNumberRef.current = number
      currentCpsRef.current = next
      setInitialCps(next)
      setInitialSnapshot(null)
      setLoading(false)
    }

    async function loadEdit() {
      if (!id) {
        navigate('/cost-pricing-sheets')
        return
      }

      const [cpsResult, rowsResult] = await Promise.all([
        tenantClient.from('cps_sheets').select('*').eq('id', id).single(),
        tenantClient.from('cps_rows').select('*').eq('cps_sheet_id', id).order('sort_order'),
      ])

      if (!active) return
      if (!cpsResult.data) {
        feedback.error('Cost & Pricing Sheet not found')
        navigate('/cost-pricing-sheets')
        return
      }

      const normalized = normalizeDbCps(cpsResult.data, rowsResult.data || [])
      currentCpsRef.current = normalized
      setInitialCps(normalized)
      setInitialSnapshot(normalized)
      setLoading(false)
    }

    setLoading(true)
    void (isCreate ? loadCreate() : loadEdit())

    return () => {
      active = false
    }
  }, [id, isCreate, navigate, settings?.document_prefixes, tenantClient, tenantClient.isReady])

  const { save, saving } = useCpsSave({
    getCps: () => currentCpsRef.current,
    initialSnapshot,
    documentPrefixes: settings?.document_prefixes,
    isCreate,
    isEdit,
    id,
    numberIsManual:
      isCreate &&
      Boolean(currentCpsRef.current.cps_number?.trim()) &&
      currentCpsRef.current.cps_number !== autoNumberRef.current,
    navigate,
  })

  const handleSave = async (cps: Cps) => {
    currentCpsRef.current = cps
    await save('open')
  }

  const handleCancel = () => navigate(isCreate ? '/cost-pricing-sheets' : `/cost-pricing-sheets/${id}`)

  if (loading || !initialCps) {
    return (
      <Layout title={isCreate ? 'New Cost & Pricing Sheet' : 'Edit Cost & Pricing Sheet'} hidePageHeader immersive>
        <div className="p-12 text-center text-sm text-bd-text-muted">Loading Cost & Pricing Sheet...</div>
      </Layout>
    )
  }

  return (
    <Layout title={isCreate ? 'New Cost & Pricing Sheet' : 'Edit Cost & Pricing Sheet'} hidePageHeader immersive>
      <CostPricingSheetEditor
        initialCps={initialCps}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        mode={mode}
      />
    </Layout>
  )
}
