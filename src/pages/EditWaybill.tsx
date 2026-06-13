import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '../components/Layout'
import WaybillForm from '../components/waybill/WaybillForm'
import { supabase } from '../supabase'
import {
  mapDbWaybill,
  parseWaybillCustomFields,
  collectWaybillCustomColumns,
} from '../components/waybill/waybillUtils'
import type { Waybill, WaybillItem, WaybillCustomFields, WaybillCustomColumn, WaybillType } from '../components/waybill/waybillUtils'
import type { WaybillFormData } from '../components/waybill/WaybillForm'
import { saveWaybill } from '../domain/waybill/waybillMutations'
import { feedback } from '../lib/feedback'

export default function EditWaybill() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [initialData, setInitialData] = useState<Partial<WaybillFormData> | null>(null)
  const [type, setType] = useState<string | undefined>(undefined)

  useEffect(() => {
    const loadWaybill = async () => {
      if (!id) {
        navigate('/waybills')
        return
      }
      try {
        const { data, error } = await supabase.from('waybills').select('*').eq('id', id).single()
        if (error || !data) {
          navigate('/waybills')
          return
        }
        const wb: Waybill = mapDbWaybill(data)
        setType(wb.type)
        const customFields: WaybillCustomFields = parseWaybillCustomFields(wb.custom_fields)
        const items: WaybillItem[] = wb.items || []
        const customColumns: WaybillCustomColumn[] = collectWaybillCustomColumns(items)
        setInitialData({ waybill: wb, items, customColumns, customFields })
      } catch {
        navigate('/waybills')
      } finally {
        setLoading(false)
      }
    }
    void loadWaybill()
  }, [id, navigate])

  const handleSave = async (data: WaybillFormData) => {
    if (!id) return
    await saveWaybill({
      waybill: data.waybill,
      items: data.items,
      custom_fields: data.customFields,
      mode: 'edit',
      waybillId: id,
    })
    feedback.success('Waybill updated')
    navigate('/waybills')
  }

  if (loading) return null

  return (
    <Layout title="Edit Waybill" session={null}>
      {initialData && type ? (
        <WaybillForm
          type={type as WaybillType}
          onSave={handleSave}
          onClose={() => navigate('/waybills')}
          initialData={initialData}
        />
      ) : null}
    </Layout>
  )
}
