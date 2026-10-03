import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { CostPricingSheetForm } from '@/components/cps/CostPricingSheetForm'
import type { CpsClient, CpsDocumentFields, CpsRow } from '@/components/cps/CostPricingSheetForm'
import { createEmptyCps } from '@/domain/cps/factories'
import type { Cps } from '@/domain/cps/types'
import { getNextCpsNumber, normalizeDbCps } from '@/domain/cps/normalize'
import { fetchAutoCursor } from '@/domain/documentNumbering'
import { resolvePrefix } from '@/domain/prefixConstants'
import { useSettings } from '@/hooks/useSettings'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'

type CpsFormPageProps = {
  mode: 'create' | 'edit'
}

function toCpsNumber(value: unknown) {
  const numeric = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

function toCpsDocument(cps: Cps): Partial<CpsDocumentFields> {
  return {
    title: cps.title || '',
    sheetNumber: cps.cps_number || '',
    issueDate: cps.issue_date || '',
    site: cps.project_name || '',
    notes: cps.notes || '',
  }
}

function toCpsClient(cps: Cps): CpsClient | null {
  const snapshot = cps.custom_fields?.client_snapshot as Partial<CpsClient> | null | undefined
  const name = cps.client_name || snapshot?.name || ''
  if (!name) return null

  return {
    id: String(cps.custom_fields?.client_id || snapshot?.id || 'current-cps-client'),
    name,
    person: String(snapshot?.person || (snapshot as any)?.contact_person || ''),
    phone: String(snapshot?.phone || ''),
    email: String(snapshot?.email || ''),
    addr: String(snapshot?.addr || ''),
  }
}

function toCpsRows(cps: Cps): CpsRow[] {
  const groupIds = new Map<string, number>()

  return (cps.table_rows || []).map((row, index) => {
    const id = index + 1
    if (row.row_type === 'section') {
      const sourceGroupId = row.group_id || row.id || row._uiKey || `section-${index}`
      groupIds.set(sourceGroupId, id)
      return {
        id,
        type: 'group',
        title: row.section_title || row.description || 'Group',
      }
    }

    const gid = row.group_id ? groupIds.get(row.group_id) ?? null : null
    return {
      id,
      type: 'item',
      gid,
      desc: row.description || '',
      sub: row.specification || '',
      subOpen: false,
      qty: toCpsNumber(row.quantity),
      unit: row.unit || '',
      make: row.make_brand || '',
      cp: toCpsNumber(row.cp),
      sp: toCpsNumber(row.sp),
      image: row.image_url || null,
    }
  })
}

export default function CpsFormPage({ mode }: CpsFormPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { settings } = useSettings()
  const isCreate = mode === 'create'
  const [initialCps, setInitialCps] = useState<Cps | null>(null)
  const [loading, setLoading] = useState(true)

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
      next.cps_number = getNextCpsNumber(rows || [], prefix, cursor)
      setInitialCps(next)
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

      setInitialCps(normalizeDbCps(cpsResult.data, rowsResult.data || []))
      setLoading(false)
    }

    setLoading(true)
    void (isCreate ? loadCreate() : loadEdit())

    return () => {
      active = false
    }
  }, [id, isCreate, navigate, settings?.document_prefixes, tenantClient, tenantClient.isReady])

  const handleCancel = () => navigate(isCreate ? '/cost-pricing-sheets' : `/cost-pricing-sheets/${id}`)

  if (loading || !initialCps) {
    return (
      <Layout title={isCreate ? 'New Cost & Pricing Sheet' : 'Edit Cost & Pricing Sheet'} hidePageHeader immersive>
        <div className="p-12 text-center text-sm text-bd-text-muted">Loading Cost & Pricing Sheet...</div>
      </Layout>
    )
  }

  const client = toCpsClient(initialCps)

  return (
    <Layout title={isCreate ? 'New Cost & Pricing Sheet' : 'Edit Cost & Pricing Sheet'} hidePageHeader immersive>
      <CostPricingSheetForm
        key={`cps-form-${mode}-${initialCps.id || initialCps.cps_number || 'new'}`}
        modeLabel={isCreate ? 'Draft' : 'Editing'}
        onBack={handleCancel}
        initialDocument={toCpsDocument(initialCps)}
        initialRows={toCpsRows(initialCps)}
        clients={client ? [client] : []}
        initialClient={client}
      />
    </Layout>
  )
}
