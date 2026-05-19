import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { feedback } from '@/lib/feedback'

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
import { getCsrPdfDocument } from '../components/csr/preview-templates'
import { canUseAndroidNativeSqlite } from '../lib/native/capacitor'
import { createOfflineCsrDraft, peekNextOfflineCsrNumber } from '../lib/native/csrOffline'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { validateProjectAssignment } from '@/domain/projects'
import { createCsr } from '@/domain/csr/csrService'

const EMPTY_BRANDING = {
  companyName: '',
  companyTagline: '',
  contactLine: '',
  footerText: '',
}

const hasInvoicePrefillDetails = (invoice: any) =>
  Boolean(invoice?.invoiceNumber || invoice?.clientId || invoice?.clientName || invoice?.poNumber)

const canUseOfflineCsrDrafts = () =>
  canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false

export default function NewCSR() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  const isField = type === 'field'
  const routeState = (location.state as any) || {}
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
  const csrNumberPopulated = useRef(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (canUseOfflineCsrDrafts()) {
        try {
          const nextNumber = await peekNextOfflineCsrNumber()
          if (mounted) {
            csrNumberPopulated.current = true
            setCsr((current: any) => ({
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
        csrNumberPopulated.current = true
        setCsr((current: any) => ({
          ...current,
          csr_number: current.csr_number || nextNumber,
          status: isField ? 'Field Entry Pending' : current.status,
        }))
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [isField])

  useEffect(() => {
    if (!projectPrefill.projectId && !projectPrefill.clientId && !projectPrefill.clientName) return

    setCsr((current: any) => ({
      ...current,
      project_id: current.project_id || projectPrefill.projectId || '',
      client_id: current.client_id || projectPrefill.clientId || '',
      client_name: current.client_name || projectPrefill.clientName || '',
    }))
  }, [projectPrefill.clientId, projectPrefill.clientName, projectPrefill.projectId])

  useEffect(() => {
    let active = true

    const applyInvoicePrefill = (invoice: any) => {
      if (!active || !invoice?.invoiceId) return

      setCsr((current: any) => ({
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

  const update = (field: string, value: any) => {
    setCsr((current: any) => ({ ...current, [field]: value }))
  }

  const updateMeta = (field: string, value: any) => {
    setCsrMeta((current: any) => ({ ...current, [field]: value }))
  }

  const updateMaterialRow = (index: number, field: string, value: any) => {
    setMaterialsRows((current: any[]) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    )
  }

  const addMaterialRow = () => {
    setMaterialsRows((current: any[]) => [...current, { ...DEFAULT_MATERIAL_ROW }])
  }

  const removeMaterialRow = (index: number) => {
    setMaterialsRows((current: any[]) =>
      current.length === 1 ? [{ ...DEFAULT_MATERIAL_ROW }] : current.filter((_, rowIndex) => rowIndex !== index),
    )
  }

  const handleApplyImport = (result: any) => {
    setCsr((current: any) => ({ ...current, ...result.fields }))

    if (result.hasMaterials) {
      setMaterialsRows(
        result.materials.length > 0
          ? result.materials.map((row: any) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
          : [{ ...DEFAULT_MATERIAL_ROW }],
      )
    }

    if (result.hasOperationalReadings) {
      setCsrMeta((current: any) => ({ ...current, showOperationalReadings: true }))
    }
  }

  const handleSave = async () => {
    if (!csrNumberPopulated.current || !String(csr.csr_number || '').trim()) {
      feedback.error('CSR number not ready', {
        description: 'Please wait for the CSR number to be assigned before saving.',
      })
      return
    }

    if (!isField && !csr.client_id) {
      feedback.error('Client required', { description: 'Please select a client before saving' })
      return
    }

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(supabase as any, {
      projectId: csr.project_id,
      documentClientId: csr.client_id,
      documentClientName: csr.client_name,
    })

    if (projectError) {
      feedback.error('Project link invalid', { description: projectError })
      return
    }

    const csrData = {
      ...csr,
      project_id: validatedProject?.id || null,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
      show_po: Boolean(String(csr.po_number || '').trim()),
      materials_used: serializeCsrMaterials(materialsRows, csrMeta as any),
    }

    if (canUseOfflineCsrDrafts()) {
      setSaving(true)
      try {
        const savedDraft = await createOfflineCsrDraft(csrData)
        setCsr((current: any) => ({ ...current, csr_number: savedDraft.csrNumber }))
        feedback.success('Saved offline', {
          description: 'CSR draft saved on this device and queued for sync when you are back online.',
        })
        navigate('/csr')
      } catch (error) {
        feedback.error('Offline save failed', {
          description: error instanceof Error ? error.message : 'Could not save this CSR offline.',
        })
      } finally {
        setSaving(false)
      }
      return
    }

    const { data: existing } = await supabase.from('csrs').select('id').eq('csr_number', csrData.csr_number)

    if (existing && existing.length > 0) {
      feedback.error('Duplicate CSR number', {
        description: 'CSR number already exists. Please use a different number.',
      })
      return
    }

    setSaving(true)
    try {
      const savedCsr = await createCsr(csrData)

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
          const blob = await pdf(getCsrPdfDocument({ csr: previewData, branding: EMPTY_BRANDING, template: '3', designPreset: {} as any })).toBlob()
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
    } catch (error) {
      console.error('[NewCSR] Save failed', error)
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'create' }),
      })
      setSaving(false)
    }
  }

  return (
    <Layout title="New CSR" hidePageHeader contentClassName="px-0 pb-24 pt-0">
      <CsrFormScreen
        mode="new"
        csr={csr}
        csrMeta={csrMeta as any}
        materialsRows={materialsRows}
        saving={saving}
        csrNumberReady={csrNumberPopulated.current && Boolean(String(csr.csr_number || '').trim())}
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
