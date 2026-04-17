import { useEffect, useState } from 'react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsField, SettingsInput, SettingsSaveButton, SettingsSummaryField } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import type { SettingsToastFn } from './settings-types'

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

export function CompanySettingsSection({ onToast }: { onToast: SettingsToastFn }) {
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
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
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

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [
        settings?.company_name,
        settings?.company_tagline,
        settings?.company_address,
        settings?.company_phone,
        settings?.company_email,
      ].some(Boolean)
      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const updateForm = (key: keyof CompanyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const restoreSavedCompanyState = () => {
    setForm({
      company_name: settings?.company_name || '',
      company_tagline: settings?.company_tagline || '',
      company_address: settings?.company_address || '',
      company_city: settings?.company_city || '',
      company_phone: settings?.company_phone || '',
      company_email: settings?.company_email || '',
      company_website: settings?.company_website || '',
    })

    try {
      const parsed = JSON.parse(settings?.custom_info || '[]')
      setCustomInfo(Array.isArray(parsed) ? parsed : [])
    } catch {
      setCustomInfo([])
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings({
        ...form,
        custom_info: JSON.stringify(customInfo.filter((item) => item.title || item.content)),
      })
      setSaved(true)
      setEditing(false)
      onToast('Company info saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      onToast(getUserFacingMutationMessage(error, { action: 'save' }))
    }
    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div>
            <div className="text-sm font-bold text-foreground">Saved business identity</div>
            <div className="mt-1 text-xs text-muted-foreground">
              These details appear anywhere the app needs your company identity.
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
          <SettingsSummaryField label="Company Name" value={form.company_name} />
          <SettingsSummaryField label="Tagline" value={form.company_tagline} />
          <SettingsSummaryField label="Address" value={form.company_address} />
          <SettingsSummaryField label="City / State" value={form.company_city} />
          <SettingsSummaryField label="Phone" value={form.company_phone} />
          <SettingsSummaryField label="Email" value={form.company_email} />
          <SettingsSummaryField label="Website" value={form.company_website} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-foreground">Edit business identity</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Save changes to update the company details used across the workspace.
          </div>
        </div>
        <button
          onClick={() => {
            restoreSavedCompanyState()
            setEditing(false)
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SettingsField label="Company Name">
          <SettingsInput
            value={form.company_name}
            onChange={(value) => updateForm('company_name', value)}
            placeholder="Sun & Shield Power Solutions"
          />
        </SettingsField>
        <SettingsField label="Tagline">
          <SettingsInput
            value={form.company_tagline}
            onChange={(value) => updateForm('company_tagline', value)}
            placeholder="Generator Sales | Maintenance"
          />
        </SettingsField>
      </div>
      <SettingsField label="Address">
        <SettingsInput
          value={form.company_address}
          onChange={(value) => updateForm('company_address', value)}
          placeholder="No. 5 Industrial Road, Apapa"
        />
      </SettingsField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SettingsField label="City / State">
          <SettingsInput
            value={form.company_city}
            onChange={(value) => updateForm('company_city', value)}
            placeholder="Lagos, Nigeria"
          />
        </SettingsField>
        <SettingsField label="Phone">
          <SettingsInput
            value={form.company_phone}
            onChange={(value) => updateForm('company_phone', value)}
            placeholder="+234 801 234 5678"
          />
        </SettingsField>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SettingsField label="Email">
          <SettingsInput
            value={form.company_email}
            onChange={(value) => updateForm('company_email', value)}
            placeholder="info@sunshield.ng"
          />
        </SettingsField>
        <SettingsField label="Website">
          <SettingsInput
            value={form.company_website}
            onChange={(value) => updateForm('company_website', value)}
            placeholder="www.sunshield.ng"
          />
        </SettingsField>
      </div>

      <div className="border-t border-border pt-2">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Additional Info
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Extra fields that appear on your invoice header (e.g. RC Number, Tax ID)
            </p>
          </div>
          <button
            onClick={() => setCustomInfo((current) => [...current, { title: '', content: '' }])}
            className="whitespace-nowrap text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            + Add Field
          </button>
        </div>
        {customInfo.length === 0 ? (
          <p className="text-xs italic text-slate-300">No extra fields yet. Click + Add Field above.</p>
        ) : null}
        {customInfo.map((item, index) => (
          <div key={index} className="mb-2 flex items-center gap-2">
            <input
              className="w-2/5 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-ring/10"
              value={item.title || ''}
              onChange={(event) =>
                setCustomInfo((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, title: event.target.value } : entry,
                  ),
                )
              }
              placeholder="Title (e.g. RC Number)"
            />
            <input
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-ring/10"
              value={item.content || ''}
              onChange={(event) =>
                setCustomInfo((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, content: event.target.value } : entry,
                  ),
                )
              }
              placeholder="Value"
            />
            <button
              onClick={() =>
                setCustomInfo((current) => current.filter((_, entryIndex) => entryIndex !== index))
              }
              className="flex-shrink-0 px-1 text-xl leading-none text-muted-foreground hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <SettingsSaveButton saving={saving} saved={saved} onClick={save} />
    </div>
  )
}
