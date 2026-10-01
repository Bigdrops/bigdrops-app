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
  const props = {
    data: viewData,
    status,
    formatters: { money: formatMoney, percent: formatPercent },
    onBack: () => navigate('/cost-pricing-sheets'),
    onEdit: () => navigate(`/cost-pricing-sheets/edit/${cps.id}`),
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
