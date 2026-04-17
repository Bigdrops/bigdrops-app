import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, Upload, UserCheck } from 'lucide-react'
import { uploadFile } from '@/hooks/useSettings'
import { supabase } from '@/supabase'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsField, SettingsInput, SettingsSaveButton } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import type { SettingsToastFn } from './settings-types'

type Signatory = {
  id: string
  name?: string | null
  role?: string | null
  signature_url?: string | null
}

type SignatoryForm = {
  name: string
  role: string
  signature_url: string
}

const emptyForm: SignatoryForm = { name: '', role: '', signature_url: '' }

export function SignatoriesSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const [items, setItems] = useState<Signatory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SignatoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const loadSignatories = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('signatories')
      .select('id, name, role, signature_url')
      .order('name', { ascending: true })

    if (error) {
      onToast(`Failed to load signatories: ${error.message}`)
      setItems([])
    } else {
      setItems((data as Signatory[]) || [])
    }
    setLoading(false)
  }, [onToast])

  useEffect(() => {
    loadSignatories()
  }, [loadSignatories])

  const updateForm = (key: keyof SignatoryForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setUploadError(null)
    setFormOpen(true)
  }

  const openEdit = (item: Signatory) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      role: item.role || '',
      signature_url: item.signature_url || '',
    })
    setUploadError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setUploadError(null)
    setFormOpen(false)
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploadError(null)

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setUploadError('Image is too large. Use one under 5MB.')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `signature/${Date.now()}.${String(ext)}`
      const url = await uploadFile('signatures', path, file)
      updateForm('signature_url', url)
      onToast('Signature uploaded')
    } catch (error) {
      onToast(`Upload failed: ${getErrorMessage(error)}`)
    }
    setUploading(false)
  }

  const saveSignatory = async () => {
    if (!form.name.trim()) {
      onToast('Name is required')
      return
    }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      signature_url: form.signature_url || null,
    }
    const result = editingId
      ? await supabase.from('signatories').update(payload).eq('id', editingId)
      : await supabase.from('signatories').insert(payload)

    if (result.error) {
      onToast(getUserFacingMutationMessage(result.error, { action: 'save' }))
      setSaving(false)
      return
    }

    await loadSignatories()
    closeForm()
    setSaving(false)
    onToast(editingId ? 'Signatory updated' : 'Signatory added')
  }

  const removeSignatory = async (id: string) => {
    setActionId(id)
    const { error } = await supabase.from('signatories').delete().eq('id', id)
    if (error) {
      onToast(`Delete failed: ${error.message}`)
      setActionId(null)
      return
    }
    await loadSignatories()
    setActionId(null)
    onToast('Signatory deleted')
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div className="text-sm font-bold text-foreground">Document signatories</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Manage the people and signature images used across invoices and other documents.
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No signatories added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/50">
                    {item.signature_url ? (
                      <img src={item.signature_url} alt={item.name || 'Signature'} className="h-full w-full object-cover" />
                    ) : (
                      <UserCheck size={20} className="text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground">{item.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.role || 'No role'}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-slate-700 hover:bg-muted/50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Pencil size={12} />
                      Edit
                    </span>
                  </button>
                  <button
                    onClick={() => removeSignatory(item.id)}
                    disabled={actionId === item.id}
                    className="rounded-xl border border-red-200 bg-card px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Trash2 size={12} />
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-foreground">{editingId ? 'Edit signatory' : 'Add signatory'}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Save signer details and the signature image used in documents.
              </div>
            </div>
            <button
              onClick={closeForm}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField label="Name">
              <SettingsInput value={form.name} onChange={(value) => updateForm('name', value)} placeholder="Adewale Musa" />
            </SettingsField>
            <SettingsField label="Role">
              <SettingsInput value={form.role} onChange={(value) => updateForm('role', value)} placeholder="Finance Manager" />
            </SettingsField>
          </div>
          <div className="mt-4">
            <SettingsField label="Signature Image">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUpload(event.target.files?.[0] || null)}
              />
              {form.signature_url ? (
                <div className="relative inline-flex flex-col gap-2">
                  <img
                    src={form.signature_url}
                    alt="Signature"
                    className="max-h-20 max-w-[180px] rounded-lg border border-border object-contain"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setUploadError(null)
                        fileRef.current?.click()
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => {
                        setUploadError(null)
                        updateForm('signature_url', '')
                      }}
                      className="text-xs font-semibold text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setUploadError(null)
                    fileRef.current?.click()
                  }}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-slate-400 hover:bg-muted/50"
                >
                  {uploading ? (
                    <div className="text-xs font-medium text-muted-foreground">Uploading...</div>
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto mb-1 text-slate-300" />
                      <p className="text-xs font-medium text-muted-foreground">Click to upload</p>
                    </>
                  )}
                </div>
              )}
              {uploadError && <div className="mt-2 text-[10px] font-medium text-red-600 font-sans tracking-tight">{uploadError}</div>}
            </SettingsField>
          </div>
          <SettingsSaveButton saving={saving} saved={false} onClick={saveSignatory} />
        </div>
      ) : null}

      <button
        onClick={openAdd}
        className="w-full rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={14} />
          Add Signatory
        </span>
      </button>
    </div>
  )
}
