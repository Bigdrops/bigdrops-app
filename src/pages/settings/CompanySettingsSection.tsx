import { useEffect, useState } from 'react'
import { Building2, Pencil, Plus, Trash2, Mail, Phone, Globe, MapPin, Fingerprint } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import {
  SettingsField,
  SettingsInput,
} from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'
import { feedback } from '@/lib/feedback'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'


type CompanyForm = {
  company_name: string
  company_tagline: string
  company_address: string
  company_city: string
  company_phone: string
  company_email: string
  company_website: string
}

type CustomInfoItem = {
  title?: string
  content?: string
}

export function CompanySettingsSection() {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<CompanyForm>({
    company_name: '',
    company_tagline: '',
    company_address: '',
    company_city: '',
    company_phone: '',
    company_email: '',
    company_website: '',
  })
  const [saving, setSaving] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [customInfo, setCustomInfo] = useState<CustomInfoItem[]>([])

  useEffect(() => {
    if (!loading && settings) {
      setForm((current) => ({ ...current, ...settings }))

      try {
        const parsed = JSON.parse(settings.custom_info || '[]')
        if (Array.isArray(parsed)) setCustomInfo(parsed)
      } catch {
        setCustomInfo([])
      }
    }
  }, [loading, settings])

  const updateForm = (key: keyof CompanyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleCancel = () => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        company_tagline: settings.company_tagline || '',
        company_address: settings.company_address || '',
        company_city: settings.company_city || '',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        company_website: settings.company_website || '',
      })
      try {
        const parsed = JSON.parse(settings.custom_info || '[]')
        setCustomInfo(Array.isArray(parsed) ? parsed : [])
      } catch {
        setCustomInfo([])
      }
    }
    setIsEditorOpen(false)
  }

  const save = async () => {
    setSaving(true)

    try {
      await saveSettings({
        ...form,
        custom_info: JSON.stringify(customInfo.filter((item) => item.title || item.content)),
      })

      feedback.success('Company info updated')
      setIsEditorOpen(false)
    } catch (error) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'save' }))
    }

    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))] opacity-60">
            Business Identity
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-xs font-bold shadow-sm hover:bg-[hsl(var(--bd-surface-muted))]"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit Identity
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Main Identity Summary */}
        <SettingsSummaryCard 
          title="Company Details"
          description="Basic information used on document headers and communications."
        >
          <SettingsSummaryRow 
            label="Legal Business Name" 
            value={form.company_name} 
            icon={<Building2 size={16} />}
          />
          <SettingsSummaryRow 
            label="Tagline / Description" 
            value={form.company_tagline} 
            icon={<Globe size={16} />}
          />
          <SettingsSummaryRow 
            label="Physical Address" 
            value={`${form.company_address}${form.company_city ? `, ${form.company_city}` : ''}`} 
            icon={<MapPin size={16} />}
          />
        </SettingsSummaryCard>

        {/* Contact Information */}
        <SettingsSummaryCard 
          title="Contact & Web"
          description="Direct lines and online presence for your business."
        >
          <SettingsSummaryRow 
            label="Business Phone" 
            value={form.company_phone} 
            icon={<Phone size={16} />}
          />
          <SettingsSummaryRow 
            label="Official Email" 
            value={form.company_email} 
            icon={<Mail size={16} />}
          />
          <SettingsSummaryRow 
            label="Website URL" 
            value={form.company_website} 
            icon={<Globe size={16} />}
          />
        </SettingsSummaryCard>

        {/* Custom Fields Summary */}
        {customInfo.length > 0 && (
          <SettingsSummaryCard 
            title="Additional Information"
            description="Extra metadata and registration details."
          >
            {customInfo
              .filter(item => item.title || item.content)
              .map((item, idx) => (
                <SettingsSummaryRow 
                  key={idx}
                  label={item.title || 'Untitled Field'} 
                  value={item.content} 
                  icon={<Fingerprint size={16} />}
                />
              ))}
          </SettingsSummaryCard>
        )}
      </div>

      {/* Focused Editor Sheet */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Edit Company Info</SheetTitle>
            <SheetDescription>
              Update your business identity details. Changes will reflect on all future documents.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-6 py-6">
              <div className="grid gap-4">
                <SettingsField label="Legal Business Name">
                  <SettingsInput
                    value={form.company_name}
                    onChange={(value) => updateForm('company_name', value)}
                    placeholder="Sun & Shield Power Solutions"
                  />
                </SettingsField>

                <SettingsField label="Tagline / Motto">
                  <SettingsInput
                    value={form.company_tagline}
                    onChange={(value) => updateForm('company_tagline', value)}
                    placeholder="Reliable Energy Solutions"
                  />
                </SettingsField>
              </div>

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <div className="grid gap-4">
                <SettingsField label="Physical Address">
                  <SettingsInput
                    value={form.company_address}
                    onChange={(value) => updateForm('company_address', value)}
                    placeholder="Street address"
                  />
                </SettingsField>
                <SettingsField label="City / State">
                  <SettingsInput
                    value={form.company_city}
                    onChange={(value) => updateForm('company_city', value)}
                    placeholder="Lagos, Nigeria"
                  />
                </SettingsField>
              </div>

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <div className="grid gap-4">
                <SettingsField label="Phone Number">
                  <SettingsInput
                    value={form.company_phone}
                    onChange={(value) => updateForm('company_phone', value)}
                    placeholder="+234..."
                  />
                </SettingsField>
                <SettingsField label="Official Email">
                  <SettingsInput
                    value={form.company_email}
                    onChange={(value) => updateForm('company_email', value)}
                    placeholder="info@business.com"
                  />
                </SettingsField>
                <SettingsField label="Website URL">
                  <SettingsInput
                    value={form.company_website}
                    onChange={(value) => updateForm('company_website', value)}
                    placeholder="https://..."
                  />
                </SettingsField>
              </div>

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">
                    Custom Fields
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomInfo((current) => [...current, { title: '', content: '' }])}
                    className="h-8 rounded-full text-xs font-bold text-[hsl(var(--bd-button-primary-bg))]"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Field
                  </Button>
                </div>

                {customInfo.length === 0 ? (
                  <p className="text-center text-[11px] italic text-[hsl(var(--bd-text-muted))] opacity-50 py-4">
                    No custom registration fields added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customInfo.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="grid flex-1 gap-2">
                          <input
                            className="w-full rounded-lg border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                            value={item.title || ''}
                            onChange={(e) =>
                              setCustomInfo(curr => curr.map((c, i) => i === index ? { ...c, title: e.target.value } : c))
                            }
                            placeholder="Field Title (e.g. TIN)"
                          />
                          <input
                            className="w-full rounded-lg border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                            value={item.content || ''}
                            onChange={(e) =>
                              setCustomInfo(curr => curr.map((c, i) => i === index ? { ...c, content: e.target.value } : c))
                            }
                            placeholder="Field Value"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCustomInfo(curr => curr.filter((_, i) => i !== index))}
                          className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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