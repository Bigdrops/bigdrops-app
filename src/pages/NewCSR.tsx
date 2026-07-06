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
import { createCsr, sanitizeCsrInsertPayload } from '@/domain/csr/csrService'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'

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
  const { settings } = useSettings()
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
  const [comments] = useState('')
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
      const nextNumber = getNextCsrNumber(latestNumber, resolvePrefix(settings?.document_prefixes, 'csr'))

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
  }, [isField, settings?.document_prefixes])

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
    console.log('[CSR Import handleApplyImport] Result received:', JSON.stringify(result, null, 2))
    console.log('[CSR Import handleApplyImport] csr BEFORE:', JSON.stringify(csr, null, 2))
    console.log('[CSR Import handleApplyImport] materialsRows BEFORE:', JSON.stringify(materialsRows, null, 2))

    setCsr((current: any) => {
      const next = { ...current, ...result.fields }
      console.log('[CSR Import handleApplyImport] csr AFTER (from updater):', JSON.stringify(next, null, 2))
      return next
    })

    if (result.hasMaterials) {
      setMaterialsRows((current: any) => {
        const next =
          result.materials.length > 0
            ? result.materials.map((row: any) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
            : [{ ...DEFAULT_MATERIAL_ROW }]
        console.log('[CSR Import handleApplyImport] materialsRows AFTER:', JSON.stringify(next, null, 2))
        return next
      })
    }

    if (result.hasOperationalReadings) {
      setCsrMeta((current: any) => ({ ...current, showOperationalReadings: true }))
    }
  }

  const handleDownloadBlankCsr = async () => {
    try {
      const { data: existingRows } = await supabase
        .from('csrs')
        .select('csr_number')
        .order('created_at', { ascending: false })
        .limit(1000)
      const latestNumber = existingRows?.[existingRows.length - 1]?.csr_number || null
      const blankNumber = getNextCsrNumber(latestNumber, resolvePrefix(settings?.document_prefixes, 'csr'))

      const { error: logError } = await supabase.from('blank_csr_logs').insert([{
        assigned_csr_number: blankNumber,
      }])
      if (logError) {
        console.warn('[NewCSR] Failed to log blank CSR:', logError)
      }

      const previewData = buildCsrPreviewData(
        { ...createDefaultCsr(isField), csr_number: blankNumber },
        { technicianSignatory: null },
      )
      const blob = await pdf(getCsrPdfDocument({ csr: previewData, comments, branding: EMPTY_BRANDING, template: '3', designPreset: {} as any })).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${blankNumber}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      feedback.success(`Blank CSR ${blankNumber} downloaded`)
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Download failed')
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

    const csrData = sanitizeCsrInsertPayload({
      ...csr,
      project_id: validatedProject?.id || null,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
      show_po: Boolean(String(csr.po_number || '').trim()),
      materials_used: serializeCsrMaterials(materialsRows, csrMeta as any),
    })

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

    setSaving(true)
    try {
      const { data: savedCsr, error: saveError } = await withUniqueRetry(
        async (candidateNumber: string) => {
          csrData.csr_number = candidateNumber
          try {
            const result = await createCsr(csrData)
            return { data: result, error: null }
          } catch (err) {
            return { data: null, error: err as any }
          }
        },
        async () => {
          const { data: rows } = await supabase
            .from('csrs')
            .select('csr_number')
            .order('created_at', { ascending: false })
            .limit(1)
          return getNextCsrNumber(rows?.[0]?.csr_number || null, resolvePrefix(settings?.document_prefixes, 'csr'))
        },
        csr.csr_number,
      )

      if (saveError || !savedCsr) {
        throw saveError || new Error('CSR save returned no data')
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
      const blob = await pdf(getCsrPdfDocument({ csr: previewData, comments, branding: EMPTY_BRANDING, template: '3', designPreset: {} as any })).toBlob()
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
    <Layout title="New CSR" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
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
        onDownloadBlank={handleDownloadBlankCsr}
      />
    </Layout>
  )
}
