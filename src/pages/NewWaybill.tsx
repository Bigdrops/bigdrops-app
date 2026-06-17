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
      const { data: existingWaybills } = await supabase
        .from('waybills')
        .select('waybill_number')
        .order('created_at', { ascending: false })
        .limit(1000)
      const existingNumbers = (existingWaybills || []).map((w) => w.waybill_number || '').filter(Boolean)
      const waybillNumber = getNextWaybillNumber(blankType, existingNumbers, resolvePrefix(settings?.document_prefixes, 'waybill'), 'blank')

      const { error: logError } = await supabase.from('blank_waybill_logs').insert([{
        assigned_waybill_number: waybillNumber,
        type: blankType,
      }])
      if (logError) {
        console.warn('Failed to log blank waybill:', logError)
      }

      const { downloadBlankWaybillTemplate } = await import('../components/waybill/blankWaybillTemplate')
      await downloadBlankWaybillTemplate(blankType, waybillNumber, settings?.company_name || 'Company Name')
      feedback.success(`Blank template ${waybillNumber} downloaded`)
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
