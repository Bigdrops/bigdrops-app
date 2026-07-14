import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react'
import { fetchSettings, saveSettings, uploadFile, useSettings } from '@/hooks/useSettings'
import { SettingsLoadingState } from './SettingsLoadingState'
import { feedback } from '@/lib/feedback'
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile, getUnsupportedImageErrorMessage } from '@/lib/documentImageUploadPolicy'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { Button } from '@/components/ui/button'

type BrandingForm = {
  company_logo_url: string
  footer_text: string
}

type LogoState = 'idle' | 'uploading' | 'uploaded-unsaved' | 'saved' | 'error'

export function BrandingSettingsSection() {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<BrandingForm>({
    company_logo_url: '',
    footer_text: '',
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [logoState, setLogoState] = useState<LogoState>('idle')
  const [localLogoPreview, setLocalLogoPreview] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!loading && settings) {
      setForm({
        company_logo_url: settings.company_logo_url || '',
        footer_text: settings.footer_text || '',
      })
      setLocalLogoPreview('')
      setLogoState('idle')
      setUploadError(null)
    }
  }, [loading, settings])

  useEffect(() => {
    return () => {
      if (localLogoPreview) {
        URL.revokeObjectURL(localLogoPreview)
      }
    }
  }, [localLogoPreview])

  const updateForm = (key: keyof BrandingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (key === 'company_logo_url') {
      setLogoState(value ? 'uploaded-unsaved' : 'idle')
    }
  }

  const handleCancel = () => {
    if (settings) {
      setForm({
        company_logo_url: settings.company_logo_url || '',
        footer_text: settings.footer_text || '',
      })
      if (localLogoPreview) URL.revokeObjectURL(localLogoPreview)
      setLocalLogoPreview('')
      setUploadError(null)
      setLogoState('idle')
      setConfirmingRemove(false)
    }
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploadError(null)

    if (!isSupportedImageFile(file)) {
      setUploadError(getUnsupportedImageErrorMessage(file.name))
      setLogoState('error')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setUploadError('Image is too large. Use one under 5MB.')
      setLogoState('error')
      return
    }

    if (localLogoPreview) URL.revokeObjectURL(localLogoPreview)
    const previewUrl = URL.createObjectURL(file)
    setLocalLogoPreview(previewUrl)
    setUploadingLogo(true)
    setLogoState('uploading')

    try {
      const ext = file.name.split('.').pop()
      const path = `logo/${Date.now()}.${String(ext || 'png')}`
      const url = await uploadFile('logos', path, file)

      if (!url) throw new Error('Upload returned no URL')

      updateForm('company_logo_url', url)
      setLogoState('uploaded-unsaved')
      feedback.success('Logo uploaded')
    } catch (error) {
      const message = 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      setUploadError(message)
      setLogoState('error')
      feedback.error(message)
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    setUploadError(null)
    if (localLogoPreview) URL.revokeObjectURL(localLogoPreview)
    setLocalLogoPreview('')
    updateForm('company_logo_url', '')
    setConfirmingRemove(false)
    setLogoState('idle')
  }

  const save = async () => {
    setSaving(true)
    setUploadError(null)

    try {
      await saveSettings({
        company_logo_url: form.company_logo_url,
        footer_text: form.footer_text,
      })

      await fetchSettings({ force: true })
      setLogoState(form.company_logo_url ? 'saved' : 'idle')
      if (localLogoPreview) URL.revokeObjectURL(localLogoPreview)
      setLocalLogoPreview('')

      feedback.success('Branding saved')
    } catch (error) {
      const message = getUserFacingMutationMessage(error, { action: 'save' })
      setUploadError(message)
      setLogoState('error')
      feedback.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SettingsLoadingState />

  const previewSrc = localLogoPreview || form.company_logo_url
  const hasChanges = form.company_logo_url !== (settings?.company_logo_url || '') ||
    form.footer_text !== (settings?.footer_text || '')

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
          Visual Identity
        </p>
      </div>

      {/* Company Logo Card */}
      <div className="overflow-hidden rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg shadow-sm">
        <div className="border-b border-[hsl(var(--bd-border)/0.4)] bg-[hsl(var(--bd-surface-muted)/0.3)] px-5 py-4">
          <h3 className="text-sm font-bold text-bd-text">Company Logo</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-bd-text-muted">
            Your brand identity across all documents and PDF exports.
          </p>
        </div>

        <div className="p-6">
          {/* Large Preview or Empty State */}
          {previewSrc ? (
            <div className="mb-6 flex justify-center">
              <div className="flex w-full max-w-[280px] items-center justify-center rounded-2xl border border-bd-border bg-bd-card-bg p-8 shadow-sm">
                <img
                  src={previewSrc}
                  alt="Company logo"
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="mb-6 flex justify-center">
              <div className="w-full max-w-[280px] rounded-2xl border-2 border-dashed border-bd-border bg-[hsl(var(--bd-surface-muted)/0.2)] p-12 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bd-card-bg shadow-sm ring-1 ring-black/5">
                  <ImageIcon className="h-7 w-7 text-bd-text-muted opacity-40" />
                </div>
                <p className="text-sm font-bold text-bd-text">No Logo Uploaded</p>
                <p className="mt-1 text-xs text-bd-text-muted">
                  Your logo will appear on quotations, invoices, receipts, and all customer-facing documents.
                </p>
              </div>
            </div>
          )}

          {/* Format and Size Info */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className="text-[10px] font-medium text-bd-text-muted">PNG &bull; SVG &bull; JPG</span>
            <span className="text-[10px] text-bd-text-muted opacity-30">|</span>
            <span className="text-[10px] font-medium text-bd-text-muted">Max 5MB</span>
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => handleUpload(event.target.files?.[0] || null)}
          />

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            {confirmingRemove ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingRemove(false)}
                  className="rounded-full text-xs font-bold"
                >
                  Keep Logo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  className="rounded-full text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  Yes, Remove
                </Button>
              </>
            ) : previewSrc ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-full text-xs font-bold"
                >
                  {uploadingLogo ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingRemove(true)}
                  className="rounded-full text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  Remove
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="rounded-full text-xs font-bold"
              >
                {uploadingLogo ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Upload Logo
              </Button>
            )}
          </div>

          {uploadError && (
            <p className="mt-4 text-center text-xs font-medium text-red-500">{uploadError}</p>
          )}

          {logoState === 'uploaded-unsaved' && (
            <p className="mt-3 text-center text-[10px] font-medium text-emerald-600">
              New logo uploaded &mdash; save changes to apply.
            </p>
          )}
        </div>

        {/* Logo Usage Info */}
        <div className="border-t border-[hsl(var(--bd-border)/0.4)] bg-[hsl(var(--bd-surface-muted)/0.15)] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-bd-text-muted opacity-70">
            Where Your Logo Appears
          </p>
          <p className="mt-1 text-xs leading-relaxed text-bd-text-muted">
            Your company logo is displayed on quotations, invoices, receipts, purchase orders, waybills, reports, PDF exports, and all customer-facing communications.
          </p>
        </div>
      </div>

      {/* PDF Footer Text Card */}
      <div className="overflow-hidden rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg shadow-sm">
        <div className="border-b border-[hsl(var(--bd-border)/0.4)] bg-[hsl(var(--bd-surface-muted)/0.3)] px-5 py-4">
          <h3 className="text-sm font-bold text-bd-text">PDF Footer Text</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-bd-text-muted">
            Optional text displayed at the bottom of every generated PDF.
          </p>
        </div>
        <div className="p-5">
          <textarea
            value={form.footer_text || ''}
            onChange={(event) => updateForm('footer_text', event.target.value)}
            placeholder="Bank details, payment terms, or legal disclaimers..."
            rows={4}
            className="w-full resize-none rounded-xl border border-bd-border bg-bd-surface px-4 py-3 text-sm text-bd-text transition-all placeholder:text-[hsl(var(--bd-text-muted))/0.5] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
          />
        </div>
      </div>

      {/* Save / Cancel */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg)/0.95)] px-1 py-4">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="text-bd-text-muted hover:text-bd-text"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="min-w-[120px] bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90"
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
