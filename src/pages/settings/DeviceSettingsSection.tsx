import { useCallback, useEffect, useState } from 'react'
import { Globe, Loader2, Smartphone } from 'lucide-react'
import { supabase } from '@/supabase'
import { adminUpdateDeviceAssignment } from '@/lib/native/deviceAssignment'
import { getErrorMessage } from './settings-helpers'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsLoadingState } from './SettingsLoadingState'
import { cn } from '@/lib/utils'

type DeviceRow = {
  id: string
  installation_id?: string | null
  device_code: string
  device_name?: string | null
  platform?: string | null
  active?: boolean | null
  assigned_at?: string | null
  last_seen_at?: string | null
  assigned_automatically?: boolean | null
  user_id?: string | null
  profiles?: { email?: string | null } | null
}

export function DeviceSettingsSection() {
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [deviceCodeDrafts, setDeviceCodeDrafts] = useState<Record<string, string>>({})
  const [fetching, setFetching] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setFetching(true)
    const { data: deviceRows } = await supabase
      .from('device_installations')
      .select('id, installation_id, user_id, platform, device_code, device_name, active, assigned_at, last_seen_at, assigned_automatically, profiles(email)')
      .order('assigned_at', { ascending: false })

    const normalizedDevices = ((deviceRows as DeviceRow[]) || []).map((row) => ({
      ...row,
      device_code: String(row.device_code || '').toUpperCase(),
    }))

    setDevices(normalizedDevices)
    setDeviceCodeDrafts(Object.fromEntries(normalizedDevices.map((row) => [row.id, row.device_code || ''])))
    setFetching(false)
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const updateDeviceCode = async (device: DeviceRow) => {
    const nextCode = String(deviceCodeDrafts[device.id] || '').trim().toUpperCase()
    setActionId(device.id)
    try {
      await adminUpdateDeviceAssignment({
        assignmentId: device.id,
        userId: device.user_id,
        newDeviceCode: nextCode,
      })
      await fetchAll()
      feedback.success(`Device code updated to ${nextCode}`)
    } catch (error) {
      feedback.error('Error: ' + getErrorMessage(error))
    } finally {
      setActionId(null)
    }
  }

  if (fetching) return <SettingsLoadingState />

  const activeDevices = devices.filter((d) => d.active).length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">Device Administration</p>
      </div>

      <div className="grid gap-6">
        <SettingsSummaryCard title="Device Ecosystem" description="Control field hardware assignments and mobile installation tokens.">
          <SettingsSummaryRow
            label="Linked Installations"
            value={
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{devices.length} Handsets</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 h-5 px-1.5 text-[9px] font-black uppercase">
                  {activeDevices} Online
                </Badge>
              </div>
            }
            icon={<Globe size={16} />}
          />
        </SettingsSummaryCard>

        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Device Assignments</h5>
            <Badge variant="outline" className="bg-bd-surface-muted text-bd-text-muted border-[hsl(var(--bd-border)/0.5)] text-[9px] font-black uppercase">
              <Smartphone className="mr-1 h-2.5 w-2.5" />
              {devices.length} Devices
            </Badge>
          </div>
          {devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-bd-text-muted">No devices linked yet.</p>
          ) : null}
          {devices.map((device) => {
            const codeValue = deviceCodeDrafts[device.id] ?? device.device_code ?? ''
            const hasChanged = codeValue !== device.device_code
            return (
              <div key={device.id} className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bd-surface-muted">
                    <Smartphone size={18} className="text-bd-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-bd-text">{device.device_name || 'Android Device'}</p>
                    <p className="truncate text-[11px] text-bd-text-muted">{device.profiles?.email || 'Unassigned'}</p>
                  </div>
                  <span className={cn('ml-auto rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider', device.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                    {device.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-[hsl(var(--bd-surface-muted)/0.3)] p-3 text-[10px] text-bd-text-muted">
                  <div>
                    Current: <span className="font-bold text-bd-text">{device.device_code || '—'}</span>
                  </div>
                  <div>
                    Platform: <span className="font-bold text-bd-text uppercase">{device.platform || 'android'}</span>
                  </div>
                  <div className="col-span-2 truncate">
                    ID: <span className="font-mono text-bd-text">{device.installation_id || 'legacy'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-[hsl(var(--bd-border)/0.3)]">
                  <div className="relative flex-1">
                    <Input
                      value={codeValue}
                      onChange={(event) => setDeviceCodeDrafts((c) => ({ ...c, [device.id]: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) }))}
                      placeholder="AA"
                      className="font-mono h-10 text-sm font-black uppercase tracking-widest text-center"
                      maxLength={2}
                    />
                  </div>
                  <Button onClick={() => void updateDeviceCode(device)} disabled={actionId === device.id || !hasChanged} className="rounded-xl px-6 h-10 text-[11px] font-bold uppercase tracking-wider bg-bd-button-primary-bg text-white disabled:opacity-50">
                    {actionId === device.id ? <Loader2 size={12} className="animate-spin" /> : 'Update Code'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
