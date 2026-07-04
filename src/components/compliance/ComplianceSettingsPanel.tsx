import { useEffect, useState } from 'react'
import { AlertCircle, Building, Loader2, Save } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { feedback } from '@/lib/feedback'
import { TaxSettings } from '@/domain/compliance/types'
import { fetchTaxSettings, upsertTaxSettings } from '@/modules/compliance/services/complianceService'

export default function ComplianceSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Partial<TaxSettings>>({
    settings_id: 1,
    tin: '',
    vat_enabled: false,
    vat_threshold: 0,
    cit_category: 'small',
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const data = await fetchTaxSettings()
        if (data) setSettings(data)
      } catch (error: any) {
        console.error('Error loading tax settings:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadSettings()
  }, [])

  async function handleSave() {
    try {
      setSaving(true)
      await upsertTaxSettings({
        settings_id: 1,
        ...settings,
      } as Partial<TaxSettings>)
      feedback.success('Tax settings updated successfully')
    } catch (error: any) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'save' }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-bd-text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading tax profile...
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bd-card-bg text-bd-text">
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-6">
          <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bd-surface-muted text-bd-text-muted">
                <Building className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-bd-text">Tax identity</h3>
                <p className="text-xs text-bd-text-muted">
                  Keep the entity tax details used across Compliance workflows.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tax-profile-tin" className="text-[11px] font-bold text-bd-text-muted">
                  TIN
                </Label>
                <Input
                  id="tax-profile-tin"
                  placeholder="Enter tax identification number"
                  value={settings.tin || ''}
                  onChange={(e) => setSettings({ ...settings, tin: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-profile-year-end" className="text-[11px] font-bold text-bd-text-muted">
                  Year-end month
                </Label>
                <Input
                  id="tax-profile-year-end"
                  value={settings.year_end_month ? String(settings.year_end_month) : ''}
                  placeholder="Not set"
                  readOnly
                  className="h-10"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-bd-text">Registration state</h3>
              <p className="text-xs text-bd-text-muted">
                Control whether VAT-related features and filings apply to this entity.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface-muted px-4 py-3">
              <div className="space-y-1">
                <Label htmlFor="tax-profile-vat" className="text-sm font-semibold text-bd-text">
                  VAT registration
                </Label>
                <p className="text-xs text-bd-text-muted">
                  {settings.vat_enabled ? 'VAT registered and active' : 'Not VAT registered'}
                </p>
              </div>
              <Switch
                id="tax-profile-vat"
                checked={settings.vat_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, vat_enabled: checked })}
              />
            </div>
          </section>

          <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-bd-text">Read-only tax metadata</h3>
              <p className="text-xs text-bd-text-muted">
                Reference values already attached to the current tax profile.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">CIT category</Label>
                <div className="flex h-10 items-center">
                  <Badge
                    variant="outline"
                    className="border-bd-border bg-bd-surface-muted text-bd-text"
                  >
                    {settings.cit_category || 'small'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Year-end day</Label>
                <Input
                  value={settings.year_end_day ? String(settings.year_end_day) : ''}
                  placeholder="Not set"
                  readOnly
                  className="h-10"
                />
              </div>
            </div>
          </section>

          {!settings.tin ? (
            <section className="rounded-[var(--bd-radius-xl)] border border-bd-status-warning-border bg-bd-status-warning-bg px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-bd-status-warning-text" />
                <p className="text-xs leading-relaxed text-bd-status-warning-text">
                  Add a TIN to keep generated tax recovery records and compliance exports complete.
                </p>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <div className="border-t border-bd-border bg-bd-card-bg px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 rounded-[var(--bd-radius-lg)] px-4 sm:min-w-36"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
