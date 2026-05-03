import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Pencil, Upload, Image as ImageIcon, FileText } from 'lucide-react'
import { fetchSettings, saveSettings, uploadFile, useSettings } from '@/hooks/useSettings'
import {
  SettingsField,
  SettingsInput,
} from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [logoState, setLogoState] = useState<LogoState>('idle')
  const [localLogoPreview, setLocalLogoPreview] = useState<string>('')
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
    }
    setIsEditorOpen(false)
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
      setIsEditorOpen(false)
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))] opacity-60">
            Visual Identity
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-xs font-bold shadow-sm hover:bg-[hsl(var(--bd-surface-muted))]"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit Branding
        </Button>
      </div>

      <div className="grid gap-6">
        <SettingsSummaryCard 
          title="Logo & Branding"
          description="Visual elements used on document headers and PDF exports."
        >
          <div className="flex items-start gap-4 px-5 py-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))/0.3]">
              {form.company_logo_url ? (
                <img
                  src={form.company_logo_url}
                  alt="Company logo"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-[hsl(var(--bd-text-muted))] opacity-40" />
              )}
            </div>
            <div className="min-w-0 flex-1 py-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--bd-text-muted))] opacity-70">
                Primary Logo
              </p>
              <p className="mt-1 text-sm font-semibold text-[hsl(var(--bd-text))]">
                {form.company_logo_url ? 'Company Logo Uploaded' : 'No Logo Set'}
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">
                Used in the top header of all generated PDF documents.
              </p>
            </div>
          </div>

          <SettingsSummaryRow 
            label="PDF Footer Text" 
            value={form.footer_text || 'Default footer information'} 
            icon={<FileText size={16} />}
          />
        </SettingsSummaryCard>
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Edit Branding</SheetTitle>
            <SheetDescription>
              Update your logo and document footer text.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-8 py-6">
              <SettingsField label="Company Logo">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleUpload(event.target.files?.[0] || null)}
                />

                {previewSrc ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center rounded-2xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))/0.2] p-6 text-center">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-[hsl(var(--bd-border))] bg-white shadow-sm">
                        <img
                          src={previewSrc}
                          alt="Company logo preview"
                          className="h-full w-full object-contain p-2"
                        />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          className="rounded-full text-xs font-bold"
                        >
                          Replace
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadError(null)
                            if (localLogoPreview) URL.revokeObjectURL(localLogoPreview)
                            setLocalLogoPreview('')
                            updateForm('company_logo_url', '')
                          }}
                          className="rounded-full text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="group cursor-pointer rounded-2xl border-2 border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))/0.2] p-8 text-center transition-all hover:border-[hsl(var(--bd-button-primary-bg)/0.5)] hover:bg-[hsl(var(--bd-surface-muted))/0.4]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
                        {uploadingLogo ? (
                          <Loader2 size={20} className="animate-spin text-[hsl(var(--bd-text-muted))]" />
                        ) : (
                          <Upload size={20} className="text-[hsl(var(--bd-button-primary-bg))]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[hsl(var(--bd-text))]">
                          {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        </p>
                        <p className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">
                          PNG, JPG or SVG (Max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-2 text-xs font-medium text-red-500">{uploadError}</p>
                )}
              </SettingsField>

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <SettingsField label="PDF Footer Text">
                <textarea
                  value={form.footer_text || ''}
                  onChange={(event) => updateForm('footer_text', event.target.value)}
                  placeholder="Bank details, payment terms, or legal disclaimers..."
                  rows={6}
                  className="w-full resize-none rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 py-3 text-sm text-[hsl(var(--bd-text))] transition-all placeholder:text-[hsl(var(--bd-text-muted))/0.5] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                />
                <p className="mt-2 text-[10px] text-[hsl(var(--bd-text-muted))]">
                  This text appears at the bottom of every generated PDF document.
                </p>
              </SettingsField>
            </div>
          </div>

          <SettingsActionFooter 
            onSave={save}
            onCancel={handleCancel}
            saving={saving}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
