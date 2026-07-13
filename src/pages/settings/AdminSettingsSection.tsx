import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Smartphone, Trash2, UserCheck, UserX, Users, ShieldCheck, Check, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/supabase'
import { adminUpdateDeviceAssignment } from '@/lib/native/deviceAssignment'
import { getErrorMessage } from './settings-helpers'
import type { SettingsSession } from './settings-types'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsLoadingState } from './SettingsLoadingState'
import { cn } from '@/lib/utils'

type ConfirmType = 'approve' | 'deactivate' | 'remove' | 'revoke'

type AdminUser = {
  id: string
  email: string
  created_at?: string | null
  assigned_device_code?: string | null
  is_approved?: boolean | null
}

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

function ConfirmModal({
  type,
  user,
  onConfirm,
  onCancel,
  loading,
}: {
  type: ConfirmType
  user: AdminUser
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [emailInput, setEmailInput] = useState('')
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  useEffect(() => {
    if (type === 'remove') inputRef.current?.focus()
    else cancelRef.current?.focus()
  }, [type])

  const emailMatch = emailInput.trim().toLowerCase() === user.email.toLowerCase()

  const config = {
    approve: {
      title: 'Grant Access',
      icon: <UserCheck size={22} className="text-emerald-600" />,
      iconBg: 'bg-emerald-50',
      body: (
        <>
          <p className="text-sm leading-relaxed text-slate-700">
            You are about to grant <span className="font-bold text-foreground">{user.email}</span> full access to BIGDROPS.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            They will be able to create invoices, CSRs, and view all client data immediately.
          </p>
        </>
      ),
      confirmLabel: 'Yes, Grant Access',
      confirmClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
      canConfirm: true,
    },
    deactivate: {
      title: 'Deactivate Account',
      icon: <UserX size={22} className="text-amber-600" />,
      iconBg: 'bg-amber-50',
      body: (
        <>
          <p className="text-sm leading-relaxed text-slate-700">
            <span className="font-bold text-foreground">{user.email}</span> will be{' '}
            <span className="font-bold text-amber-700">locked out immediately.</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Their data is preserved. You can reactivate them at any time.
          </p>
        </>
      ),
      confirmLabel: 'Yes, Deactivate',
      confirmClass: 'bg-amber-600 text-white hover:bg-amber-700',
      canConfirm: true,
    },
    remove: {
      title: 'Remove User',
      icon: <Trash2 size={22} className="text-red-600" />,
      iconBg: 'bg-red-50',
      body: (
        <>
          <p className="text-sm leading-relaxed text-slate-700">
            This will <span className="font-bold text-red-700">permanently remove</span>{' '}
            <span className="font-bold text-foreground">{user.email}</span> from BIGDROPS.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Their invoice and CSR history is preserved, but their login access is gone forever.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="mt-0.5 text-sm text-red-500">!</span>
            <p className="text-xs font-semibold text-red-700">
              This cannot be undone. Type the email address below to confirm.
            </p>
          </div>
          <input
            ref={inputRef}
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder={user.email}
            className="mt-3 w-full rounded-lg border border-input px-3 py-2.5 text-sm font-mono transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          {emailInput && !emailMatch ? <p className="mt-1 text-[11px] font-bold text-red-500">Email doesn't match</p> : null}
        </>
      ),
      confirmLabel: 'Permanently Remove',
      confirmClass: emailMatch ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed bg-slate-200 text-slate-400',
      canConfirm: emailMatch,
    },
    revoke: {
      title: 'Revoke Device Access',
      icon: <Smartphone size={22} className="text-amber-600" />,
      iconBg: 'bg-amber-50',
      body: (
        <>
          <p className="text-sm leading-relaxed text-slate-700">
            You are about to revoke device code <span className="font-bold text-amber-700">{String(user.assigned_device_code).toUpperCase()}</span> for <span className="font-bold text-foreground">{user.email}</span>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            This clears the code from their profile and deactivates any matching installation mapping.
          </p>
        </>
      ),
      confirmLabel: 'Yes, Revoke',
      confirmClass: 'bg-amber-600 text-white hover:bg-amber-700',
      canConfirm: true,
    },
  }

  const currentConfig = config[type]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[var(--bd-radius-xl)] bg-bd-card-bg shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${currentConfig.iconBg}`}>
            {currentConfig.icon}
          </div>
          <h3 className="text-base font-black text-foreground">{currentConfig.title}</h3>
        </div>

        <div className="px-5 pb-5">{currentConfig.body}</div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-bd-border py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={currentConfig.canConfirm ? onConfirm : undefined}
            disabled={!currentConfig.canConfirm || loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${currentConfig.confirmClass} disabled:opacity-60`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Processing…' : currentConfig.confirmLabel}
          </button>
        </div>

        <p className="pb-3 text-center text-[10px] font-bold text-slate-300">Press Esc to cancel</p>
      </div>
    </div>
  )
}

export function AdminSettingsSection({
  session,
}: {
  session: SettingsSession
}) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [deviceCodeDrafts, setDeviceCodeDrafts] = useState<Record<string, string>>({})
  const [fetching, setFetching] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: ConfirmType; user: AdminUser } | null>(null)

  const fetchAll = useCallback(async () => {
    setFetching(true)
    const [{ data: profiles }, { data: deviceRows }] = await Promise.all([
      supabase.from('profiles').select('id, email, created_at, assigned_device_code, is_approved').order('created_at', { ascending: false }),
      supabase
        .from('device_installations')
        .select('id, installation_id, user_id, platform, device_code, device_name, active, assigned_at, last_seen_at, assigned_automatically, profiles(email)')
        .order('assigned_at', { ascending: false }),
    ])

    const normalizedDevices = ((deviceRows as DeviceRow[]) || []).map((row) => ({
      ...row,
      device_code: String(row.device_code || '').toUpperCase(),
    }))

    setUsers((profiles as AdminUser[]) || [])
    setDevices(normalizedDevices)
    setDeviceCodeDrafts(
      Object.fromEntries(normalizedDevices.map((row) => [row.id, row.device_code || ''])),
    )
    setFetching(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const closeModal = useCallback(() => setModal(null), [])

  const handleConfirm = async () => {
    if (!modal) return
    const { type, user } = modal
    setActionId(user.id + '_' + type[0])
    try {
      if (type === 'approve') {
        await supabase.from('profiles').update({ is_approved: true }).eq('id', user.id)
        feedback.success('Access granted to ' + user.email)
      } else if (type === 'deactivate') {
        await supabase.from('profiles').update({ is_approved: false }).eq('id', user.id)
        feedback.success(user.email + ' deactivated')
      } else if (type === 'remove') {
        await supabase.from('profiles').delete().eq('id', user.id)
        feedback.success(user.email + ' removed')
      } else if (type === 'revoke') {
        await supabase.from('profiles').update({ assigned_device_code: null }).eq('id', user.id)
        await supabase.from('device_installations').update({ user_id: null }).eq('user_id', user.id)
        feedback.success('Device access revoked for ' + user.email)
      }
      await fetchAll()
    } catch (error) {
      feedback.error('Error: ' + getErrorMessage(error))
    }
    setActionId(null)
    setModal(null)
  }

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

  const isLoading = (id: string, suffix: string) => actionId === id + '_' + suffix

  if (fetching) return <SettingsLoadingState />

  const approvedUsers = users.filter(u => u.is_approved).length
  const pendingUsers = users.length - approvedUsers
  const activeDevices = devices.filter(d => d.active).length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {modal ? (
        <ConfirmModal
          type={modal.type}
          user={modal.user}
          onConfirm={handleConfirm}
          onCancel={closeModal}
          loading={!!actionId}
        />
      ) : null}

      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
          System Administration
        </p>
      </div>

      <div className="grid gap-6">
        <SettingsSummaryCard 
          title="User Directory"
          description="Manage application access and authentication for all registered profiles."
        >
          <SettingsSummaryRow 
            label="Total Registered" 
            value={
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{users.length} Users</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 h-5 px-1.5 text-[9px] font-black uppercase">
                  {approvedUsers} Active
                </Badge>
                {pendingUsers > 0 && (
                   <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 h-5 px-1.5 text-[9px] font-black uppercase">
                    {pendingUsers} Pending
                  </Badge>
                )}
              </div>
            }
            icon={<ShieldCheck size={16} />}
          />
        </SettingsSummaryCard>

        {/* Inline Users List */}
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">All Users</h5>
            <Badge variant="outline" className="bg-bd-surface-muted text-bd-text-muted border-[hsl(var(--bd-border)/0.5)] text-[9px] font-black uppercase">
              <Users className="mr-1 h-2.5 w-2.5" />
              {users.length} Registered
            </Badge>
          </div>
          {users.map((user) => {
            const isSelf = user.id === session?.user?.id
            return (
              <div
                key={user.id}
                className={cn(
                  "rounded-[var(--bd-radius-lg)] border p-4 transition-all",
                  isSelf ? "border-blue-200 bg-blue-50/20" : "border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg"
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-bd-text">{user.email}</p>
                      {isSelf && (
                        <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                          You
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-bd-text-muted">
                      Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      {user.assigned_device_code && (
                        <span className="ml-2 font-bold text-bd-text-muted opacity-60">· {String(user.assigned_device_code).toUpperCase()}</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider",
                      user.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
                    )}
                  >
                    {user.is_approved ? 'Active' : 'Pending'}
                  </span>
                </div>
                
                {!isSelf && (
                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--bd-border)/0.3)]">
                    {!user.is_approved ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModal({ type: 'approve', user })}
                        disabled={isLoading(user.id, 'a')}
                        className="flex-1 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                      >
                        {isLoading(user.id, 'a') ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} className="mr-1.5" />}
                        Approve
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModal({ type: 'deactivate', user })}
                        disabled={isLoading(user.id, 'd')}
                        className="flex-1 bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                      >
                        {isLoading(user.id, 'd') ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} className="mr-1.5" />}
                        Deactivate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setModal({ type: 'remove', user })}
                      disabled={isLoading(user.id, 'r')}
                      className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl"
                    >
                      {isLoading(user.id, 'r') ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                    {user.assigned_device_code && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setModal({ type: 'revoke', user })}
                        disabled={isLoading(user.id, 'rv')}
                        className="h-9 w-9 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-xl"
                      >
                        {isLoading(user.id, 'rv') ? <Loader2 size={12} className="animate-spin" /> : <Smartphone size={14} />}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <SettingsSummaryCard 
          title="Device Ecosystem"
          description="Control field hardware assignments and mobile installation tokens."
        >
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

        {/* Inline Devices List */}
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Device Assignments</h5>
            <Badge variant="outline" className="bg-bd-surface-muted text-bd-text-muted border-[hsl(var(--bd-border)/0.5)] text-[9px] font-black uppercase">
              <Smartphone className="mr-1 h-2.5 w-2.5" />
              {devices.length} Devices
            </Badge>
          </div>
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
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider",
                      device.active ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {device.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-[hsl(var(--bd-surface-muted)/0.3)] p-3 text-[10px] text-bd-text-muted">
                  <div>Current: <span className="font-bold text-bd-text">{device.device_code || '—'}</span></div>
                  <div>Platform: <span className="font-bold text-bd-text uppercase">{device.platform || 'android'}</span></div>
                  <div className="col-span-2 truncate">ID: <span className="font-mono text-bd-text">{device.installation_id || 'legacy'}</span></div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-[hsl(var(--bd-border)/0.3)]">
                  <div className="relative flex-1">
                    <Input
                      value={codeValue}
                      onChange={(event) =>
                        setDeviceCodeDrafts((current) => ({
                          ...current,
                          [device.id]: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                        }))
                      }
                      placeholder="AA"
                      className="font-mono h-10 text-sm font-black uppercase tracking-widest text-center"
                      maxLength={2}
                    />
                  </div>
                  <Button
                    onClick={() => updateDeviceCode(device)}
                    disabled={actionId === device.id || !hasChanged}
                    className="rounded-xl px-6 h-10 text-[11px] font-bold uppercase tracking-wider bg-bd-button-primary-bg text-white disabled:opacity-50"
                  >
                    {actionId === device.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      'Update Code'
                    )}
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
