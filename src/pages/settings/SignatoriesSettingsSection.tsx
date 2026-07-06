import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, Upload, UserCheck, ShieldCheck, Loader2 } from 'lucide-react'
import { uploadFile } from '@/hooks/useSettings'
import { processSignature, dataURItoFile } from '@/lib/processSignature'
import { supabase } from '@/supabase'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsField, SettingsInput } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { feedback } from '@/lib/feedback'
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile, getUnsupportedImageErrorMessage } from '@/lib/documentImageUploadPolicy'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'

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

export function SignatoriesSettingsSection() {
  const [items, setItems] = useState<Signatory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [form, setForm] = useState<SignatoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const loadSignatories = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('signatories')
      .select('id, name, role, signature_url')
      .order('name', { ascending: true })

    if (error) {
      feedback.error(`Failed to load signatories: ${error.message}`)
      setItems([])
    } else {
      setItems((data as Signatory[]) || [])
    }
    setLoading(false)
  }, [])

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
    setIsEditorOpen(true)
  }

  const openEdit = (item: Signatory) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      role: item.role || '',
      signature_url: item.signature_url || '',
    })
    setUploadError(null)
    setIsEditorOpen(true)
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyForm)
    setUploadError(null)
    setIsEditorOpen(false)
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploadError(null)

    if (!isSupportedImageFile(file)) {
      setUploadError(getUnsupportedImageErrorMessage(file.name))
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setUploadError('Image is too large. Use one under 5MB.')
      return
    }

    setUploading(true)
    try {
      const processedDataURI = await processSignature(file)
      const processedFile = dataURItoFile(processedDataURI, `signature_${Date.now()}.png`)
      const ext = processedFile.name.split('.').pop()
      const path = `signature/${Date.now()}.${String(ext)}`
      const url = await uploadFile('signatures', path, processedFile)
      updateForm('signature_url', url)
      feedback.success('Signature uploaded')
    } catch (error) {
      feedback.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const saveSignatory = async () => {
    if (!form.name.trim()) {
      feedback.error('Name is required')
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
      feedback.error(getUserFacingMutationMessage(result.error, { action: 'save' }))
      setSaving(false)
      return
    }

    await loadSignatories()
    setIsEditorOpen(false)
    setSaving(false)
    feedback.success(editingId ? 'Signatory updated' : 'Signatory added')
  }

  const removeSignatory = async (id: string) => {
    setDeletingId(id)
    const { error } = await supabase.from('signatories').delete().eq('id', id)

    if (error) {
      feedback.error(`Delete failed: ${error.message}`)
      setDeletingId(null)
      return
    }

    await loadSignatories()
    setDeletingId(null)
    feedback.success('Signatory deleted')
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Authorized Signers
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={openAdd}
          className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Signatory
        </Button>
      </div>

      <div className="grid gap-6">
        {items.length === 0 ? (
          <div className="rounded-[var(--bd-radius-xl)] border border-dashed border-bd-border bg-[hsl(var(--bd-surface-muted))/0.2] py-12 text-center">
            <UserCheck className="mx-auto h-8 w-8 text-bd-text-muted opacity-20" />
            <p className="mt-3 text-sm text-bd-text-muted">No signatories added yet.</p>
          </div>
        ) : (
          items.map((item) => (
            <SettingsSummaryCard 
              key={item.id}
              title={item.name || 'Untitled Signatory'}
              description={item.role || 'No role defined'}
              action={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(item)}
                    className="h-8 rounded-full text-xs font-bold text-bd-button-primary-bg"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSignatory(item.id)}
                    disabled={deletingId === item.id}
                    className="h-8 rounded-full text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    {deletingId === item.id ? '...' : 'Delete'}
                  </Button>
                </div>
              }
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-bd-border bg-white">
                  {item.signature_url ? (
                    <img
                      src={item.signature_url}
                      alt={`${item.name} signature`}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-bd-text-muted opacity-30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-bd-text-muted opacity-70">
                    Active Signature
                  </p>
                  <p className="mt-1 text-xs text-bd-text-muted">
                    {item.signature_url ? 'Digital signature uploaded' : 'Missing signature image'}
                  </p>
                </div>
              </div>
            </SettingsSummaryCard>
          ))
        )}
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>{editingId ? 'Edit Signatory' : 'Add Signatory'}</SheetTitle>
            <SheetDescription>
              Manage signatory details and their digital signature image.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-8 py-6">
              <div className="grid gap-4">
                <SettingsField label="Full Name">
                  <SettingsInput
                    value={form.name}
                    onChange={(value) => updateForm('name', value)}
                    placeholder="Adewale Musa"
                  />
                </SettingsField>

                <SettingsField label="Role / Designation">
                  <SettingsInput
                    value={form.role}
                    onChange={(value) => updateForm('role', value)}
                    placeholder="Finance Director"
                  />
                </SettingsField>
              </div>

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <SettingsField label="Signature Image">
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_ACCEPT_ATTRIBUTE}
                  className="hidden"
                  onChange={(event) => handleUpload(event.target.files?.[0] || null)}
                />

                {form.signature_url ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center rounded-xl border border-bd-border bg-[hsl(var(--bd-surface-muted))/0.2] p-6 text-center">
                      <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-lg border border-bd-border bg-white shadow-sm">
                        <img
                          src={form.signature_url}
                          alt="Signature preview"
                          className="h-full w-full object-contain p-2"
                        />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileRef.current?.click()}
                          className="rounded-full text-xs font-bold"
                        >
                          Replace
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadError(null)
                            updateForm('signature_url', '')
                          }}
                          className="rounded-full text-xs font-bold text-red-500 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="group cursor-pointer rounded-xl border-2 border-dashed border-bd-border bg-[hsl(var(--bd-surface-muted))/0.2] p-8 text-center transition-all hover:border-[hsl(var(--bd-button-primary-bg)/0.5)]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                        {uploading ? (
                          <Loader2 size={18} className="animate-spin text-bd-text-muted" />
                        ) : (
                          <Upload size={18} className="text-bd-button-primary-bg" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-bd-text">
                          {uploading ? 'Uploading...' : 'Upload Signature'}
                        </p>
                        <p className="mt-1 text-xs text-bd-text-muted">
                          Transparent PNG recommended
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-2 text-xs font-medium text-red-500">{uploadError}</p>
                )}
              </SettingsField>
            </div>
          </div>

          <SettingsActionFooter 
            onSave={saveSignatory}
            onCancel={handleCancel}
            saving={saving}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}