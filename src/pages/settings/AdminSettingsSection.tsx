import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Smartphone, Trash2, UserCheck, UserX } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/supabase'
import { getErrorMessage } from './settings-helpers'
import type { SettingsSession, SettingsToastFn } from './settings-types'

type ConfirmType = 'approve' | 'deactivate' | 'remove'

type AdminUser = {
  id: string
  email: string
  created_at?: string | null
  assigned_device_code?: string | null
  is_approved?: boolean | null
}

type DeviceRow = {
  device_code: string
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
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="mt-0.5 text-sm text-amber-500">⚠️</span>
            <p className="text-xs font-semibold text-amber-700">
              If they are currently logged in, they will be blocked on their next action.
            </p>
          </div>
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
            <span className="mt-0.5 text-sm text-red-500">🚨</span>
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
  deviceCodes,
}: {
  onToast: SettingsToastFn
  session: SettingsSession
  deviceCodes: string[]
}) {
  const [tab, setTab] = useState<'users' | 'devices'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [fetching, setFetching] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: ConfirmType; user: AdminUser } | null>(null)

  const fetchAll = useCallback(async () => {
    setFetching(true)
    const [{ data: profiles }, { data: deviceRows }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('devices').select('*, profiles(email)'),
    ])
    setUsers((profiles as AdminUser[]) || [])
    setDevices((deviceRows as DeviceRow[]) || [])
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
      }
      await fetchAll()
    } catch (error) {
      onToast('Error: ' + getErrorMessage(error))
    }
    setActionId(null)
    setModal(null)
  }

  const assignDevice = async (code: string, userId: string) => {
    setActionId(code)
    if (userId === '') {
      await supabase.from('devices').update({ user_id: null }).eq('device_code', code)
    } else {
      await supabase.from('devices').upsert({ device_code: code, user_id: userId })
      await supabase.from('profiles').update({ assigned_device_code: code }).eq('id', userId)
    }
    await fetchAll()
    setActionId(null)
    onToast('Device updated')
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
            {currentTab === 'users' ? 'Manage Users' : 'Device Codes'}
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
                        <span className="ml-2 font-bold text-muted-foreground">· {user.assigned_device_code}</span>
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
                  <p className="py-1 text-center text-[11px] font-bold text-blue-400">🔒 Cannot modify your own account</p>
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
                  </div>
                )}
              </div>
            )
          })}
          {users.length === 0 ? <p className="py-8 text-center text-xs font-bold text-muted-foreground">NO USERS FOUND</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          {deviceCodes.map((code) => {
            const device = devices.find((row) => row.device_code === code)
            return (
              <div key={code} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Smartphone size={15} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Device {code}</p>
                    <p className="text-[11px] text-muted-foreground">{device?.profiles?.email || 'Unassigned'}</p>
                  </div>
                  {device?.profiles ? (
                    <span className="ml-auto rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600">
                      Assigned
                    </span>
                  ) : null}
                </div>
                <Select
                  value={device?.user_id || '__unassigned__'}
                  onValueChange={(value) => assignDevice(code, value === '__unassigned__' ? '' : value)}
                  disabled={actionId === code}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">— Unassign —</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
