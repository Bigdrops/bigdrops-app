import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '@/components/Layout'
import {
  CostPricingSheetDesktopView,
  CostPricingSheetMobileFoldView,
} from '@/components/cps/CostPricingSheetViewPresentations'
import { normalizeDbCps } from '@/domain/cps/normalize'
import type { Cps } from '@/domain/cps/types'
import { buildCpsViewData } from '@/domain/cps/viewData'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'

import {
  archiveCpsRecord,
  convertCpsToQuotation,
  deleteCpsRecord,
  duplicateCpsRecord,
  updateCpsStatus,
} from './view-cps-actions'

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0)
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

export default function ViewCps() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { isDesktop, hasFold, isTablet } = useLayoutMode()
  const [cps, setCps] = useState<Cps | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantClient.isReady) return
    let active = true

    async function load() {
      if (!id) {
        navigate('/cost-pricing-sheets')
        return
      }

      setLoading(true)
      const [cpsResult, rowsResult] = await Promise.all([
        tenantClient.from('cps_sheets').select('*').eq('id', id).single(),
        tenantClient.from('cps_rows').select('*').eq('cps_sheet_id', id).order('sort_order'),
      ])

      if (!active) return
      if (cpsResult.error || !cpsResult.data) {
        feedback.error('Cost & Pricing Sheet not found')
        navigate('/cost-pricing-sheets')
        return
      }

      setCps(normalizeDbCps(cpsResult.data, rowsResult.data || []))
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [id, navigate, tenantClient, tenantClient.isReady])

  const viewData = useMemo(() => (cps ? buildCpsViewData(cps) : null), [cps])

  if (loading || !cps || !viewData) {
    return (
      <Layout title="Cost & Pricing Sheet" session={null} hidePageHeader immersive>
        <div className="min-h-[60vh] p-12 text-center text-sm text-bd-text-muted">Loading Cost & Pricing Sheet...</div>
      </Layout>
    )
  }

  const status = String((cps as any).status || 'Draft')
  const cpsId = cps.id

  // Production View actions. Each reuses the established CPS record helpers;
  // no new persistence, numbering, or conversion semantics are introduced here.
  const actions = useMemo(() => ({
    onConvertToQuotation: async () => {
      const items = (cps.table_rows || []).map((row) =>
        row.row_type === 'section'
          ? { ...row, row_type: 'group_header', group_name: row.section_title || row.description || 'Group' }
          : row,
      )
      const created = await convertCpsToQuotation({ cps, items: items as any[], tenantClient })
      feedback.success('Quotation created from Cost & Pricing Sheet')
      navigate(`/quotations/${(created as { id: string }).id}`)
    },
    onDuplicate: async () => {
      const created = await duplicateCpsRecord(cpsId, tenantClient)
      feedback.success('Cost & Pricing Sheet duplicated')
      navigate(`/cost-pricing-sheets/${(created as { id: string }).id}`)
    },
    onToggleStatus: async () => {
      const next = status.toLowerCase() === 'approved' ? 'open' : 'approved'
      await updateCpsStatus(cpsId, next, tenantClient)
      setCps({ ...cps, status: next } as Cps)
      feedback.success(next === 'approved' ? 'Cost & Pricing Sheet approved' : 'Cost & Pricing Sheet reopened')
    },
    onArchive: async () => {
      await archiveCpsRecord(cpsId, tenantClient)
      feedback.success('Cost & Pricing Sheet archived')
      navigate('/cost-pricing-sheets')
    },
    onDelete: async () => {
      await deleteCpsRecord(cpsId, tenantClient)
      feedback.success('Cost & Pricing Sheet deleted')
      navigate('/cost-pricing-sheets')
    },
  }), [cps, cpsId, navigate, status, tenantClient])

  const props = {
    data: viewData,
    status,
    formatters: { money: formatMoney, percent: formatPercent },
    onBack: () => navigate('/cost-pricing-sheets'),
    onEdit: () => navigate(`/cost-pricing-sheets/edit/${cps.id}`),
    actions,
  }
  const useDesktopComposition = isDesktop && !hasFold && !isTablet

  return (
    <Layout title="Cost & Pricing Sheet" session={null} hidePageHeader immersive>
      {useDesktopComposition ? (
        <CostPricingSheetDesktopView {...props} />
      ) : (
        <CostPricingSheetMobileFoldView {...props} />
      )}
    </Layout>
  )
}
