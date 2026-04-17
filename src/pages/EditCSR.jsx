import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import CsrFormScreen from '@/components/csr/CsrFormScreen'
import {
  createDefaultCsr,
  DEFAULT_CSR_META,
  DEFAULT_MATERIAL_ROW,
  parseCsrMaterials,
  serializeCsrMaterials,
} from '../components/csr/csrUtils'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'

export default function EditCSR() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [csr, setCsr] = useState(() => createDefaultCsr(false))
  const [csrMeta, setCsrMeta] = useState(() => ({ ...DEFAULT_CSR_META }))
  const [materialsRows, setMaterialsRows] = useState([{ ...DEFAULT_MATERIAL_ROW }])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase.from('csrs').select('*').eq('id', id).single()

        if (error) {
          toast({ title: 'Load failed', description: error.message, variant: 'destructive' })
          navigate('/csr')
          return
        }

        const parsed = parseCsrMaterials(data.materials_used, data)
        setCsr((current) => ({ ...current, ...data }))
        setCsrMeta(parsed.meta)
        setMaterialsRows(parsed.materialsRows.length > 0 ? parsed.materialsRows : [{ ...DEFAULT_MATERIAL_ROW }])
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadData()
    }
  }, [id, navigate])

  const update = (field, value) => {
    setCsr((current) => ({ ...current, [field]: value }))
  }

  const updateMeta = (field, value) => {
    setCsrMeta((current) => ({ ...current, [field]: value }))
  }

  const updateMaterialRow = (index, field, value) => {
    setMaterialsRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    )
  }

  const addMaterialRow = () => {
    setMaterialsRows((current) => [...current, { ...DEFAULT_MATERIAL_ROW }])
  }

  const removeMaterialRow = (index) => {
    setMaterialsRows((current) =>
      current.length === 1 ? [{ ...DEFAULT_MATERIAL_ROW }] : current.filter((_, rowIndex) => rowIndex !== index),
    )
  }

  const handleApplyImport = (result) => {
    setCsr((current) => ({ ...current, ...result.fields }))

    if (result.hasMaterials) {
      setMaterialsRows(
        result.materials.length > 0
          ? result.materials.map((row) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
          : [{ ...DEFAULT_MATERIAL_ROW }],
      )
    }

    if (result.hasOperationalReadings) {
      setCsrMeta((current) => ({ ...current, showOperationalReadings: true }))
    }
  }

  const handleSave = async () => {
    if (!csr.client_id) {
      toast({ title: 'Client required', description: 'Please select a client before saving', variant: 'destructive' })
      return
    }

    const csrData = {
      ...csr,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
      show_po: Boolean(String(csr.po_number || '').trim()),
      materials_used: serializeCsrMaterials(materialsRows, csrMeta),
    }

    const { data: existing } = await supabase.from('csrs').select('id').eq('csr_number', csrData.csr_number)

    if ((existing || []).some((item) => String(item.id) !== String(id))) {
      toast({ title: 'Duplicate CSR number', description: 'CSR number already exists. Please use a different number.', variant: 'destructive' })
      return
    }

    setSaving(true)
    const { error } = await supabase.from('csrs').update(csrData).eq('id', id)

    if (error) {
      toast({
        title: 'Save failed',
        description: getUserFacingMutationMessage(error, { action: 'save' }),
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    setSaving(false)
    navigate('/csr/' + id)
  }

  if (loading) {
    return (
      <Layout title="Edit CSR" hidePageHeader contentClassName="px-0 pb-24 pt-0">
        <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Loading CSR...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Edit CSR" hidePageHeader contentClassName="px-0 pb-24 pt-0">
      <CsrFormScreen
        mode="edit"
        csr={csr}
        csrMeta={csrMeta}
        materialsRows={materialsRows}
        saving={saving}
        onUpdate={update}
        onUpdateMeta={updateMeta}
        onUpdateMaterialRow={updateMaterialRow}
        onAddMaterialRow={addMaterialRow}
        onRemoveMaterialRow={removeMaterialRow}
        onApplyImport={handleApplyImport}
        onSave={handleSave}
      />
    </Layout>
  )
}
