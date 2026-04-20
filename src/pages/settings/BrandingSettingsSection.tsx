import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Loader2, Pencil, Upload } from 'lucide-react'
import { saveSettings, uploadFile, useSettings } from '@/hooks/useSettings'
import {
  SettingsField,
  SettingsSaveButton,
  SettingsSummaryField,
} from './SettingsFormPrimitives'
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
  const [uploadError, setUploadError] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!loading && settings) {
      setForm((current) => ({ ...current, ...settings }))
    }
  }, [loading, settings])

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [settings?.logo_url, settings?.footer_text].some(Boolean)
      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const updateForm = (key: keyof BrandingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const restoreSavedBrandingState = () => {
    setForm({
      logo_url: settings?.logo_url || '',
      footer_text: settings?.footer_text || '',
    })
    setUploadError(null)
  }

  const handleUpload = async (type: keyof BrandingUploadState, file: File | null) => {
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

  const footerPreview = (form.footer_text || '').split('\n').find(Boolean) || ''

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
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2">
            <img
              src={form[`${type}_url` as keyof BrandingForm]}
              alt={label}
              className="max-h-20 max-w-[180px] object-contain"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setUploadError(null)
                inputRef.current?.click()
              }}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              Change
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadError(null)
                updateForm(`${type}_url` as keyof BrandingForm, '')
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
            inputRef.current?.click()
          }}
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-indigo-50/20 p-6 text-center transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          {uploading[type] ? (
            <>
              <Loader2 size={20} className="mx-auto mb-1 animate-spin text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Upload size={20} className="mx-auto mb-1 text-indigo-400" />
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
  )

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-600/80">
            Logo & Branding
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">Saved Branding</div>
            <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
              Review your logo and footer text before editing branding assets.
            </div>
          </div>

          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
          <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-indigo-50/20 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Logo
              </div>
              <div className="mt-2">
                {form.logo_url ? (
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-200/80 bg-white p-2">
                    <img
                      src={form.logo_url}
                      alt="Company logo"
                      className="h-14 w-14 object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm font-medium text-slate-900">No logo</div>
                )}
              </div>
            </div>

            <SettingsSummaryField label="Footer Text" value={footerPreview || 'Not set'} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3.5">
        <button
          type="button"
          onClick={() => {
            restoreSavedBrandingState()
            setEditing(false)
          }}
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-700 transition-colors hover:bg-indigo-50"
          aria-label="Back to saved branding"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">Edit Branding</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Update the company logo and footer text used in generated documents.
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        <div className="px-4 py-4">
          <UploadBox type="logo" label="Company Logo" inputRef={logoRef} />
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
          <SettingsField label="PDF Footer Text">
            <textarea
              value={form.footer_text || ''}
              onChange={(event) => updateForm('footer_text', event.target.value)}
              placeholder={
                'Bank: First Bank | Account: Sun & Shield Power Solutions | No: 0123456789\nAll prices in NGN. Payment within 30 days.'
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200/80 bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </SettingsField>
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
          <SettingsSaveButton saving={saving} saved={saved} onClick={save} />
        </div>
      </div>
    </div>
  )
}