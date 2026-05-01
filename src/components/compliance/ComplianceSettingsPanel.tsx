import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Building, 
  HelpCircle, 
  Loader2, 
  Save, 
  AlertCircle 
} from 'lucide-react'
import { supabase } from '@/supabase'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { feedback } from '@/lib/feedback'
import { TaxSettings } from '@/domain/compliance/types'

export default function ComplianceSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Partial<TaxSettings>>({
    settings_id: 1, // Global settings
    tin: '',
    vat_enabled: false,
    vat_threshold: 0,
    cit_category: 'small',
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('tax_settings')
          .select('*')
          .eq('settings_id', 1)
          .single()
        
        if (error && error.code !== 'PGRST116') throw error
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
      const { error } = await supabase
        .from('tax_settings')
        .upsert({ 
          settings_id: 1, 
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'settings_id' })

      if (error) throw error
      feedback.success('Tax settings updated successfully')
    } catch (error: any) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'save' }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading profiles...
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader className="pb-3 border-b border-white flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-600" />
            Entity Tax Profile
          </CardTitle>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-full h-8 px-4"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
            Save Profile
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tin" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  TIN (Tax ID Number)
                </Label>
                <Input 
                  id="tin"
                  placeholder="Not set"
                  value={settings.tin || ''}
                  onChange={(e) => setSettings({ ...settings, tin: e.target.value })}
                  className="bg-slate-50/50 border-slate-100 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-3">
                  VAT Status
                </Label>
                <div className="flex items-center gap-3">
                  <Switch 
                    id="vat-enabled"
                    checked={settings.vat_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, vat_enabled: checked })}
                  />
                  <Label htmlFor="vat-enabled" className="text-sm font-semibold">
                    {settings.vat_enabled ? 'VAT Registered' : 'Not VAT Registered'}
                  </Label>
                </div>
              </div>

              <div className="space-y-2 opacity-50">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">
                  CIT Category
                </Label>
                <div className="pt-1">
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                    {settings.cit_category || 'small'}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Currently read-only</p>
              </div>

              <div className="space-y-2 opacity-50">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">
                  Year-end Month
                </Label>
                <div className="text-sm font-bold text-slate-800 italic pt-1">
                  {settings.year_end_month || 'Not set'}
                </div>
              </div>
            </div>

            {!settings.tin && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-tight">
                  TIN is required for generating valid withholding tax (WHT) recovery documents.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-blue-50/20">
        <CardContent className="p-4 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-[11px] text-blue-800 leading-relaxed">
            <span className="font-bold text-blue-900">Note:</span> These settings control tax-related features across BigDrops.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
