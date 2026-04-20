import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronLeft, Loader2, Pencil, Upload } from 'lucide-react'
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
  company_logo_url: string
  footer_text: string
}

type BrandingUploadState = {
  logo: boolean
}

type LogoState = 'idle' | 'uploading' | 'uploaded-unsaved' | 'saved' | 'error'

export function BrandingSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<BrandingForm>({
    company_logo_url: '',
    footer_text: '',
  })
  const [uploading, setUploading] = useState<BrandingUploadState>({ logo: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [logoState, setLogoState] = useState<LogoState>('idle')
  const logoRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!loading && settings) {
      const resolvedLogoUrl =
        settings.company_logo_url ||
        settings.logo_url ||
        ''

      setForm({
        company_logo_url: resolvedLogoUrl,
        footer_text: settings.footer_text || '',
      })

      setLogoState('idle')
      setUploadError(null)
    }
  }, [loading, settings])

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [
        settings?.company_logo_url,
        settings?.logo_url,
        settings?.footer_text,
      ].some(Boolean)

      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const updateForm = (key: keyof BrandingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))

    if (key === 'company_logo_url') {
      setLogoState(value ? 'uploaded-unsaved' : 'idle')
    }
  }

  const restoreSavedBrandingState = () => {
    setForm({
      company_logo_url: settings?.company_logo_url || settings?.logo_url || '',
      footer_text: settings?.footer_text || '',
    })
    setUploadError(null)
    setLogoState('idle')
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return

    setUploadError(null)

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      setLogoState('error')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setUploadError('Image is too large. Use one under 5MB.')
      setLogoState('error')
      return
    }

    setUploading({ logo: true })
    setLogoState('uploading')

    try {
      const ext = file.name.split('.').pop()
      const path = `logo/${Date.now()}.${String(ext || 'png')}`
      const url = await uploadFile('logos', path, file)

      updateForm('company_logo_url', url)
      setLogoState('uploaded-unsaved')
      onToast('Logo uploaded')
    } catch (error) {
      const message = 'Upload failed: ' + getErrorMessage(error)
      setUploadError(message)
      setLogoState('error')
      onToast(message)
    } finally {
      setUploading({ logo: false })

      if (logoRef.current) {
        logoRef.current.value = ''
      }
    }
  }

  const save = async () => {
    setSaving(true)
    setUploadError(null)

    try {
      await saveSettings({
        company_logo_url: form.company_logo_url,
        footer_text: form.footer_text,
      })

      setSaved(true)
      setEditing(false)
      setLogoState(form.company_logo_url ? 'saved' : 'idle')
      onToast('Branding saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      const message = getErrorMessage(error)
      setUploadError(message)
      setLogoState('error')
      onToast(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SettingsLoadingState />

  const footerPreview = (form.footer_text || '').split('\n').find(Boolean) || ''

  const UploadBox = ({
    label,
    inputRef,
  }: {
    label: string
    inputRef: React.RefObject<HTMLInputElement | null>
  }) => (
    <SettingsField label={label}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleUpload(event.target.files?.[0] || null)}
      />

      {form.company_logo_url ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50">
                <img
                  src={form.company_logo_url}
                  alt={label}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-3 text-sm font-bold text-slate-900">Current Logo</div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                This is the logo currently selected for branding.
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null)
                    inputRef.current?.click()
                  }}
                  className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  Replace Logo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null)
                    updateForm('company_logo_url', '')
                  }}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {logoState === 'uploading' ? (
            <div className="rounded-xl bg-indigo-50 px-3 py-2 text-[12px] font-medium text-indigo-700">
              Uploading logo...
            </div>
          ) : null}

          {logoState === 'uploaded-unsaved' ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700">
              Logo uploaded. Save branding to keep this change.
            </div>
          ) : null}

          {logoState === 'saved' ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              Logo saved successfully.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setUploadError(null)
              inputRef.current?.click()
            }}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-indigo-50/20 px-4 py-5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white">
              {uploading.logo ? (
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              ) : (
                <Upload size={20} className="text-indigo-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900">
                {uploading.logo ? 'Uploading...' : 'Upload Logo'}
              </div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                PNG, JPG, or SVG. Use a clean high-resolution logo.
              </div>
            </div>
          </button>

          {logoState === 'saved' && form.company_logo_url ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              Logo saved successfully.
            </div>
          ) : null}
        </div>
      )}

      {uploadError ? (
        <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
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
          <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-indigo-50/20 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Logo
              </div>

              <div className="mt-3">
                {form.company_logo_url ? (
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                    <img
                      src={form.company_logo_url}
                      alt="Company logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm font-medium text-slate-900">No logo</div>
                )}
              </div>

              {form.company_logo_url && !saved ? (
                <div className="mt-3 text-[12px] font-medium text-slate-500">
                  Logo available
                </div>
              ) : null}

              {logoState === 'saved' && form.company_logo_url ? (
                <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-emerald-700">
                  <CheckCircle2 size={14} />
                  Saved
                </div>
              ) : null}
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
          <UploadBox label="Company Logo" inputRef={logoRef} />
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