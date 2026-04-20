import { useEffect, useState } from 'react'
import { ChevronLeft, Pencil, Plus } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import {
  SettingsField,
  SettingsInput,
  SettingsSaveButton,
  SettingsSummaryField,
} from './SettingsFormPrimitives'
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

  const updateForm = (key: keyof CompanyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

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
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-600/80">
            Company Info
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">Saved Business Identity</div>
            <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
              These details appear anywhere the app needs your company identity.
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
            <SettingsSummaryField label="Company Name" value={form.company_name} />
            <SettingsSummaryField label="Tagline" value={form.company_tagline} />
            <SettingsSummaryField label="Address" value={form.company_address} />
            <SettingsSummaryField label="City / State" value={form.company_city} />
            <SettingsSummaryField label="Phone" value={form.company_phone} />
            <SettingsSummaryField label="Email" value={form.company_email} />
            <SettingsSummaryField label="Website" value={form.company_website} />
          </div>

          {customInfo.length > 0 ? (
            <div className="border-t border-slate-200/80 px-4 py-4">
              <div className="mb-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  Additional Info
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  Extra business fields shown in document headers.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {customInfo
                  .filter((item) => item.title || item.content)
                  .map((item, index) => (
                    <SettingsSummaryField
                      key={`${item.title || 'extra'}-${index}`}
                      label={item.title || 'Untitled'}
                      value={item.content || '—'}
                    />
                  ))}
              </div>
            </div>
          ) : null}
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
            restoreSavedCompanyState()
            setEditing(false)
          }}
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-700 transition-colors hover:bg-indigo-50"
          aria-label="Back to saved company info"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">Edit Business Identity</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Save changes to update the company details used across the workspace.
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
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

        <div className="border-t border-slate-200/80 px-4 py-4">
          <SettingsField label="Address">
            <SettingsInput
              value={form.company_address}
              onChange={(value) => updateForm('company_address', value)}
              placeholder="No. 5 Industrial Road, Apapa"
            />
          </SettingsField>
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
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
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
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
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Additional Info
              </p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                Extra fields that appear in your invoice header, such as RC Number or Tax ID.
              </p>
            </div>

            <button
              onClick={() => setCustomInfo((current) => [...current, { title: '', content: '' }])}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <Plus size={12} />
              Add Field
            </button>
          </div>

          {customInfo.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              No extra fields yet.
            </p>
          ) : (
            <div className="space-y-3">
              {customInfo.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)_auto] items-start gap-2"
                >
                  <input
                    className="rounded-xl border border-slate-200/80 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                    value={item.title || ''}
                    onChange={(event) =>
                      setCustomInfo((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, title: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="Title"
                  />

                  <input
                    className="rounded-xl border border-slate-200/80 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
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
                      setCustomInfo((current) =>
                        current.filter((_, entryIndex) => entryIndex !== index),
                      )
                    }
                    className="h-[42px] rounded-xl border border-red-200 bg-white px-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                    aria-label="Remove field"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
          <SettingsSaveButton saving={saving} saved={saved} onClick={save} />
        </div>
      </div>
    </div>
  )
}