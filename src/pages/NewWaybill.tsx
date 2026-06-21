import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import WaybillForm from '../components/waybill/WaybillForm'
import WaybillGatewayOverlay from '../components/waybill/WaybillGatewayOverlay'
import { saveWaybill } from '../domain/waybill/waybillMutations'
import { getNextWaybillNumber } from '../components/waybill/waybillUtils'
import type { Waybill, WaybillType } from '../components/waybill/waybillUtils'
import type { WaybillFormData } from '../components/waybill/WaybillForm'
import { feedback } from '../lib/feedback'
import { supabase } from '../supabase'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'

export default function NewWaybill() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [type, setType] = useState<WaybillType | null>(null)
  const [waybillNumber, setWaybillNumber] = useState<string>('')
  const [loadingNumber, setLoadingNumber] = useState(false)

  useEffect(() => {
    if (!type) return
    let cancelled = false
    const generate = async () => {
      setLoadingNumber(true)
      try {
        const { data: existingWaybills } = await supabase
          .from('waybills')
          .select('waybill_number')
          .order('created_at', { ascending: false })
          .limit(1000)
        const existingNumbers = (existingWaybills || []).map((w) => w.waybill_number || '').filter(Boolean)
        const number = getNextWaybillNumber(type, existingNumbers, resolvePrefix(settings?.document_prefixes, 'waybill'))
        if (!cancelled) setWaybillNumber(number)
      } finally {
        if (!cancelled) setLoadingNumber(false)
      }
    }
    generate()
    return () => { cancelled = true }
  }, [type, settings?.document_prefixes])

  const handleBlankDownload = async (blankType: WaybillType) => {
    try {
      const prefix = resolvePrefix(settings?.document_prefixes, 'waybill')

      for (let attempt = 0; attempt <= 3; attempt++) {
        const [existingWaybills, existingBlanks] = await Promise.all([
          supabase
            .from('waybills')
            .select('waybill_number')
            .order('created_at', { ascending: false })
            .limit(1000),
          supabase
            .from('blank_waybill_logs')
            .select('assigned_waybill_number')
            .order('downloaded_at', { ascending: false })
            .limit(1000),
        ])
        const existingNumbers = [
          ...(existingWaybills.data || []).map((w) => w.waybill_number || ''),
          ...(existingBlanks.data || []).map((b) => b.assigned_waybill_number || ''),
        ].filter(Boolean)
        const waybillNumber = getNextWaybillNumber(blankType, existingNumbers, prefix, 'blank')

        const { error: logError } = await supabase.from('blank_waybill_logs').insert([{
          assigned_waybill_number: waybillNumber,
          type: blankType,
        }])

        if (!logError) {
          const { downloadBlankWaybillTemplate } = await import('../components/waybill/blankWaybillTemplate')
          const { buildWaybillRenderModel } = await import('../domain/waybill/engine/assembly')
          const { STANDARD_ITEM_COLUMNS } = await import('../domain/waybill/contracts/waybillContract')

          const model = buildWaybillRenderModel({
            waybill: {
              waybill_number: waybillNumber,
              type: blankType,
              date: new Date().toISOString(),
              items: [],
            },
            columns: STANDARD_ITEM_COLUMNS.map((c) => ({ key: c.key, label: c.label })),
            company: {
              name: settings?.company_name || 'Company Name',
              tagline: settings?.company_tagline || null,
              logo: settings?.company_logo_url || null,
              address: settings?.company_address || null,
              phone: settings?.company_phone || null,
              email: settings?.company_email || null,
            },
          })

          await downloadBlankWaybillTemplate({
            model,
            type: blankType,
          })
          feedback.success(`Blank template ${waybillNumber} downloaded`)
          return
        }

        if (logError.code === '23505' && attempt < 3) continue
        throw new Error(logError.message || 'Failed to reserve waybill number')
      }
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  if (!type) {
    return (
      <WaybillGatewayOverlay
        open
        onSelect={(t) => setType(t)}
        onDownloadBlank={handleBlankDownload}
        onClose={() => navigate('/waybills')}
      />
    )
  }

  const handleSave = async (data: WaybillFormData) => {
    try {
      const result = await saveWaybill({
        waybill: data.waybill,
        items: data.items,
        custom_fields: data.customFields,
        mode: 'new',
        prefixes: settings?.document_prefixes,
      })
      feedback.success('Waybill created')
      navigate(`/waybills/${result.waybillId}`)
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <WaybillForm
      type={type}
      onSave={handleSave}
      onClose={() => navigate('/waybills')}
      waybillNumber={waybillNumber}
      loadingNumber={loadingNumber}
    />
  )
}
