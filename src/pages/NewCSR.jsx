import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { toast } from '@/hooks/use-toast'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import CsrFormScreen from '@/components/csr/CsrFormScreen'
import {
  buildCsrPreviewData,
  createDefaultCsr,
  DEFAULT_CSR_META,
  DEFAULT_MATERIAL_ROW,
  getNextCsrNumber,
  serializeCsrMaterials,
} from '../components/csr/csrUtils'
import { getCsrPdfDocument } from '../components/csr/CSRPreviewTemplates'
import { canUseAndroidNativeSqlite } from '../lib/native/capacitor'
import { createOfflineCsrDraft, peekNextOfflineCsrNumber } from '../lib/native/csrOffline'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { validateProjectAssignment } from '@/domain/projects'

const EMPTY_BRANDING = {
  companyName: '',
  companyTagline: '',
  contactLine: '',
  footerText: '',
}

const hasInvoicePrefillDetails = (invoice) =>
  Boolean(invoice?.invoiceNumber || invoice?.clientId || invoice?.clientName || invoice?.poNumber)

const canUseOfflineCsrDrafts = () =>
  canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false

export default function NewCSR() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  const isField = type === 'field'
  const routeState = location.state || {}
  const sourceInvoice = routeState.sourceInvoice || null
  const projectPrefill = {
    projectId: String(routeState.projectId || ''),
    clientId: String(routeState.clientId || ''),
    clientName: String(routeState.clientName || ''),
  }

  const [saving, setSaving] = useState(false)
  const [csr, setCsr] = useState(() => createDefaultCsr(isField))
  const [csrMeta, setCsrMeta] = useState(() => ({ ...DEFAULT_CSR_META }))
  const [materialsRows, setMaterialsRows] = useState([{ ...DEFAULT_MATERIAL_ROW }])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (canUseOfflineCsrDrafts()) {
        try {
          const nextNumber = await peekNextOfflineCsrNumber()
          if (mounted) {
            setCsr((current) => ({
              ...current,
              csr_number: current.csr_number || nextNumber,
              status: isField ? 'Field Entry Pending' : current.status,
            }))
          }
        } catch (error) {
          console.warn('Failed to prepare offline CSR number', error)
        }
        return
      }

      const { data: latestRows } = await supabase
        .from('csrs')
        .select('csr_number')
        .order('created_at', { ascending: false })
        .order('csr_number', { ascending: false })
        .limit(1)

      const latestNumber = latestRows?.[0]?.csr_number || ''
      const nextNumber = getNextCsrNumber(latestNumber)

      if (mounted) {
        setCsr((current) => ({
          ...current,
          csr_number: current.csr_number || nextNumber,
          status: isField ? 'Field Entry Pending' : current.status,
        }))
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [isField])

  useEffect(() => {
    if (!projectPrefill.projectId && !projectPrefill.clientId && !projectPrefill.clientName) return

    setCsr((current) => ({
      ...current,
      project_id: current.project_id || projectPrefill.projectId || '',
      client_id: current.client_id || projectPrefill.clientId || '',
      client_name: current.client_name || projectPrefill.clientName || '',
    }))
  }, [projectPrefill.clientId, projectPrefill.clientName, projectPrefill.projectId])

  useEffect(() => {
    let active = true

    const applyInvoicePrefill = (invoice) => {
      if (!active || !invoice?.invoiceId) return

      setCsr((current) => ({
        ...current,
        linked_invoice_id: current.linked_invoice_id || String(invoice.invoiceId || ''),
        client_id: current.client_id || String(invoice.clientId || ''),
        client_name: current.client_name || String(invoice.clientName || ''),
        po_number: current.po_number || String(invoice.poNumber || ''),
        show_po: current.show_po || Boolean(String(invoice.poNumber || '').trim()),
      }))
    }

    const loadInvoicePrefill = async () => {
      if (!sourceInvoice?.invoiceId) return

      if (hasInvoicePrefillDetails(sourceInvoice)) {
        applyInvoicePrefill(sourceInvoice)
        return
      }

      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_id, client_name, po_number')
        .eq('id', sourceInvoice.invoiceId)
        .single()

      if (!data) return

      applyInvoicePrefill({
        invoiceId: data.id,
        invoiceNumber: data.invoice_number || '',
        clientId: data.client_id || '',
        clientName: data.client_name || '',
        poNumber: data.po_number || '',
      })
    }

    void loadInvoicePrefill()

    return () => {
      active = false
    }
  }, [sourceInvoice])

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
    if (!isField && !csr.client_id) {
      toast({ title: 'Client required', description: 'Please select a client before saving', variant: 'destructive' })
      return
    }

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(supabase, {
      projectId: csr.project_id,
      documentClientId: csr.client_id,
      documentClientName: csr.client_name,
    })

    if (projectError) {
      toast({ title: 'Project link invalid', description: projectError, variant: 'destructive' })
      return
    }

    const csrData = {
      ...csr,
      project_id: validatedProject?.id || null,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
      show_po: Boolean(String(csr.po_number || '').trim()),
      materials_used: serializeCsrMaterials(materialsRows, csrMeta),
    }

    if (canUseOfflineCsrDrafts()) {
      setSaving(true)
      try {
        const savedDraft = await createOfflineCsrDraft(csrData)
        setCsr((current) => ({ ...current, csr_number: savedDraft.csrNumber }))
        toast({
          title: 'Saved offline',
          description: 'CSR draft saved on this device and queued for sync when you are back online.',
        })
        navigate('/csr')
      } catch (error) {
        toast({
          title: 'Offline save failed',
          description: error instanceof Error ? error.message : 'Could not save this CSR offline.',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
      return
    }

    const { data: existing } = await supabase.from('csrs').select('id').eq('csr_number', csrData.csr_number)

    if (existing && existing.length > 0) {
      toast({ title: 'Duplicate CSR number', description: 'CSR number already exists. Please use a different number.', variant: 'destructive' })
      return
    }

    setSaving(true)
    const { data: savedCsr, error } = await supabase.from('csrs').insert([csrData]).select('id, csr_number').single()

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

    if (isField) {
      try {
        const technicianSignatory = csrData.technician_signatory_id
          ? (
              await supabase
                .from('signatories')
                .select('id, name, role, signature_url')
                .eq('id', csrData.technician_signatory_id)
                .maybeSingle()
            ).data
          : null
        const previewData = buildCsrPreviewData(csrData, { technicianSignatory })
        const blob = await pdf(getCsrPdfDocument({ csr: previewData, branding: EMPTY_BRANDING, template: '3' })).toBlob()
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = (csrData.csr_number || 'csr') + '.pdf'
        anchor.click()
      } catch (error) {
        console.error('Failed to generate PDF', error)
      }
    }

    navigate('/csr/' + savedCsr.id)
  }

  return (
    <Layout title="New CSR" hidePageHeader contentClassName="px-0 pb-24 pt-0">
      <CsrFormScreen
        mode="new"
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
