import { useEffect, useState } from 'react'
import { Building2, Pencil, Plus, Trash2, Mail, Phone, Globe, MapPin, Fingerprint, X, Check } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { useEntity } from '@/lib/tenant/contexts'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { normalizeCompanyCustomInfo } from '@/domain/invoice/normalize'
import {
  SettingsField,
  SettingsInput,
} from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
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
  label?: string
  value?: string
}

export function CompanySettingsSection() {
  const { settings, loading } = useSettings()
  const { tenantClient } = useEntity()
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
  const [isEditing, setIsEditing] = useState(false)
  const [customInfo, setCustomInfo] = useState<CustomInfoItem[]>([])

  useEffect(() => {
    if (!loading && settings) {
      setForm((current) => ({ ...current, ...settings }))
      setCustomInfo(normalizeCompanyCustomInfo(settings.custom_info))
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
      setCustomInfo(normalizeCompanyCustomInfo(settings.custom_info))
    }
    setIsEditing(false)
  }

  const save = async () => {
    setSaving(true)

    try {
      await saveSettings({
        ...form,
        custom_info: JSON.stringify(customInfo.filter((item) => item.label || item.value)),
      }, tenantClient)

      feedback.success('Company info updated')
      setIsEditing(false)
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Business Identity
          </p>
        </div>
        {!isEditing ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(true)}
            className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit Identity
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={save}
              disabled={saving}
              className="rounded-full bg-bd-button-primary-bg text-bd-button-primary-text text-xs font-bold shadow-sm hover:bg-bd-button-primary-bg/90"
            >
              {saving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Check className="mr-2 h-3.5 w-3.5" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-6">
          {/* Main Identity Form */}
          <div className="rounded-xl border border-bd-border bg-bd-card-bg p-6">
            <h3 className="mb-4 text-sm font-bold text-bd-text">Company Details</h3>
            <p className="mb-6 text-[11px] text-bd-text-muted">Basic information used on document headers and communications.</p>
            
            <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Contact Information Form */}
          <div className="rounded-xl border border-bd-border bg-bd-card-bg p-6">
            <h3 className="mb-4 text-sm font-bold text-bd-text">Contact & Web</h3>
            <p className="mb-6 text-[11px] text-bd-text-muted">Direct lines and online presence for your business.</p>
            
            <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Custom Fields Form */}
          <div className="rounded-xl border border-bd-border bg-bd-card-bg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-bd-text">Custom Fields</h3>
                <p className="text-[11px] text-bd-text-muted">Additional metadata and registration details.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomInfo((current) => [...current, { label: '', value: '' }])}
                className="h-8 rounded-full text-xs font-bold text-bd-button-primary-bg"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Field
              </Button>
            </div>

            {customInfo.length === 0 ? (
              <p className="text-center text-[11px] italic text-bd-text-muted opacity-50 py-4">
                No custom registration fields added.
              </p>
            ) : (
              <div className="space-y-3">
                {customInfo.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <input
                        className="w-full rounded-lg border border-bd-border bg-bd-surface px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                        value={item.label || ''}
                        onChange={(e) =>
                          setCustomInfo(curr => curr.map((c, i) => i === index ? { ...c, label: e.target.value } : c))
                        }
                        placeholder="Field Label (e.g. TIN)"
                      />
                      <input
                        className="w-full rounded-lg border border-bd-border bg-bd-surface px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                        value={item.value || ''}
                        onChange={(e) =>
                          setCustomInfo(curr => curr.map((c, i) => i === index ? { ...c, value: e.target.value } : c))
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
      ) : (
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
                .filter(item => item.label || item.value)
                .map((item, idx) => (
                  <SettingsSummaryRow 
                    key={idx}
                    label={item.label || 'Untitled Field'} 
                    value={item.value} 
                    icon={<Fingerprint size={16} />}
                  />
                ))}
            </SettingsSummaryCard>
          )}
        </div>
      )}
    </div>
  )
}