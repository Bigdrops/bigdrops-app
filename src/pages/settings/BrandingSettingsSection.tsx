import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { saveSettings, uploadFile, useSettings } from '@/hooks/useSettings'
import { SettingsField, SettingsSaveButton, SettingsSummaryField } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import type { SettingsToastFn } from './settings-types'

type BrandingForm = {
  logo_url: string
  footer_text: string
}

type BrandingUploadState = {
  logo: boolean
}

export function BrandingSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<BrandingForm>({ logo_url: '', footer_text: '' })
  const [uploading, setUploading] = useState<BrandingUploadState>({ logo: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const logoRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!loading && settings) setForm((current) => ({ ...current, ...settings }))
  }, [loading, settings])

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [settings?.logo_url, settings?.footer_text].some(Boolean)
      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const updateForm = (key: keyof BrandingForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const restoreSavedBrandingState = () => {
    setForm({
      logo_url: settings?.logo_url || '',
      footer_text: settings?.footer_text || '',
    })
  }

  const handleUpload = async (type: keyof BrandingUploadState, file: File | null) => {
    if (!file) return
    setUploading((current) => ({ ...current, [type]: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `${type}/${Date.now()}.${String(ext)}`
      const url = await uploadFile('logos', path, file)
      updateForm(`${type}_url` as keyof BrandingForm, url)
      onToast('Logo uploaded')
    } catch (error) {
      onToast('Upload failed: ' + getErrorMessage(error))
    }
    setUploading((current) => ({ ...current, [type]: false }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      setEditing(false)
      onToast('Branding saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  const UploadBox = ({
    type,
    label,
    inputRef,
  }: {
    type: keyof BrandingUploadState
    label: string
    inputRef: React.RefObject<HTMLInputElement | null>
  }) => (
    <SettingsField label={label}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleUpload(type, event.target.files?.[0] || null)}
      />
      {form[`${type}_url` as keyof BrandingForm] ? (
        <div className="relative inline-flex flex-col gap-2">
          <img
            src={form[`${type}_url` as keyof BrandingForm]}
            alt={label}
            className="max-h-20 max-w-[180px] rounded-lg border border-border object-contain"
          />
          <div className="flex gap-3">
            <button onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-blue-600 hover:underline">
              Change
            </button>
            <button
              onClick={() => updateForm(`${type}_url` as keyof BrandingForm, '')}
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-slate-400 hover:bg-muted/50"
        >
          {uploading[type] ? (
            <>
              <Loader2 size={20} className="mx-auto mb-1 animate-spin text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Upload size={20} className="mx-auto mb-1 text-slate-300" />
              <p className="text-xs font-medium text-muted-foreground">Click to upload</p>
            </>
          )}
        </div>
      )}
    </SettingsField>
  )

  const footerPreview = (form.footer_text || '').split('\n').find(Boolean) || ''

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div>
            <div className="text-sm font-bold text-foreground">Saved branding</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Review your logo and footer text before editing branding assets.
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logo</div>
            <div className="mt-2">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="Company logo"
                  className="h-14 w-14 rounded-lg border border-border bg-card object-contain"
                />
              ) : (
                <div className="text-sm font-medium text-foreground">No logo</div>
              )}
            </div>
          </div>
          <SettingsSummaryField label="Footer Text" value={footerPreview || 'Not set'} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-foreground">Edit branding</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Update the company logo and footer text used in generated documents.
          </div>
        </div>
        <button
          onClick={() => {
            restoreSavedBrandingState()
            setEditing(false)
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <UploadBox type="logo" label="Company Logo" inputRef={logoRef} />
      </div>
      <SettingsField label="PDF Footer Text">
        <textarea
          value={form.footer_text || ''}
          onChange={(event) => updateForm('footer_text', event.target.value)}
          placeholder={
            'Bank: First Bank | Account: Sun & Shield Power Solutions | No: 0123456789\nAll prices in NGN. Payment within 30 days.'
          }
          rows={4}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-ring/10"
        />
      </SettingsField>
      <SettingsSaveButton saving={saving} saved={saved} onClick={save} />
    </div>
  )
}
