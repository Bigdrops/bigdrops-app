import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import WaybillForm from '../components/waybill/WaybillForm'
import WaybillGatewayOverlay from '../components/waybill/WaybillGatewayOverlay'
import { saveWaybill } from '../domain/waybill/waybillMutations'
import { getNextWaybillNumber, mapDbWaybill, parseWaybillCustomFields, collectWaybillCustomColumns } from '../components/waybill/waybillUtils'
import type { Waybill, WaybillType, WaybillItem, WaybillCustomFields, WaybillCustomColumn } from '../components/waybill/waybillUtils'
import type { WaybillFormData } from '../components/waybill/WaybillForm'
import { feedback } from '../lib/feedback'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { useEntity } from '@/lib/tenant/contexts'

interface WaybillFormPageProps {
  mode: 'create' | 'edit'
}

export default function WaybillFormPage({ mode }: WaybillFormPageProps) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { tenantClient } = useEntity()
  const { id } = useParams<{ id: string }>()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const [type, setType] = useState<WaybillType | null>(null)
  const [waybillNumber, setWaybillNumber] = useState<string>('')
  const [loadingNumber, setLoadingNumber] = useState(false)

  const [editLoading, setEditLoading] = useState(isEdit)
  const [editInitialData, setEditInitialData] = useState<Partial<WaybillFormData> | null>(null)
  const [editType, setEditType] = useState<string | undefined>(undefined)

  /* ── Create-mode: generate number after type selection ── */
  useEffect(() => {
    if (!isCreate || !type) return
    let cancelled = false
    const generate = async () => {
      setLoadingNumber(true)
      try {
        const db = tenantClient
        const { data: existingWaybills } = await db
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
  }, [isCreate, type, settings?.document_prefixes])

  /* ── Edit-mode: load waybill by id ── */
  useEffect(() => {
    if (!isEdit || !id) return
    const loadWaybill = async () => {
      try {
        const db = tenantClient
        const { data, error } = await db.from('waybills').select('*').eq('id', id).single()
        if (error || !data) { navigate('/waybills'); return }
        const wb: Waybill = mapDbWaybill(data)
        setEditType(wb.type)
        const customFields: WaybillCustomFields = parseWaybillCustomFields(wb.custom_fields)
        const items: WaybillItem[] = wb.items || []
        const customColumns: WaybillCustomColumn[] = collectWaybillCustomColumns(items)
        setEditInitialData({ waybill: wb, items, customColumns, customFields })
      } catch {
        navigate('/waybills')
      } finally {
        setEditLoading(false)
      }
    }
    void loadWaybill()
  }, [isEdit, id, navigate])

  /* ── Create-mode: blank download ── */
  const handleBlankDownload = async (blankType: WaybillType) => {
    try {
      const prefix = resolvePrefix(settings?.document_prefixes, 'waybill')
      const db = tenantClient

      for (let attempt = 0; attempt <= 3; attempt++) {
        const [existingWaybills, existingBlanks] = await Promise.all([
          db
            .from('waybills')
            .select('waybill_number')
            .order('created_at', { ascending: false })
            .limit(1000),
          db
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

        const { error: logError } = await db.from('blank_waybill_logs').insert([{
          assigned_waybill_number: waybillNumber,
          type: blankType,
        }])

        if (!logError) {
          const { downloadBlankWaybillTemplate } = await import('../components/waybill/blankWaybillTemplate')
          await downloadBlankWaybillTemplate({
            type: blankType,
            waybillNumber,
            date: new Date().toLocaleDateString(),
            companyName: settings?.company_name || 'Company Name',
            companyAddress: settings?.company_address || undefined,
            companyLogoUrl: settings?.company_logo_url || undefined,
            tagline: settings?.company_tagline || undefined,
            companyPhone: settings?.company_phone || undefined,
            companyEmail: settings?.company_email || undefined,
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

  /* ── Create-mode: overlay → form ── */
  if (isCreate && !type) {
    return (
      <WaybillGatewayOverlay
        open
        onSelect={(t) => setType(t)}
        onDownloadBlank={handleBlankDownload}
        onClose={() => navigate('/waybills')}
      />
    )
  }

  /* ── Edit-mode: loading ── */
  if (isEdit && editLoading) {
    return null
  }

  if (isEdit && (!editInitialData || !editType)) return null

  /* ── Shared save handler ── */
  const handleSave = async (data: WaybillFormData) => {
    if (isCreate) {
      const result = await saveWaybill({
        waybill: data.waybill,
        items: data.items,
        custom_fields: data.customFields,
        mode: 'new',
        prefixes: settings?.document_prefixes,
        tenantClient,
      })
      feedback.success('Waybill created')
      navigate(`/waybills/${result.waybillId}`)
    } else {
      const result = await saveWaybill({
        waybill: data.waybill,
        items: data.items,
        custom_fields: data.customFields,
        mode: 'edit',
        waybillId: id,
        prefixes: settings?.document_prefixes,
        tenantClient,
      })
      feedback.success('Waybill updated')
      navigate(`/waybills/${result.waybillId}`)
    }
  }

  return (
    <WaybillForm
      type={isCreate ? type! : editType as WaybillType}
      onSave={handleSave}
      onClose={() => navigate('/waybills')}
      {...(isCreate ? { waybillNumber, loadingNumber } : { initialData: editInitialData! })}
    />
  )
}
