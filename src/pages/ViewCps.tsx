import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '@/components/Layout'
import {
  CostPricingSheetDesktopView,
  CostPricingSheetMobileFoldView,
} from '@/components/cps/CostPricingSheetViewPresentations'
import { normalizeDbCps } from '@/domain/cps/normalize'
import { handleDownloadCpsPdf } from '@/domain/cps/pdfDownloadHandler'
import type { Cps } from '@/domain/cps/types'
import type { CpsConversionOptions } from '@/domain/cps/conversion'
import { buildCpsViewData } from '@/domain/cps/viewData'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useSettings } from '@/hooks/useSettings'
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
  const { settings } = useSettings()
  const { isDesktop, hasFold, isTablet } = useLayoutMode()
  const [cps, setCps] = useState<Cps | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

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

  const status = String((cps as any)?.status || 'Draft')
  const cpsId = cps?.id

  // Hooks must all run above the loading early return. A hook below that
  // guard executes only after data loads, which changes the hook count
  // across renders and throws React #310 on the loading-to-loaded
  // transition. The in-callback guards below are unreachable in practice
  // (actions render only after load) and exist for type narrowing.
  const actions = useMemo(() => ({
    onConvertToQuotation: async (options?: CpsConversionOptions) => {
      if (!cps) return
      const created = await convertCpsToQuotation({ cps, tenantClient, prefixes: settings?.document_prefixes, options })
      feedback.success('Quotation created from Cost & Pricing Sheet')
      navigate(`/quotations/${(created as { id: string }).id}`)
    },
    onDuplicate: async () => {
      if (!cpsId) return
      const created = await duplicateCpsRecord(cpsId, tenantClient)
      feedback.success('Cost & Pricing Sheet duplicated')
      navigate(`/cost-pricing-sheets/${(created as { id: string }).id}`)
    },
    onToggleStatus: async () => {
      if (!cps || !cpsId) return
      const next = status.toLowerCase() === 'approved' ? 'open' : 'approved'
      await updateCpsStatus(cpsId, next, tenantClient)
      setCps({ ...cps, status: next } as Cps)
      feedback.success(next === 'approved' ? 'Cost & Pricing Sheet approved' : 'Cost & Pricing Sheet reopened')
    },
    onArchive: async () => {
      if (!cpsId) return
      await archiveCpsRecord(cpsId, tenantClient)
      feedback.success('Cost & Pricing Sheet archived')
      navigate('/cost-pricing-sheets')
    },
    onDelete: async () => {
      if (!cpsId) return
      await deleteCpsRecord(cpsId, tenantClient)
      feedback.success('Cost & Pricing Sheet deleted')
      navigate('/cost-pricing-sheets')
    },
    onDownload: async () => {
      if (!cps || downloading) return
      await handleDownloadCpsPdf({
        cps,
        settings,
        setDownloading,
      })
    },
  }), [cps, cpsId, navigate, status, tenantClient, settings, downloading])

  if (loading || !cps || !viewData) {
    return (
      <Layout title="Cost & Pricing Sheet" session={null} hidePageHeader contentClassName="!max-w-none md:!px-0 md:!py-0">
        <div className="min-h-[60vh] p-12 text-center text-sm text-bd-text-muted">Loading Cost & Pricing Sheet...</div>
      </Layout>
    )
  }

  const props = {
    data: viewData,
    status,
    formatters: { money: formatMoney, percent: formatPercent },
    onBack: () => navigate('/cost-pricing-sheets'),
    onEdit: () => navigate(`/cost-pricing-sheets/edit/${cps.id}`),
    onDownload: () => void actions.onDownload(),
    downloading,
    actions,
  }
  const useDesktopComposition = isDesktop && !hasFold && !isTablet

  return (
    <Layout title="Cost & Pricing Sheet" session={null} hidePageHeader contentClassName="!max-w-none md:!px-0 md:!py-0">
      {useDesktopComposition ? (
        <CostPricingSheetDesktopView {...props} />
      ) : (
        <CostPricingSheetMobileFoldView {...props} />
      )}
    </Layout>
  )
}
