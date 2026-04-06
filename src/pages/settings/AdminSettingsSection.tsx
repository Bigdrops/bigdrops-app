import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Smartphone, Trash2, UserCheck, UserX } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/supabase'
import { getErrorMessage } from './settings-helpers'
import type { SettingsSession, SettingsToastFn } from './settings-types'

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-2xl">
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
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
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
  onToast,
  session,
}: {
  onToast: SettingsToastFn
  session: SettingsSession
}) {
  const [tab, setTab] = useState<'users' | 'devices'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [deviceCodeDrafts, setDeviceCodeDrafts] = useState<Record<string, string>>({})
  const [fetching, setFetching] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: ConfirmType; user: AdminUser } | null>(null)

  const fetchAll = useCallback(async () => {
    setFetching(true)
    const [{ data: profiles }, { data: deviceRows }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
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
        onToast('Access granted to ' + user.email)
      } else if (type === 'deactivate') {
        await supabase.from('profiles').update({ is_approved: false }).eq('id', user.id)
        onToast(user.email + ' deactivated')
      } else if (type === 'remove') {
        await supabase.from('profiles').delete().eq('id', user.id)
        onToast(user.email + ' removed')
      } else if (type === 'revoke') {
        const uppercaseCode = String(user.assigned_device_code).toUpperCase()
        await supabase.from('profiles').update({ assigned_device_code: null }).eq('id', user.id)
        await supabase.from('device_installations').update({ user_id: null, active: false }).eq('user_id', user.id)
        onToast('Device access revoked for ' + user.email)
      }
      await fetchAll()
    } catch (error) {
      onToast('Error: ' + getErrorMessage(error))
    }
    setActionId(null)
    setModal(null)
  }

  const updateDeviceCode = async (device: DeviceRow) => {
    const nextCode = String(deviceCodeDrafts[device.id] || '').trim().toUpperCase()

    if (!/^[A-Z]{2}$/.test(nextCode)) {
      onToast('Device codes must be exactly two uppercase letters.')
      return
    }

    if (devices.some(d => d.id !== device.id && d.device_code === nextCode && d.active)) {
      onToast(`Conflict: Code ${nextCode} is active on another device.`)
      return
    }

    setActionId(device.id)

    try {
      const { data: existingProfiles, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('assigned_device_code', nextCode)

      if (fetchErr) throw fetchErr
      if (existingProfiles && existingProfiles.length > 0 && existingProfiles.some(p => p.id !== device.user_id)) {
        onToast(`Conflict: Code ${nextCode} is mapped to another user's profile.`)
        return
      }

      const { error } = await supabase.rpc('admin_update_device_assignment_code', {
        p_assignment_id: device.id,
        p_device_code: nextCode,
      })
      if (error) throw error

      if (device.user_id) {
        await supabase.from('profiles').update({ assigned_device_code: nextCode }).eq('id', device.user_id)
      }

      await fetchAll()
      onToast(`Device code updated to ${nextCode}`)
    } catch (error) {
      onToast('Error: ' + getErrorMessage(error))
    } finally {
      setActionId(null)
    }
  }

  const isLoading = (id: string, suffix: string) => actionId === id + '_' + suffix

  return (
    <div>
      {modal ? (
        <ConfirmModal
          type={modal.type}
          user={modal.user}
          onConfirm={handleConfirm}
          onCancel={closeModal}
          loading={!!actionId}
        />
      ) : null}

      <div className="mb-5 flex gap-2">
        {['users', 'devices'].map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => setTab(currentTab as 'users' | 'devices')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === currentTab ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {currentTab === 'users' ? 'Manage Users' : 'Device Assignments'}
          </button>
        ))}
      </div>

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-3">
          {users.map((user) => {
            const isSelf = user.id === session?.user?.id
            return (
              <div
                key={user.id}
                className={`rounded-xl border bg-card p-4 ${isSelf ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{user.email}</p>
                      {isSelf ? (
                        <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-black text-blue-600">
                          YOU
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      {user.assigned_device_code ? (
                        <span className="ml-2 font-bold text-muted-foreground">· {String(user.assigned_device_code).toUpperCase()}</span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                      user.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {user.is_approved ? 'Active' : 'Pending'}
                  </span>
                </div>
                {isSelf ? (
                  <p className="py-1 text-center text-[11px] font-bold text-blue-400">Cannot modify your own account</p>
                ) : (
                  <div className="flex gap-2">
                    {!user.is_approved ? (
                      <button
                        onClick={() => setModal({ type: 'approve', user })}
                        disabled={isLoading(user.id, 'a')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {isLoading(user.id, 'a') ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => setModal({ type: 'deactivate', user })}
                        disabled={isLoading(user.id, 'd')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-50 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                      >
                        {isLoading(user.id, 'd') ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                        Deactivate
                      </button>
                    )}
                      <button
                        onClick={() => setModal({ type: 'remove', user })}
                        disabled={isLoading(user.id, 'r')}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        {isLoading(user.id, 'r') ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        Remove
                      </button>
                      {user.assigned_device_code ? (
                        <button
                          onClick={() => setModal({ type: 'revoke', user })}
                          disabled={isLoading(user.id, 'rv')}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-600 transition-colors hover:bg-amber-100 disabled:opacity-50"
                        >
                          {isLoading(user.id, 'rv') ? <Loader2 size={11} className="animate-spin" /> : <Smartphone size={11} />}
                          Revoke Device
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )
          })}
          {users.length === 0 ? <p className="py-8 text-center text-xs font-bold text-muted-foreground">NO USERS FOUND</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const codeValue = deviceCodeDrafts[device.id] ?? device.device_code ?? ''
            return (
              <div key={device.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Smartphone size={15} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{device.device_name || 'Android Device'}</p>
                    <p className="text-[11px] text-muted-foreground">{device.profiles?.email || 'Unassigned'}</p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-2 py-1 text-[10px] font-black ${
                      device.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {device.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-3 grid gap-2 rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  <div>Current code: <span className="font-bold text-foreground">{device.device_code || '—'}</span></div>
                  <div>Platform: <span className="font-medium text-foreground">{device.platform || 'android'}</span></div>
                  <div>Installation: <span className="font-mono text-foreground">{device.installation_id || 'legacy-device-row'}</span></div>
                  <div>Assigned: <span className="font-medium text-foreground">{device.assigned_at ? new Date(device.assigned_at).toLocaleString() : '—'}</span></div>
                  <div>Last seen: <span className="font-medium text-foreground">{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : '—'}</span></div>
                  <div>Mode: <span className="font-medium text-foreground">{device.assigned_automatically ? 'Auto-assigned' : 'Manual / migrated'}</span></div>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={codeValue}
                    onChange={(event) =>
                      setDeviceCodeDrafts((current) => ({
                        ...current,
                        [device.id]: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                      }))
                    }
                    placeholder="AA"
                    className="font-mono text-sm font-semibold uppercase"
                    maxLength={2}
                  />
                  <button
                    type="button"
                    onClick={() => updateDeviceCode(device)}
                    disabled={actionId === device.id || codeValue === device.device_code}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {actionId === device.id ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 size={11} className="animate-spin" />
                        Saving
                      </span>
                    ) : (
                      'Update Code'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
          {devices.length === 0 ? (
            <p className="py-8 text-center text-xs font-bold text-muted-foreground">NO DEVICE ASSIGNMENTS FOUND</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
