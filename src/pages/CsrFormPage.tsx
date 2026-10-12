import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { feedback } from '@/lib/feedback'
import { userDownloadLocationLabel } from '@/lib/native/fileDownload'

import Layout from '../components/Layout'
import CsrFormScreen from '@/components/csr/CsrFormScreen'
import IdentityLockDialog from '@/components/document/IdentityLockDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
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
import { registerAndroidBackGuard } from '@/lib/native/androidBackGuard'
import { createOfflineCsrDraft, peekNextOfflineCsrNumber } from '../lib/native/csrOffline'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { validateProjectAssignment } from '@/domain/projects'
import { createCsr, updateCsr, sanitizeCsrInsertPayload } from '@/domain/csr/csrService'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { csrFamilyFor } from '@/domain/csr/csrNumbering'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { parseTrailingSequence } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { useEntity } from '@/lib/tenant/contexts'

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
  const { tenantClient } = useEntity()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
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
  // Last system-generated number shown in the field. A differing field
  // value means the user explicitly typed it (manual identifier).
  const autoNumberRef = useRef('')
  const [identityLockDialog, setIdentityLockDialog] = useState<{ open: boolean; field: 'client' | 'csr_number' | null }>({ open: false, field: null })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false)
  const [lastSaveOffline, setLastSaveOffline] = useState(false)

  /**
   * Unified exit intent. Null means no exit is pending. A route intent
   * carries the destination (explicit Cancel defaults to the CSR list);
   * a back intent means "reverse one history step" (hardware or browser
   * Back) so the real previous route is preserved instead of forcing /csr.
   */
  type ExitIntent = { kind: 'route'; path: string } | { kind: 'back' }
  const [exitRequest, setExitRequest] = useState<ExitIntent | null>(null)
  // One-time bypass for navigation the user already authorized. It is set
  // only around a confirmed exit and disarmed as soon as that exit lands
  // (or when the form unmounts), so future navigation is guarded again.
  const exitBypassRef = useRef(false)
  // Set while the authorized route exit consumes the sentinel entry; the
  // pending replace runs when that POP lands back on the form.
  const consumePhaseRef = useRef<{ dest: string; state?: any; rearm: boolean } | null>(null)
  // Set while an authorized back exit walks back through form-URL entries.
  const passThroughRef = useRef(false)
  const sentinelRef = useRef(false)
  // Live mirrors for listeners registered once (popstate, back guard).
  const exitRequestRef = useRef(exitRequest)
  exitRequestRef.current = exitRequest
  const hasUnsavedRef = useRef(hasUnsavedChanges)
  hasUnsavedRef.current = hasUnsavedChanges
  const savingRef = useRef(saving)
  savingRef.current = saving
  const saveSuccessRef = useRef(saveSuccessOpen)
  saveSuccessRef.current = saveSuccessOpen

  const isCsrFormPath = (pathname: string) =>
    pathname === '/csr/new' || pathname.startsWith('/csr/edit/')

  const pushExitSentinel = useCallback(() => {
    try {
      window.history.pushState(
        { ...((window.history.state as any) || {}), csrExitGuard: true },
        '',
        window.location.href,
      )
      sentinelRef.current = true
    } catch {
      sentinelRef.current = false
    }
  }, [])

  /**
   * Authorized route exit. The sentinel entry sits directly above the form
   * entry, so leaving is a two-step: step back onto the form entry (a POP
   * the bypassed popstate handler observes), then replace it with the
   * destination. The stack is left clean with no leftover guard entries.
   */
  const authorizedRouteExit = useCallback((dest: string, state?: any, rearm = false) => {
    exitBypassRef.current = true
    if (sentinelRef.current) {
      consumePhaseRef.current = { dest, state, rearm }
      window.history.back()
    } else {
      navigate(dest, state === undefined ? undefined : { state })
    }
  }, [navigate])

  /** Authorized back exit: walk back through form-URL entries to the real previous page. */
  const authorizedBackExit = useCallback(() => {
    exitBypassRef.current = true
    passThroughRef.current = true
    window.history.back()
    // Deep-link edge: nothing below the form entry, so no POP ever arrives
    // to disarm the bypass. Release it so the guard works on later presses.
    window.setTimeout(() => {
      exitBypassRef.current = false
      passThroughRef.current = false
    }, 600)
  }, [])

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

      const { data: latestRows } = await tenantClient
        .from('csrs')
        .select('csr_number')
        .order('created_at', { ascending: false })
        .limit(1000)

      const csrPrefix = resolvePrefix(settings?.document_prefixes, 'csr')
      const numbers = (latestRows || []).map((r: any) => String(r?.csr_number || ''))
      const family = csrFamilyFor(csrPrefix, numbers[0] || null)
      const cursor = await fetchAutoCursor(tenantClient, family)
      const nextNumber = getNextCsrNumber(numbers[0] || null, csrPrefix, cursor, numbers)

      if (mounted) {
        csrNumberPopulated.current = true
        autoNumberRef.current = nextNumber
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

      const { data } = await tenantClient
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

        const { data, error } = await tenantClient.from('csrs').select('*').eq('id', id).single()

        if (error) {
          feedback.error('Load failed', { description: error.message })
          authorizedRouteExit('/csr')
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
  }, [isEdit, id, navigate, authorizedRouteExit])

  /* ── State updaters ── */
  const update = (field: string, value: any) => {
    setHasUnsavedChanges(true)
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
    // Same-route replace through the exit machine: consumes the sentinel so
    // no stale guard entry is left behind, then re-arms it for the new form.
    authorizedRouteExit('/csr/new', {
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
    }, true)
  }, [csr, csrMeta, materialsRows, authorizedRouteExit])

  const updateMeta = (field: string, value: any) => {
    setHasUnsavedChanges(true)
    setCsrMeta((current: any) => ({ ...current, [field]: value }))
  }

  const updateMaterialRow = (index: number, field: string, value: any) => {
    setHasUnsavedChanges(true)
    setMaterialsRows((current: any[]) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    )
  }

  const addMaterialRow = () => {
    setHasUnsavedChanges(true)
    setMaterialsRows((current: any[]) => [...current, { ...DEFAULT_MATERIAL_ROW }])
  }

  const removeMaterialRow = (index: number) => {
    setHasUnsavedChanges(true)
    setMaterialsRows((current: any[]) =>
      current.length === 1 ? [{ ...DEFAULT_MATERIAL_ROW }] : current.filter((_, rowIndex) => rowIndex !== index),
    )
  }

  const handleApplyImport = (result: any) => {
    setHasUnsavedChanges(true)
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
      const { data: existingRows } = await tenantClient
        .from('csrs')
        .select('csr_number')
        .order('created_at', { ascending: false })
        .limit(1000)
      const csrPrefix = resolvePrefix(settings?.document_prefixes, 'csr')
      const numbers = (existingRows || []).map((r: any) => String(r?.csr_number || ''))
      const family = csrFamilyFor(csrPrefix, numbers[0] || null)
      const cursor = await fetchAutoCursor(tenantClient, family)
      const blankNumber = getNextCsrNumber(numbers[0] || null, csrPrefix, cursor, numbers)
      const blankSeq = parseTrailingSequence(blankNumber)

      const { error: logError } = await tenantClient.from('blank_csr_logs').insert([{
        assigned_csr_number: blankNumber,
      }])
      if (logError) {
        console.warn('[CsrFormPage] Failed to log blank CSR:', logError)
      } else if (blankSeq !== null) {
        await advanceAutoCursor(tenantClient, family, blankSeq)
      }

      const previewData = buildCsrPreviewData(
        { ...createDefaultCsr(isField), csr_number: blankNumber },
        { technicianSignatory: null },
      )
      const blob = await pdf(getCsrPdfDocument({ csr: previewData, comments, branding: EMPTY_BRANDING, template: '3', designPreset: {} as any })).toBlob()
      const { downloadBlobFile } = await import('@/lib/native/fileDownload')
      await downloadBlobFile({ fileName: `${blankNumber}.pdf`, blob })
      feedback.success(`Blank CSR ${blankNumber} saved to ${userDownloadLocationLabel()}`)
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  /* ── Save ── */
  // Authoritative CSR persistence used by the bottom Save button, the
  // floating Save FAB, and the exit dialog's Save & Exit. Returns true only
  // after confirmed persistence; validation, offline-draft, and server
  // failures return false so callers stay on the form without navigating.
  const handleSave = async (): Promise<boolean> => {
    if (saving) return false
    if (isCreate) {
      if (!csrNumberPopulated.current || !String(csr.csr_number || '').trim()) {
        feedback.error('CSR number not ready', {
          description: 'Please wait for the CSR number to be assigned before saving.',
        })
        return false
      }

      if (!isField && !csr.client_id) {
        feedback.error('Client required', { description: 'Please select a client before saving' })
        return false
      }
    }

    if (isEdit && !csr.client_id) {
      feedback.error('Client required', { description: 'Please select a client before saving' })
      return false
    }

    if (isCreate) {
      const { project: validatedProject, error: projectError } = await validateProjectAssignment(tenantClient as any, {
        projectId: csr.project_id,
        documentClientId: csr.client_id,
        documentClientName: csr.client_name,
      })

      if (projectError) {
        feedback.error('Project link invalid', { description: projectError })
        return false
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
          setHasUnsavedChanges(false)
          setLastSaveOffline(true)
          setSaveSuccessOpen(true)
          return true
        } catch (error) {
          feedback.error('Offline save failed', {
            description: error instanceof Error ? error.message : 'Could not save this CSR offline.',
          })
          return false
        } finally {
          setSaving(false)
        }
      }

      setSaving(true)
      try {
        // The field is user-editable: a value differing from the last
        // system pre-fill is an explicitly typed manual identifier.
        const manualNumber =
          String(csr.csr_number || '').trim() && csr.csr_number !== autoNumberRef.current
            ? String(csr.csr_number).trim()
            : undefined
        const csrPrefix = resolvePrefix(settings?.document_prefixes, 'csr')
        const { data: savedCsr, error: saveError } = await withUniqueRetry(
          async (candidateNumber: string) => {
            csrData.csr_number = candidateNumber
            try {
              const result = await createCsr(csrData, tenantClient)
              return { data: result, error: null }
            } catch (err) {
              return { data: null, error: err as any }
            }
          },
          async () => {
            const { data: rows } = await tenantClient
              .from('csrs')
              .select('csr_number')
              .order('created_at', { ascending: false })
              .limit(1000)
            const numbers = (rows || []).map((r: any) => String(r?.csr_number || ''))
            const family = csrFamilyFor(csrPrefix, numbers[0] || null)
            const cursor = await fetchAutoCursor(tenantClient, family)
            return getNextCsrNumber(numbers[0] || null, csrPrefix, cursor, numbers)
          },
          manualNumber,
        )
        // Advance the automatic cursor only for system-generated numbers.
        if (!saveError && savedCsr && !manualNumber) {
          const seq = parseTrailingSequence((savedCsr as { csr_number?: string | null })?.csr_number ?? csrData.csr_number)
          if (seq !== null) {
            const numbers = [String((savedCsr as { csr_number?: string | null })?.csr_number || '')]
            await advanceAutoCursor(tenantClient, csrFamilyFor(csrPrefix, numbers[0]), seq)
          }
        }

        if (saveError || !savedCsr) {
          throw saveError || new Error('CSR save returned no data')
        }

        if (isField) {
          try {
            const technicianSignatory = csrData.technician_signatory_id
              ? (
                  await tenantClient
                    .from('signatories')
                    .select('id, name, role, signature_url')
                    .eq('id', csrData.technician_signatory_id)
                    .maybeSingle()
                ).data
              : null
            const previewData = buildCsrPreviewData(csrData, { technicianSignatory })
            const blob = await pdf(getCsrPdfDocument({ csr: previewData, comments, branding: EMPTY_BRANDING, template: '3', designPreset: {} as any })).toBlob()
            const { downloadBlobFile } = await import('@/lib/native/fileDownload')
            await downloadBlobFile({ fileName: (csrData.csr_number || 'csr') + '.pdf', blob })
          } catch (error) {
            console.error('Failed to generate PDF', error)
          }
        }

        setSaving(false)
        setHasUnsavedChanges(false)
        setLastSaveOffline(false)
        setSaveSuccessOpen(true)
        return true
      } catch (error) {
        console.error('[CsrFormPage] Save failed', error)
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(error, { action: 'create' }),
        })
        setSaving(false)
        return false
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

      const { data: existing } = await tenantClient.from('csrs').select('id').eq('csr_number', csrData.csr_number)

      if ((existing || []).some((item: any) => String(item.id) !== String(id))) {
        feedback.error('Duplicate CSR number', {
          description: 'CSR number already exists. Please use a different number.',
        })
        return false
      }

      setSaving(true)
      try {
        await updateCsr(id!, csrData, tenantClient)
        setSaving(false)
        setHasUnsavedChanges(false)
        setLastSaveOffline(false)
        setSaveSuccessOpen(true)
        return true
      } catch (error) {
        console.error('[CsrFormPage] Save failed', error)
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(error, { action: 'update' }),
        })
        setSaving(false)
        return false
      }
    }

    // Unreachable in practice (create/edit cover both modes), but callers
    // treat a non-true result as "stay on the form".
    return false
  }

  const requestExit = useCallback((intent: { kind: 'route'; path: string } | { kind: 'back' }) => {
    if (savingRef.current) return
    if (hasUnsavedRef.current) {
      setExitRequest(intent)
      return
    }
    if (intent.kind === 'back') authorizedBackExit()
    else authorizedRouteExit(intent.path)
  }, [authorizedBackExit, authorizedRouteExit])

  const handleCancel = () => {
    requestExit({ kind: 'route', path: '/csr' })
  }

  const handleKeepEditing = useCallback(() => {
    // Close the dialog only. The form never unmounted and history was never
    // left, so values, rows, signatures, and scroll position are intact.
    setExitRequest(null)
  }, [])

  const handleDiscardAndExit = useCallback(() => {
    // Never saves: abandon local edits only and honor the original intent.
    const pending = exitRequestRef.current
    setExitRequest(null)
    if (pending && pending.kind === 'back') authorizedBackExit()
    else authorizedRouteExit(pending && pending.kind === 'route' ? pending.path : '/csr')
  }, [authorizedBackExit, authorizedRouteExit])

  const handleSaveAndExit = useCallback(async () => {
    if (savingRef.current) return
    // Same authoritative handler as the bottom Save button and the FAB.
    // A non-true result (validation or save failure) keeps the dialog open
    // on the form with entered values preserved for correction and retry.
    await handleSave()
    // On success the existing success dialog takes over (its confirm button
    // completes the pending exit) while the exit request preserves the
    // destination. On failure the dialog simply stays open on the form with
    // entered values intact for correction and retry.
  }, [handleSave])

  const handleSaveSuccessExit = useCallback(() => {
    setSaveSuccessOpen(false)
    const pending = exitRequestRef.current
    setExitRequest(null)
    if (pending?.kind === 'back') authorizedBackExit()
    else authorizedRouteExit(pending?.kind === 'route' ? pending.path : '/csr')
  }, [authorizedBackExit, authorizedRouteExit])

  /* ── Sentinel + browser-history guard ── */
  useEffect(() => {
    // One extra same-URL entry. A browser Back POP lands on the form entry
    // (component stays mounted), where the popstate handler below either
    // continues travel (pristine/authorized) or restores the sentinel and
    // asks (dirty). No polling, no history loops. If this mount already sits
    // on a marked entry (remount onto a leftover sentinel), adopt it instead
    // of stacking a second one.
    if ((window.history.state as any)?.csrExitGuard) {
      sentinelRef.current = true
      return () => { sentinelRef.current = false }
    }
    pushExitSentinel()
    return () => { sentinelRef.current = false }
  }, [pushExitSentinel])

  useEffect(() => {
    const onPopState = () => {
      const pathname = window.location.pathname
      const stillOnForm = isCsrFormPath(pathname)

      if (exitBypassRef.current) {
        const pending = consumePhaseRef.current
        if (pending && stillOnForm) {
          consumePhaseRef.current = null
          exitBypassRef.current = false
          navigate(pending.dest, { replace: true, state: pending.state })
          if (pending.rearm) pushExitSentinel()
          return
        }
        if (passThroughRef.current && stillOnForm) {
          // Consumed one hop but still on a form-URL entry (sentinel or a
          // same-URL push): keep walking back to the real previous page.
          window.history.back()
          return
        }
        if (!stillOnForm) {
          // The authorized exit landed away from the form: disarm so all
          // future navigation is guarded again.
          exitBypassRef.current = false
          passThroughRef.current = false
          return
        }
        // Bypassed but nothing pending and still on the form: disarm and
        // evaluate this same POP with the normal rules below.
        exitBypassRef.current = false
        passThroughRef.current = false
      }

      if (!stillOnForm) return
      if (savingRef.current) {
        // A save is in flight: hold the position without asking. Success
        // clears the dirty flag (Back then travels normally); failure keeps
        // the form dirty so the next Back press asks.
        pushExitSentinel()
        return
      }
      if (!hasUnsavedRef.current) {
        // Pristine hop onto the form entry (or a leftover sentinel entry):
        // continue normal travel instead of trapping the Back button.
        if ((window.history.state as any)?.csrExitGuard) {
          sentinelRef.current = false
        }
        window.history.back()
        return
      }
      // Dirty: restore the sentinel consumed by this POP and ask once.
      pushExitSentinel()
      setExitRequest({ kind: 'back' })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [navigate, pushExitSentinel])

  /* ── Refresh / tab-close guard (browsers show their own prompt) ── */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !exitBypassRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  /* ── Capacitor Android hardware-back guard (scoped, cleaned up) ── */
  const handleSaveSuccessExitRef = useRef(handleSaveSuccessExit)
  handleSaveSuccessExitRef.current = handleSaveSuccessExit
  useEffect(() => {
    return registerAndroidBackGuard(() => {
      if (savingRef.current) return true
      if (saveSuccessRef.current) {
        handleSaveSuccessExitRef.current()
        return true
      }
      if (exitRequestRef.current) {
        // Dialog already open: treat Back as Keep Editing, never stack dialogs.
        setExitRequest(null)
        return true
      }
      if (hasUnsavedRef.current) {
        setExitRequest({ kind: 'back' })
        return true
      }
      return false
    })
  }, [])

  /* ── Render ── */
  if (isEdit && loading) {
    return (
      <Layout title="Edit CSR" hidePageHeader immersive desktopShell contentClassName="!max-w-none px-0 pb-24 pt-0">
        <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Loading CSR...</div>
      </Layout>
    )
  }

  const title = isCreate ? 'New CSR' : 'Edit CSR'

  return (
    <Layout title={title} hidePageHeader immersive desktopShell contentClassName="!max-w-none px-0 pb-24 pt-0">
      {/* Decorative ambient SVG backgrounds — subtle industrial identity */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
        <div
          className="absolute -top-20 -right-16 h-[420px] w-[420px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(30,58,95,0.10) 0%, rgba(15,23,42,0) 70%)',
            filter: 'blur(28px)',
            animation: 'csrAmbientDrift 18s ease-in-out infinite alternate',
          }}
        />
        <svg
          className="absolute right-[-2rem] top-10 h-56 w-56 text-[rgba(30,58,95,0.04)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          style={{ animation: 'csrAmbientDrift 22s ease-in-out infinite alternate-reverse' }}
        >
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
        <svg
          className="absolute left-[-3rem] top-[38%] h-64 w-64 text-[rgba(15,23,42,0.03)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          style={{ animation: 'csrAmbientDrift 26s ease-in-out infinite alternate' }}
        >
          <path d="M2 15h20" />
          <path d="M6 15v-1a6 6 0 0112 0v1" />
          <path d="M12 4v4" />
          <path d="M4 15a8 8 0 0116 0" />
        </svg>
      </div>
      <style>{`
        @keyframes csrAmbientDrift {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(10px, -8px) rotate(3deg); }
        }
      `}</style>
      <CsrFormScreen
        mode={isCreate ? 'new' : 'edit'}
        csr={csr}
        csrMeta={csrMeta as any}
        materialsRows={materialsRows}
        saving={saving}
        csrNumberReady={isEdit ? Boolean(String(csr.csr_number || '').trim()) : (csrNumberPopulated.current && Boolean(String(csr.csr_number || '').trim()))}
        isFieldMode={isField}
        onToggleFieldMode={isCreate ? () => {
          const next = new URLSearchParams(searchParams)
          if (isField) {
            next.delete('type')
            if (String(csr.status || '') === 'Field Entry Pending') {
              update('status', 'Complete')
            }
          } else {
            next.set('type', 'field')
            update('status', 'Field Entry Pending')
          }
          setSearchParams(next, { replace: true })
        } : undefined}
        onUpdate={guardedUpdate}
        onUpdateMeta={updateMeta}
        onUpdateMaterialRow={updateMaterialRow}
        onAddMaterialRow={addMaterialRow}
        onRemoveMaterialRow={removeMaterialRow}
        onApplyImport={handleApplyImport}
        onSave={handleSave}
        onCancel={handleCancel}
        onLockedFieldClick={isEdit ? handleLockedFieldClick : undefined}
      />

      <AlertDialog
        open={exitRequest !== null && !saveSuccessOpen}
        onOpenChange={(open) => {
          // The dialog has no external dismiss path (AlertDialog traps
          // Escape/outside clicks); any other close means Keep Editing.
          // While the save-success dialog is up the exit request is hidden,
          // not cancelled, so the pending destination survives.
          if (!open && !saveSuccessRef.current) setExitRequest(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this Customer Service Report. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* DOM order is Save, Keep, Discard so keyboard focus lands on the
              safe primary action; sm:order restores Discard-first hierarchy
              on desktop rows. Destructive stays last and visually restrained.
              Plain Buttons (not AlertDialogAction) so Save & Exit can keep
              the dialog mounted with actions disabled during the save. */}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              autoFocus
              disabled={saving}
              loading={saving}
              onClick={() => void handleSaveAndExit()}
              className="min-h-11 w-full sm:order-3 sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save & Exit'}
            </Button>
            <AlertDialogCancel
              disabled={saving}
              onClick={handleKeepEditing}
              className="min-h-11 w-full sm:order-2 sm:w-auto"
            >
              Keep Editing
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={handleDiscardAndExit}
              className="min-h-11 w-full border-bd-status-danger-border/60 text-bd-status-danger-text hover:bg-bd-status-danger-bg hover:text-bd-status-danger-text sm:order-1 sm:w-auto"
            >
              Discard &amp; Exit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saveSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lastSaveOffline ? 'Draft Saved Offline' : 'CSR Saved'}</AlertDialogTitle>
            <AlertDialogDescription>
              {lastSaveOffline
                ? 'This Customer Service Report is saved on this device only and will sync when you are back online.'
                : 'The Customer Service Report has been saved successfully.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSaveSuccessExit}>
              Back to CSR Reports
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
