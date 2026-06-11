import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import WaybillForm from '../components/waybill/WaybillForm'
import WaybillGatewayOverlay from '../components/waybill/WaybillGatewayOverlay'
import { saveWaybill } from '../domain/waybill/waybillMutations'
import { getNextWaybillNumber } from '../components/waybill/waybillUtils'
import type { WaybillType } from '../components/waybill/waybillUtils'
import type { WaybillFormData } from '../components/waybill/WaybillForm'
import { feedback } from '../lib/feedback'
import { supabase } from '../supabase'

export default function NewWaybill() {
  const navigate = useNavigate()
  const [type, setType] = useState<WaybillType | null>(null)

  const handleBlankDownload = async (blankType: WaybillType) => {
    try {
      const { data: existingWaybills } = await supabase
        .from('waybills')
        .select('waybill_number')
        .order('created_at', { ascending: false })
        .limit(1000)
      const existingNumbers = (existingWaybills || []).map((w) => w.waybill_number || '').filter(Boolean)
      const waybillNumber = getNextWaybillNumber(blankType, existingNumbers)

      const { error: logError } = await supabase.from('blank_waybill_logs').insert([{
        assigned_waybill_number: waybillNumber,
        type: blankType,
      }])
      if (logError) {
        console.warn('Failed to log blank waybill:', logError)
      }

      const { downloadBlankWaybillTemplate } = await import('../components/waybill/blankWaybillTemplate')
      await downloadBlankWaybillTemplate(blankType, waybillNumber)
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
      await saveWaybill({
        waybill: data.waybill,
        items: data.items,
        custom_fields: data.customFields,
        mode: 'new',
        isOffline: false,
      })
      feedback.success('Waybill created')
      navigate('/waybills')
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <WaybillForm
      type={type}
      onSave={handleSave}
      onClose={() => navigate('/waybills')}
    />
  )
}
