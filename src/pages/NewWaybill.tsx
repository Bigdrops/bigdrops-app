import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import WaybillForm from '../components/waybill/WaybillForm'
import WaybillGatewayOverlay from '../components/waybill/WaybillGatewayOverlay'
import { saveWaybill } from '../domain/waybill/waybillMutations'
import type { WaybillType } from '../components/waybill/waybillUtils'
import type { WaybillFormData } from '../components/waybill/WaybillForm'
import { feedback } from '../lib/feedback'

export default function NewWaybill() {
  const navigate = useNavigate()
  const [type, setType] = useState<WaybillType | null>(null)

  const handleBlankDownload = async (blankType: WaybillType) => {
    try {
      const { downloadBlankWaybillTemplate } = await import('../components/waybill/blankWaybillTemplate')
      await downloadBlankWaybillTemplate(blankType)
      feedback.success(`Blank ${blankType} template downloaded`)
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
