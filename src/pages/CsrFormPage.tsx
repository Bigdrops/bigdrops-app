import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { feedback } from '@/lib/feedback'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import CsrFormScreen from '@/components/csr/CsrFormScreen'
import IdentityLockDialog from '@/components/document/IdentityLockDialog'
import {
  buildCsrPreviewData,
  createDefaultCsr,
  DEFAULT_CSR_META,
  DEFAULT_MATERIAL_ROW,
  getNextCsrNumber,
  parseCsrMaterials,
  serializeCsrMaterials,
} from '../components/csr/csrUtils'
import { getCsrPdfDocument } from '../components/csr/preview-templates'
import { canUseAndroidNativeSqlite } from '../lib/native/capacitor'
import { createOfflineCsrDraft, peekNextOfflineCsrNumber } from '../lib/native/csrOffline'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { validateProjectAssignment } from '@/domain/projects'
import { createCsr, updateCsr, sanitizeCsrInsertPayload } from '@/domain/csr/csrService'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'

const EMPTY_BRANDING = {
  companyName: '',
  companyTagline: '',
  contactLine: '',
  footerText: '',
}

/** Convert string booleans ('Yes'/'No'/''/etc.) to actual booleans for DB columns */
function toDbBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'Yes' || value === 'true') return true
  if (value === 'No' || value === 'false') return false
  return null
}

const hasInvoicePrefillDetails = (invoice: any) =>
  Boolean(invoice?.invoiceNumber || invoice?.clientId || invoice?.clientName || invoice?.poNumber)

const canUseOfflineCsrDrafts = () =>
  canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false

interface CsrFormPageProps {
  mode: 'create' | 'edit'
}

export default function CsrFormPage({ mode }: CsrFormPageProps) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const type = searchParams.get('type')
  const isField = type === 'field'
  const routeState = (isCreate ? (location.state || {}) : {}) as any
  const duplicateState = routeState.duplicateState || null
  const sourceInvoice = routeState.sourceInvoice || null
  const projectPrefill = isCreate ? {
    projectId: String(routeState.projectId || ''),
    clientId: String(routeState.clientId || ''),
    clientName: String(routeState.clientName || ''),
  } : { projectId: '', clientId: '', clientName: '' }

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [csr, setCsr] = useState(() => isCreate
    ? (duplicateState?.csr || createDefaultCsr(isField))
    : createDefaultCsr(false))
  const [csrMeta, setCsrMeta] = useState(() => isCreate
    ? (duplicateState?.csrMeta || ({ ...DEFAULT_CSR_META } as any))
    : ({ ...DEFAULT_CSR_META } as any))
  const [materialsRows, setMaterialsRows] = useState(
    isCreate
      ? (duplicateState?.materialsRows || [{ ...DEFAULT_MATERIAL_ROW }])
      : [{ ...DEFAULT_MATERIAL_ROW }])
  const [comments] = useState('')
  const csrNumberPopulated = useRef(false)
  const [identityLockDialog, setIdentityLockDialog] = useState<{ open: boolean; field: 'client' | 'csr_number' | null }>({ open: false, field: null })

  /* ── Create-mode init effects ── */
  useEffect(() => {
    if (!isCreate) return
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
    return () => { mounted = false }
  }, [isCreate, isField, settings?.document_prefixes])

  useEffect(() => {
    if (!isCreate) return
    if (!projectPrefill.projectId && !projectPrefill.clientId && !projectPrefill.clientName) return

    setCsr((current: any) => ({
      ...current,
      project_id: current.project_id || projectPrefill.projectId || '',
      client_id: current.client_id || projectPrefill.clientId || '',
      client_name: current.client_name || projectPrefill.clientName || '',
    }))
  }, [isCreate, projectPrefill.clientId, projectPrefill.clientName, projectPrefill.projectId])

  useEffect(() => {
    if (!isCreate) return
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
    return () => { active = false }
  }, [isCreate, sourceInvoice])

  /* ── Edit-mode data loading ── */
  useEffect(() => {
    if (!isEdit || !id) return

    const loadData = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase.from('csrs').select('*').eq('id', id).single()

        if (error) {
          feedback.error('Load failed', { description: error.message })
          navigate('/csr')
          return
        }

        const parsed = parseCsrMaterials(data.materials_used, data)
        setCsr((current: any) => ({ ...current, ...data }))
        setCsrMeta(parsed.meta as any)
        setMaterialsRows(parsed.materialsRows.length > 0 ? parsed.materialsRows : [{ ...DEFAULT_MATERIAL_ROW }])
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [isEdit, id, navigate])

  /* ── State updaters ── */
  const update = (field: string, value: any) => {
    setCsr((current: any) => ({ ...current, [field]: value }))
  }

  const IDENTITY_FIELDS = ['client_id', 'client_name', 'csr_number'] as const
  const guardedUpdate = useCallback((field: string, value: any) => {
    if (isEdit && IDENTITY_FIELDS.includes(field as typeof IDENTITY_FIELDS[number])) {
      setIdentityLockDialog({ open: true, field: field === 'client_id' || field === 'client_name' ? 'client' : 'csr_number' })
      return
    }
    update(field, value)
  }, [isEdit])

  const handleLockedFieldClick = useCallback((field: 'client' | 'csr_number') => {
    setIdentityLockDialog({ open: true, field })
  }, [])

  const handleDuplicateFromEditable = useCallback(() => {
    const { id: _origId, ...csrWithoutId } = JSON.parse(JSON.stringify(csr))
    navigate('/csr/new', {
      state: {
        duplicateState: {
          csr: {
            ...csrWithoutId,
            client_id: '',
            client_name: '',
            csr_number: '',
          },
          csrMeta: JSON.parse(JSON.stringify(csrMeta)),
          materialsRows: JSON.parse(JSON.stringify(materialsRows)),
        },
      },
    })
  }, [csr, csrMeta, materialsRows, navigate])

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
    setCsr((current: any) => {
      const next = { ...current, ...result.fields }
      return next
    })

    if (result.hasMaterials) {
      setMaterialsRows((current: any) => {
        const next =
          result.materials.length > 0
            ? result.materials.map((row: any) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
            : [{ ...DEFAULT_MATERIAL_ROW }]
        return next
      })
    }

    if (result.hasOperationalReadings) {
      setCsrMeta((current: any) => ({ ...current, showOperationalReadings: true }))
    }
  }

  /* ── Download blank (create-mode only) ── */
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
        console.warn('[CsrFormPage] Failed to log blank CSR:', logError)
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

  /* ── Save ── */
  const handleSave = async () => {
    if (isCreate) {
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
    }

    if (isEdit && !csr.client_id) {
      feedback.error('Client required', { description: 'Please select a client before saving' })
      return
    }

    if (isCreate) {
      const { project: validatedProject, error: projectError } = await validateProjectAssignment(supabase as any, {
        projectId: csr.project_id,
        documentClientId: csr.client_id,
        documentClientName: csr.client_name,
      })

      if (projectError) {
        feedback.error('Project link invalid', { description: projectError })
        return
      }

      const { id: _id, ...csrFields } = csr
      const csrData = sanitizeCsrInsertPayload({
        ...csrFields,
        project_id: validatedProject?.id || null,
        client_id: csr.client_id || null,
        linked_invoice_id: csr.linked_invoice_id || null,
        show_po: Boolean(String(csr.po_number || '').trim()),
        system_down: toDbBoolean(csr.system_down),
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
        console.error('[CsrFormPage] Save failed', error)
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(error, { action: 'create' }),
        })
        setSaving(false)
      }
    }

    if (isEdit) {
      const csrData = sanitizeCsrInsertPayload({
        ...csr,
        client_id: csr.client_id || null,
        linked_invoice_id: csr.linked_invoice_id || null,
        show_po: Boolean(String(csr.po_number || '').trim()),
        system_down: toDbBoolean(csr.system_down),
        materials_used: serializeCsrMaterials(materialsRows, csrMeta),
      })

      const { data: existing } = await supabase.from('csrs').select('id').eq('csr_number', csrData.csr_number)

      if ((existing || []).some((item: any) => String(item.id) !== String(id))) {
        feedback.error('Duplicate CSR number', {
          description: 'CSR number already exists. Please use a different number.',
        })
        return
      }

      setSaving(true)
      try {
        await updateCsr(id!, csrData)
        setSaving(false)
        navigate('/csr/' + id)
      } catch (error) {
        console.error('[CsrFormPage] Save failed', error)
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(error, { action: 'update' }),
        })
        setSaving(false)
      }
    }
  }

  /* ── Render ── */
  if (isEdit && loading) {
    return (
      <Layout title="Edit CSR" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
        <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Loading CSR...</div>
      </Layout>
    )
  }

  const title = isCreate ? 'New CSR' : 'Edit CSR'

  return (
    <Layout title={title} hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
      <CsrFormScreen
        mode={isCreate ? 'new' : 'edit'}
        csr={csr}
        csrMeta={csrMeta as any}
        materialsRows={materialsRows}
        saving={saving}
        csrNumberReady={isEdit ? Boolean(String(csr.csr_number || '').trim()) : (csrNumberPopulated.current && Boolean(String(csr.csr_number || '').trim()))}
        onUpdate={guardedUpdate}
        onUpdateMeta={updateMeta}
        onUpdateMaterialRow={updateMaterialRow}
        onAddMaterialRow={addMaterialRow}
        onRemoveMaterialRow={removeMaterialRow}
        onApplyImport={handleApplyImport}
        onSave={handleSave}
        onDownloadBlank={isCreate ? handleDownloadBlankCsr : undefined}
        onLockedFieldClick={isEdit ? handleLockedFieldClick : undefined}
      />

      {isEdit && identityLockDialog.open && (
        <IdentityLockDialog
          open={identityLockDialog.open}
          onOpenChange={(open) => setIdentityLockDialog((prev) => ({ ...prev, open }))}
          onDuplicate={handleDuplicateFromEditable}
        />
      )}
    </Layout>
  )
}
