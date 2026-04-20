import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Pencil, Plus, Trash2, Upload, UserCheck } from 'lucide-react'
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

  const updateForm = (key: keyof SignatoryForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

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

  if (formOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3.5">
          <button
            type="button"
            onClick={closeForm}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-white text-amber-700 transition-colors hover:bg-amber-50"
            aria-label="Back to signatories"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit Signatory' : 'Add Signatory'}
            </div>
            <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
              Save signer details and the signature image used on documents.
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
          <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
            <SettingsField label="Name">
              <SettingsInput
                value={form.name}
                onChange={(value) => updateForm('name', value)}
                placeholder="Adewale Musa"
              />
            </SettingsField>

            <SettingsField label="Role">
              <SettingsInput
                value={form.role}
                onChange={(value) => updateForm('role', value)}
                placeholder="Finance Manager"
              />
            </SettingsField>
          </div>

          <div className="border-t border-slate-200/80 px-4 py-4">
            <SettingsField label="Signature Image">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUpload(event.target.files?.[0] || null)}
              />

              {form.signature_url ? (
                <div className="flex flex-col gap-3">
                  <div className="inline-flex w-fit overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2">
                    <img
                      src={form.signature_url}
                      alt="Signature"
                      className="max-h-20 max-w-[180px] object-contain"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null)
                        fileRef.current?.click()
                      }}
                      className="text-xs font-semibold text-amber-700 hover:underline"
                    >
                      Change
                    </button>

                    <button
                      type="button"
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
                  className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-amber-50/20 p-6 text-center transition-colors hover:border-amber-200 hover:bg-amber-50/40"
                >
                  {uploading ? (
                    <div className="text-xs font-medium text-muted-foreground">Uploading...</div>
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto mb-1 text-amber-400" />
                      <p className="text-xs font-medium text-muted-foreground">Click to upload</p>
                    </>
                  )}
                </div>
              )}

              {uploadError ? (
                <div className="mt-2 text-[11px] font-medium tracking-tight text-red-600">
                  {uploadError}
                </div>
              ) : null}
            </SettingsField>
          </div>

          <div className="border-t border-slate-200/80 px-4 py-4">
            <SettingsSaveButton saving={saving} saved={false} onClick={saveSignatory} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-700/80">
          Signatories
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        <div className="border-b border-slate-200/80 bg-amber-50/40 px-4 py-3.5">
          <div className="text-sm font-bold text-slate-900">Document Signatories</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Manage the people and signature images used across invoices and other documents.
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No signatories added yet.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={index !== items.length - 1 ? 'border-b border-slate-200/80' : ''}
            >
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-amber-50/20">
                      {item.signature_url ? (
                        <img
                          src={item.signature_url}
                          alt={item.name || 'Signature'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCheck size={20} className="text-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.role || 'No role'}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Pencil size={12} />
                        Edit
                      </span>
                    </button>

                    <button
                      onClick={() => removeSignatory(item.id)}
                      disabled={actionId === item.id}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 size={12} />
                        Delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={openAdd}
        className="w-full rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 px-4 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-50"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={14} />
          Add Signatory
        </span>
      </button>
    </div>
  )
}