import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../components/Layout'
import WaybillForm from '../components/waybill/WaybillForm'
import WaybillGatewayOverlay from '../components/waybill/WaybillGatewayOverlay'
import { saveWaybill } from '../domain/waybill/waybillMutations'
import type { WaybillType } from '../components/waybill/waybillUtils'
import type { WaybillFormData } from '../components/waybill/WaybillForm'
import { feedback } from '../lib/feedback'

export default function NewWaybill() {
  const navigate = useNavigate()
  const [type, setType] = useState<WaybillType | null>(null)

  if (!type) {
    return (
      <Layout title="New Waybill" session={null}>
        <WaybillGatewayOverlay
          open
          onSelect={(t) => setType(t)}
          onClose={() => navigate('/waybills')}
        />
      </Layout>
    )
  }

  const handleSave = async (data: WaybillFormData) => {
    await saveWaybill({
      waybill: data.waybill,
      items: data.items,
      custom_fields: data.customFields,
      mode: 'new',
      isOffline: false,
    })
    feedback.success('Waybill created')
    navigate('/waybills')
  }

  return (
    <Layout title="New Waybill" session={null}>
      <WaybillForm
        type={type}
        onSave={handleSave}
        onClose={() => navigate('/waybills')}
      />
    </Layout>
  )
}
